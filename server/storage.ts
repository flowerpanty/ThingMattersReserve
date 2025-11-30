import { type Order, type InsertOrder } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  getAllOrders(): Promise<Order[]>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  updatePaymentStatus(id: string, confirmed: boolean): Promise<Order | undefined>;
}

export class MemStorage implements IStorage {
  private orders: Map<string, Order>;

  constructor() {
    this.orders = new Map();
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = {
      ...insertOrder,
      id,
      createdAt: new Date()
    };
    this.orders.set(id, order);
    console.log(`주문 저장됨: ID=${id}, 고객명=${order.customerName}, 총 주문 수=${this.orders.size}`);
    return order;
  }

  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;

    const updatedOrder: Order = { ...order, orderStatus: status };
    this.orders.set(id, updatedOrder);
    console.log(`주문 상태 업데이트: ID=${id}, 상태=${status}`);
    return updatedOrder;
  }

  async updatePaymentStatus(id: string, confirmed: boolean): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;

    const updatedOrder: Order = {
      ...order,
      paymentConfirmed: confirmed ? 1 : 0,
      // 입금 확인되면 자동으로 상태를 payment_confirmed로 변경
      orderStatus: confirmed ? 'payment_confirmed' : order.orderStatus
    };
    this.orders.set(id, updatedOrder);
    console.log(`입금 상태 업데이트: ID=${id}, 입금확인=${confirmed}`);
    return updatedOrder;
  }
}

export const storage = new MemStorage();
