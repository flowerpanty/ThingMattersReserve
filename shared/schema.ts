import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerName: text("customer_name").notNull(),
  customerContact: text("customer_contact").notNull(),
  deliveryDate: text("delivery_date").notNull(),
  orderItems: json("order_items").notNull(),
  totalPrice: integer("total_price").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orderItemSchema = z.object({
  type: z.enum(['regular', 'brownie', 'fortune', 'airplane']),
  name: z.string(),
  quantity: z.number().min(0),
  price: z.number().min(0),
  options: z.record(z.any()).optional(),
});

export const orderDataSchema = z.object({
  customerName: z.string().min(1, "이름을 입력해주세요"),
  customerContact: z.string().min(1, "연락처를 입력해주세요"),
  deliveryDate: z.string().min(1, "날짜를 선택해주세요"),
  regularCookies: z.record(z.number().min(0)).default({}),
  packaging: z.enum(['1box', '2box', '4box']).optional(),
  brownieCookie: z.object({
    quantity: z.number().min(0).default(0),
    shape: z.enum(['bear', 'rabbit', 'birthdayBear']).optional(),
    customSticker: z.boolean().default(false),
    heartMessage: z.string().optional(),
    customTopper: z.boolean().default(false),
  }).default({ quantity: 0, customSticker: false, customTopper: false }),
  fortuneCookie: z.number().min(0).default(0),
  airplaneSandwich: z.number().min(0).default(0),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type OrderData = z.infer<typeof orderDataSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;

export const cookieTypes = [
  '호두초코',
  '더블초코', 
  '블랙피넛',
  '로투스',
  '버터스카치',
  '호레오',
  '말차마카다미아'
] as const;

export const cookiePrices = {
  regular: 2000, // 일반 쿠키 기본 가격
  brownie: 7800, // 브라우니쿠키 기본 가격
  fortune: 1500, // 행운쿠키
  airplane: 3000, // 비행기샌드쿠키
  packaging: {
    '1box': 500,
    '2box': 1500,
    '4box': 1000,
  },
  brownieOptions: {
    birthdayBear: 500,
    customSticker: 15000,
    heartMessage: 500,
  }
} as const;
