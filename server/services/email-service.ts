// EmailService.ts (Mailgun 사용)
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { type OrderData, cookiePrices } from '@shared/schema';

export class EmailService {
  private mg: any = null;

  constructor() {
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN || 'sandbox-mailgun.mailgun.org';

    if (apiKey) {
      const mailgun = new Mailgun(formData);
      this.mg = mailgun.client({ username: 'api', key: apiKey });
      console.log('📧 이메일 서비스 초기화 (Mailgun)');
      console.log('도메인:', domain);
    } else {
      console.log('⚠️ MAILGUN_API_KEY가 설정되지 않았습니다.');
    }
  }

  // 금액 계산
  private calculateTotal(orderData: OrderData): number {
    let total = 0;

    // 일반 쿠키
    Object.values(orderData.regularCookies || {}).forEach((qty: any) => {
      total += (qty || 0) * cookiePrices.regular;
    });

    // 2구 패키지
    (orderData.twoPackSets || []).forEach((set: any) => {
      total += (set.quantity || 0) * cookiePrices.twoPackSet;
    });

    // 1구+음료
    (orderData.singleWithDrinkSets || []).forEach((set: any) => {
      total += (set.quantity || 0) * cookiePrices.singleWithDrink;
    });

    // 브라우니쿠키
    (orderData.brownieCookieSets || []).forEach((set: any) => {
      total += (set.quantity || 0) * cookiePrices.brownie;
    });

    // 스콘
    (orderData.sconeSets || []).forEach((set: any) => {
      total += (set.quantity || 0) * cookiePrices.scone;
    });

    // 기타
    total += (orderData.fortuneCookie || 0) * cookiePrices.fortune;
    total += (orderData.airplaneSandwich || 0) * cookiePrices.airplane;

    return total;
  }

  // 고객용 이메일 HTML
  private generateCustomerEmailHTML(orderData: OrderData): string {
    const total = this.calculateTotal(orderData);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Apple SD Gothic Neo', sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 10px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #333; margin: 0; }
    .section { margin: 20px 0; padding: 20px; background-color: #f9f9f9; border-radius: 8px; }
    .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #444; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f0f0f0; font-weight: bold; }
    .total-row { font-weight: bold; font-size: 16px; background-color: #fff3cd; }
    .footer { margin-top: 30px; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🍪 주문 견적서</h1>
      <p>고객님의 주문이 접수되었습니다</p>
    </div>

    <div class="section">
      <div class="section-title">📋 주문 정보</div>
      <p><strong>고객명:</strong> ${orderData.customerName}</p>
      <p><strong>연락처:</strong> ${orderData.customerContact}</p>
      <p><strong>전화번호:</strong> ${orderData.customerPhone}</p>
      <p><strong>수령 희망일:</strong> ${orderData.deliveryDate}</p>
      <p><strong>수령 방법:</strong> ${orderData.deliveryMethod === 'pickup' ? '매장 픽업' : '배송'}</p>
      ${orderData.deliveryAddress ? `<p><strong>배송 주소:</strong> ${orderData.deliveryAddress}</p>` : ''}
    </div>

    <div class="footer">
      <p>상세 견적서는 첨부 파일을 확인해주세요.</p>
      <p><strong>주문 문의:</strong> 카카오톡 @nothingmatters 또는 010-2866-7976</p>
      <p>감사합니다! 🙏</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  // 관리자용 이메일 HTML
  private generateAdminEmailHTML(orderData: OrderData): string {
    const total = this.calculateTotal(orderData);
    const items: Array<{ name: string, quantity: number, price: number }> = [];

    // 일반 쿠키
    const regularCookieQty = Object.values(orderData.regularCookies || {}).reduce((sum: number, qty: any) => sum + (qty || 0), 0);
    if (regularCookieQty > 0) {
      items.push({ name: '일반 쿠키', quantity: regularCookieQty, price: regularCookieQty * cookiePrices.regular });
    }

    // 2구 패키지
    const twoPackQty = (orderData.twoPackSets || []).reduce((sum: number, set: any) => sum + (set.quantity || 0), 0);
    if (twoPackQty > 0) {
      items.push({ name: '2구 패키지', quantity: twoPackQty, price: twoPackQty * cookiePrices.twoPackSet });
    }

    // 1구+음료
    const singleDrinkQty = (orderData.singleWithDrinkSets || []).reduce((sum: number, set: any) => sum + (set.quantity || 0), 0);
    if (singleDrinkQty > 0) {
      items.push({ name: '1구+음료', quantity: singleDrinkQty, price: singleDrinkQty * cookiePrices.singleWithDrink });
    }

    // 브라우니쿠키
    const brownieQty = (orderData.brownieCookieSets || []).reduce((sum: number, set: any) => sum + (set.quantity || 0), 0);
    if (brownieQty > 0) {
      items.push({ name: '브라우니쿠키', quantity: brownieQty, price: brownieQty * cookiePrices.brownie });
    }

    // 스콘
    const sconeQty = (orderData.sconeSets || []).reduce((sum: number, set: any) => sum + (set.quantity || 0), 0);
    if (sconeQty > 0) {
      items.push({ name: '스콘', quantity: sconeQty, price: sconeQty * cookiePrices.scone });
    }

    // 행운쿠키
    if (orderData.fortuneCookie > 0) {
      items.push({ name: '행운쿠키', quantity: orderData.fortuneCookie, price: orderData.fortuneCookie * cookiePrices.fortune });
    }

    // 비행기샌드쿠키
    if (orderData.airplaneSandwich > 0) {
      items.push({ name: '비행기샌드쿠키', quantity: orderData.airplaneSandwich, price: orderData.airplaneSandwich * cookiePrices.airplane });
    }

    const itemsHTML = items.map(item => `
      <tr>
        <td>${item.name}</td>
        <td>${item.quantity}개</td>
        <td>${item.price.toLocaleString()}원</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Apple SD Gothic Neo', sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 10px; }
    .header { text-align: center; margin-bottom: 30px; background-color: #4CAF50; color: white; padding: 20px; border-radius: 8px; }
    .header h1 { margin: 0; font-size: 24px; }
    .alert { background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
    .section { margin: 20px 0; padding: 20px; background-color: #f9f9f9; border-radius: 8px; }
    .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #444; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; background-color: white; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f0f0f0; font-weight: bold; }
    .total-row { font-weight: bold; font-size: 16px; background-color: #fff3cd; }
    .info-box { background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 10px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 nothingmatters</h1>
      <p style="margin: 10px 0 0 0;">새로운 주문이 들어왔습니다!</p>
    </div>

    <div class="section">
      <div class="section-title">주문 정보</div>
      <p><strong>고객명:</strong> ${orderData.customerName}</p>
      <p><strong>연락처:</strong> ${orderData.customerContact} / ${orderData.customerPhone}</p>
      <p><strong>수령 희망일:</strong> ${orderData.deliveryDate}</p>
    </div>

    <div class="section">
      <div class="section-title">📋 견적서</div>
      <table>
        <thead>
          <tr>
            <th>제품명</th>
            <th>수량</th>
            <th>금액</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
          <tr class="total-row">
            <td colspan="2">합계</td>
            <td>${total.toLocaleString()}원</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="info-box">
      <p style="margin: 5px 0;"><strong>계좌번호:</strong> 국민은행 83050104204736 (낫띵메터스)</p>
      <p style="margin: 5px 0;"><strong>주문 문의:</strong> 카카오톡 @nothingmatters 또는 010-2866-7976</p>
    </div>

    <div class="section">
      <div class="section-title">📋 주문 요약</div>
      <p><strong>이름:</strong> ${orderData.customerName}</p>
      <p><strong>연락처:</strong> ${orderData.customerContact} / ${orderData.customerPhone}</p>
      <p><strong>수령날짜:</strong> ${orderData.deliveryDate}</p>
      <p><strong>수령방법:</strong> ${orderData.deliveryMethod === 'pickup' ? '매장 픽업' : '배송'}</p>
      <p><strong>제품:</strong> ${items.map(item => `${item.name} ${item.quantity}개`).join(', ')}</p>
    </div>

    <div class="alert">
      <p style="margin: 5px 0;">※ 고객에게는 견적서가 이미 전송되었습니다.</p>
      <p style="margin: 5px 0;">※ 카카오톡으로 상담을 진행해주세요.</p>
    </div>

    <div class="footer">
      <p>상세 내역은 첨부된 견적서를 확인하세요.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  async sendQuote(orderData: OrderData, quoteBuffer: Buffer): Promise<void> {
    if (!this.mg) {
      throw new Error('Mailgun이 초기화되지 않았습니다. MAILGUN_API_KEY를 확인하세요.');
    }

    const domain = process.env.MAILGUN_DOMAIN || 'sandbox-mailgun.mailgun.org';
    console.log('📧 Mailgun으로 이메일 전송...');

    const customerHTML = this.generateCustomerEmailHTML(orderData);
    const adminHTML = this.generateAdminEmailHTML(orderData);
    const fileName = `견적서_${orderData.customerName}_${new Date().toISOString().split('T')[0]}.xlsx`;

    try {
      // 고객에게 이메일 전송
      await this.mg.messages.create(domain, {
        from: `띵매러 <mailgun@${domain}>`,
        to: [orderData.customerContact],
        subject: `🍪 [띵매러] ${orderData.customerName}님의 주문 견적서`,
        html: customerHTML,
        attachment: {
          data: quoteBuffer,
          filename: fileName,
        },
      });

      console.log('✅ 고객 이메일 전송 완료:', orderData.customerContact);

      // 관리자에게 전송
      await this.mg.messages.create(domain, {
        from: `띵매러 <mailgun@${domain}>`,
        to: ['flowerpanty@gmail.com'],
        subject: `[주문 알림] ${orderData.customerName} 님의 새로운 쿠키 주문`,
        html: adminHTML,
        attachment: {
          data: quoteBuffer,
          filename: fileName,
        },
      });

      console.log('✅ 관리자 이메일 전송 완료');
    } catch (error: any) {
      console.error('❌ Mailgun 이메일 전송 실패:', error);
      if (error.message) {
        console.error('에러 메시지:', error.message);
      }
      throw error;
    }
  }
}
