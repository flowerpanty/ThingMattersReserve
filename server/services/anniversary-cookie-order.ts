import type { OrderItem } from '@shared/schema';

export const anniversarySetPrice = 20000;

export function buildAnniversaryLandingItems(body: Record<string, unknown>) {
  const designType = body.designType;
  if (designType !== 'A' && designType !== 'B') throw new Error('A형 또는 B형을 선택해주세요.');
  const text = (value: unknown) => typeof value === 'string' ? value.normalize('NFC').trim() : '';
  const speechBubbleName = designType === 'A' ? text(body.speechBubbleName) : '';
  const heartMessage = designType === 'B' ? text(body.heartMessage) : '';
  const bottomMessage = text(body.bottomMessage);
  if (designType === 'A' && (!speechBubbleName || speechBubbleName.length > 80)) {
    throw new Error('말풍선에 넣을 이름을 80글자 이내로 입력해주세요.');
  }
  if (designType === 'B') {
    const messages = heartMessage.split('/').map(value => value.trim());
    if (messages.length > 2 || messages.some(value => !/^(?:[가-힣]{1,2}|[A-Za-z]{1,4})$/.test(value))) {
      throw new Error('하트 안 문구는 한글 2글자 또는 영문 4글자 이내로 입력해주세요. 두 하트의 문구는 /로 구분할 수 있어요.');
    }
  }
  if (!bottomMessage || bottomMessage.length > 200) throw new Error('하단 문구를 200글자 이내로 입력해주세요.');
  const quantity = Number(body.quantity);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000) throw new Error('수량은 1세트 이상 선택해주세요.');
  const orderItems: OrderItem[] = [{
    type: 'addon', name: `축하쿠키 2구 세트 · ${designType}형`, quantity, price: anniversarySetPrice,
    options: {
      landingSource: 'anniversary', unitLabel: '세트', packageName: '브루키 2개 + 문구 커스텀 + 토퍼',
      designType, ...(designType === 'A' ? { speechBubbleName } : { heartMessage }), bottomMessage,
    },
  }];
  return { orderItems, totalPrice: quantity * anniversarySetPrice };
}
