import nodemailer from 'nodemailer';
import { type OrderData } from '@shared/schema';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || process.env.GMAIL_USER || 'test@example.com',
        pass: process.env.EMAIL_PASS || process.env.GMAIL_PASS || 'test_password',
      },
    });
  }

  async sendQuote(orderData: OrderData, quoteBuffer: Buffer): Promise<void> {
    const mailOptions = {
      from: process.env.EMAIL_USER || process.env.GMAIL_USER || 'noreply@nothingmatters.com',
      to: orderData.customerContact,
      subject: `[낫띵메터스] ${orderData.customerName}님의 쿠키 주문 견적서`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #D4B8D8; font-size: 24px; margin: 0;">낫띵메터스</h1>
            <p style="color: #666; margin: 5px 0;">귀여운 수제 쿠키 예약 주문</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">안녕하세요, ${orderData.customerName}님!</h2>
            <p style="color: #666; line-height: 1.6;">
              낫띵메터스 쿠키 주문 견적서가 첨부되어 있습니다.<br>
              견적서를 확인하신 후, 아래 카카오톡 채널로 상담을 진행해주세요.
            </p>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <strong>수령 희망일:</strong> ${orderData.deliveryDate}
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://pf.kakao.com/_your_channel" 
               style="display: inline-block; background: #FEE500; color: black; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              💬 카카오톡으로 상담하기
            </a>
          </div>
          
          <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
            <p>※ 본 견적서는 예약 확정이 아닙니다. 상담 후 최종 확정됩니다.</p>
            <p>※ 당일 예약은 불가능하며, 최소 1일 전 주문 부탁드립니다.</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `낫띵메터스_견적서_${orderData.customerName}_${new Date().toISOString().split('T')[0]}.xlsx`,
          content: quoteBuffer,
        },
      ],
    };

    await this.transporter.sendMail(mailOptions);
  }
}
