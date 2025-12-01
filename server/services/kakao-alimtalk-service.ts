// 카카오톡 알림톡 서비스
// https://developers.kakao.com/docs/latest/ko/message/rest-api

interface KakaoAlimtalkConfig {
    restApiKey: string;
    senderKey: string;
    adminPhone: string;
    templateAdmin: string;
    templateCustomer: string;
}

interface AlimtalkMessage {
    to: string;
    templateCode: string;
    templateParams: Record<string, string>;
}

export class KakaoAlimtalkService {
    private config: KakaoAlimtalkConfig;
    private enabled: boolean;

    constructor() {
        // 환경변수에서 설정 로드
        this.config = {
            restApiKey: process.env.KAKAO_REST_API_KEY || '',
            senderKey: process.env.KAKAO_SENDER_KEY || '',
            adminPhone: process.env.KAKAO_ADMIN_PHONE || '',
            templateAdmin: process.env.KAKAO_TEMPLATE_ADMIN || '',
            templateCustomer: process.env.KAKAO_TEMPLATE_CUSTOMER || '',
        };

        // 모든 필수 설정이 있는지 확인
        this.enabled = !!(
            this.config.restApiKey &&
            this.config.senderKey &&
            this.config.adminPhone
        );

        if (!this.enabled) {
            console.warn('[알림톡] 카카오 알림톡이 설정되지 않았습니다. 환경변수를 확인하세요.');
            console.warn('[알림톡] 필요한 환경변수: KAKAO_REST_API_KEY, KAKAO_SENDER_KEY, KAKAO_ADMIN_PHONE');
        } else {
            console.log('[알림톡] 카카오 알림톡 서비스가 활성화되었습니다.');
        }
    }

    /**
     * 관리자에게 새 주문 알림 전송
     */
    async sendAdminNotification(orderData: {
        customerName: string;
        customerContact: string;
        deliveryDate: string;
        deliveryMethod: string;
        totalPrice: number;
    }): Promise<boolean> {
        if (!this.enabled) {
            console.log('[알림톡] 비활성화 상태 - 관리자 알림 전송 생략');
            return false;
        }

        if (!this.config.templateAdmin) {
            console.warn('[알림톡] 관리자 템플릿이 설정되지 않았습니다.');
            return false;
        }

        try {
            const message: AlimtalkMessage = {
                to: this.config.adminPhone,
                templateCode: this.config.templateAdmin,
                templateParams: {
                    customerName: orderData.customerName,
                    customerContact: orderData.customerContact,
                    deliveryDate: orderData.deliveryDate,
                    deliveryMethod: orderData.deliveryMethod === 'delivery' ? '배송' : '픽업/퀵',
                    totalPrice: orderData.totalPrice.toLocaleString(),
                },
            };

            await this.sendAlimtalk(message);
            console.log('[알림톡] 관리자 알림 전송 성공');
            return true;
        } catch (error) {
            console.error('[알림톡] 관리자 알림 전송 실패:', error);
            return false;
        }
    }

    /**
     * 고객에게 주문 확인 알림 전송
     */
    async sendCustomerNotification(orderData: {
        customerName: string;
        customerContact: string;
        orderItems: string;
        deliveryDate: string;
        totalPrice: number;
    }): Promise<boolean> {
        if (!this.enabled) {
            console.log('[알림톡] 비활성화 상태 - 고객 알림 전송 생략');
            return false;
        }

        if (!this.config.templateCustomer) {
            console.warn('[알림톡] 고객 템플릿이 설정되지 않았습니다.');
            return false;
        }

        // 전화번호 포맷 검증 (01012345678 형식)
        const phone = orderData.customerContact.replace(/[^0-9]/g, '');
        if (phone.length < 10 || phone.length > 11) {
            console.warn('[알림톡] 유효하지 않은 전화번호:', orderData.customerContact);
            return false;
        }

        try {
            const message: AlimtalkMessage = {
                to: phone,
                templateCode: this.config.templateCustomer,
                templateParams: {
                    customerName: orderData.customerName,
                    orderItems: orderData.orderItems,
                    deliveryDate: orderData.deliveryDate,
                    totalPrice: orderData.totalPrice.toLocaleString(),
                },
            };

            await this.sendAlimtalk(message);
            console.log('[알림톡] 고객 알림 전송 성공:', phone);
            return true;
        } catch (error) {
            console.error('[알림톡] 고객 알림 전송 실패:', error);
            return false;
        }
    }

    /**
     * 카카오 알림톡 API 호출
     */
    private async sendAlimtalk(message: AlimtalkMessage): Promise<void> {
        // 카카오 알림톡 API 엔드포인트
        const url = 'https://kapi.kakao.com/v1/api/talk/friends/message/default/send';

        const payload = {
            receiver_uuids: [message.to],
            template_object: {
                object_type: 'text',
                text: this.formatMessage(message),
                link: {
                    web_url: 'https://thingmattersreserve-production.up.railway.app',
                    mobile_web_url: 'https://thingmattersreserve-production.up.railway.app',
                },
            },
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `KakaoAK ${this.config.restApiKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                template_object: JSON.stringify(payload.template_object),
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`카카오 API 오류: ${response.status} - ${error}`);
        }

        const result = await response.json();
        console.log('[알림톡] API 응답:', result);
    }

    /**
     * 템플릿 파라미터를 메시지로 포맷
     */
    private formatMessage(message: AlimtalkMessage): string {
        let text = '';
        const params = message.templateParams;

        // 템플릿 코드에 따라 메시지 포맷 생성
        if (message.templateCode === this.config.templateAdmin) {
            text = `[낫띵메터스] 새로운 주문이 접수되었습니다.\n\n`;
            text += `고객명: ${params.customerName}\n`;
            text += `연락처: ${params.customerContact}\n`;
            text += `배송일: ${params.deliveryDate}\n`;
            text += `배송방법: ${params.deliveryMethod}\n`;
            text += `금액: ${params.totalPrice}원\n\n`;
            text += `주문 내역을 확인해주세요.`;
        } else if (message.templateCode === this.config.templateCustomer) {
            text = `[낫띵메터스] 주문이 접수되었습니다.\n\n`;
            text += `${params.customerName}님, 주문해 주셔서 감사합니다!\n\n`;
            text += `주문 내역:\n${params.orderItems}\n\n`;
            text += `배송일: ${params.deliveryDate}\n`;
            text += `금액: ${params.totalPrice}원\n\n`;
            text += `문의사항이 있으시면 연락 주세요.`;
        }

        return text;
    }

    /**
     * 서비스 활성화 여부 확인
     */
    isEnabled(): boolean {
        return this.enabled;
    }
}

// 싱글톤 인스턴스
export const kakaoAlimtalkService = new KakaoAlimtalkService();
