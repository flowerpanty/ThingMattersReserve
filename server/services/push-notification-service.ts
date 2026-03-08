import webpush from 'web-push';

// VAPID 키 설정 (실제 운영시에는 환경변수로 관리)
const VAPID_PUBLIC_KEY = 'BNqrcbFlP-aBmpUF_puabPTb2sjQYVq6NAy5zLng9JmDGRjlK7WXpRLZbYwhqnDOFCYRLd2MEmNJp14j9qw_6UY';
const VAPID_PRIVATE_KEY = '6dsIMeeh4xDW0HjXL7B3YCYHK8C5Ggnztd1eUNf4jCc';

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
    console.log('[푸시] 전체 알림 전송 시작:', { title, body, subscriberCount: this.subscriptions.size });

    const payload = {
      title,
      body,
      data: data || {}
    };

    const promises = Array.from(this.subscriptions).map(async (subscription, index) => {
      try {
        console.log(`[푸시] ${index + 1}/${this.subscriptions.size} 구독자에게 전송 중...`);
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        console.log(`[푸시] ${index + 1}/${this.subscriptions.size} 전송 성공:`, subscription.endpoint.substring(0, 50) + '...');
      } catch (error) {
        console.error(`[푸시] ${index + 1}/${this.subscriptions.size} 전송 실패:`, error);

        // 만료된 구독은 제거
        if (error instanceof Error && error.message.includes('410')) {
          console.log('[푸시] 만료된 구독 제거:', subscription.endpoint.substring(0, 50) + '...');
          this.removeSubscription(subscription);
        }
      }
    });

    await Promise.allSettled(promises);
    console.log(`[푸시] 총 ${this.subscriptions.size}개 기기로 푸시 알림 전송 완료`);
  }

  // 새 주문 알림 전송
  async sendNewOrderNotification(customerName: string, orderId: string): Promise<void> {
    const title = '🚨😱 🍪 띵메터스 대박! 새 주문 도착!! 🍪 😱🚨';
    const body = `👤 ${customerName}님의 주문이 방금 접수되었습니다!! 🎉🎉 빨리 확인해보세요 사장님! 🔥🔥 돈 들어오는 소리 들리시나요? 💸💰🤑`;

    await this.sendNotificationToAll(title, body, {
      type: 'new_order',
      orderId,
      customerName,
      url: '/dashboard'
    });
  }

  // 테스트 알림 전송
  async sendTestNotification(): Promise<void> {
    console.log('[푸시] 테스트 알림 전송 시작');
    console.log('[푸시] 현재 구독자 수:', this.subscriptions.size);

    if (this.subscriptions.size === 0) {
      console.warn('[푸시] 구독자가 없어 테스트 알림을 보낼 수 없습니다.');
      return;
    }

    const title = '🔔 테스트 알림';
    const body = '푸시 알림이 정상적으로 작동하고 있습니다!';

    console.log('[푸시] 알림 내용:', { title, body });
    await this.sendNotificationToAll(title, body, {
      type: 'test',
      url: '/dashboard'
    });
    console.log('[푸시] 테스트 알림 전송 완료');
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