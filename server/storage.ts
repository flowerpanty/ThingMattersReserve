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
    // 입금 확인 시 자동으로 상태를 payment_confirmed로 변경
    const updateData: any = {
      paymentConfirmed: confirmed ? 1 : 0,
    };

    if (confirmed) {
      updateData.orderStatus = 'payment_confirmed';
    }

    const result = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();

    if (result.length > 0) {
      console.log(`입금 상태 업데이트 (DB): ID=${id}, 입금확인=${confirmed}, 상태=${result[0].orderStatus}`);
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
