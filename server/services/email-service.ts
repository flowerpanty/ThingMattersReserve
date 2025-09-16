// EmailService.ts (Brevo API 버전)
import Brevo from '@getbrevo/brevo'
import { type OrderData } from '@shared/schema'

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

  async sendQuote(orderData: OrderData, quoteBuffer: Buffer): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    const xlsxBase64 = quoteBuffer.toString('base64')

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
              nothingmatters 쿠키 주문 견적서가 첨부되어 있습니다.<br>
              견적서를 확인하신 후, 아래 카카오톡 채널로 상담을 진행해주세요.
            </p>
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <strong>수령 희망일:</strong> ${orderData.deliveryDate}
            </div>
          </div>
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
        content: xlsxBase64, // base64
      }],
    }

    const ownerReq: Brevo.SendSmtpEmail = {
      to: [{ email: 'betterbetters@kakao.com' }],
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
              <p><strong>연락처:</strong> ${orderData.customerContact}</p>
              <p><strong>수령 희망일:</strong> ${orderData.deliveryDate}</p>
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
    }

    try {
      console.log('견적서 이메일 전송(Brevo)...')
      await Promise.all([
        this.api.sendTransacEmail(customerReq),
        this.api.sendTransacEmail(ownerReq),
      ])
      console.log('✅ Brevo 전송 완료')
    } catch (e: any) {
      console.error('❌ Brevo 오류:', e?.response?.body || e?.message || e)
      // 401: API 키 문제 / 403: 발신자 미인증 / 400: 수신자 이메일 형식 오류 등이 흔해요.
    }
  }
}
