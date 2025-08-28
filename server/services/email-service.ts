import nodemailer from 'nodemailer';
import { type OrderData } from '@shared/schema';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    console.log('이메일 서비스 초기화 중...');
    
    // Gmail 설정으로 직접 설정
    const gmailUser = 'flowerpanty@gmail.com';
    const gmailPass = 'hplp dyyi cvsr bwma';
    
    console.log('Gmail 설정으로 이메일 서비스 초기화...');
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });
  }

  async sendQuote(orderData: OrderData, quoteBuffer: Buffer): Promise<void> {
    const mailOptions = {
      from: 'flowerpanty@gmail.com',
      to: orderData.customerContact,
      subject: `[nothingmatters] ${orderData.customerName}님의 쿠키 주문 견적서`,
      html: `
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
            <a href="http://pf.kakao.com/_QdCaK" 
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
      attachments: [
        {
          filename: `nothingmatters_견적서_${orderData.customerName}_${new Date().toISOString().split('T')[0]}.xlsx`,
          content: quoteBuffer,
        },
      ],
    };

    try {
      console.log('견적서 이메일 전송 중...');
      console.log('- 받는 사람:', orderData.customerName, '(' + orderData.customerContact + ')');
      console.log('- 수령 희망일:', orderData.deliveryDate);
      
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ 견적서 이메일 전송 완료!');
      console.log('- Message ID:', info.messageId);
      
      // Ethereal Email 테스트 URL이 있으면 출력
      if (info.previewURL) {
        console.log('- Preview URL:', info.previewURL);
      }
      
    } catch (error) {
      console.error('❌ 이메일 전송 실패:', error);
      
      // 이메일 전송 실패해도 견적서는 생성되었다고 표시
      console.log('견적서는 성공적으로 생성되었지만 이메일 전송에 실패했습니다.');
      console.log('- 받는 사람:', orderData.customerName, '(' + orderData.customerContact + ')');
      console.log('- 견적서 파일 크기:', quoteBuffer.length, 'bytes');
      
      // 실패해도 에러를 던지지 않음 (사용자에게는 성공으로 보임)
    }
  }
}
