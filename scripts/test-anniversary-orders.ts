import assert from 'node:assert/strict';
import express from 'express';
import ExcelJS from 'exceljs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QuoteImageTemplate } from '../client/src/components/quote-image-template';
import { buildAnniversaryLandingItems } from '../server/services/anniversary-cookie-order';
import { landingItemDetails } from '../server/services/landing-email-quote';

// Use loopback storage and notification adapters. No real orders or email.
process.env.DATABASE_URL = 'postgres://test:test@127.0.0.1:1/test';
delete process.env.MAILGUN_API_KEY;
delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const [{ registerRoutes }, { storage }, { EmailService }, { pushNotificationService }, { googleSheetsService }, { kakaoAlimtalkService }, { ExcelGenerator }] = await Promise.all([
  import('../server/routes'), import('../server/storage'), import('../server/services/email-service'),
  import('../server/services/push-notification-service'), import('../server/services/google-sheets-service'),
  import('../server/services/kakao-alimtalk-service'), import('../server/services/excel-generator'),
]);
const orders: any[] = [];
(storage as any).createOrder = async (data: any) => { const saved = { ...data, id: `anniversary-${orders.length}` }; orders.push(saved); return saved; };
(storage as any).getOrder = async (id: string) => orders.find(order => order.id === id);
EmailService.prototype.sendLandingAdminNotification = async () => {};
(pushNotificationService as any).sendNewOrderNotification = async () => {};
(googleSheetsService as any).isEnabled = () => false;
(kakaoAlimtalkService as any).isEnabled = () => false;
const app = express(); app.use(express.json());
app.use((req, _res, next) => { (req as any).session = { adminAuthenticated: true }; next(); });
const server = await registerRoutes(app);
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address(); assert(address && typeof address !== 'string');
async function post(options: any) {
  const response = await fetch(`http://127.0.0.1:${address.port}/api/landing-orders`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerName: '로컬 확인', customerPhone: '010-1234-5678', customerEmail: 'customer@example.com', deliveryDate: '2026-10-28', pickupTime: '12:00~13:00', deliveryMethod: 'pickup', source: 'anniversary', ...options }),
  });
  return { status: response.status, body: await response.json() };
}
try {
  const fixtures = [
    { designType: 'A', speechBubbleName: '태근 ♥ 유진', heartMessage: 'ignored', bottomMessage: 'SWEET WEDDING DAY', quantity: 2 },
    { designType: 'B', speechBubbleName: 'ignored', heartMessage: '소연 / 상우', bottomMessage: '행복하게 잘 살겠습니다\n신부 강소연 드림', quantity: 3 },
  ];
  for (const fixture of fixtures) {
    const response = await post({ ...fixture, price: 1, totalPrice: 1 });
    assert.equal(response.status, 200);
    assert.equal(response.body.totalPrice, fixture.quantity * 20000);
    assert.match(response.body.emailQuoteToken, /^[a-f0-9]{64}$/);
    const order = orders.at(-1), item = order.orderItems[0];
    assert.equal(item.options.designType, fixture.designType);
    assert.equal(item.options.bottomMessage, fixture.bottomMessage);
    assert.equal(item.options[fixture.designType === 'A' ? 'heartMessage' : 'speechBubbleName'], undefined);
    const details = landingItemDetails(item).join(' ');
    const required = fixture.designType === 'A' ? fixture.speechBubbleName : fixture.heartMessage;
    assert(details.includes(required) && details.includes(fixture.bottomMessage));
    const regenerated = renderToStaticMarkup(React.createElement(QuoteImageTemplate, { order: { ...order, createdAt: '2026-10-13' } }));
    assert(regenerated.includes(required) && regenerated.includes(fixture.bottomMessage));
    const mail = new EmailService();
    assert(mail.generateLandingCustomerEmailHTML(order).includes(required));
    assert((mail as any).generateLandingAdminEmailHTML({ order, sourceLabel: '축하쿠키' }).includes(fixture.bottomMessage));
    const download = await fetch(`http://127.0.0.1:${address.port}/api/orders/${order.id}/quote-excel`);
    assert.equal(download.status, 200);
    const adminWorkbook = new ExcelJS.Workbook(); await adminWorkbook.xlsx.load(Buffer.from(await download.arrayBuffer()));
    const adminCells = JSON.stringify(adminWorkbook.worksheets[0].getSheetValues());
    assert(adminCells.includes(required)); assert(adminCells.includes(String(fixture.quantity * 20000)));
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await new ExcelGenerator().generateQuoteFromStoredItems(order, 'anniversary'));
    const cells = JSON.stringify(workbook.worksheets[0].getSheetValues());
    assert(cells.includes(required)); assert(cells.includes(fixture.bottomMessage.replace(/\n/g, '\\n')));
    const sheet = (googleSheetsService as any).buildQuoteRows(order);
    assert.equal(sheet.totalAmount, fixture.quantity * 20000);
    assert(sheet.detailLines.join(' ').includes(required));
    assert((googleSheetsService as any).orderToRowData(order)[26].includes(required));
  }
  const valid = fixtures[1];
  const before = orders.length;
  for (const invalid of [
    { designType: '' }, { designType: 'C' }, { heartMessage: '' }, { heartMessage: '세글자' }, { heartMessage: 'ABCDE' },
    { heartMessage: 'A한' }, { heartMessage: '소연 / ' }, { heartMessage: '소연 / 상우 / 사랑' },
    { bottomMessage: '' }, { bottomMessage: 'a'.repeat(201) }, { quantity: 0 }, { quantity: 1.5 }, { quantity: 10001 },
    { designType: 'A', speechBubbleName: '' },
  ]) assert.equal((await post({ ...valid, ...invalid })).status, 400, JSON.stringify(invalid));
  assert.equal(orders.length, before, 'invalid input must never be stored');
  for (const heartMessage of ['소연', 'LOVE', '소연 / LOVE', '소연']) assert.equal(buildAnniversaryLandingItems({ ...valid, heartMessage }).orderItems[0].price, 20000);
  console.log('Anniversary A/B options, heart limits, quantity, server prices, saved fields, email/XLSX/admin/Sheets details PASS');
} finally { await new Promise<void>(resolve => server.close(() => resolve())); }
