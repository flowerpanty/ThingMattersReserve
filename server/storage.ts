import { type Order, type InsertOrder, orders } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from 'crypto';

export interface IStorage {
  getAllOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  updatePaymentStatus(id: string, confirmed: boolean): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<boolean>;
}

export class PostgreStorage implements IStorage {
  async getAllOrders(): Promise<Order[]> {
    // 최신 주문이 먼저 오도록 정렬
    const result = await db.select().from(orders).orderBy(desc(orders.createdAt));
    return result;
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.id, id));
    return result[0];
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    // 애플리케이션 레벨에서 UUID 생성
    const newOrder = {
      ...insertOrder,
      id: randomUUID(),
    };

    const result = await db.insert(orders).values(newOrder).returning();
    const order = result[0];
    console.log(`주문 저장됨 (DB): ID=${order.id}, 고객명=${order.customerName}`);
    return order;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const result = await db
      .update(orders)
      .set({ orderStatus: status })
      .where(eq(orders.id, id))
      .returning();

    if (result.length > 0) {
      console.log(`주문 상태 업데이트 (DB): ID=${id}, 상태=${status}`);
      return result[0];
    }
    return undefined;
  }

  async updatePaymentStatus(id: string, confirmed: boolean): Promise<Order | undefined> {
    // 현재 주문 상태 조회
    const currentOrder = await this.getOrder(id);
    if (!currentOrder) return undefined;

    console.log(`[Storage] 입금 상태 변경 요청: ID=${id}, Confirmed=${confirmed}, 현재상태=${currentOrder.orderStatus}`);

    const updateData: any = {
      paymentConfirmed: confirmed ? 1 : 0,
    };

    if (confirmed) {
      // 입금 확인 시, 상태가 pending이거나 order_confirmed이면 payment_confirmed로 변경
      // (이미 제작중이거나 완료된 상태가 아니면 변경)
      if (['pending', 'order_confirmed'].includes(currentOrder.orderStatus)) {
        updateData.orderStatus = 'payment_confirmed';
      }
    } else {
      // 입금 취소 시, 상태가 payment_confirmed이면 pending으로 원복
      if (currentOrder.orderStatus === 'payment_confirmed') {
        updateData.orderStatus = 'pending';
      }
    }

    const result = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();

    if (result.length > 0) {
      console.log(`[Storage] 입금 상태 업데이트 완료: ID=${id}, 상태=${result[0].orderStatus}, PaymentConfirmed=${result[0].paymentConfirmed}`);
      return result[0];
    }
    return undefined;
  }

  async deleteOrder(id: string): Promise<boolean> {
    const result = await db.delete(orders).where(eq(orders.id, id)).returning();

    if (result.length > 0) {
      console.log(`주문 삭제 (DB): ID=${id}`);
      return true;
    }
    return false;
  }
}

export const storage = new PostgreStorage();
