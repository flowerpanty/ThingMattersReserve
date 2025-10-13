import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerName: text("customer_name").notNull(),
  customerContact: text("customer_contact").notNull(),
  deliveryDate: text("delivery_date").notNull(),
  deliveryMethod: text("delivery_method").notNull().default('pickup'),
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
  customerContact: z.string().email("올바른 이메일 주소를 입력해주세요"),
  customerPhone: z.string().optional(),
  deliveryDate: z.string().min(1, "날짜를 선택해주세요"),
  deliveryMethod: z.enum(['pickup', 'quick']).default('pickup'),
  deliveryAddress: z.string().optional(),
  regularCookies: z.record(z.number().min(0)).default({}),
  packaging: z.enum(['single_box', 'plastic_wrap', 'oil_paper']).optional(),
  brownieCookieSets: z.array(z.object({
    quantity: z.number().min(1).default(1),
    shape: z.enum(['bear', 'rabbit', 'birthdayBear', 'tiger']).optional(),
    customSticker: z.boolean().default(false),
    heartMessage: z.string().optional(),
    customTopper: z.boolean().default(false),
  })).default([]),
  twoPackSets: z.array(z.object({
    selectedCookies: z.array(z.string()).length(2),
    quantity: z.number().min(1).default(1),
  })).default([]),
  singleWithDrinkSets: z.array(z.object({
    selectedCookie: z.string(),
    selectedDrink: z.string(),
    quantity: z.number().min(1).default(1),
  })).default([]),
  fortuneCookie: z.number().min(0).default(0), // 박스당
  airplaneSandwich: z.number().min(0).default(0), // 박스당
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

export const drinkTypes = [
  '콜드브루',
  '수제초코우유',
  '밀크티'
] as const;

export const cookiePrices = {
  regular: 4500, // 일반 쿠키 기본 가격
  brownie: 7000, // 브라우니쿠키 기본 가격 (곰돌이, 토끼, 호랑이)
  fortune: 17000, // 행운쿠키 (박스당)
  airplane: 22000, // 비행기샌드쿠키 (박스당)
  twoPackSet: 10500, // 2구 패키지
  singleWithDrink: 11000, // 1구 + 음료
  packaging: {
    single_box: 600, // 1구박스 (+600원)
    plastic_wrap: 500, // 비닐탭포장 (+500원) 
    oil_paper: 0, // 유산지 (무료)
  },
  brownieOptions: {
    birthdayBear: 500, // 생일곰 추가 비용 (+500원, 총 7,500원)
    customSticker: 15000,
    heartMessage: 500,
  }
} as const;
