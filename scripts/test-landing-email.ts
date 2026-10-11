import assert from 'node:assert/strict';
import express from 'express';
import ExcelJS from 'exceljs';
process.env.DATABASE_URL = 'postgres://test:test@127.0.0.1:1/test';
process.env.NODE_ENV = 'production';
process.env.MAILGUN_API_KEY = 'isolated-test-key';
process.env.MAILGUN_DOMAIN = 'quotes.example.com';
process.env.MAILGUN_FROM = 'nothingmatters <quotes@quotes.example.com>';
delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const [{registerRoutes}, {storage}, {EmailService}, {pushNotificationService}, {googleSheetsService}, {kakaoAlimtalkService}] = await Promise.all([
  import('../server/routes'), import('../server/storage'), import('../server/services/email-service'),
  import('../server/services/push-notification-service'), import('../server/services/google-sheets-service'), import('../server/services/kakao-alimtalk-service'),
]);
const orders: any[] = [], messages: any[] = [];
(storage as any).createOrder = async (order: any) => { const saved = {...order, id: `email-${orders.length}`}; orders.push(saved); return saved; };
(storage as any).getOrder = async (id: string) => orders.find(o => o.id === id);
EmailService.prototype.sendLandingAdminNotification = async () => {};
(pushNotificationService as any).sendNewOrderNotification = async () => {};
(googleSheetsService as any).isEnabled = () => false;
(kakaoAlimtalkService as any).isEnabled = () => false;
let failure = false, nonAccepted = false, calls = 0;
const realSend = EmailService.prototype.sendLandingQuote;
EmailService.prototype.sendLandingQuote = async function(order, email, buffer) {
  (this as any).mg = {messages: {create: async (_domain: string, message: any) => {
    calls++;
    if (failure) throw Object.assign(new Error('Mock provider rejected'), {status: 403});
    if (nonAccepted) return {status: 200, message: 'Not queued'};
    messages.push(message);
    return {status: 200, id: '<local-message>', message: 'Queued. Thank you.'};
  }}};
  return realSend.call(this, order, email, buffer);
};
const app = express(); app.use(express.json());
app.use((req, _res, next) => { Object.defineProperty(req, 'ip', {value: req.get('X-Test-IP') || 'test'}); next(); });
const server = await registerRoutes(app);
await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
const address = server.address(); assert(address && typeof address !== 'string');
const base = `http://127.0.0.1:${address.port}`;
const common = {customerName: '검증 <script>alert(1)</script>', customerPhone:'010-1234-5678', deliveryDate:'2026-10-28', deliveryMethod:'pickup', pickupTime:'12:00~13:00'};
const fixtures = [
  {source:'brookie', combos:[{character:'bear', paper:'navy',qty:12}]},
  {source:'cookie7', items:[{packageId:'two-box', flavorQty:{'double-choco':2}, ribbon:true},{packageId:'one-box',flavorQty:{'walnut-choco':1}}], sticker:true},
  {source:'lucky', quantity:2}, {source:'cookieFlight',quantity:2}, {source:'airplaneButter',quantity:3}, {source:'terminalCookie',quantity:1},
  {source:'cookieCrew',crewQuantities:{captain:3,blue:3,orange:3,green:3}},
];
async function post(path: string, body: any, ip: string, token?: string) {
  const response = await fetch(base + path, {method:'POST', headers:{'Content-Type':'application/json','X-Test-IP':ip,...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
  return {status:response.status, data:await response.json()};
}
try {
  for (const fixture of fixtures) {
    const source = fixture.source;
    const empty = await post('/api/landing-orders',{...common,...fixture,customerEmail:''},source);
    assert.equal(empty.status,200); assert.equal(empty.data.emailQuoteToken,undefined);
    assert.equal((await post('/api/landing-orders',{...common,...fixture,customerEmail:'invalid'},source)).status,400);
    const saved = await post('/api/landing-orders',{...common,...fixture,customerEmail:'customer@example.com',price:1,totalPrice:1},source);
    assert.equal(saved.status,200); assert.match(saved.data.emailQuoteToken,/^[a-f0-9]{64}$/);
    const order = orders.at(-1), meta = order.orderItems.find((i:any)=>i.type==='meta').options;
    assert(meta.emailQuoteTokenHash !== saved.data.emailQuoteToken); assert(!JSON.stringify(order).includes(saved.data.emailQuoteToken));
    const url = `/api/orders/${saved.data.orderId}/email-quote`, token = saved.data.emailQuoteToken;
    assert.equal((await post(url,{email:'other@example.com'},source,token)).status,403);
    assert.equal((await post(url,{email:'customer@example.com'},source,'a'.repeat(64))).status,403);
    const expiry = meta.emailQuoteExpiresAt; meta.emailQuoteExpiresAt=Date.now()-1;
    assert.equal((await post(url,{email:'customer@example.com'},source,token)).status,403); meta.emailQuoteExpiresAt=expiry;
    const originalPrice = order.orderItems[0].price; order.orderItems[0].price++;
    assert.equal((await post(url,{email:'customer@example.com'},source,token)).status,503);order.orderItems[0].price=originalPrice;
    const originalSource = order.orderItems[0].options.landingSource;order.orderItems[0].options.landingSource='unknown';
    assert.equal((await post(url,{email:'customer@example.com'},source,token)).status,503);order.orderItems[0].options.landingSource=originalSource;
    failure=true; const count=orders.length;
    assert.equal((await post(url,{email:'customer@example.com'},source,token)).status,503);
    failure=false;nonAccepted=true;
    assert.equal((await post(url,{email:'customer@example.com'},source,token)).status,503);nonAccepted=false;
    const before=calls;
    const concurrent=await Promise.all([post(url,{email:'customer@example.com'},source,token),post(url,{email:'customer@example.com'},source,token)]);
    assert(concurrent.every(r=>r.status===200 && r.data.success));assert.equal(calls,before+1);assert.equal(orders.length,count);
    assert.equal((await post(url,{email:'customer@example.com'},source,token)).status,200);assert.equal(calls,before+1);
    const message = messages.at(-1);assert.deepEqual(message.to,['customer@example.com']);
    assert(!message.html.includes('<script>'));assert(message.html.includes('&lt;script&gt;'));
    assert(message.html.includes('카카오톡 상담을 완료하지 않으면 주문이 최종 완료되지 않습니다.'));
    assert(message.html.includes('https://pf.kakao.com/_QdCaK/chat'));
    const book=new ExcelJS.Workbook();await book.xlsx.load(message.attachment.data);
    const values=JSON.stringify(book.worksheets[0].getSheetValues());
    if (source==='cookieCrew') {
      assert.equal(saved.data.totalPrice,0);assert.equal(saved.data.pricingPending,true);
      assert(message.html.includes('nothingmatters 주문 상담 요청서'));assert(message.html.includes('상담 후 안내'));assert(!message.html.includes('0원'));
      assert(values.includes('상담 후 안내'));assert(!values.includes('총 합계'));assert(!values.includes('0원'));
      for(const name of ['쿠키기장','쿠키블루','쿠키오렌지','쿠키그린']) assert(message.html.includes(name));
    } else {
      assert.equal(saved.data.pricingPending,false);assert(message.html.includes(saved.data.totalPrice.toLocaleString('ko-KR')+'원'));
      const items=order.orderItems.filter((i:any)=>i.type!=='meta');
      assert.equal(items.reduce((sum:number,i:any)=>sum+i.price*i.quantity,0),saved.data.totalPrice);
      assert.equal(book.worksheets[0].getCell(7+items.length,4).value,saved.data.totalPrice);
    }
    if(source==='cookieFlight')assert.equal(saved.data.totalPrice,32000);
    if(source==='airplaneButter')assert.equal(saved.data.totalPrice,7500);
    if(source==='terminalCookie')assert.equal(saved.data.totalPrice,24000);
    if(source==='cookie7'){assert.equal(saved.data.totalPrice,36100);assert(message.html.includes('더블초코 2개'));assert(message.html.includes('호두초코 1개'));}
    console.log(`${source}: optional/invalid email, stored price, recipient/token/expiry, corrupt-item rejection, provider failure/nonaccepted, same-order retry, concurrent dedup, XLSX/escaped HTML PASS`);
  }
  assert.equal(messages.length,7);
} finally {await new Promise<void>(r=>server.close(()=>r()));}
