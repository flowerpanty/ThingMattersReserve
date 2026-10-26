import type { Order, OrderItem } from './schema';

export const MAX_ORDER_AMOUNT = 2_147_483_647;
const feeKind = 'quick_delivery_fee';

export class QuickDeliveryFeeError extends Error {}

export function isQuickDeliveryFeeItem(item: { type?: string; options?: any } | null | undefined): boolean {
  return item?.type === 'addon' && item.options?.kind === feeKind;
}

export function getQuickDeliveryFee(order: Pick<Order, 'orderItems'> | null | undefined): number {
  const items = Array.isArray(order?.orderItems) ? order.orderItems as OrderItem[] : [];
  return items.filter(isQuickDeliveryFeeItem).reduce((sum, item) => sum + item.quantity * item.price, 0);
}

export function withQuickDeliveryFee(order: Pick<Order, 'orderItems' | 'totalPrice' | 'deliveryMethod'>, fee: number) {
  if (!Number.isSafeInteger(fee) || fee < 0 || fee > MAX_ORDER_AMOUNT) {
    throw new QuickDeliveryFeeError('퀵비는 0원 이상의 정수로 입력해주세요.');
  }
  if (order.deliveryMethod !== 'quick') {
    throw new QuickDeliveryFeeError('퀵 배송 주문에만 퀵비를 적용할 수 있습니다.');
  }

  const previousFee = getQuickDeliveryFee(order);
  const totalPrice = order.totalPrice - previousFee + fee;
  if (!Number.isSafeInteger(previousFee) || previousFee < 0 || !Number.isSafeInteger(totalPrice) || totalPrice < 0 || totalPrice > MAX_ORDER_AMOUNT) {
    throw new QuickDeliveryFeeError('총 결제 금액이 저장 가능한 범위를 벗어났습니다.');
  }

  const orderItems = (Array.isArray(order.orderItems) ? order.orderItems as OrderItem[] : []).filter(item => !isQuickDeliveryFeeItem(item));
  if (fee > 0) {
    const metaIndex = orderItems.findIndex(item => item.type === 'meta');
    const source = orderItems.find(item => item.type === 'meta')?.options?.landingSource;
    orderItems.splice(metaIndex < 0 ? orderItems.length : metaIndex, 0, {
      type: 'addon', name: '퀵비', quantity: 1, price: fee,
      options: { kind: feeKind, unitLabel: '건', ...(source ? { landingSource: source } : {}) },
    });
  }
  return { orderItems, totalPrice };
}
