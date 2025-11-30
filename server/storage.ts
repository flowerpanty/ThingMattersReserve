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

    const updateData: any = {
      paymentConfirmed: confirmed ? 1 : 0,
    };

    if (confirmed) {
      // 입금 확인 시, 상태가 pending이면 payment_confirmed로 변경
      // 이미 더 진행된 상태(제작중, 완료 등)라면 변경하지 않음 (선택사항, 여기서는 강제 변경하지 않도록 수정 가능하지만, 
      // 기존 로직 유지하되 pending일 때만 변경하거나, 무조건 변경하거나 정책 결정 필요.
      // 일단 기존처럼 무조건 변경하되, 이미 완료된 건 건드리지 않는게 좋을듯.
      // 하지만 요구사항이 명확하지 않으므로, 입금 확인 = 결제 완료 상태로 보는 것이 일반적.
      // 여기서는 'pending'이거나 'payment_confirmed'가 아닌 경우에도 입금 확인을 누르면 'payment_confirmed'로 가는게 맞을 수 있음.
      // 다만, 'in_production' 상태에서 입금 확인을 다시 누른다고 상태가 뒤로 가면 안됨.
      if (currentOrder.orderStatus === 'pending') {
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
