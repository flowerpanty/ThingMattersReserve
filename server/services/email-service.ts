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

    // 브라우니쿠키 (옵션 포함)
    (orderData.brownieCookieSets || []).forEach((set: any) => {
      total += (set.quantity || 0) * cookiePrices.brownie;

      // 생일곰
      if (set.shape === 'birthdayBear') {
        total += (set.quantity || 0) * cookiePrices.brownieOptions.birthdayBear;
      }
      // 커스텀 스티커 (세트당 1회)
      if (set.customSticker) {
        total += cookiePrices.brownieOptions.customSticker;
      }
      // 하트 메시지
      if (set.heartMessage) {
        total += (set.quantity || 0) * cookiePrices.brownieOptions.heartMessage;
      }
    });

    // 스콘 (옵션 포함)
    (orderData.sconeSets || []).forEach((set: any) => {
      total += (set.quantity || 0) * cookiePrices.scone;

      // 딸기잼
      if (set.strawberryJam) {
        total += (set.quantity || 0) * cookiePrices.sconeOptions.strawberryJam;
      }
    });

    // 기타
    total += (orderData.fortuneCookie || 0) * cookiePrices.fortune;
    total += (orderData.airplaneSandwich || 0) * cookiePrices.airplane;

    // 포장비
    if (orderData.packaging && orderData.packaging in cookiePrices.packaging) {
      const packagingPricePerItem = cookiePrices.packaging[orderData.packaging as keyof typeof cookiePrices.packaging];

      if (orderData.packaging === 'single_box' || orderData.packaging === 'plastic_wrap') {
        // 1구박스와 비닐탭포장은 일반 쿠키 개수만큼 계산
        let regularCookieQuantity = 0;
        Object.values(orderData.regularCookies || {}).forEach((qty: any) => {
          regularCookieQuantity += (qty || 0);
        });
        total += regularCookieQuantity * packagingPricePerItem;
      } else {
        // 유산지는 전체 주문당 1번만
        total += packagingPricePerItem;
      }
    }

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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: white; border-radius: 10px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px; text-align: center; background-color: #4F46E5;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: bold;">🔔 nothingmatters</h1>
              <p style="margin: 10px 0 0 0; color: white; font-size: 16px;">새로운 주문이 들어왔습니다!</p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <!-- Order Info Section -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px; background-color: #f9f9f9; border-radius: 8px; padding: 20px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #444;">📋 주문 정보</h2>
                    <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>고객명:</strong> ${orderData.customerName}</p>
                    <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>연락처:</strong> ${orderData.customerContact}</p>
                    <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>전화번호:</strong> ${orderData.customerPhone}</p>
                    <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>수령 희망일:</strong> ${orderData.deliveryDate}</p>
                    <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>수령 방법:</strong> ${orderData.deliveryMethod === 'pickup' ? '매장 픽업' : '배송'}</p>
                    ${orderData.deliveryAddress ? `<p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>배송 주소:</strong> ${orderData.deliveryAddress}</p>` : ''}
                  </td>
                </tr>
              </table>
              
              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 30px; text-align: center;">
                <tr>
                  <td>
                    <p style="margin: 10px 0; color: #666; font-size: 14px;">상세 견적서는 첨부 파일을 확인해주세요.</p>
                    <p style="margin: 10px 0; color: #666; font-size: 14px;"><strong>주문 문의:</strong> 카카오톡 @nothingmatters 또는 010-2866-7976</p>
                    <p style="margin: 10px 0; color: #666; font-size: 14px;">감사합니다! 🙏</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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

      // 브라우니 옵션 집계
      let birthdayBearQty = 0;
      let customStickerCount = 0;
      let heartMessageQty = 0;

      (orderData.brownieCookieSets || []).forEach((set: any) => {
        const qty = set.quantity || 0;
        if (set.shape === 'birthdayBear') birthdayBearQty += qty;
        if (set.customSticker) customStickerCount += 1; // 세트당 1회
        if (set.heartMessage) heartMessageQty += qty;
      });

      if (birthdayBearQty > 0) {
        items.push({ name: '└ 생일곰 추가', quantity: birthdayBearQty, price: birthdayBearQty * cookiePrices.brownieOptions.birthdayBear });
      }
      if (customStickerCount > 0) {
        items.push({ name: '└ 커스텀 스티커', quantity: customStickerCount, price: customStickerCount * cookiePrices.brownieOptions.customSticker });
      }
      if (heartMessageQty > 0) {
        items.push({ name: '└ 하트안 문구', quantity: heartMessageQty, price: heartMessageQty * cookiePrices.brownieOptions.heartMessage });
      }
    }

    // 스콘
    const sconeQty = (orderData.sconeSets || []).reduce((sum: number, set: any) => sum + (set.quantity || 0), 0);
    if (sconeQty > 0) {
      items.push({ name: '스콘', quantity: sconeQty, price: sconeQty * cookiePrices.scone });

      // 스콘 옵션 집계
      let strawberryJamQty = 0;
      (orderData.sconeSets || []).forEach((set: any) => {
        if (set.strawberryJam) strawberryJamQty += (set.quantity || 0);
      });

      if (strawberryJamQty > 0) {
        items.push({ name: '└ 딸기잼 추가', quantity: strawberryJamQty, price: strawberryJamQty * cookiePrices.sconeOptions.strawberryJam });
      }
    }

    // 행운쿠키
    if (orderData.fortuneCookie > 0) {
      items.push({ name: '행운쿠키', quantity: orderData.fortuneCookie, price: orderData.fortuneCookie * cookiePrices.fortune });
    }

    // 비행기샌드쿠키
    if (orderData.airplaneSandwich > 0) {
      items.push({ name: '비행기샌드쿠키', quantity: orderData.airplaneSandwich, price: orderData.airplaneSandwich * cookiePrices.airplane });
    }

    // 포장비
    if (orderData.packaging && orderData.packaging in cookiePrices.packaging) {
      const packagingPricePerItem = cookiePrices.packaging[orderData.packaging as keyof typeof cookiePrices.packaging];
      const packagingName = orderData.packaging === 'single_box' ? '1구박스' :
        orderData.packaging === 'plastic_wrap' ? '비닐탭포장' : '유산지';

      let packagingQuantity = 0;
      let totalPackagingPrice = 0;

      if (orderData.packaging === 'single_box' || orderData.packaging === 'plastic_wrap') {
        // 1구박스와 비닐탭포장은 일반 쿠키 개수만큼 계산
        const regularCookieQty = Object.values(orderData.regularCookies || {}).reduce((sum: number, qty: any) => sum + (qty || 0), 0);
        packagingQuantity = regularCookieQty;
        totalPackagingPrice = regularCookieQty * packagingPricePerItem;
      } else {
        // 유산지는 전체 주문당 1번만
        packagingQuantity = 1;
        totalPackagingPrice = packagingPricePerItem;
      }

      if (totalPackagingPrice > 0) {
        items.push({ name: packagingName, quantity: packagingQuantity, price: totalPackagingPrice });
      }
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: white; border-radius: 10px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px; text-align: center; background-color: #4CAF50;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: bold;">🔔 nothingmatters</h1>
              <p style="margin: 10px 0 0 0; color: white; font-size: 16px;">새로운 주문이 들어왔습니다!</p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <!-- Order Info Section -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px; background-color: #f9f9f9; border-radius: 8px; padding: 20px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #444;">주문 정보</h2>
                    <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>고객명:</strong> ${orderData.customerName}</p>
                    <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>연락처:</strong> ${orderData.customerContact} / ${orderData.customerPhone}</p>
                    <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>수령 희망일:</strong> ${orderData.deliveryDate}</p>
                  </td>
                </tr>
              </table>
              
              <!-- Quote Section -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px; background-color: #f9f9f9; border-radius: 8px; padding: 20px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #444;">📋 견적서</h2>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: white; border-radius: 4px; overflow: hidden;">
                      <tr style="background-color: #f0f0f0;">
                        <th style="padding: 12px; text-align: left; font-weight: bold; border-bottom: 1px solid #ddd;">제품명</th>
                        <th style="padding: 12px; text-align: left; font-weight: bold; border-bottom: 1px solid #ddd;">수량</th>
                        <th style="padding: 12px; text-align: left; font-weight: bold; border-bottom: 1px solid #ddd;">금액</th>
                      </tr>
                      ${itemsHTML}
                      <tr style="background-color: #fff3cd;">
                        <td colspan="2" style="padding: 12px; font-weight: bold; font-size: 16px;">합계</td>
                        <td style="padding: 12px; font-weight: bold; font-size: 16px;">${total.toLocaleString()}원</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Account Info -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px; background-color: #e3f2fd; border-radius: 8px; padding: 15px;">
                <tr>
                  <td>
                    <p style="margin: 5px 0; color: #333; font-size: 14px;"><strong>계좌번호:</strong> 국민은행 83050104204736 (낫띵메터스)</p>
                    <p style="margin: 5px 0; color: #333; font-size: 14px;"><strong>주문 문의:</strong> 카카오톡 @nothingmatters 또는 010-2866-7976</p>
                  </td>
                </tr>
              </table>
              
              <!-- Order Summary Section -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px; background-color: #f9f9f9; border-radius: 8px; padding: 20px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #444;">📋 주문 요약</h2>
                    <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>이름:</strong> ${orderData.customerName}</p>
                    <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>연락처:</strong> ${orderData.customerContact} / ${orderData.customerPhone}</p>
                    <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>수령날짜:</strong> ${orderData.deliveryDate}</p>
                    <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>수령방법:</strong> ${orderData.deliveryMethod === 'pickup' ? '매장 픽업' : '배송'}</p>
                    <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>제품:</strong> ${items.map(item => `${item.name} ${item.quantity}개`).join(', ')}</p>
                  </td>
                </tr>
              </table>
              
              <!-- Alert Section -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 8px; padding: 15px;">
                <tr>
                  <td>
                    <p style="margin: 5px 0; color: #333; font-size: 14px;">※ 고객에게는 견적서가 이미 전송되었습니다.</p>
                    <p style="margin: 5px 0; color: #333; font-size: 14px;">※ 카카오톡으로 상담을 진행해주세요.</p>
                  </td>
                </tr>
              </table>
              
              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 10px 0; color: #666; font-size: 14px;">상세 내역은 첨부된 견적서를 확인하세요.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
        to: ['flowerpanty@gmail.com', 'betterbetters@kakao.com'],
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
