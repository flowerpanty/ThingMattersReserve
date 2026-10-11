import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Order, OrderItem } from '@shared/schema';

export function createEmailQuoteAccess() {
  const token = randomBytes(32).toString('hex');
  return {
    token,
    emailQuoteTokenHash: createHash('sha256').update(token).digest('hex'),
    emailQuoteExpiresAt: Date.now() + 30 * 60 * 1000,
  };
}

export function hasEmailQuoteAccess(metadata: Record<string, any>, token: string, now = Date.now()): boolean {
  if (!/^[a-f0-9]{64}$/.test(token) || !/^[a-f0-9]{64}$/.test(metadata.emailQuoteTokenHash || '') ||
      !Number.isFinite(metadata.emailQuoteExpiresAt) || metadata.emailQuoteExpiresAt <= now) return false;
  return timingSafeEqual(Buffer.from(metadata.emailQuoteTokenHash, 'hex'), createHash('sha256').update(token).digest());
}

export function maskQuoteEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local.slice(0, Math.min(3, Math.max(1, local.length - 1)))}***@${domain}`;
}

export function brookieItemDetails(item: OrderItem): string[] {
  const options = item.options || {};
  const topperLabels: Record<string, string> = { square: '네모', circle: '동그라미', sign: '팻말', display: '전광판', custom: '주문제작' };
  return [
    options.characterName && `캐릭터: ${options.characterName}`,
    options.paperName && `포장 종이: ${options.paperName}`,
    item.type === 'brownie' && `하트: ${options.heartMessage || '기본 하트'}`,
    options.premiumCharacter && '프리미엄 캐릭터 +500원',
    (options.customPaper || options.paper === 'custom') && `커스텀 종이 1줄: ${options.customPaperLine1 || '없음'}`,
    (options.customPaper || options.paper === 'custom') && `커스텀 종이 2줄: ${options.customPaperLine2 || '없음'}`,
    options.topperKind && `토퍼 종류: ${topperLabels[options.topperKind] || options.topperKind}`,
  ].filter(Boolean).map(String);
}

export function storedBrookieQuote(order: Order) {
  const allItems = Array.isArray(order.orderItems) ? order.orderItems as OrderItem[] : [];
  const metadata = allItems.find((item) => item?.type === 'meta')?.options || {};
  const items = allItems.filter((item) => item?.type !== 'meta');
  if (metadata.landingSource !== 'brookie' || metadata.pricingPending || !items.length || items.some((item) =>
    item.options?.landingSource !== 'brookie' || !['brownie', 'addon'].includes(item.type) ||
    !Number.isSafeInteger(item.quantity) || item.quantity < 1 || !Number.isSafeInteger(item.price) || item.price < 1 ||
    typeof item.name !== 'string' || !item.name.trim())) throw new Error('저장된 브루키 견적을 확인할 수 없습니다.');
  const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const quantity = items.filter((item) => item.type === 'brownie').reduce((sum, item) => sum + item.quantity, 0);
  if (!Number.isSafeInteger(total) || total !== order.totalPrice || quantity < 12) {
    throw new Error('저장된 브루키 항목과 총 금액 또는 수량이 일치하지 않습니다.');
  }
  return { items, metadata, quantity, total };
}
