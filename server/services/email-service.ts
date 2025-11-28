// EmailService.ts (Resend 사용)
import { Resend } from 'resend';
import { type OrderData, cookiePrices } from '@shared/schema';

export class EmailService {
  private resend: Resend | null = null;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;

    if (apiKey) {
      this.resend = new Resend(apiKey);
      console.log('📧 이메일 서비스 초기화 (Resend)');
    } else {
      console.log('⚠️ RESEND_API_KEY가 설정되지 않았습니다.');
    }
  }

  // 이메일 HTML 생성 (기존 로직 유지)
  private generateEmailHTML(orderData: OrderData): string {
    const regularCookieQuantity = Object.values(orderData.regularCookies || {}).reduce((sum: number, qty: any) => sum + (qty || 0), 0);
    const totalTwoPackQuantity = (orderData.twoPackSets || []).reduce((sum: number, set: any) => sum + (set.quantity || 0), 0);
    const totalSingleWithDrinkQuantity = (orderData.singleWithDrinkSets || []).reduce((sum: number, set: any) => sum + (set.quantity || 0), 0);
    const totalBrownieQuantity = (orderData.brownieCookieSets || []).reduce((sum: number, set: any) => sum + (set.quantity || 0), 0);
    const totalSconeQuantity = (orderData.sconeSets || []).reduce((sum: number, set: any) => sum + (set.quantity || 0), 0);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Apple SD Gothic Neo', sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .section { margin: 20px 0; padding: 20px; background-color: #f9f9f9; border-radius: 8px; }
    .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; }
    .item { margin: 10px 0; padding: 10px; background-color: white; border-radius: 4px; }
    .footer { margin-top: 30px; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🍪 주문 견적서</h1>
      <p>고객님의 주문 내역입니다</p>
    </div>

    <div class="section">
      <div class="section-title">고객 정보</div>
      <p><strong>이름:</strong> ${orderData.customerName}</p>
      <p><strong>연락처:</strong> ${orderData.customerContact}</p>
      <p><strong>전화번호:</strong> ${orderData.customerPhone}</p>
      <p><strong>배송일:</strong> ${orderData.deliveryDate}</p>
      <p><strong>수령 방법:</strong> ${orderData.deliveryMethod === 'pickup' ? '방문 수령' : '배송'}</p>
      ${orderData.deliveryAddress ? `<p><strong>배송 주소:</strong> ${orderData.deliveryAddress}</p>` : ''}
    </div>

    <div class="section">
      <div class="section-title">주문 내역</div>
      ${regularCookieQuantity > 0 ? `<div class="item">일반 쿠키: ${regularCookieQuantity}개</div>` : ''}
      ${totalTwoPackQuantity > 0 ? `<div class="item">2구 패키지: ${totalTwoPackQuantity}세트</div>` : ''}
      ${totalSingleWithDrinkQuantity > 0 ? `<div class="item">1구+음료: ${totalSingleWithDrinkQuantity}세트</div>` : ''}
      ${totalBrownieQuantity > 0 ? `<div class="item">브라우니쿠키: ${totalBrownieQuantity}세트</div>` : ''}
      ${totalSconeQuantity > 0 ? `<div class="item">스콘: ${totalSconeQuantity}세트</div>` : ''}
      ${orderData.fortuneCookie > 0 ? `<div class="item">행운쿠키: ${orderData.fortuneCookie}개</div>` : ''}
      ${orderData.airplaneSandwich > 0 ? `<div class="item">비행기샌드쿠키: ${orderData.airplaneSandwich}개</div>` : ''}
    </div>

    <div class="footer">
      <p>상세한 가격표는 첨부된 견적서(Excel)를 확인해주세요.</p>
      <p>궁금한 사항이 있으시면 언제든지 연락 주세요!</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  async sendQuote(orderData: OrderData, quoteBuffer: Buffer): Promise<void> {
    if (!this.resend) {
      throw new Error('Resend가 초기화되지 않았습니다. RESEND_API_KEY를 확인하세요.');
    }

    console.log('📧 Resend로 이메일 전송...');

    const html = this.generateEmailHTML(orderData);
    const fileName = `견적서_${orderData.customerName}_${new Date().toISOString().split('T')[0]}.xlsx`;

    try {
      // 고객에게 이메일 전송
      await this.resend.emails.send({
        from: 'onboarding@resend.dev', // Resend 검증된 도메인 (나중에 변경 가능)
        to: orderData.customerContact,
        subject: `🍪 [띵매러] ${orderData.customerName}님의 주문 견적서`,
        html: html,
        attachments: [
          {
            filename: fileName,
            content: quoteBuffer,
          },
        ],
      });

      console.log('✅ 고객 이메일 전송 완료:', orderData.customerContact);

      // 관리자에게도 전송 (flowerpanty@gmail.com)
      await this.resend.emails.send({
        from: 'onboarding@resend.dev',
        to: 'flowerpanty@gmail.com',
        subject: `[새 주문] ${orderData.customerName}님의 견적서 요청`,
        html: html,
        attachments: [
          {
            filename: fileName,
            content: quoteBuffer,
          },
        ],
      });

      console.log('✅ 관리자 이메일 전송 완료');
    } catch (error) {
      console.error('❌ Resend 이메일 전송 실패:', error);
      throw error;
    }
  }
}
