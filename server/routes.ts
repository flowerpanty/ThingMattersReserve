import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { orderDataSchema, cookiePrices } from "@shared/schema";
import { ExcelGenerator } from "./services/excel-generator";
import { EmailService } from "./services/email-service";

export async function registerRoutes(app: Express): Promise<Server> {
  const excelGenerator = new ExcelGenerator();
  const emailService = new EmailService();

  // Calculate price function
  const calculatePrice = (orderData: any) => {
    let totalPrice = 0;
    let breakdown = {
      regularCookies: 0,
      twoPackSet: 0,
      singleWithDrink: 0,
      packaging: 0,
      brownie: 0,
      fortune: 0,
      airplane: 0,
    };

    // Regular cookies
    const regularCookieQuantity = Object.values(orderData.regularCookies || {}).reduce((sum: number, qty: any) => sum + qty, 0);
    breakdown.regularCookies = regularCookieQuantity * cookiePrices.regular;
    totalPrice += breakdown.regularCookies;

    // 2구 패키지 (다중 세트)
    if (orderData.twoPackSets?.length > 0) {
      breakdown.twoPackSet = orderData.twoPackSets.length * cookiePrices.twoPackSet;
      totalPrice += breakdown.twoPackSet;
    }

    // 1구 + 음료 (다중 세트)
    if (orderData.singleWithDrinkSets?.length > 0) {
      breakdown.singleWithDrink = orderData.singleWithDrinkSets.length * cookiePrices.singleWithDrink;
      totalPrice += breakdown.singleWithDrink;
    }

    // Packaging (개당 계산)
    if (orderData.packaging && orderData.packaging in cookiePrices.packaging) {
      const packagingPricePerItem = cookiePrices.packaging[orderData.packaging as keyof typeof cookiePrices.packaging];
      
      // 1구박스의 경우 일반 쿠키 개수만큼 계산 (2구패키지와 1구+음료는 별도 포장)
      if (orderData.packaging === 'single_box') {
        breakdown.packaging = regularCookieQuantity * packagingPricePerItem;
      } else {
        // 비닐탭포장, 유산지는 전체 주문당 1번만
        breakdown.packaging = packagingPricePerItem;
      }
      
      totalPrice += breakdown.packaging;
    }

    // Brownie cookies
    if (orderData.brownieCookie?.quantity > 0) {
      breakdown.brownie = orderData.brownieCookie.quantity * cookiePrices.brownie;
      
      if (orderData.brownieCookie.shape === 'birthdayBear') {
        breakdown.brownie += orderData.brownieCookie.quantity * cookiePrices.brownieOptions.birthdayBear;
      }
      
      if (orderData.brownieCookie.customSticker) {
        breakdown.brownie += cookiePrices.brownieOptions.customSticker;
      }
      
      if (orderData.brownieCookie.heartMessage) {
        breakdown.brownie += cookiePrices.brownieOptions.heartMessage;
      }
      
      totalPrice += breakdown.brownie;
    }

    // Fortune cookies (박스당)
    if (orderData.fortuneCookie > 0) {
      breakdown.fortune = orderData.fortuneCookie * cookiePrices.fortune;
      totalPrice += breakdown.fortune;
    }

    // Airplane sandwich cookies (박스당)
    if (orderData.airplaneSandwich > 0) {
      breakdown.airplane = orderData.airplaneSandwich * cookiePrices.airplane;
      totalPrice += breakdown.airplane;
    }

    return { totalPrice, breakdown };
  };

  // Calculate price endpoint
  app.post("/api/calculate-price", async (req, res) => {
    try {
      const orderData = orderDataSchema.parse(req.body);
      const result = calculatePrice(orderData);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: "잘못된 요청입니다.", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Generate and send quote
  app.post("/api/generate-quote", async (req, res) => {
    try {
      const orderData = orderDataSchema.parse(req.body);
      
      // Validate email for sending quote
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(orderData.customerContact)) {
        return res.status(400).json({ 
          message: "견적서 전송을 위해 이메일 주소를 입력해주세요." 
        });
      }

      // Calculate total price
      const { totalPrice } = calculatePrice(orderData);

      // Generate Excel quote
      const quoteBuffer = await excelGenerator.generateQuote(orderData);

      // Send email
      await emailService.sendQuote(orderData, quoteBuffer);

      // Save order to storage
      const orderItems = [];
      
      // Add regular cookies
      Object.entries(orderData.regularCookies || {}).forEach(([type, quantity]) => {
        if (quantity > 0) {
          orderItems.push({
            type: 'regular' as const,
            name: type,
            quantity,
            price: cookiePrices.regular,
          });
        }
      });

      // Add 2구 패키지 (다중 세트)
      if (orderData.twoPackSets?.length > 0) {
        orderData.twoPackSets.forEach((set, index) => {
          orderItems.push({
            type: 'twopack' as const,
            name: `2구 패키지 세트 ${index + 1}`,
            quantity: 1,
            price: cookiePrices.twoPackSet,
            options: {
              selectedCookies: set.selectedCookies,
            },
          });
        });
      }

      // Add 1구 + 음료 (다중 세트)
      if (orderData.singleWithDrinkSets?.length > 0) {
        orderData.singleWithDrinkSets.forEach((set, index) => {
          orderItems.push({
            type: 'singledrink' as const,
            name: `1구 + 음료 세트 ${index + 1}`,
            quantity: 1,
            price: cookiePrices.singleWithDrink,
            options: {
              selectedCookie: set.selectedCookie,
              selectedDrink: set.selectedDrink,
            },
          });
        });
      }

      // Add brownie cookie if selected
      if (orderData.brownieCookie.quantity > 0) {
        orderItems.push({
          type: 'brownie' as const,
          name: '브라우니쿠키',
          quantity: orderData.brownieCookie.quantity,
          price: cookiePrices.brownie,
          options: {
            shape: orderData.brownieCookie.shape,
            customSticker: orderData.brownieCookie.customSticker,
            heartMessage: orderData.brownieCookie.heartMessage,
            customTopper: orderData.brownieCookie.customTopper,
          },
        });
      }

      // Add other products
      if (orderData.fortuneCookie > 0) {
        orderItems.push({
          type: 'fortune' as const,
          name: '행운쿠키',
          quantity: orderData.fortuneCookie,
          price: cookiePrices.fortune,
        });
      }

      if (orderData.airplaneSandwich > 0) {
        orderItems.push({
          type: 'airplane' as const,
          name: '비행기샌드쿠키',
          quantity: orderData.airplaneSandwich,
          price: cookiePrices.airplane,
        });
      }

      const order = await storage.createOrder({
        customerName: orderData.customerName,
        customerContact: orderData.customerContact,
        deliveryDate: orderData.deliveryDate,
        orderItems,
        totalPrice,
      });

      res.json({ 
        message: "견적서가 이메일로 전송되었습니다!", 
        orderId: order.id 
      });
    } catch (error) {
      console.error('Quote generation error:', error);
      res.status(500).json({ 
        message: "견적서 생성 중 오류가 발생했습니다. 다시 시도해주세요.",
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
