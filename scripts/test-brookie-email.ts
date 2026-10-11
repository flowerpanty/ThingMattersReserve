import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import express from 'express';
import ExcelJS from 'exceljs';

// Isolated integration test: no real database, notifications, or email delivery.
process.env.DATABASE_URL = 'postgres://test:test@127.0.0.1:1/test';
process.env.NODE_ENV = 'production';
process.env.MAILGUN_API_KEY = 'isolated-test-key';
process.env.MAILGUN_DOMAIN = 'quotes.example.com';
process.env.MAILGUN_FROM = 'nothingmatters <quotes@quotes.example.com>';
delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
delete process.env.KAKAO_ALIMTALK_API_KEY;
const [{ registerRoutes }, { storage }, { EmailService }, { pushNotificationService }, { kakaoAlimtalkService }, { googleSheetsService }, access] = await Promise.all([
  import('../server/routes'), import('../server/storage'), import('../server/services/email-service'),
  import('../server/services/push-notification-service'), import('../server/services/kakao-alimtalk-service'),
  import('../server/services/google-sheets-service'), import('../server/services/landing-email-quote'),
]);
const saved: any[] = [];
const sent: any[] = [];
let failEmail = false;
let rejectResponse = false;
let providerCalls = 0;
const failedAddresses = new Set<string>();
(storage as any).createOrder = async (order: any) => {
  if (order.customerName === '저장 실패 테스트') throw new Error('저장 실패 테스트');
  const record = { ...order, id: `brookie-test-${saved.length + 1}` };
  saved.push(record);
  return record;
};
(storage as any).getOrder = async (id: string) => saved.find(order => order.id === id);
EmailService.prototype.sendLandingAdminNotification = async () => {};
const realSend = EmailService.prototype.sendBrookieQuote;
EmailService.prototype.sendBrookieQuote = async function (order, email, buffer) {
  (this as any).mg = { messages: { create: async (_domain: string, message: any) => {
    providerCalls++;
    if (rejectResponse) return { status: 200, message: 'Not queued' };
    if (failEmail || (email === 'retry@example.com' && !failedAddresses.has(email))) {
      failedAddresses.add(email);
      throw Object.assign(new Error('Mock provider failure'), { status: 403, details: 'Domain not verified' });
    }
    sent.push(message);
    if (process.argv.includes('--serve-ui')) await writeFile('/tmp/brookie-customer-email.html', message.html);
    return { status: 200, id: '<isolated-message@quotes.example.com>', message: 'Queued. Thank you.' };
  } } };
  await realSend.call(this, order, email, buffer);
};
(pushNotificationService as any).sendNewOrderNotification = async () => {};
(kakaoAlimtalkService as any).isEnabled = () => false;
(googleSheetsService as any).isEnabled = () => false;

const app = express();
app.use(express.json());
app.use((req, _res, next) => { if (req.get('X-Test-IP')) Object.defineProperty(req, 'ip', { value: req.get('X-Test-IP') }); next(); });
app.use((req, _res, next) => { (req as any).session = { adminAuthenticated: req.get('X-Test-Admin') === 'true' }; next(); });
const server = await registerRoutes(app);
const serveUI = process.argv.includes('--serve-ui');
if (serveUI) {
  app.post('/__test/png', express.raw({ type: 'image/png', limit: '10mb' }), async (req, res) => {
    await writeFile('/tmp/brookie-customer-quote.png', req.body);
    res.sendStatus(204);
  });
  app.get('/__test/state', (_req, res) => res.json({ saves: saved.length, sends: sent.length }));
  app.get('/brookie-before', async (_req, res) => res.type('html').send(await readFile('/tmp/brookie-desktop-before.html', 'utf8')));
  app.get('/brookie', async (_req, res) => {
    let html = await readFile('client/public/brookie.html', 'utf8');
    html = html.replace('<script src="brookie-quote.js"></script>', `<script src="brookie-quote.js"></script><script>
      const trace = text => { let node=document.getElementById('test-trace'); if(!node){ node=document.createElement('pre');node.id='test-trace';document.body.append(node); } node.textContent+=text+'\\n'; };
      const originalFetch=window.fetch.bind(window);
      window.fetch=async (...args) => { const response=await originalFetch(...args); if(args[1]?.method==='POST') trace(args[0]+' '+response.status); return response; };
      const originalProvide=window.NMQuote.provideImage;
      // Test the real download fallback without opening an OS share sheet.
      navigator.canShare=()=>false;
      Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{}}});
      window.NMQuote.provideImage=async (...args) => { await originalFetch('/__test/png',{method:'POST',headers:{'Content-Type':'image/png'},body:args[0]}); trace('PNG');const method=await originalProvide(...args);trace(method);return method; };
      window.NMQuote.navigateToKakao=()=>{trace('KAKAO https://pf.kakao.com/_QdCaK/chat'); if(location.search.includes('real-kakao'))location.href='https://pf.kakao.com/_QdCaK/chat';};
    </script>`);
    res.type('html').send(html);
  });
  app.get('/__test/email', async (_req, res) => res.type('html').send(await readFile('/tmp/brookie-customer-email.html', 'utf8')));
  app.use(express.static('client/public'));
}
await new Promise<void>(resolve => server.listen(serveUI ? 5003 : 0, '127.0.0.1', resolve));
const address = server.address();
assert(address && typeof address !== 'string');
const base = `http://127.0.0.1:${address.port}`;
if (serveUI) {
  console.log(`Isolated Brookie UI test server: ${base}/brookie`);
} else {
  const common = { source: 'brookie', customerName: '검증 <script>', customerPhone: '010-1234-5678', customerEmail: 'kim@example.com', deliveryDate: '2026-10-20', deliveryMethod: 'pickup', pickupTime: '12:00~13:00' };
  const combos = [
    { character: 'bear', paper: 'navy', qty: 6 },
    { character: 'birthday_bear', paper: 'custom', qty: 6, heartTextEnabled: true, heartText: 'LOVE', customPaperLine1: '첫번째 줄', customPaperLine2: '둘째 <img src=x>' },
  ];
  let faultCases = false;
  const post = async (path: string, body: any, token?: string) => {
    const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(faultCases ? { 'X-Test-IP': 'configuration-tests' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
  try {
    const { ExcelGenerator } = await import('../server/services/excel-generator');
    const created = await post('/api/landing-orders', { ...common, combos, topper: true, topperKind: 'square', sticker: true, totalPrice: 1 });
    assert.equal(created.status, 200);
    assert.equal(created.body.totalPrice, 132200);
    assert.equal(saved[0].customerContact, common.customerPhone);
    const meta = saved[0].orderItems.at(-1).options;
    assert.equal(meta.customerEmail, common.customerEmail);
    assert.equal(meta.emailQuoteTokenHash.length, 64);
    assert.notEqual(meta.emailQuoteTokenHash, created.body.emailQuoteToken);
    assert(access.hasEmailQuoteAccess(meta, created.body.emailQuoteToken));
    assert(!access.hasEmailQuoteAccess(meta, created.body.emailQuoteToken, meta.emailQuoteExpiresAt));
    const path = `/api/orders/${created.body.orderId}/email-quote`;
    // Missing configuration must fail before Excel/provider; never send real mail.
    faultCases = true;
    const initialCalls = providerCalls;
    for (const variable of ['MAILGUN_API_KEY', 'MAILGUN_DOMAIN']) {
      const previous = process.env[variable];
      delete process.env[variable];
      assert.equal(new EmailService().isConfigured(), false);
      const unavailable = await post(path, { email: common.customerEmail }, created.body.emailQuoteToken);
      assert.equal(unavailable.status, 503);
      assert.match(unavailable.body.message, /현재 이메일 견적 서비스를 사용할 수 없습니다/);
      process.env[variable] = previous;
    }
    process.env.MAILGUN_DOMAIN = 'sandbox123.mailgun.org';
    delete process.env.MAILGUN_FROM;
    assert.equal(new EmailService().isConfigured(), false);
    assert.equal((await post(path, { email: common.customerEmail }, created.body.emailQuoteToken)).status, 503);
    process.env.MAILGUN_DOMAIN = 'quotes.example.com';
    process.env.MAILGUN_FROM = 'quotes@wrong.example.com';
    assert.equal((await post(path, { email: common.customerEmail }, created.body.emailQuoteToken)).status, 503);
    delete process.env.MAILGUN_FROM;
    assert.equal(new EmailService().isConfigured(), true);
    process.env.MAILGUN_FROM = 'nothingmatters <quotes@quotes.example.com>';
    assert.equal(providerCalls, initialCalls);
    const realExcel = ExcelGenerator.prototype.generateQuoteFromStoredItems;
    const originalError = console.error;
    const failures: any[] = [];
    console.error = (...args: any[]) => { failures.push(args); };
    try {
      ExcelGenerator.prototype.generateQuoteFromStoredItems = async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        throw new Error('Isolated Excel failure');
      };
      const failedExcel = await Promise.all([
        post(path, { email: common.customerEmail }, created.body.emailQuoteToken),
        post(path, { email: common.customerEmail }, created.body.emailQuoteToken),
      ]);
      assert(failedExcel.every(result => result.status === 503));
      assert.equal(failures.length, 2);
      assert(failures.every(args => args[1]?.stage === 'excel_generation'));
    } finally {
      ExcelGenerator.prototype.generateQuoteFromStoredItems = realExcel;
      console.error = originalError;
    }
    assert.equal(providerCalls, initialCalls);
    const savedEmail = meta.customerEmail;
    delete meta.customerEmail;
    assert.equal((await post(path, { email: common.customerEmail }, created.body.emailQuoteToken)).status, 403);
    meta.customerEmail = savedEmail;
    rejectResponse = true;
    assert.equal((await post(path, { email: common.customerEmail }, created.body.emailQuoteToken)).status, 503);
    rejectResponse = false;
    const diagnostic = new EmailService().diagnostic({ name: 'ProviderError', status: 401,
      message: 'isolated-test-key Bearer secret-header ' + created.body.emailQuoteToken + ' kim@example.com', details: 'Domain not verified' }, [created.body.emailQuoteToken]);
    const log = JSON.stringify(diagnostic);
    for (const secret of ['isolated-test-key', 'secret-header', created.body.emailQuoteToken, 'kim@example.com']) assert(!log.includes(secret));
    assert.equal(diagnostic.status, 401);
    assert.equal(diagnostic.providerMessage, 'Domain not verified');
    faultCases = false;
    for (const [email, token, status] of [
      ['not-email', created.body.emailQuoteToken, 400],
      ['other@example.com', created.body.emailQuoteToken, 403],
      [common.customerEmail, undefined, 403],
      [common.customerEmail, '0'.repeat(64), 403],
    ] as const) assert.equal((await post(path, { email }, token)).status, status);
    assert.equal(sent.length, 0);
    const results = await Promise.all([post(path, { email: common.customerEmail }, created.body.emailQuoteToken), post(path, { email: common.customerEmail }, created.body.emailQuoteToken)]);
    assert(results.every(result => result.status === 200));
    assert.equal(sent.length, 1);
    const expiresAt = meta.emailQuoteExpiresAt;
    meta.emailQuoteExpiresAt = Date.now() - 1;
    assert.equal((await post(path, { email: common.customerEmail }, created.body.emailQuoteToken)).status, 403);
    meta.emailQuoteExpiresAt = expiresAt;
    const otherSource = await post('/api/landing-orders', { ...common, source: 'cookieFlight', quantity: 2 });
    assert.equal(otherSource.status, 200);
    assert.equal((await post(`/api/orders/${otherSource.body.orderId}/email-quote`, { email: common.customerEmail }, created.body.emailQuoteToken)).status, 403);
    assert.equal(results[0].body.maskedEmail, 'ki***@example.com');
    const message = sent[0];
    assert.equal(message.from, process.env.MAILGUN_FROM);
    assert.deepEqual(message.to, [common.customerEmail]);
    assert.match(message.subject, /^\[nothingmatters\].*브루키 견적서$/);
    assert.match(message.attachment.filename, /^nothingmatters-brookie-quote-\d{4}-\d{2}-\d{2}\.xlsx$/);
    assert(message.html.includes('132,200원') && message.html.includes('12개'));
    for (const detail of ['곰돌이', '생일곰', 'LOVE', '첫번째 줄', '둘째 &lt;img src=x&gt;', '프리미엄 캐릭터', '토퍼 추가', '스티커 제작', '카카오톡 상담을 완료하지 않으면']) assert(message.html.includes(detail), detail);
    assert(!message.html.includes('<script>') && !message.html.includes('<img src=x>'));
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(message.attachment.data);
    const values = workbook.worksheets[0].getSheetValues().flat().map(String).join('\n');
    for (const detail of ['LOVE', '첫번째 줄', '둘째 <img src=x>', '프리미엄 캐릭터', '토퍼 추가', '스티커 제작', '132200', '견적은 주문 접수용']) assert(values.includes(detail), detail);
    const excelPath = `/api/orders/${created.body.orderId}/quote-excel`;
    assert.equal((await fetch(base + excelPath)).status, 401);
    const adminExcel = await fetch(base + excelPath, { headers: { 'X-Test-Admin': 'true' } });
    assert.equal(adminExcel.status, 200);
    const adminWorkbook = new ExcelJS.Workbook();
    await adminWorkbook.xlsx.load(Buffer.from(await adminExcel.arrayBuffer()));
    const adminValues = adminWorkbook.worksheets[0].getSheetValues().flat().map(String).join('\n');
    assert(adminValues.includes('132200') && adminValues.includes('첫번째 줄') && adminValues.includes('토퍼 추가'));
    assert.equal((await post(path, { email: common.customerEmail }, created.body.emailQuoteToken)).status, 200);
    assert.equal(sent.length, 1);
    const noEmail = await post('/api/landing-orders', { ...common, customerEmail: '', combos });
    assert.equal(noEmail.status, 200);
    assert.equal(noEmail.body.emailQuoteToken, undefined);
    assert.equal((await post('/api/landing-orders', { ...common, customerEmail: 'bad', combos })).status, 400);
    const retry = await post('/api/landing-orders', { ...common, customerEmail: 'failure@example.com', combos });
    failEmail = true;
    const retryPath = `/api/orders/${retry.body.orderId}/email-quote`;
    assert.equal((await post(retryPath, { email: 'failure@example.com' }, retry.body.emailQuoteToken)).status, 503);
    const saveCount = saved.length;
    failEmail = false;
    assert.equal((await post(retryPath, { email: 'failure@example.com' }, retry.body.emailQuoteToken)).status, 200);
    assert.equal(saved.length, saveCount);
    saved.at(-1).totalPrice++;
    assert.throws(() => access.storedBrookieQuote(saved.at(-1)), /일치/);
    assert.equal((await post(retryPath, { email: 'failure@example.com' }, retry.body.emailQuoteToken)).status, 503);
    assert.equal((await post('/api/orders/unknown/email-quote', { email: common.customerEmail }, created.body.emailQuoteToken)).status, 403);
    while ((await post(path, { email: common.customerEmail }, created.body.emailQuoteToken)).status === 200) {}
    assert.equal((await post(path, { email: common.customerEmail }, created.body.emailQuoteToken)).status, 429);
    console.log('Brookie saved-item Excel/HTML/Mailgun adapter, details, phone contact, optional/invalid email, access token, expiry, duplicate sends, missing key/domain, production sandbox guard, sender validation, safe diagnostics, rejection/non-accepted response, failure/retry and rate limit: PASS');
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}
