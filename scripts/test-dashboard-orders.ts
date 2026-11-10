import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import express from 'express';
import {
  formatReceiptDateHeading, formatReceiptTime, getReceiptDateKey, groupReceiptOrders, getDashboardItemLines,
  getDashboardStatusCounts, selectDashboardOrders, type DashboardOrderFilters,
} from '../client/src/lib/dashboard-orders';

// Synthetic customer data and recoverable, in-memory orders only.
const item = (type: string, name: string, quantity: number, price: number, options = {}) => ({ type, name, quantity, price, options });
const meta = (source: string, options = {}) => item('meta', '주문 정보', 0, 0, { landingSource: source, ...options });
function order(id: string, name: string, createdAt: string | null, source: string, items: ReturnType<typeof item>[], patch = {}) {
  return { id, customerName: name, customerContact: '010-0000-0000', createdAt, deliveryDate: '2026-11-12', pickupTime: '14:00',
    deliveryMethod: 'pickup', paymentConfirmed: 0, paymentMethod: null, orderStatus: 'pending',
    orderItems: [...items, meta(source)], totalPrice: items.reduce((total, i) => total + i.price * i.quantity, 0), ...patch };
}
const fixtures = [
  order('fixture-christmas', '테스트 김하늘', '2026-11-10T08:30:00Z', 'christmasBrookie', [
    item('addon', '트리 브루키', 4, 9500, { landingSource: 'christmasBrookie', unitLabel: '개' }),
    item('addon', '브루키 2종 세트', 2, 17000, { landingSource: 'christmasBrookie', unitLabel: '세트' }),
    item('addon', '퀵비', 1, 12000, { kind: 'quick_delivery_fee', landingSource: 'christmasBrookie', unitLabel: '건' }),
  ], { deliveryDate: '2026-12-01', deliveryMethod: 'quick' }),
  order('fixture-completed', '테스트 완료주문', '2026-11-10T07:00:00Z', 'lucky', [item('fortune', '행운쿠키 4가지맛 세트', 3, 15000, { landingSource: 'lucky' })], { orderStatus: 'completed', paymentConfirmed: 1, paymentMethod: 'transfer', deliveryDate: '2026-11-10' }),
  order('fixture-production', '테스트 제작주문', '2026-11-10T05:00:00Z', 'cookie7', [
    item('regular', '호두초코', 12, 4500), item('regular', '더블초코', 8, 4500),
    item('packaging', '단품 상자', 20, 600), item('addon', '리본 추가', 20, 300, { landingSource: 'cookie7', unitLabel: '개' }),
  ], { orderStatus: 'in_production', paymentConfirmed: 1, deliveryDate: '2026-11-10', pickupTime: '16:00~17:00' }),
  order('fixture-midnight', '테스트 자정접수', '2026-11-09T15:00:00Z', 'cookieCrew', [item('addon', '쿠키기장', 12, 0, { landingSource: 'cookieCrew', pricingPending: true })], { orderItems: [item('addon', '쿠키기장', 12, 0), meta('cookieCrew', { pricingPending: true })] }),
  order('fixture-before-midnight', '테스트 이름이 긴 고객의 모든 품목과 수량 표시', '2026-11-09T14:59:59Z', 'brookie', [
    item('brownie', '곰돌이 브루키', 12, 7800), item('brownie', '토끼 브루키', 15, 7800),
    item('addon', '주문제작 스티커', 1, 20000, { landingSource: 'brookie' }),
  ], { orderStatus: 'order_confirmed', customerContact: 'long-customer-contact@example.com' }),
  order('fixture-flight', '테스트 박스주문', '2026-11-09T07:00:00Z', 'cookieFlight', [item('addon', 'COOKIE FLIGHT', 2, 16000, { landingSource: 'cookieFlight', unitLabel: 'BOX' })], { orderStatus: 'payment_confirmed', paymentConfirmed: 1, deliveryDate: '2026-11-11' }),
  order('fixture-delete-a', '테스트 삭제대상 A', '2026-11-08T07:00:00Z', 'anniversary', [item('addon', '축하쿠키 A형', 1, 20000, { landingSource: 'anniversary', unitLabel: '세트' })]),
  order('fixture-delete-b', '테스트 삭제대상 B', '2026-11-08T06:00:00Z', 'airplaneButter', [item('addon', '비행기 버터쿠키', 30, 2500, { landingSource: 'airplaneButter', unitLabel: '개' })]),
  order('fixture-legacy', '테스트 접수일미확인', null, '', [item('fortune', '행운쿠키 박스', 2, 15000)]),
];
const defaults: DashboardOrderFilters = { search: '', status: 'all', product: 'all', receiptDate: '', delivery: 'all',
  today: '2026-11-10', tomorrow: '2026-11-11', weekEnd: '2026-11-14' };
const select = (patch = {}) => selectDashboardOrders(fixtures, { ...defaults, ...patch }, () => '');
assert.equal(getReceiptDateKey(fixtures[3]), '2026-11-10');
assert.equal(getReceiptDateKey(fixtures[4]), '2026-11-09');
assert.equal(formatReceiptTime(fixtures[3]), '00:00');
assert.equal(formatReceiptDateHeading('2026-11-10'), '2026년 11월 10일(화)');
assert.equal(getReceiptDateKey({ id: 'bad', createdAt: 'invalid' }), '');
assert.equal(getReceiptDateKey({ id: 'missing' }), '');
const groups = groupReceiptOrders([...fixtures].reverse());
assert.deepEqual(groups.map(g => [g.dateKey, g.orders.length]), [['2026-11-10', 4], ['2026-11-09', 2], ['2026-11-08', 2], ['', 1]]);
assert.equal(groups[0].orders[0].id, 'fixture-christmas');
assert.equal(select().length, 9);
assert.equal(select({ status: 'active' }).length, 8);
assert.equal(select({ status: 'completed' })[0].id, 'fixture-completed');
assert.equal(select({ receiptDate: '2026-11-10', delivery: 'today' }).length, 2);
assert.equal(select({ receiptDate: '2026-11-09', delivery: 'tomorrow' })[0].id, 'fixture-flight');
assert.equal(select({ search: '토끼' })[0].id, 'fixture-before-midnight');
assert.equal(select({ product: 'christmasBrookie' })[0].id, 'fixture-christmas');
assert.equal(getDashboardStatusCounts(fixtures).all, 9);
assert.equal(getDashboardStatusCounts(fixtures).active, 8);
const originalIds = select().map(o => o.id);
const changed = fixtures.map(o => o.id === 'fixture-production' ? { ...o, orderStatus: 'completed' } : o);
assert.deepEqual(selectDashboardOrders(changed, defaults, () => '').map(o => o.id), originalIds, 'completion never changes receipt position');
const lines = getDashboardItemLines(fixtures[0]);
assert.deepEqual(lines.map(l => [l.name, l.kind, l.quantity]), [['트리 브루키', 'product', '4개'], ['브루키 2종 세트', 'product', '2세트'], ['퀵비', 'fee', '1건']]);
assert.equal(lines[2].amount, '12,000원');
assert.equal(getDashboardItemLines(fixtures[5])[0].quantity, '2박스');
assert.equal(getDashboardItemLines(fixtures[8])[0].quantity, '2박스');
assert.equal(getDashboardItemLines(fixtures[1])[0].quantity, '3세트');
assert.equal(getDashboardItemLines(fixtures[2])[2].prefix, '포장');
assert.equal(getDashboardItemLines(fixtures[4])[2].kind, 'extra');
console.log('Dashboard orders: Seoul date boundary, newest-first groups, missing dates, complete-inclusive counts, combined filters, stable status updates and saved item units/fees PASS');

if (process.argv.includes('--serve-ui')) {
  process.env.DATABASE_URL = 'postgres://fixture:fixture@127.0.0.1:1/fixture';
  process.env.SESSION_SECRET = 'isolated-dashboard-fixture';
  const [{ registerRoutes }, { storage }] = await Promise.all([import('../server/routes'), import('../server/storage')]);
  const records = new Map<string, any>();
  const deleted = new Map<string, any>();
  const actions: any[] = [];
  const reset = () => { records.clear(); deleted.clear(); actions.length = 0; fixtures.forEach(o => records.set(o.id, structuredClone(o))); };
  reset();
  storage.getAllOrders = async () => [...records.values()];
  storage.getOrder = async id => records.get(id);
  storage.updateOrderStatus = async (id, status) => {
    const row = records.get(id); if (!row) return undefined;
    row.orderStatus = status; actions.push({ kind: 'status', id, status }); return row;
  };
  storage.updatePaymentStatus = async (id, confirmed) => {
    const row = records.get(id); if (!row) return undefined;
    row.paymentConfirmed = Number(confirmed);
    if (confirmed && ['pending', 'order_confirmed'].includes(row.orderStatus)) row.orderStatus = 'payment_confirmed';
    if (!confirmed && row.orderStatus === 'payment_confirmed') row.orderStatus = 'order_confirmed';
    actions.push({ kind: 'payment', id, confirmed }); return row;
  };
  storage.updatePaymentMethod = async (id, method) => {
    const row = records.get(id); if (!row) return undefined;
    row.paymentMethod = method; actions.push({ kind: 'payment-method', id, method }); return row;
  };
  storage.deleteOrder = async id => {
    if (!records.has(id)) return false;
    deleted.set(id, records.get(id)); records.delete(id); actions.push({ kind: 'delete', id }); return true;
  };
  storage.deleteOrders = async ids => {
    const removed: string[] = [];
    for (const id of ids) if (await storage.deleteOrder(id)) removed.push(id);
    return removed;
  };
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => { (req as any).session = { adminAuthenticated: true }; next(); });
  app.get('/api/admin/me', (_req, res) => res.json({ authenticated: true }));
  app.get('/__fixture/state', (_req, res) => res.json({ records: [...records.values()], deletedIds: [...deleted.keys()], actions }));
  app.post('/__fixture/reset', (_req, res) => { reset(); res.sendStatus(204); });
  let failNext = false;
  app.post('/__fixture/fail-next', (_req, res) => { failNext = true; res.sendStatus(204); });
  app.use('/api/orders', (req, res, next) => {
    if (req.method !== 'GET' && failNext) { failNext = false; res.status(500).json({ message: 'Fixture request failure' }); return; }
    next();
  });
  const server = await registerRoutes(app);
  app.use('/api', (_req, res) => res.status(404).json({ message: 'Unexpected fixture API' }));
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true, hmr: { server } }, appType: 'custom' });
  app.get('/dashboard', async (_req, res) => {
    let html = await readFile('client/index.html', 'utf8');
    html = html.replace('<head>', `<head><script>
      const RealDate = Date; const fixtureNow = '2026-11-10T19:00:00+09:00';
      window.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [fixtureNow])); } static now() { return new RealDate(fixtureNow).getTime(); } };
      // Test adapter: all deletions are recoverable via /__fixture/reset.
      // Avoid native confirm dialogs blocking browser automation; log each prompt visibly.
      window.confirm = message => { console.info('Recoverable fixture confirmation:', message); return true; };
    </script>`);
    res.type('html').send(await vite.transformIndexHtml('/dashboard', html));
  });
  app.use(vite.middlewares);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  await writeFile('/private/tmp/dashboard-orders-ui-url.txt', base);
  console.log(`Recoverable in-memory dashboard fixtures (no production database/messages): ${base}/dashboard`);
  await new Promise(() => {});
}
