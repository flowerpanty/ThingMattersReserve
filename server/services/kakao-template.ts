import { type OrderData } from "@shared/schema";

export class KakaoTemplateService {

  generateOrderConfirmMessage(orderData: OrderData, totalPrice: number): string {
    const { customerName, deliveryDate } = orderData;

    // 주문 항목들을 정리
    const orderItems: string[] = [];

    // 일반 쿠키
    const regularCookies = Object.entries(orderData.regularCookies || {})
      .filter(([_, qty]) => qty > 0)
      .map(([type, qty]) => `${type} ${qty}개`);

    if (regularCookies.length > 0) {
      orderItems.push(`🍪 일반쿠키: ${regularCookies.join(', ')}`);
    }

    // 2구 패키지
    if (orderData.twoPackSets?.length > 0) {
      const totalTwoPackQuantity = orderData.twoPackSets.reduce((sum, set) => sum + (set.quantity || 1), 0);
      orderItems.push(`📦 2구 패키지: ${totalTwoPackQuantity}세트`);

      orderData.twoPackSets.forEach((set, index) => {
        if (set.selectedCookies?.length > 0) {
          orderItems.push(`  └ 세트${index + 1} (${set.quantity || 1}개): ${set.selectedCookies.join(', ')}`);
        }
      });
    }

    // 1구 + 음료
    if (orderData.singleWithDrinkSets?.length > 0) {
      const totalSingleDrinkQuantity = orderData.singleWithDrinkSets.reduce((sum, set) => sum + (set.quantity || 1), 0);
      orderItems.push(`🍪☕ 1구+음료: ${totalSingleDrinkQuantity}세트`);

      orderData.singleWithDrinkSets.forEach((set, index) => {
        if (set.selectedCookie || set.selectedDrink) {
          let setDetail = `  └ 세트${index + 1} (${set.quantity || 1}개):`;
          if (set.selectedCookie) setDetail += ` ${set.selectedCookie}`;
          if (set.selectedDrink) setDetail += ` + ${set.selectedDrink}`;
          orderItems.push(setDetail);
        }
      });
    }

    // 브라우니 쿠키
    if (orderData.brownieCookieSets?.length > 0) {
      const totalBrownieQuantity = orderData.brownieCookieSets.reduce((sum, set) => sum + (set.quantity || 1), 0);
      orderItems.push(`🧁 브라우니쿠키: 총 ${totalBrownieQuantity}개`);

      orderData.brownieCookieSets.forEach((set, index) => {
        let brownieText = `  └ 세트${index + 1} (${set.quantity || 1}개):`;
        if (set.shape) {
          const shapeText = set.shape === 'bear' ? '곰' :
            set.shape === 'rabbit' ? '토끼' : '생일곰';
          brownieText += ` ${shapeText} 모양`;
        }
        orderItems.push(brownieText);
      });
    }

    // 행운쿠키
    if (orderData.fortuneCookie > 0) {
      orderItems.push(`🥠 행운쿠키: ${orderData.fortuneCookie}박스`);
    }

    // 비행기샌드쿠키
    if (orderData.airplaneSandwich > 0) {
      orderItems.push(`✈️ 비행기샌드쿠키: ${orderData.airplaneSandwich}박스`);
    }

    // 포장 옵션
    let packagingText = '';
    if (orderData.packaging) {
      const packagingName = orderData.packaging === 'single_box' ? '1구박스' :
        orderData.packaging === 'plastic_wrap' ? '비닐탭포장' : '유산지';
      packagingText = `📦 포장: ${packagingName}`;
    }

    // 메시지 템플릿 생성
    const message = `안녕하세요! ${customerName}님 ✨

낫띵메터스 주문 확인드립니다 😊

📝 주문 내역:
${orderItems.join('\n')}

${packagingText ? packagingText + '\n' : ''}
💰 총 금액: ${totalPrice.toLocaleString('ko-KR')}원

📅 수령 희망일: ${deliveryDate}

🏦 입금 계좌
국민은행 830501042047336 (낫띵메터스)

📌 안내사항:
• 입금 확인 후 제작 시작됩니다
• 수령일 하루 전까지 입금 부탁드려요
• 문의사항은 언제든 연락주세요!

감사합니다 🙏`;

    return message;
  }

  generatePaymentConfirmMessage(customerName: string, deliveryDate: string): string {
    return `안녕하세요! ${customerName}님 😊

입금 확인되었습니다! ✅

지금부터 정성스럽게 제작 시작하겠습니다 👩‍🍳

📅 수령일: ${deliveryDate}
⏰ 수령 시간: 오후 2시~6시

수령일에 완성품 사진과 함께 픽업 안내 메시지 보내드릴게요!

오늘도 좋은 하루 되세요 🌸`;
  }

  generateReadyForPickupMessage(customerName: string): string {
    return `안녕하세요! ${customerName}님 ✨

주문하신 쿠키가 완성되었습니다! 🎉

📍 픽업 장소: [픽업 주소]
⏰ 픽업 시간: 오후 2시~6시
📞 도착 시 연락: 010-2866-7976

픽업 오시기 전에 미리 연락 주시면 더욱 원활하게 받아가실 수 있어요!

오늘도 감사합니다 🙏`;
  }
}