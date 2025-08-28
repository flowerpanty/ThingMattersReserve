import webpush from 'web-push';

// VAPID 키 설정 (실제 운영시에는 환경변수로 관리)
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HcCWLEw0VjAOoozm0VB-9o4IfKjM6cMElcI_FjmOJ2Y7Udt5Cc-D4W2xNk';
const VAPID_PRIVATE_KEY = 'k-EjEI_p90WLb0bMT46LgIc0Wg7ePRn7sY8G2xHMGaI';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushNotificationService {
  private subscriptions: Set<PushSubscription> = new Set();

  constructor() {
    // VAPID 설정
    webpush.setVapidDetails(
      'mailto:flowerpanty@gmail.com',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
  }

  // 구독 추가
  addSubscription(subscription: PushSubscription): void {
    // 중복 구독 제거를 위해 endpoint로 체크
    const existing = Array.from(this.subscriptions).find(
      sub => sub.endpoint === subscription.endpoint
    );
    
    if (!existing) {
      this.subscriptions.add(subscription);
      console.log('새로운 푸시 구독 추가:', subscription.endpoint);
    } else {
      console.log('이미 존재하는 구독:', subscription.endpoint);
    }
  }

  // 구독 제거
  removeSubscription(subscription: PushSubscription): void {
    const existing = Array.from(this.subscriptions).find(
      sub => sub.endpoint === subscription.endpoint
    );
    
    if (existing) {
      this.subscriptions.delete(existing);
      console.log('푸시 구독 제거:', subscription.endpoint);
    }
  }

  // 모든 구독자에게 알림 전송
  async sendNotificationToAll(title: string, body: string, data?: any): Promise<void> {
    const payload = {
      title,
      body,
      data: data || {}
    };

    const promises = Array.from(this.subscriptions).map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        console.log('푸시 알림 전송 성공:', subscription.endpoint);
      } catch (error) {
        console.error('푸시 알림 전송 실패:', subscription.endpoint, error);
        
        // 만료된 구독은 제거
        if (error instanceof Error && error.message.includes('410')) {
          this.removeSubscription(subscription);
        }
      }
    });

    await Promise.allSettled(promises);
    console.log(`총 ${this.subscriptions.size}개 기기로 푸시 알림 전송 완료`);
  }

  // 새 주문 알림 전송
  async sendNewOrderNotification(customerName: string, orderId: string): Promise<void> {
    const title = '🍪 새로운 주문이 들어왔습니다!';
    const body = `${customerName}님의 주문이 접수되었습니다. 확인해보세요.`;
    
    await this.sendNotificationToAll(title, body, {
      type: 'new_order',
      orderId,
      customerName,
      url: '/dashboard'
    });
  }

  // 테스트 알림 전송
  async sendTestNotification(): Promise<void> {
    const title = '🔔 테스트 알림';
    const body = '푸시 알림이 정상적으로 작동하고 있습니다!';
    
    await this.sendNotificationToAll(title, body, {
      type: 'test',
      url: '/dashboard'
    });
  }

  // 현재 구독자 수 반환
  getSubscriberCount(): number {
    return this.subscriptions.size;
  }

  // 구독 상태 확인
  hasSubscriptions(): boolean {
    return this.subscriptions.size > 0;
  }
}

// 싱글톤 인스턴스
export const pushNotificationService = new PushNotificationService();