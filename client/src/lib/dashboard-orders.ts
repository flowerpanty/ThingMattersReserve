import { isQuickDeliveryFeeItem } from '@shared/quick-delivery-fee';

export type DashboardOrderStatus = 'pending' | 'order_confirmed' | 'payment_confirmed' | 'in_production' | 'completed';
type OrderState = { orderStatus?: string | null; paymentConfirmed?: number | null };
type ReceiptOrder = { id: string; createdAt?: string | Date | null };
type ListItem = { type: string; name: string; quantity: number; price: number; options?: Record<string, any> };
type ListOrder = ReceiptOrder & OrderState & {
  customerName: string; customerContact: string; deliveryDate: string; orderItems: ListItem[];
};

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
});
const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const headingFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short',
});

function receiptTimestamp(order: ReceiptOrder): number | null {
  if (!order.createdAt) return null;
  const timestamp = new Date(order.createdAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function getReceiptDateKey(order: ReceiptOrder) {
  const timestamp = receiptTimestamp(order);
  return timestamp === null ? '' : dateFormatter.format(timestamp);
}

export function formatReceiptTime(order: ReceiptOrder) {
  const timestamp = receiptTimestamp(order);
  return timestamp === null ? '시간 미확인' : timeFormatter.format(timestamp);
}

export function formatReceiptDateHeading(dateKey: string) {
  if (!dateKey) return '접수일 미확인';
  const parts = headingFormatter.formatToParts(new Date(`${dateKey}T12:00:00+09:00`));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(value => value.type === type)?.value;
  return `${part('year')}년 ${part('month')}월 ${part('day')}일(${part('weekday')})`;
}

export function sortReceiptOrders<T extends ReceiptOrder>(orders: T[]): T[] {
  return [...orders].sort((a, b) => {
    const left = receiptTimestamp(a), right = receiptTimestamp(b);
    if (left === null && right !== null) return 1;
    if (right === null && left !== null) return -1;
    return (right ?? 0) - (left ?? 0) || a.id.localeCompare(b.id);
  });
}

export function groupReceiptOrders<T extends ReceiptOrder>(orders: T[]) {
  const groups = new Map<string, T[]>();
  for (const order of sortReceiptOrders(orders)) {
    const key = getReceiptDateKey(order);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(order);
  }
  return Array.from(groups, ([dateKey, groupOrders]) => ({ dateKey, orders: groupOrders }));
}

export function getNormalizedOrderStatus(order: OrderState): DashboardOrderStatus {
  const status = order.orderStatus || 'pending';
  if (order.paymentConfirmed && (status === 'pending' || status === 'order_confirmed')) return 'payment_confirmed';
  return ['order_confirmed', 'payment_confirmed', 'in_production', 'completed'].includes(status)
    ? status as DashboardOrderStatus : 'pending';
}

export function getOrderFilterStatus(order: OrderState) {
  const status = getNormalizedOrderStatus(order);
  return status === 'order_confirmed' ? 'pending' : status;
}

export function getDashboardStatusCounts(orders: OrderState[]) {
  const counts: Record<string, number> = { all: orders.length, active: 0, pending: 0, payment_confirmed: 0, in_production: 0, completed: 0 };
  for (const order of orders) {
    const status = getOrderFilterStatus(order);
    counts[status]++;
    if (status !== 'completed') counts.active++;
  }
  return counts;
}

export function getLandingSourceKey(order: { orderItems: ListItem[] }) {
  const metadata = order.orderItems.find(item => item.type === 'meta')?.options;
  return String(metadata?.landingSource || metadata?.source || '');
}

export interface DashboardOrderFilters {
  search: string; status: string; product: string; receiptDate: string;
  delivery: string; today: string; tomorrow: string; weekEnd: string;
}

export function selectDashboardOrders<T extends ListOrder>(orders: T[], filters: DashboardOrderFilters, sourceLabel: (order: T) => string) {
  const query = filters.search.trim().toLocaleLowerCase();
  return sortReceiptOrders(orders.filter(order => {
    const status = getOrderFilterStatus(order);
    if (filters.status === 'active' ? status === 'completed' : filters.status !== 'all' && status !== filters.status) return false;
    if (filters.product !== 'all' && getLandingSourceKey(order) !== filters.product) return false;
    if (filters.receiptDate && getReceiptDateKey(order) !== filters.receiptDate) return false;
    if (filters.delivery === 'today' && order.deliveryDate !== filters.today) return false;
    if (filters.delivery === 'tomorrow' && order.deliveryDate !== filters.tomorrow) return false;
    if (filters.delivery === 'week' && (order.deliveryDate < filters.today || order.deliveryDate > filters.weekEnd)) return false;
    return !query || [order.customerName, order.customerContact, order.id, sourceLabel(order), ...order.orderItems.map(item => item.name)]
      .some(value => value.toLocaleLowerCase().includes(query));
  }));
}

export function getDashboardItemLines(order: { orderItems: ListItem[] }) {
  const source = getLandingSourceKey(order);
  return order.orderItems.filter(item => item.type !== 'meta').map(item => {
    const itemSource = item.options?.landingSource || source;
    const fee = isQuickDeliveryFeeItem(item);
    const addonProduct = ['christmasBrookie', 'anniversary', 'cookieFlight', 'airplaneButter', 'cookieCrew', 'terminalCookie'].includes(itemSource);
    const extra = item.type === 'packaging' || (item.type === 'addon' && !addonProduct);
    const explicitUnit = item.options?.unitLabel;
    let unit: string;
    if (typeof explicitUnit === 'string') unit = explicitUnit.toUpperCase() === 'BOX' ? '박스' : explicitUnit;
    else if (itemSource === 'lucky' || ['twopack', 'singledrink'].includes(item.type)) unit = '세트';
    else if (['fortune', 'airplane'].includes(item.type)) unit = '박스';
    else unit = item.type === 'addon' && extra ? '건' : '개';
    return {
      kind: fee ? 'fee' : extra ? 'extra' : 'product',
      name: item.name, quantity: `${item.quantity.toLocaleString('ko-KR')}${unit}`,
      amount: `${(item.quantity * item.price).toLocaleString('ko-KR')}원`,
      prefix: item.type === 'packaging' ? '포장' : extra ? '추가' : '',
    };
  });
}
