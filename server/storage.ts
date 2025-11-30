import { type Order, type InsertOrder, orders } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  getAllOrders(): Promise<Order[]>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  updatePaymentStatus(id: string, confirmed: boolean): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<boolean>;
}

export class PostgreStorage implements IStorage {
  async getOrder(id: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.id, id));
    return result[0];
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const result = await db.insert(orders).values(insertOrder).returning();
    const order = result[0];
    console.log(`주문 저장됨 (DB): ID=${order.id}, 고객명=${order.customerName}`);
    return order;
  }

  async getAllOrders(): Promise<Order[]> {
    const result = await db.select().from(orders);
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
    const result = await db
      .update(orders)
      .set({
        paymentConfirmed: confirmed ? 1 : 0,
        // 입금 확인되면 자동으로 상태를 payment_confirmed로 변경
        orderStatus: confirmed ? 'payment_confirmed' : undefined,
      })
      .where(eq(orders.id, id))
      .returning();

    if (result.length > 0) {
      console.log(`입금 상태 업데이트 (DB): ID=${id}, 입금확인=${confirmed}`);
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
