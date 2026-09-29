import assert from 'node:assert/strict';
import express from 'express';
import ExcelJS from 'exceljs';

// This test never connects to a database or sends notifications.
process.env.DATABASE_URL = 'postgres://test:test@127.0.0.1:1/test';
delete process.env.MAILGUN_API_KEY;
delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
delete process.env.KAKAO_ALIMTALK_API_KEY;

const [{ registerRoutes }, { storage }, { EmailService }, { pushNotificationService }, { kakaoAlimtalkService }, { googleSheetsService }, { buildOrderDataFromOrder }] = await Promise.all([
  import('../server/routes'),
  import('../server/storage'),
  import('../server/services/email-service'),
  import('../server/services/push-notification-service'),
  import('../server/services/kakao-alimtalk-service'),
  import('../server/services/google-sheets-service'),
  import('../server/services/order-data-utils'),
]);

const saved: any[] = [];
(storage as any).createOrder = async (order: any) => {
  const record = { ...order, id: `test-${saved.length + 1}` };
  saved.push(record);
  return record;
};
(storage as any).getOrder = async (id: string) => saved.find((order) => order.id === id);
(EmailService.prototype as any).sendLandingAdminNotification = async () => {};
(pushNotificationService as any).sendNewOrderNotification = async () => {};
(kakaoAlimtalkService as any).isEnabled = () => false;
(googleSheetsService as any).isEnabled = () => false;

const app = express();
app.use(express.json());
app.use((req, _res, next) => { (req as any).session = { adminAuthenticated: true }; next(); });
const server = await registerRoutes(app);
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
assert(address && typeof address !== 'string');
const endpoint = `http://127.0.0.1:${address.port}/api/landing-orders`;
const common = {
  customerName: '테스트 주문자',
  customerPhone: '010-1234-5678',
  deliveryDate: '2026-10-01',
  deliveryMethod: 'pickup',
  pickupTime: '10:00~11:00',
};

async function post(body: Record<string, unknown>) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...common, ...body }),
  });
  return { status: response.status, result: await response.json() };
}

try {
  let response = await post({ source: 'cookieFlight', quantity: 2, price: 1, totalPrice: 1 });
  assert.equal(response.status, 200);
  assert.equal(response.result.totalPrice, 32000);
  assert.equal(saved[0].orderItems[0].type, 'addon');
  assert.equal(saved[0].orderItems[0].quantity, 2);
  assert.deepEqual(saved[0].orderItems[0].options.flavors, ['클래식버터', '더블초코', '제주말차', '오렌지']);

  response = await post({ source: 'airplaneButter', quantity: 3, price: 22000 });
  assert.equal(response.status, 200);
  assert.equal(response.result.totalPrice, 7500);
  assert.equal(saved[1].orderItems[0].price, 2500);
  assert.notEqual(saved[1].orderItems[0].type, 'airplane');
  assert.equal(buildOrderDataFromOrder(saved[1]).airplaneSandwich, 0);
  const flightQuote = (googleSheetsService as any).buildQuoteRows(saved[0]);
  assert.equal(flightQuote.totalAmount, 32000);
  assert.equal(flightQuote.rows[0].quantity, '2BOX');
  assert(flightQuote.detailLines.join(' ').includes('제주말차'));
  const butterQuote = (googleSheetsService as any).buildQuoteRows(saved[1]);
  assert.equal(butterQuote.totalAmount, 7500);
  assert.equal(butterQuote.rows[0].price, 2500);

  response = await post({ source: 'cookieCrew', crewQuantities: { captain: 2, blue: 1, orange: 3, green: 4 } });
  assert.equal(response.status, 200);
  assert.equal(response.result.pricingPending, true);
  assert.deepEqual(saved[2].orderItems.slice(0, 4).map((item: any) => [item.name, item.quantity]), [['쿠키기장', 2], ['쿠키블루', 1], ['쿠키오렌지', 3], ['쿠키그린', 4]]);
  assert.equal(saved[2].orderItems.at(-1).options.pricingPending, true);
  const email = (new EmailService() as any).generateLandingAdminEmailHTML({ order: saved[2], sourceLabel: '쿠키크루' });
  assert(email.includes('가격 상담 필요'));
  assert(!email.includes('0원'));
  assert(email.includes('쿠키기장') && email.includes('쿠키블루'));
  const crewSheetRow = (googleSheetsService as any).orderToRowData(saved[2]);
  assert.equal(crewSheetRow[23], '가격 상담 필요');
  assert(crewSheetRow[26].includes('쿠키기장 2개'));
  let appendedColumns = 0;
  (googleSheetsService as any).sheets = { spreadsheets: {
    get: async () => ({ data: { sheets: [{ properties: { sheetId: 0, title: '주문목록', gridProperties: { columnCount: 26 } } }] } }),
    batchUpdate: async (request: any) => { appendedColumns = request.requestBody.requests[0].appendDimension.length; },
  } };
  await (googleSheetsService as any).ensureLandingDetailColumn('주문목록');
  assert.equal(appendedColumns, 1);

  for (const [index, name, quantity, price, total] of [
    [0, '쿠키 플라이트', '2BOX', 16000, 32000],
    [1, '비행기 버터쿠키', '3개', 2500, 7500],
  ] as const) {
    const excelResponse = await fetch(`http://127.0.0.1:${address.port}/api/orders/${saved[index].id}/quote-excel`);
    assert.equal(excelResponse.status, 200);
    assert.match(excelResponse.headers.get('content-type') || '', /spreadsheetml/);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(await excelResponse.arrayBuffer()));
    const sheet = workbook.worksheets[0];
    assert.equal(sheet.getCell('A6').value, name);
    assert.equal(sheet.getCell('B6').value, quantity);
    assert.equal(sheet.getCell('C6').value, price);
    assert.equal(sheet.getCell('D6').value, total);
    assert.equal(sheet.getCell('D8').value, total);
    assert(!sheet.getColumn(1).values.includes('비행기샌드쿠키'));
  }
  const crewExcelResponse = await fetch(`http://127.0.0.1:${address.port}/api/orders/${saved[2].id}/quote-excel`);
  assert.equal(crewExcelResponse.status, 409);
  assert.match((await crewExcelResponse.json()).message, /가격 상담 후/);

  for (const existing of [
    { source: 'brookie', combos: [{ character: 'bear', paper: 'navy', qty: 12 }] },
    { source: 'cookie7', packageId: 'one-box', flavorQty: { 'double-choco': 1 } },
    { source: 'lucky', quantity: 1 },
  ]) {
    response = await post(existing);
    assert.equal(response.status, 200);
    assert(response.result.totalPrice > 0);
  }

  for (const invalid of [
    { source: 'cookieCrew', crewQuantities: { captain: 0, blue: 0, orange: 0, green: 0 } },
    { source: 'cookieCrew', crewQuantities: { magnet: 1 } },
    { source: 'cookieFlight', quantity: 0 },
    { source: 'airplaneButter', quantity: 1.5 },
    { source: 'unknown', quantity: 1 },
  ]) {
    response = await post(invalid);
    assert.equal(response.status, 400);
  }
  assert.equal(saved.length, 6);
  console.log('Landing order API, Excel/Sheets/email data, and existing products: 6 valid and 5 invalid cases passed.');
} finally {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
