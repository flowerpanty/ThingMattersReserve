import { createHash, createHmac } from 'node:crypto';
import { z } from 'zod';
import { CHRISTMAS_SOURCE, CHRISTMAS_CATALOG_VERSION, christmasProducts, christmasPickupTimes, christmasOrderAvailability } from '@shared/christmas-brookie';
import { MAX_ORDER_AMOUNT } from '@shared/quick-delivery-fee';

export class ChristmasOrderError extends Error {
  constructor(message: string, public status = 400, public code = 'INVALID_CHRISTMAS_ORDER') { super(message); }
}
const requestSchema = z.object({
  source: z.literal(CHRISTMAS_SOURCE), catalogVersion: z.literal(CHRISTMAS_CATALOG_VERSION),
  customerName: z.string().trim().min(1, '이름을 입력해주세요.').max(80),
  customerPhone: z.string().trim().regex(/^010[-\s]?\d{4}[-\s]?\d{4}$/, '올바른 핸드폰 번호를 입력해주세요.'),
  customerEmail: z.union([z.literal(''), z.string().trim().max(254).email('올바른 이메일 주소를 입력해주세요.')]).optional().default(''),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pickupTime: z.enum(christmasPickupTimes), deliveryMethod: z.enum(['pickup', 'quick']),
  deliveryAddress: z.string().trim().max(500).optional().default(''),
  request: z.string().trim().max(1000).optional().default(''),
  privacyConsent: z.literal(true), idempotencyKey: z.string().uuid(),
  items: z.array(z.object({ sku: z.string(), quantity: z.number().int().positive() })).min(1).max(4),
});
export function validateChristmasRequest(input: unknown, now = new Date()) {
  const availability = christmasOrderAvailability(now);
  if (!availability.enabled) throw new ChristmasOrderError(availability.message, 403, 'CHRISTMAS_NOT_OPEN');
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) throw new ChristmasOrderError('주문 정보와 상품 수량, 수령 시간을 확인해주세요.');
  const body = parsed.data;
  const date = new Date(`${body.deliveryDate}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== body.deliveryDate ||
      body.deliveryDate < availability.minimumDeliveryDate || availability.unavailableDates.includes(body.deliveryDate)) {
    throw new ChristmasOrderError(`${availability.minimumDeliveryDate} 이후 주문 가능한 수령 날짜를 선택해주세요.`);
  }
  if (body.deliveryMethod === 'quick' && !body.deliveryAddress) throw new ChristmasOrderError('퀵 배송 주소를 입력해주세요.');
  if (body.deliveryMethod === 'pickup') body.deliveryAddress = '';
  body.items.sort((a, b) => a.sku.localeCompare(b.sku));
  return body;
}
export function buildChristmasLandingItems(body: { items: Array<{ sku: string; quantity: number }> }) {
  const seen = new Set<string>();
  const orderItems = body.items.map(item => {
    const product = christmasProducts.find(product => product.sku === item.sku);
    if (!product || seen.has(item.sku) || !Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new ChristmasOrderError('상품 구성을 확인해주세요.');
    seen.add(item.sku);
    return { type: 'addon' as const, name: product.name, quantity: item.quantity, price: product.price,
      options: { landingSource: CHRISTMAS_SOURCE, sku: product.sku, composition: product.composition, unitLabel: '개' } };
  });
  const totalPrice = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (!Number.isSafeInteger(totalPrice) || totalPrice < 1 || totalPrice > MAX_ORDER_AMOUNT) throw new ChristmasOrderError('주문 금액 또는 수량을 확인해주세요.');
  return { orderItems, totalPrice };
}
export function christmasRequestIdentity(body: ReturnType<typeof validateChristmasRequest>) {
  const { idempotencyKey, ...payload } = body;
  return {
    id: `xmas-${createHash('sha256').update(`${CHRISTMAS_SOURCE}:${idempotencyKey}`).digest('hex')}`,
    fingerprint: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
  };
}
export function christmasEmailToken(key: string) {
  const secret = process.env.SESSION_SECRET || process.env.DATABASE_URL;
  if (!secret) throw new Error('Order email capability configuration unavailable.');
  return createHmac('sha256', secret).update(`${CHRISTMAS_SOURCE}:email-quote:v1:${key}`).digest('hex');
}
