import webpush from 'web-push';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { pushSubscriptions } from '@shared/schema';

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
  constructor() {
    webpush.setVapidDetails(
      'mailto:flowerpanty@gmail.com',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
  }

  private isValidSubscription(subscription: any): subscription is PushSubscription {
    return Boolean(
      subscription &&
      typeof subscription.endpoint === 'string' &&
      subscription.endpoint.length > 0 &&
      subscription.keys &&
      typeof subscription.keys.p256dh === 'string' &&
      typeof subscription.keys.auth === 'string'
    );
  }

  private normalizeSubscription(subscription: any): PushSubscription {
    if (!this.isValidSubscription(subscription)) {
      throw new Error('유효하지 않은 푸시 구독 정보입니다.');
    }

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    };
  }

  private async getAllSubscriptions(): Promise<PushSubscription[]> {
    const records = await db.select().from(pushSubscriptions);

    return records
      .map((record) => {
        try {
          return this.normalizeSubscription(record.subscription);
        } catch (error) {
          console.warn('[푸시] 잘못된 구독 데이터를 건너뜁니다:', record.endpoint, error);
          return null;
        }
      })
      .filter((subscription): subscription is PushSubscription => subscription !== null);
  }

  async addSubscription(subscription: PushSubscription, userAgent?: string): Promise<void> {
    const normalized = this.normalizeSubscription(subscription);
    const now = new Date();

    const existing = await db
      .select({ endpoint: pushSubscriptions.endpoint })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, normalized.endpoint))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(pushSubscriptions)
        .set({
          subscription: normalized,
          userAgent,
          updatedAt: now,
        })
        .where(eq(pushSubscriptions.endpoint, normalized.endpoint));
      console.log('[푸시] 기존 구독 갱신:', normalized.endpoint);
      return;
    }

    await db.insert(pushSubscriptions).values({
      endpoint: normalized.endpoint,
      subscription: normalized,
      userAgent,
      createdAt: now,
      updatedAt: now,
    });

    console.log('[푸시] 새 구독 저장:', normalized.endpoint);
  }

  async removeSubscription(subscription: PushSubscription | string): Promise<void> {
    const endpoint = typeof subscription === 'string' ? subscription : subscription.endpoint;

    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    console.log('[푸시] 구독 제거:', endpoint);
  }

  async sendNotificationToAll(title: string, body: string, data?: any): Promise<void> {
    const subscriptions = await this.getAllSubscriptions();
    console.log('[푸시] 전체 알림 전송 시작:', { title, body, subscriberCount: subscriptions.length });

    if (subscriptions.length === 0) {
      console.warn('[푸시] 등록된 구독이 없어 전송을 건너뜁니다.');
      return;
    }

    const payload = {
      title,
      body,
      data: data || {},
    };

    const promises = subscriptions.map(async (subscription, index) => {
      try {
        console.log(`[푸시] ${index + 1}/${subscriptions.length} 구독자에게 전송 중...`);
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        console.log(`[푸시] ${index + 1}/${subscriptions.length} 전송 성공:`, subscription.endpoint.substring(0, 50) + '...');
      } catch (error: any) {
        const statusCode = error?.statusCode;
        console.error(`[푸시] ${index + 1}/${subscriptions.length} 전송 실패:`, error);

        if (statusCode === 404 || statusCode === 410) {
          console.log('[푸시] 만료된 구독 제거:', subscription.endpoint.substring(0, 50) + '...');
          await this.removeSubscription(subscription.endpoint);
        }
      }
    });

    await Promise.allSettled(promises);
    console.log(`[푸시] 총 ${subscriptions.length}개 기기로 푸시 알림 전송 완료`);
  }

  async sendNewOrderNotification(customerName: string, orderId: string): Promise<void> {
    const title = '🍪 새 주문 도착! 💸';
    const body = `📦 ${customerName}님 주문이 접수됐어요. 지금 확인해보세요.`;

    await this.sendNotificationToAll(title, body, {
      type: 'new_order',
      orderId,
      customerName,
      url: '/dashboard',
      badgeCount: 1,
    });
  }

  async sendTestNotification(): Promise<number> {
    const subscriberCount = await this.getSubscriberCount();
    console.log('[푸시] 테스트 알림 전송 시작, 구독자 수:', subscriberCount);

    if (subscriberCount === 0) {
      throw new Error('등록된 푸시 구독이 없습니다. 알림을 다시 켜 주세요.');
    }

    await this.sendNotificationToAll(
      '🔔 테스트 알림 ✨',
      '핸드폰으로 이모지 알림이 잘 오고 있는지 확인해보세요.',
      {
        type: 'test',
        url: '/dashboard',
        badgeCount: 1,
      }
    );

    console.log('[푸시] 테스트 알림 전송 완료');
    return subscriberCount;
  }

  async getSubscriberCount(): Promise<number> {
    const records = await db
      .select({ endpoint: pushSubscriptions.endpoint })
      .from(pushSubscriptions);

    return records.length;
  }
}

export const pushNotificationService = new PushNotificationService();
