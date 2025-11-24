// EmailService.ts (Brevo API 버전)
import Brevo from '@getbrevo/brevo'
import { type OrderData, cookiePrices } from '@shared/schema'

function parseFrom(fromEnv: string) {
  // "Brand <email@domain>" 형식/일반 이메일 모두 지원
  const m = fromEnv.match(/^(.*)<\s*([^>]+)\s*>$/)
  return {
    name: (m?.[1] ?? '').trim().replace(/^"|"$/g, ''),
    email: (m?.[2] ?? fromEnv).trim(),
  }
}

export class EmailService {
  private api: Brevo.TransactionalEmailsApi
  private sender: { email: string; name?: string }

  constructor() {
    const apiKey = process.env.BREVO_API_KEY
    const from = process.env.MAIL_FROM
    if (!apiKey || !from) {
      throw new Error('BREVO_API_KEY 또는 MAIL_FROM이 설정되어 있지 않습니다.')
    }

    this.api = new Brevo.TransactionalEmailsApi()
    this.api.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey)

    const { email, name } = parseFrom(from)
    this.sender = { email, name: name || undefined }

    console.log('이메일 서비스 초기화(Brevo API) 완료')
  }

  private generateQuoteHTML(orderData: OrderData): string {
    const cookieLabels: Record<string, string> = {
      bear: '곰돌이',
      rabbit: '토끼',
      cat: '고양이',
      chick: '병아리',
      dinosaur: '공룡',
      fire: '불',
      cloud: '구름',
      star: '별',
      heart: '하트',
      flower: '꽃',
    };

    let tableRows = '';
    let totalPrice = 0;

    // 일반쿠키
    const regularCookies = orderData.regularCookies || {};
    Object.entries(regularCookies).forEach(([key, quantity]) => {
      if (quantity > 0) {
        const label = cookieLabels[key] || key;
        const price = cookiePrices.regular * quantity;
        totalPrice += price;
        tableRows += `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">${label}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${quantity}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${price.toLocaleString()}원</td>
          </tr>
        `;
      }
    });

    // 2구 패키지
    if (orderData.twoPackSets && orderData.twoPackSets.length > 0) {
      orderData.twoPackSets.forEach((set, index) => {
        const quantity = set.quantity || 1;
        const price = cookiePrices.twoPackSet * quantity;
        totalPrice += price;

        const cookieTypes = set.selectedCookies?.join(', ') || '';

        tableRows += `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">2구 패키지 ${index + 1}<br/>${cookieTypes || ''}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${quantity}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${price.toLocaleString()}원</td>
          </tr>
        `;
      });
    }

    // 1구+음료 패키지
    if (orderData.singleWithDrinkSets && orderData.singleWithDrinkSets.length > 0) {
      orderData.singleWithDrinkSets.forEach((set, index) => {
        const quantity = set.quantity || 1;
        const price = cookiePrices.singleWithDrink * quantity;
        totalPrice += price;

        const info = `${set.selectedCookie || ''} / ${set.selectedDrink || ''}`;

        tableRows += `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">1구+음료 ${index + 1}<br/>${info}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${quantity}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${price.toLocaleString()}원</td>
          </tr>
        `;
      });
    }

    // 브라우니쿠키
    if (orderData.brownieCookieSets && orderData.brownieCookieSets.length > 0) {
      orderData.brownieCookieSets.forEach((set, index) => {
        const quantity = set.quantity || 1;
        const price = cookiePrices.brownie * quantity;
        totalPrice += price;

        tableRows += `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">브라우니쿠키 ${index + 1}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${quantity}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${price.toLocaleString()}원</td>
          </tr>
        `;
      });
    }

    // 스콘
    if (orderData.sconeSets && orderData.sconeSets.length > 0) {
      orderData.sconeSets.forEach((set, index) => {
        const quantity = set.quantity || 1;
        const price = cookiePrices.scone * quantity;
        totalPrice += price;

        tableRows += `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">스콘 ${index + 1}<br/>${set.flavor || ''}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${quantity}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${price.toLocaleString()}원</td>
          </tr>
        `;
      });
    }

    // 행운쿠키
    if (orderData.fortuneCookie > 0) {
      const price = cookiePrices.fortune * orderData.fortuneCookie;
      totalPrice += price;
      tableRows += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">행운쿠키</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${orderData.fortuneCookie}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${price.toLocaleString()}원</td>
        </tr>
      `;
    }

    // 비행기샌드쿠키
    if (orderData.airplaneSandwich > 0) {
      const price = cookiePrices.airplane * orderData.airplaneSandwich;
      totalPrice += price;
      tableRows += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">비행기샌드쿠키</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${orderData.airplaneSandwich}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${price.toLocaleString()}원</td>
        </tr>
      `;
    }

    // 합계
    tableRows += `
      <tr style="font-weight: bold; background-color: #f9f9f9;">
        <td colspan="2" style="border: 1px solid #ddd; padding: 8px; text-align: right;">합계</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalPrice.toLocaleString()}원</td>
      </tr>
    `;

    return `
      <div style="margin: 20px 0; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background-color: #4F46E5; color: white;">
              <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">제품명</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 80px;">수량</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: right; width: 120px;">금액</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div style="padding: 15px; background-color: #f9f9f9; text-align: center; font-size: 12px; color: #666;">
          <p style="margin: 5px 0;"><strong>계좌번호:</strong> 국민은행 83050104204736 (낫띵메터스)</p>
          <p style="margin: 5px 0;">주문 문의: 카카오톡 @nothingmatters 또는 010-2866-7976</p>
        </div>
      </div>
    `;
  }

  async sendQuote(orderData: OrderData, quoteBuffer: Buffer): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const xlsxBase64 = quoteBuffer.toString('base64');
    
    // 제품 요약 생성
    const productSummary: string[] = [];
    const regularCookieQuantity = Object.values(orderData.regularCookies || {}).reduce((sum, qty) => sum + qty, 0);
    
    if (regularCookieQuantity > 0) {
      productSummary.push(`일반쿠키 ${regularCookieQuantity}개`);
    }
    if (orderData.twoPackSets?.length > 0) {
      const totalTwoPackQuantity = orderData.twoPackSets.reduce((sum, set) => sum + (set.quantity || 1), 0);
      productSummary.push(`2구 패키지 ${totalTwoPackQuantity}개`);
    }
    if (orderData.singleWithDrinkSets?.length > 0) {
      const totalSingleWithDrinkQuantity = orderData.singleWithDrinkSets.reduce((sum, set) => sum + (set.quantity || 1), 0);
      productSummary.push(`1구+음료 ${totalSingleWithDrinkQuantity}개`);
    }
    if (orderData.brownieCookieSets?.length > 0) {
      const totalBrownieQuantity = orderData.brownieCookieSets.reduce((sum, set) => sum + (set.quantity || 1), 0);
      productSummary.push(`브라우니쿠키 ${totalBrownieQuantity}개`);
    }
    if (orderData.sconeSets?.length > 0) {
      const totalSconeQuantity = orderData.sconeSets.reduce((sum, set) => sum + (set.quantity || 1), 0);
      productSummary.push(`스콘 ${totalSconeQuantity}개`);
    }
    if (orderData.fortuneCookie > 0) {
      productSummary.push(`행운쿠키 ${orderData.fortuneCookie}박스`);
    }
    if (orderData.airplaneSandwich > 0) {
      productSummary.push(`비행기샌드쿠키 ${orderData.airplaneSandwich}박스`);
    }

    const quoteHTML = this.generateQuoteHTML(orderData);

    const customerReq: Brevo.SendSmtpEmail = {
      to: [{ email: orderData.customerContact }],
      sender: this.sender,
      subject: `[nothingmatters] ${orderData.customerName}님의 쿠키 주문 견적서`,
      htmlContent: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4F46E5; font-size: 24px; margin: 0; font-weight: 800;">nothingmatters</h1>
            <p style="color: #666; margin: 5px 0;">귀여운 수제 쿠키 예약 주문</p>
          </div>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">안녕하세요, ${orderData.customerName}님!</h2>
            <p style="color: #666; line-height: 1.6;">
              nothingmatters 쿠키 주문 견적서입니다.<br>
              견적서를 확인하신 후, 아래 카카오톡 채널로 상담을 진행해주세요.
            </p>
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <strong>수령 희망일:</strong> ${orderData.deliveryDate}
            </div>
          </div>
          
          <h3 style="color: #333; margin: 20px 0 10px 0;">📋 견적서</h3>
          ${quoteHTML}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://pf.kakao.com/_QdCaK" 
               style="display: inline-block; background: #FEE500; color: black; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              💬 카카오톡으로 상담하기
            </a>
          </div>
          <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
            <p>※ 본 견적서는 예약 확정이 아닙니다. 카카오톡 상담 후 최종 확정됩니다.</p>
            <p>※ 당일 예약은 불가능하며, 최소 1일 전 주문 부탁드립니다.</p>
          </div>
        </div>
      `,
      attachment: [{
        name: `nothingmatters_견적서_${orderData.customerName}_${today}.xlsx`,
        content: xlsxBase64,
      }],
    };

    const deliveryMethodText = orderData.deliveryMethod === 'pickup' ? '매장 픽업' : '퀵 배송';
    let deliveryInfo = deliveryMethodText;
    if (orderData.deliveryMethod === 'quick' && orderData.deliveryAddress) {
      deliveryInfo += ` (${orderData.deliveryAddress})`;
    }

    const ownerReq: Brevo.SendSmtpEmail = {
      to: [
        { email: '4nimal@naver.com' },
        { email: 'xyxxseoul@gmail.com' },
        { email: 'flowerpanty@gmail.com' }
      ],
      sender: this.sender,
      subject: `[주문 알림] ${orderData.customerName}님의 새로운 쿠키 주문`,
      htmlContent: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4F46E5; font-size: 24px; margin: 0; font-weight: 800;">nothingmatters</h1>
            <p style="color: #666; margin: 5px 0;">새로운 주문이 들어왔습니다!</p>
          </div>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">주문 정보</h2>
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p><strong>고객명:</strong> ${orderData.customerName}</p>
              <p><strong>연락처:</strong> ${orderData.customerContact}${orderData.customerPhone ? ' / ' + orderData.customerPhone : ''}</p>
              <p><strong>수령 희망일:</strong> ${orderData.deliveryDate}</p>
            </div>
          </div>
          
          <h3 style="color: #333; margin: 20px 0 10px 0;">📋 견적서</h3>
          ${quoteHTML}
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #4F46E5;">
            <h3 style="color: #333; margin-top: 0; font-size: 16px;">📋 주문 요약</h3>
            <div style="background: white; padding: 15px; border-radius: 8px;">
              <p style="margin: 8px 0;"><strong>이름:</strong> ${orderData.customerName}</p>
              <p style="margin: 8px 0;"><strong>연락처:</strong> ${orderData.customerContact}${orderData.customerPhone ? ' / ' + orderData.customerPhone : ''}</p>
              <p style="margin: 8px 0;"><strong>수령날짜:</strong> ${orderData.deliveryDate}</p>
              <p style="margin: 8px 0;"><strong>수령방법:</strong> ${deliveryInfo}</p>
              <p style="margin: 8px 0;"><strong>제품:</strong> ${productSummary.join(', ')}</p>
            </div>
          </div>
          
          <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
            <p>※ 고객에게는 견적서가 이미 전송되었습니다.</p>
            <p>※ 카카오톡으로 상담을 진행해주세요.</p>
          </div>
        </div>
      `,
      attachment: [{
        name: `주문알림_${orderData.customerName}_${today}.xlsx`,
        content: xlsxBase64,
      }],
    };

    try {
      console.log('견적서 이메일 전송(Brevo)...')
      await Promise.all([
        this.api.sendTransacEmail(customerReq),
        this.api.sendTransacEmail(ownerReq),
      ])
      console.log('✅ Brevo 전송 완료')
    } catch (e: any) {
      console.error('❌ Brevo 오류:', e?.response?.body || e?.message || e)
    }
  }
}
