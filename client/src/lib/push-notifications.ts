// 웹 푸시 알림 관리 서비스

const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HcCWLEw0VjAOoozm0VB-9o4IfKjM6cMElcI_FjmOJ2Y7Udt5Cc-D4W2xNk';

export class PushNotificationService {
  private registration: ServiceWorkerRegistration | null = null;

  async init(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('푸시 알림이 지원되지 않는 브라우저입니다.');
      return false;
    }

    try {
      // 서비스 워커 등록
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('서비스 워커 등록 완료:', this.registration);
      return true;
    } catch (error) {
      console.error('서비스 워커 등록 실패:', error);
      return false;
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  async subscribe(): Promise<PushSubscription | null> {
    if (!this.registration) {
      const error = '서비스 워커가 등록되지 않았습니다.';
      console.error(error);
      throw new Error(error);
    }

    try {
      console.log('푸시 구독 시작...');
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      console.log('푸시 구독 완료:', subscription);

      // 서버에 구독 정보 전송
      console.log('서버에 구독 정보 전송 시작...');
      await this.sendSubscriptionToServer(subscription);
      console.log('서버에 구독 정보 전송 완료');

      return subscription;
    } catch (error) {
      console.error('푸시 구독 실패 상세:', error);
      if (error instanceof Error) {
        throw new Error(`푸시 구독 실패: ${error.message}`);
      }
      throw error;
    }
  }

  async unsubscribe(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        const result = await subscription.unsubscribe();
        console.log('푸시 구독 해제:', result);

        // 서버에서도 구독 정보 제거
        await this.removeSubscriptionFromServer(subscription);

        return result;
      }
      return true;
    } catch (error) {
      console.error('푸시 구독 해제 실패:', error);
      return false;
    }
  }

  async isSubscribed(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      return !!subscription;
    } catch (error) {
      console.error('구독 상태 확인 실패:', error);
      return false;
    }
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      console.log('서버로 구독 정보 전송 중...', subscription);
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`구독 정보 서버 전송 실패: ${response.status} ${errorText}`);
      }

      console.log('구독 정보 서버 저장 완료');
    } catch (error) {
      console.error('구독 정보 서버 전송 오류:', error);
      throw error; // 에러를 다시 throw
    }
  }

  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        throw new Error('구독 해제 서버 전송 실패');
      }

      console.log('구독 해제 서버 처리 완료');
    } catch (error) {
      console.error('구독 해제 서버 전송 오류:', error);
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // 테스트용 알림 전송
  async sendTestNotification(): Promise<void> {
    try {
      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('테스트 알림 전송 실패');
      }

      console.log('테스트 알림 전송 요청 완료');
    } catch (error) {
      console.error('테스트 알림 전송 오류:', error);
    }
  }
}

export const pushService = new PushNotificationService();