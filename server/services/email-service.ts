// EmailService.ts (Gmail SMTP + Replit 통합 지원)
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { type OrderData, cookiePrices } from '@shared/schema';

// ============ Replit 통합용 함수들 ============
let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

async function getUncachableGmailClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

function createEmailWithAttachment(
  to: string | string[],
  subject: string,
  htmlContent: string,
  attachmentName: string,
  attachmentBase64: string
): string {
  const boundary = 'boundary_' + Date.now().toString(16);
  const toAddresses = Array.isArray(to) ? to.join(', ') : to;

  const emailParts = [
    `To: ${toAddresses}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(htmlContent).toString('base64'),
    '',
    `--${boundary}`,
    `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; name="=?UTF-8?B?${Buffer.from(attachmentName).toString('base64')}?="`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="=?UTF-8?B?${Buffer.from(attachmentName).toString('base64')}?="`,
    '',
    attachmentBase64,
    '',
    `--${boundary}--`
  ];

  const email = emailParts.join('\r\n');
  return Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ============ 이메일 전송 방식 감지 ============
function getEmailMode(): 'smtp' | 'replit' | 'none' {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return 'smtp';
  }
  if (process.env.REPLIT_CONNECTORS_HOSTNAME) {
    return 'replit';
  }
  return 'none';
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private emailMode: 'smtp' | 'replit' | 'none';

  constructor() {
    this.emailMode = getEmailMode();

    if (this.emailMode === 'smtp') {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
        connectionTimeout: 10000, // 10초
        greetingTimeout: 10000, // 10초
        socketTimeout: 10000, // 10초
      });
      console.log('📧 이메일 서비스 초기화 (Gmail SMTP)');
    } else if (this.emailMode === 'replit') {
      console.log('📧 이메일 서비스 초기화 (Replit Gmail 통합)');
    } else {
      console.log('⚠️ 이메일 설정이 없습니다. GMAIL_USER와 GMAIL_APP_PASSWORD를 설정하세요.');
    }
  }

  private generateQuoteHTML(orderData: OrderData): string {
    let tableRows = '';
    let totalPrice = 0;

    // 일반쿠키 - 총 수량으로 통합
    const regularCookieQuantity = Object.values(orderData.regularCookies || {}).reduce((sum, qty) => sum + qty, 0);
    if (regularCookieQuantity > 0) {
      const amount = regularCookieQuantity * cookiePrices.regular;
      totalPrice += amount;
      tableRows += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">일반쿠키</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${regularCookieQuantity}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${amount.toLocaleString()}원</td>
        </tr>
      `;
    }

    // 2구 패키지 - 총 수량으로 통합
    if (orderData.twoPackSets?.length > 0) {
      const totalTwoPackQuantity = orderData.twoPackSets.reduce((sum, set) => sum + (set.quantity || 1), 0);
      const amount = totalTwoPackQuantity * cookiePrices.twoPackSet;
      totalPrice += amount;
      tableRows += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">2구 패키지</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${totalTwoPackQuantity}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${amount.toLocaleString()}원</td>
        </tr>
      `;
    }

    // 1구+음료 - 총 수량으로 통합
    if (orderData.singleWithDrinkSets?.length > 0) {
      const totalSingleWithDrinkQuantity = orderData.singleWithDrinkSets.reduce((sum, set) => sum + (set.quantity || 1), 0);
      const amount = totalSingleWithDrinkQuantity * cookiePrices.singleWithDrink;
      totalPrice += amount;
      tableRows += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">1구+음료</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${totalSingleWithDrinkQuantity}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${amount.toLocaleString()}원</td>
        </tr>
      `;
    }

    // 브라우니쿠키 - 총 수량으로 통합
    if (orderData.brownieCookieSets?.length > 0) {
      const totalBrownieQuantity = orderData.brownieCookieSets.reduce((sum, set) => sum + (set.quantity || 1), 0);
      const amount = totalBrownieQuantity * cookiePrices.brownie;
      totalPrice += amount;
      tableRows += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">브라우니쿠키</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${totalBrownieQuantity}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${amount.toLocaleString()}원</td>
        </tr>
      `;
    }

    // 스콘 - 총 수량으로 통합
    if (orderData.sconeSets?.length > 0) {
      const totalSconeQuantity = orderData.sconeSets.reduce((sum, set) => sum + (set.quantity || 1), 0);
      const amount = totalSconeQuantity * cookiePrices.scone;
      totalPrice += amount;
      tableRows += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">스콘</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${totalSconeQuantity}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${amount.toLocaleString()}원</td>
        </tr>
      `;
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
    const deliveryMethodText = orderData.deliveryMethod === 'pickup' ? '매장 픽업' : '퀵 배송';
    let deliveryInfo = deliveryMethodText;
    if (orderData.deliveryMethod === 'quick' && orderData.deliveryAddress) {
      deliveryInfo += ` (${orderData.deliveryAddress})`;
    }

    // 고객용 이메일 HTML
    const customerHtml = `
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
    `;

    // 관리자용 이메일 HTML
    const ownerHtml = `
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
    `;

    const adminEmails = ['4nimal@naver.com', 'xyxxseoul@gmail.com', 'flowerpanty@gmail.com'];

    if (this.emailMode === 'smtp' && this.transporter) {
      // Gmail SMTP로 전송
      console.log('📧 Gmail SMTP로 이메일 전송...');

      await Promise.all([
        // 고객용 이메일
        this.transporter.sendMail({
          from: `"nothingmatters" <${process.env.GMAIL_USER}>`,
          to: orderData.customerContact,
          subject: `[nothingmatters] ${orderData.customerName}님의 쿠키 주문 견적서`,
          html: customerHtml,
          attachments: [{
            filename: `nothingmatters_견적서_${orderData.customerName}_${today}.xlsx`,
            content: quoteBuffer,
          }],
        }),
        // 관리자용 이메일
        this.transporter.sendMail({
          from: `"nothingmatters" <${process.env.GMAIL_USER}>`,
          to: adminEmails,
          subject: `[주문 알림] ${orderData.customerName}님의 새로운 쿠키 주문`,
          html: ownerHtml,
          attachments: [{
            filename: `주문알림_${orderData.customerName}_${today}.xlsx`,
            content: quoteBuffer,
          }],
        }),
      ]);

      console.log('✅ Gmail SMTP 전송 완료');

    } else if (this.emailMode === 'replit') {
      // Replit Gmail 통합으로 전송
      console.log('📧 Replit Gmail 통합으로 이메일 전송...');
      const gmail = await getUncachableGmailClient();
      const xlsxBase64 = quoteBuffer.toString('base64');

      const customerRaw = createEmailWithAttachment(
        orderData.customerContact,
        `[nothingmatters] ${orderData.customerName}님의 쿠키 주문 견적서`,
        customerHtml,
        `nothingmatters_견적서_${orderData.customerName}_${today}.xlsx`,
        xlsxBase64
      );

      const ownerRaw = createEmailWithAttachment(
        adminEmails,
        `[주문 알림] ${orderData.customerName}님의 새로운 쿠키 주문`,
        ownerHtml,
        `주문알림_${orderData.customerName}_${today}.xlsx`,
        xlsxBase64
      );

      const [customerResult, ownerResult] = await Promise.all([
        gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw: customerRaw }
        }),
        gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw: ownerRaw }
        })
      ]);

      console.log('✅ Replit Gmail 전송 완료');
      console.log('고객 이메일 결과:', JSON.stringify(customerResult.data, null, 2));
      console.log('관리자 이메일 결과:', JSON.stringify(ownerResult.data, null, 2));

    } else {
      throw new Error('이메일 설정이 없습니다. GMAIL_USER와 GMAIL_APP_PASSWORD를 설정하세요.');
    }
  }
}
