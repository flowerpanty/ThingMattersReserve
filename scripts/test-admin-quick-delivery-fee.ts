import assert from 'node:assert/strict';
import express from 'express';
import ExcelJS from 'exceljs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFile } from 'node:fs/promises';
import { QuoteImageTemplate } from '../client/src/components/quote-image-template';
import { getQuickDeliveryFee, isQuickDeliveryFeeItem, MAX_ORDER_AMOUNT, withQuickDeliveryFee } from '../shared/quick-delivery-fee';
import { cookiePrices } from '../shared/schema';

// All writes, email and sheet adapters are local fixtures. Never connect to a real database.
process.env.DATABASE_URL = 'postgres://test:test@127.0.0.1:1/test';
process.env.MAILGUN_API_KEY = 'isolated-test-key';
process.env.MAILGUN_DOMAIN = 'quotes.example.com';
process.env.MAILGUN_FROM = 'nothingmatters <quotes@quotes.example.com>';
delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
delete process.env.KAKAO_ALIMTALK_API_KEY;
const [{ registerRoutes }, { storage }, { EmailService }, { pushNotificationService }, { kakaoAlimtalkService }, { googleSheetsService }, quote] = await Promise.all([
  import('../server/routes'), import('../server/storage'), import('../server/services/email-service'),
  import('../server/services/push-notification-service'), import('../server/services/kakao-alimtalk-service'),
  import('../server/services/google-sheets-service'), import('../server/services/landing-email-quote'),
]);
const orders = new Map<string, any>();
let writes = 0;
let failSave = false;
const sent: any[] = [];
(storage as any).getAllOrders = async () => [...orders.values()];
(storage as any).getOrder = async (id: string) => orders.get(id);
(storage as any).createOrder = async (order: any) => {
  const saved = { ...order, id: `quick-fee-${orders.size + 1}`, createdAt: new Date().toISOString() };
  orders.set(saved.id, saved);
  return saved;
};
(storage as any).updateQuickDeliveryFee = async (id: string, fee: number) => {
  if (failSave) throw new Error('simulated database failure');
  const current = orders.get(id);
  if (!current) return undefined;
  const saved = { ...current, ...withQuickDeliveryFee(current, fee) };
  writes++;
  orders.set(id, saved);
  return saved;
};
EmailService.prototype.sendLandingAdminNotification = async () => {};
EmailService.prototype.isConfigured = () => true;
EmailService.prototype.sendLandingQuote = async function (order) {
  sent.push({ total: order.totalPrice, html: this.generateLandingCustomerEmailHTML(order) });
};
EmailService.prototype.sendBrookieQuote = EmailService.prototype.sendLandingQuote;
(pushNotificationService as any).sendNewOrderNotification = async () => {};
(kakaoAlimtalkService as any).isEnabled = () => false;
(googleSheetsService as any).isEnabled = () => false;

const serveUI = process.argv.includes('--serve-ui');
const app = express();
app.use(express.json());
app.use((req, _res, next) => { (req as any).session = { adminAuthenticated: serveUI || req.get('X-Test-Admin') === 'true' }; next(); });
const server = await registerRoutes(app);
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
assert(address && typeof address !== 'string');
const base = `http://127.0.0.1:${address.port}`;
const common = {
  customerName: '퀵비 검증 주문', customerPhone: '010-0000-0000', customerEmail: 'customer@example.com',
  deliveryDate: '2026-10-28', deliveryMethod: 'quick', deliveryAddress: '서울특별시 강남구 테헤란로 123 테스트빌딩 12층', pickupTime: '12:00~13:00',
};
async function patch(id: string, fee: unknown, headers: Record<string, string> = {}, extra: object = {}) {
  const response = await fetch(`${base}/api/orders/${id}/quick-delivery-fee`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Test-Admin': 'true', ...headers },
    body: JSON.stringify({ fee, ...extra }),
  });
  return { status: response.status, body: await response.json() };
}
async function email(id: string, token: string) {
  return fetch(`${base}/api/orders/${id}/email-quote`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email: common.customerEmail }),
  });
}
async function workbookFor(id: string) {
  const response = await fetch(`${base}/api/orders/${id}/quote-excel`, { headers: { 'X-Test-Admin': 'true' } });
  assert.equal(response.status, 200);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()));
  return workbook.worksheets[0];
}
function verifySheet(sheet: ExcelJS.Worksheet, total: number, fee: number) {
  let feeRows = 0;
  let foundTotal = false;
  sheet.eachRow(row => {
    if (row.getCell(1).value === '퀵비') { feeRows++; assert.equal(row.getCell(4).value, fee); }
    if (row.getCell(1).value === '총 합계') { foundTotal = true; assert.equal(row.getCell(4).value, total); }
  });
  assert.equal(feeRows, fee > 0 ? 1 : 0);
  assert(foundTotal);
}

try {
  const fixtures = [
    { source: 'brookie', combos: [{ character: 'bear', paper: 'navy', qty: 12 }] },
    { source: 'cookie7', packageId: 'one-box', flavorQty: { 'double-choco': 12 } },
    { source: 'lucky', quantity: 2 },
    { source: 'anniversary', designType: 'A', speechBubbleName: '태근 ♥ 유진', bottomMessage: '축하합니다', quantity: 2 },
    { source: 'cookieFlight', quantity: 2 },
    { source: 'airplaneButter', quantity: 3 },
    { source: 'terminalCookie', quantity: 2 },
  ];
  for (const fixture of fixtures) {
    const response = await fetch(base + '/api/landing-orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...common, ...fixture, quickDeliveryFee: 999999, fee: 999999 }),
    });
    assert.equal(response.status, 200);
    const created = await response.json();
    const original = orders.get(created.orderId);
    const before = structuredClone(original);
    const quantity = quote.storedLandingQuote(original).quantity;
    assert.equal(getQuickDeliveryFee(original), 0, 'public form cannot set an administrative fee');
    if (fixture.source === 'brookie') assert.equal((await email(original.id, created.emailQuoteToken)).status, 200);

    for (const fee of [5000, 5000, 8000, 0, 4500]) {
      const updated = await patch(original.id, fee);
      assert.equal(updated.status, 200);
      const saved = orders.get(original.id);
      assert.equal(saved.totalPrice, before.totalPrice + fee);
      assert.equal(getQuickDeliveryFee(saved), fee);
      assert.equal(saved.orderItems.filter(isQuickDeliveryFeeItem).length, fee > 0 ? 1 : 0);
      assert.deepEqual(saved.orderItems.filter((item: any) => !isQuickDeliveryFeeItem(item)), before.orderItems);
      assert.equal(quote.storedLandingQuote(saved).quantity, quantity, 'delivery fee never increases product quantity');
      verifySheet(await workbookFor(saved.id), saved.totalPrice, fee);
      const sheets = (googleSheetsService as any).buildQuoteRows(saved);
      assert.equal(sheets.totalAmount, saved.totalPrice);
      assert.equal(sheets.rows.filter((row: any) => row.name === '퀵비').length, fee > 0 ? 1 : 0);
      if (fee > 0) {
        assert.equal(sheets.rows.find((row: any) => row.name === '퀵비').amount, fee);
        const image = renderToStaticMarkup(React.createElement(QuoteImageTemplate, { order: saved }));
        assert(image.includes('퀵비') && image.includes(saved.totalPrice.toLocaleString('ko-KR')));
        const html = new EmailService().generateLandingCustomerEmailHTML(saved);
        assert(html.includes('퀵비') && html.includes(saved.totalPrice.toLocaleString('ko-KR')));
      }
    }
    if (fixture.source === 'brookie') {
      assert.equal((await email(original.id, created.emailQuoteToken)).status, 200);
      assert.equal(sent.length, 2, 'changing the fee invalidates the earlier email quote cache');
      assert.equal(sent.at(-1).total, before.totalPrice + 4500);
      assert(sent.at(-1).html.includes('퀵비'));
    }
    console.log(`${fixture.source}: replace/retry/remove, saved total, quantity, image, Excel, email and Sheets PASS`);
  }

  const legacy = {
    ...common, id: 'quick-fee-legacy', customerContact: common.customerEmail, createdAt: new Date().toISOString(),
    totalPrice: cookiePrices.regular * 12 + 1200,
    orderItems: [
      { type: 'regular', name: '초코칩', quantity: 12, price: cookiePrices.regular },
      { type: 'meta', name: 'metadata', quantity: 0, price: 0, options: { regularCookies: { 초코칩: 12 }, deliveryAddress: common.deliveryAddress } },
    ],
  };
  orders.set(legacy.id, legacy);
  assert.equal((await patch(legacy.id, 6000)).status, 200);
  verifySheet(await workbookFor(legacy.id), legacy.totalPrice + 6000, 6000);
  assert.equal(orders.get(legacy.id).totalPrice, legacy.totalPrice + 6000, 'preserve historical adjustments');

  const id = [...orders.keys()][0];
  const writeCount = writes;
  if (!serveUI) assert.equal((await patch(id, 1, { 'X-Test-Admin': 'false' })).status, 401);
  assert.equal((await patch(id, 1, { Origin: 'https://untrusted.example' })).status, 403);
  assert.equal((await patch(id, 1, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  for (const value of [-1, 1.5, '5000', null, MAX_ORDER_AMOUNT + 1, {}]) assert.equal((await patch(id, value)).status, 400);
  assert.equal((await patch(id, 1, {}, { totalPrice: 1 })).status, 400);
  assert.equal((await patch(id, MAX_ORDER_AMOUNT)).status, 400, 'reject an overflowing total');
  assert.equal((await patch('missing', 5000)).status, 404);
  orders.set('pickup', { ...legacy, id: 'pickup', deliveryMethod: 'pickup' });
  assert.equal((await patch('pickup', 5000)).status, 400);
  failSave = true;
  const failure = await patch(id, 6000);
  assert.equal(failure.status, 500);
  assert(!JSON.stringify(failure.body).includes('simulated database failure'));
  failSave = false;
  assert.equal(writes, writeCount, 'invalid and failed requests never update saved money');

  const pending = {
    ...legacy, id: 'pending', totalPrice: 0,
    orderItems: [{ type: 'addon', name: '쿠키크루', quantity: 12, price: 0, options: { landingSource: 'cookieCrew' } },
      { type: 'meta', name: 'metadata', quantity: 0, price: 0, options: { landingSource: 'cookieCrew', pricingPending: true } }],
  };
  orders.set(pending.id, pending);
  assert.equal((await patch(pending.id, 4000)).status, 200);
  assert.equal(quote.storedLandingQuote(orders.get(pending.id)).quantity, 12);
  const pendingHTML = new EmailService().generateLandingCustomerEmailHTML(orders.get(pending.id));
  assert(pendingHTML.includes('상담 후 안내') && pendingHTML.includes('4,000원'));
  console.log('Legacy adjustments, admin/CSRF/input/overflow guards, failed saves and consultation pricing PASS');

  if (serveUI) {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true, hmr: { server } }, appType: 'custom' });
    app.get('/__quick-fee-check', async (req, res) => {
      const fixture = orders.get(typeof req.query.id === 'string' ? req.query.id : id);
      const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module">
        import React from 'react';import {createRoot} from 'react-dom/client';
        import {OrderDetailModal} from '/src/components/order-detail-modal.tsx';
        import {Toaster} from '/src/components/ui/toaster.tsx';import '/src/index.css';
        const root=createRoot(document.getElementById('root'));
        function show(order){root.render(React.createElement(React.Fragment,null,React.createElement(OrderDetailModal,{order,isOpen:true,onClose:()=>{},onOrderUpdated:show}),React.createElement(Toaster)));}
        fetch('/api/orders').then(response=>response.json()).then(orders=>show(orders.find(order=>order.id===${JSON.stringify(fixture.id)})));
      </script></body></html>`;
      res.type('html').send(await vite.transformIndexHtml('/__quick-fee-check', html));
    });
    app.use(vite.middlewares);
    await writeFile('/private/tmp/admin-quick-fee-ui-url.txt', `${base}/__quick-fee-check`);
    console.log(`Fixture-only UI: ${base}/__quick-fee-check`);
  }
} finally {
  if (!serveUI) await new Promise<void>(resolve => server.close(() => resolve()));
}
