import { orderOperatingSettings } from './product-catalog';

export const CHRISTMAS_SOURCE = 'christmasBrookie';
export const CHRISTMAS_CATALOG_VERSION = 'christmas-2026-v1';
export const CHRISTMAS_OPEN_AT = Date.parse('2026-12-01T00:00:00+09:00');
export const CHRISTMAS_OPEN_MESSAGE = '크리스마스 브루키 주문은 12월 1일부터 가능합니다.';
export const christmasPickupTimes = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'] as const;
export const christmasProducts = [
  { sku: 'christmas-bear-brookie', name: '곰돌이 브루키', price: 8500, composition: '곰돌이 브루키 1개' },
  { sku: 'christmas-tree-brookie', name: '트리 브루키', price: 9500, composition: '트리 브루키 1개' },
  { sku: 'christmas-brookie-set', name: '브루키 2종 세트', price: 17000, composition: '곰돌이 브루키 1개 + 트리 브루키 1개' },
  { sku: 'christmas-santa-bundle', name: '산타꾸러미 4종', price: 23000, composition: '루돌프초코 · 버터산타 · 말차리스 · 로투스노우맨 각 1개' },
] as const;

export function christmasOrderAvailability(now = new Date()) {
  // Convert to the Seoul calendar before adding the common lead time. Host TZ is irrelevant.
  const seoulDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  const minDate = new Date(`${seoulDate}T00:00:00Z`);
  minDate.setUTCDate(minDate.getUTCDate() + orderOperatingSettings.minimumLeadDays);
  const minimumDeliveryDate = [minDate.toISOString().slice(0, 10), '2026-12-01'].sort().at(-1)!;
  const enabled = now.getTime() >= CHRISTMAS_OPEN_AT;
  return {
    source: CHRISTMAS_SOURCE, enabled, catalogVersion: CHRISTMAS_CATALOG_VERSION,
    opensAt: '2026-12-01T00:00:00+09:00', minimumDeliveryDate,
    unavailableDates: orderOperatingSettings.unavailableDates,
    pickupTimes: christmasPickupTimes,
    message: enabled ? '견적서를 받은 후 카카오톡 상담에서 최종 주문을 확정해 주세요.' : CHRISTMAS_OPEN_MESSAGE,
  };
}
