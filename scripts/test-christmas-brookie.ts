import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import ExcelJS from 'exceljs';
import { christmasOrderAvailability, christmasPickupTimes, christmasProducts } from '../shared/christmas-brookie';
import { orders as orderTable } from '../shared/schema';

// Loopback fixtures only. No real database, mail, push, Kakao or Sheets writes.
process.env.DATABASE_URL = 'postgres://fixture:fixture@127.0.0.1:1/fixture';
process.env.SESSION_SECRET = 'isolated-christmas-fixture';
process.env.MAILGUN_API_KEY = 'fixture-mail-key';
process.env.MAILGUN_DOMAIN = 'quotes.example.com';
process.env.MAILGUN_FROM = 'nothingmatters <quotes@quotes.example.com>';
const [{ registerRoutes }, { storage, PostgreStorage }, { db }, { EmailService }, { pushNotificationService }, { googleSheetsService }, { kakaoAlimtalkService }] = await Promise.all([
  import('../server/routes'), import('../server/storage'), import('../server/db'), import('../server/services/email-service'),
  import('../server/services/push-notification-service'), import('../server/services/google-sheets-service'), import('../server/services/kakao-alimtalk-service'),
]);
const records = new Map<string, any>();
const mail: any[] = [];
let writes = 0, admin = 0, push = 0, sheets = 0, conflictChecks = 0;
let failSave = false, failMail = false;
let clock = new Date('2026-11-30T23:59:00+09:00');
(db as any).insert = (table: unknown) => {
  assert.equal(table, orderTable);
  return { values: (value: any) => {
    const query = {
      onConflictDoNothing: (options: any) => { assert.equal(options.target, orderTable.id); conflictChecks++; return query; },
      returning: async () => {
        if (failSave) throw new Error('private simulated database failure');
        if (records.has(value.id)) return [];
        const order = { ...value, createdAt: clock, orderStatus: 'pending', paymentConfirmed: 0 };
        records.set(value.id, order); writes++; return [order];
      },
    }; return query;
  } };
};
storage.getOrder = async id => records.get(id);
storage.getAllOrders = async () => [...records.values()];
EmailService.prototype.sendLandingAdminNotification = async () => { admin++; };
(pushNotificationService as any).sendNewOrderNotification = async () => { push++; };
(kakaoAlimtalkService as any).isEnabled = () => false;
(googleSheetsService as any).isEnabled = () => true;
(googleSheetsService as any).appendOrderToSheet = async (order: any) => {
  const rows = (googleSheetsService as any).buildQuoteRows(order);
  assert.equal(rows.totalAmount, order.totalPrice); sheets++;
};
const sendQuote = EmailService.prototype.sendLandingQuote;
EmailService.prototype.sendLandingQuote = async function (...args) {
  (this as any).mg = { messages: { create: async (_domain: string, payload: any) => {
    if (failMail) throw new Error('fixture mail failure');
    mail.push(payload); return { status: 200, id: '<fixture-message>', message: 'Queued. Thank you.' };
  } } };
  return sendQuote.apply(this, args);
};
const app = express(); app.use(express.json());
const serveUI = process.argv.includes('--serve-ui');
app.use((req, _res, next) => { (req as any).session = { adminAuthenticated: serveUI || req.get('X-Fixture-Admin') === 'yes' }; next(); });
const server = await registerRoutes(app, { now: () => clock });
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${(server.address() as any).port}`;
const body = (patch = {}) => ({ source: 'christmasBrookie', catalogVersion: 'christmas-2026-v1',
  items: [{ sku: 'christmas-tree-brookie', quantity: 1, price: 1 }], customerName: 'LOCAL CHRISTMAS FIXTURE',
  customerPhone: '010-0000-0000', customerEmail: '', deliveryDate: '2026-12-03', pickupTime: '10:00',
  deliveryMethod: 'pickup', privacyConsent: true, idempotencyKey: randomUUID(), ...patch });
async function post(payload: any) {
  const response = await fetch(`${base}/api/landing-orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return { status: response.status, data: await response.json() };
}
async function email(order: any) {
  return fetch(`${base}/api/orders/${order.orderId}/email-quote`, { method: 'POST', headers: {
    'Content-Type': 'application/json', Authorization: `Bearer ${order.emailQuoteToken}`,
  }, body: JSON.stringify({ email: 'customer@example.com' }) });
}
try {
  assert.equal(christmasOrderAvailability(clock).enabled, false);
  const closed = await post(body({ clientTime: '2026-12-02', enabled: true }));
  assert.equal(closed.status, 403); assert.match(closed.data.message, /12월 1일/); assert.equal(writes, 0);
  clock = new Date('2026-12-01T00:00:00+09:00');
  assert.equal(christmasOrderAvailability(clock).enabled, true);
  assert.equal(christmasOrderAvailability(clock).minimumDeliveryDate, '2026-12-02');
  for (const pickupTime of christmasPickupTimes) assert.equal((await post(body({ pickupTime }))).status, 200);
  for (const pickupTime of ['09:00', '17:01', '14:30', '10:00~11:00', '18:00']) assert.equal((await post(body({ pickupTime }))).status, 400);
  for (const deliveryDate of ['2026-11-30', '2026-12-01', '2026-02-30']) assert.equal((await post(body({ deliveryDate }))).status, 400);
  for (const quantity of [1, 2, 10, 12]) {
    const result = await post(body({ items: [{ sku: 'christmas-tree-brookie', quantity, price: 1 }], totalPrice: 1 }));
    assert.equal(result.status, 200); assert.equal(result.data.totalPrice, quantity * 9500);
    assert.equal(result.data.orderItems[0].price, 9500);
  }
  const withoutEmail = await post(body()); assert.equal(withoutEmail.status, 200); assert.equal(withoutEmail.data.emailQuoteToken, undefined);
  assert.equal((await post(body({ customerEmail: 'bad-email' }))).status, 400);
  assert.equal((await post(body({ deliveryMethod: 'quick', deliveryAddress: '' }))).status, 400);
  assert.equal((await post(body({ deliveryMethod: 'quick', deliveryAddress: '서울시 테스트 주소' }))).status, 200);
  const request = body({ customerEmail: 'customer@example.com', request: '<script>fixture</script>' });
  const previous = writes;
  const responses = await Promise.all([post(request), post(request), post(request)]);
  assert(responses.every(result => result.status === 200));
  assert.equal(writes, previous + 1); assert.equal(admin, writes); assert.equal(push, writes); assert.equal(sheets, writes);
  assert.equal(new Set(responses.map(r => r.data.orderId)).size, 1);
  assert.equal(new Set(responses.map(r => r.data.emailQuoteToken)).size, 1);
  const saved = responses[0].data;
  assert.equal((await post({ ...request, items: [{ sku: 'christmas-tree-brookie', quantity: 2 }] })).status, 409);
  const restarted = new PostgreStorage(); restarted.getOrder = async id => records.get(id);
  const stored = records.get(saved.orderId);
  const fingerprint = stored.orderItems.find((i: any) => i.type === 'meta').options.requestFingerprint;
  assert.equal((await restarted.createIdempotentLandingOrder(stored, stored.id, fingerprint)).created, false);
  assert.equal(writes, previous + 1); assert(conflictChecks > writes);
  failMail = true; assert.equal((await email(saved)).status, 503); assert.equal(writes, previous + 1);
  failMail = false; assert.equal((await email(saved)).status, 200); assert.equal((await email(saved)).status, 200);
  assert.equal(mail.length, 1); assert.equal(writes, previous + 1);
  assert.equal(mail[0].subject, '[nothingmatters] LOCAL CHRISTMAS FIXTURE님의 크리스마스 브루키 견적서');
  assert(mail[0].html.includes('9,500원') && mail[0].html.includes('2026-12-03') && mail[0].html.includes('10:00'));
  assert(!mail[0].html.includes('<script>fixture</script>'));
  const quote = await fetch(`${base}/api/orders/${saved.orderId}/quote-excel`, { headers: { 'X-Fixture-Admin': 'yes' } });
  assert.equal(quote.status, 200); const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(Buffer.from(await quote.arrayBuffer()));
  assert(JSON.stringify(workbook.worksheets[0].getSheetValues()).includes('9500'));
  const list = await fetch(`${base}/api/orders`, { headers: { 'X-Fixture-Admin': 'yes' } });
  assert((await list.json()).some((order: any) => order.id === saved.orderId && order.orderItems.some((item: any) => item.options?.landingSource === 'christmasBrookie')));
  failSave = true; const failed = await post(body()); assert.equal(failed.status, 500); assert(!failed.data.message.includes('private')); failSave = false;
  const landingRoot = process.env.CHRISTMAS_LANDING_ROOT;
  if (landingRoot) {
    const catalog = JSON.parse(await readFile(path.join(landingRoot, 'data/christmas-products.json'), 'utf8'));
    assert.deepEqual(catalog.products.map((p: any) => [p.sku, p.name, p.price]), christmasProducts.map(p => [p.sku, p.name, p.price]));
  }
  console.log('Christmas Brookie: Seoul opening boundary, receipt minimum, 8 exact hours, server repricing 1/2/10/12, optional email, shared DB/admin/notifications/Sheets, concurrent & restart-safe deduplication, email failure/retry, stored Excel and sanitized failures PASS');
  if (serveUI) {
    assert(landingRoot, 'CHRISTMAS_LANDING_ROOT is required for fixture UI');
    app.post('/__test/png', express.raw({ type: 'image/png', limit: '10mb' }), async (req, res) => { await writeFile('/private/tmp/christmas-brookie-quote.png', req.body); res.sendStatus(204); });
    app.get('/__test/email', (_req, res) => res.type('html').send(mail.at(-1)?.html || 'No mail yet'));
    app.get('/__test/state', (_req, res) => res.json({ writes, mail: mail.length, admin, push, sheets }));
    app.get('/__test-adapter.js', (_req, res) => res.type('application/javascript').send(`
      const fixtureTrace=text=>{let n=document.getElementById('fixture-trace');if(!n){n=document.createElement('pre');n.id='fixture-trace';document.body.append(n);}n.textContent+=text+'\\n';};
      const originalProvide=window.NMQuote.provideImage;
      navigator.canShare=()=>false;
      window.NMQuote.provideImage=async (...args)=>{await fetch('/__test/png',{method:'POST',headers:{'Content-Type':'image/png'},body:args[0]});const result=await originalProvide(...args);fixtureTrace('PNG '+result);return result;};
      window.NMQuote.navigateToKakao=()=>fixtureTrace('KAKAO https://pf.kakao.com/_QdCaK/chat');
    `));
    app.get('/christmas/', async (_req, res) => {
      const html = (await readFile(path.join(landingRoot, 'christmas/index.html'), 'utf8')).replace('  <script src="/christmas/christmas-order.js', '  <script src="/__test-adapter.js" defer></script>\n  <script src="/christmas/christmas-order.js');
      res.type('html').send(html);
    });
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true, hmr: { server } }, appType: 'custom' });
    app.get('/dashboard', async (_req, res) => res.type('html').send(await vite.transformIndexHtml('/dashboard', await readFile('client/index.html', 'utf8'))));
    app.use(express.static(landingRoot)); app.use(vite.middlewares);
    await writeFile('/private/tmp/christmas-brookie-ui-url.txt', base);
    console.log(`Fixture UI (opened clock; no production writes): ${base}/christmas/`);
    await new Promise(() => {});
  }
} finally { await new Promise<void>(resolve => server.close(() => resolve())); }
