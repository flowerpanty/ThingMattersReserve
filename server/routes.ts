import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { orderDataSchema, cookiePrices } from "@shared/schema";
import { ExcelGenerator } from "./services/excel-generator";
import { EmailService } from "./services/email-service";
import { KakaoTemplateService } from "./services/kakao-template";
import { pushNotificationService } from "./services/push-notification-service";

export async function registerRoutes(app: Express): Promise<Server> {
  const excelGenerator = new ExcelGenerator();
  const emailService = new EmailService();
  const kakaoTemplateService = new KakaoTemplateService();

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

    // 2구 패키지 (다중 세트 및 수량)
    if (orderData.twoPackSets?.length > 0) {
      const totalTwoPackQuantity = orderData.twoPackSets.reduce((sum: number, set: any) => sum + (set.quantity || 1), 0);
      breakdown.twoPackSet = totalTwoPackQuantity * cookiePrices.twoPackSet;
      totalPrice += breakdown.twoPackSet;
    }

    // 1구 + 음료 (다중 세트 및 수량)
    if (orderData.singleWithDrinkSets?.length > 0) {
      const totalSingleWithDrinkQuantity = orderData.singleWithDrinkSets.reduce((sum: number, set: any) => sum + (set.quantity || 1), 0);
      breakdown.singleWithDrink = totalSingleWithDrinkQuantity * cookiePrices.singleWithDrink;
      totalPrice += breakdown.singleWithDrink;
    }

    // Packaging (개당 계산)
    if (orderData.packaging && orderData.packaging in cookiePrices.packaging) {
      const packagingPricePerItem = cookiePrices.packaging[orderData.packaging as keyof typeof cookiePrices.packaging];
      
      // 1구박스와 비닐탭포장은 일반 쿠키 개수만큼 계산 (2구패키지와 1구+음료는 별도 포장)
      if (orderData.packaging === 'single_box' || orderData.packaging === 'plastic_wrap') {
        breakdown.packaging = regularCookieQuantity * packagingPricePerItem;
      } else {
        // 유산지는 전체 주문당 1번만
        breakdown.packaging = packagingPricePerItem;
      }
      
      totalPrice += breakdown.packaging;
    }

    // Brownie cookies (다중 세트)
    if (orderData.brownieCookieSets?.length > 0) {
      breakdown.brownie = 0;
      
      for (const set of orderData.brownieCookieSets) {
        // 기본 가격 (수량 * 개당 가격)
        breakdown.brownie += set.quantity * cookiePrices.brownie;
        
        // 생일곰 추가 비용
        if (set.shape === 'birthdayBear') {
          breakdown.brownie += set.quantity * cookiePrices.brownieOptions.birthdayBear;
        }
        
        // 커스텀 스티커 (세트당)
        if (set.customSticker) {
          breakdown.brownie += cookiePrices.brownieOptions.customSticker;
        }
        
        // 하트 메시지 (세트당)
        if (set.heartMessage) {
          breakdown.brownie += cookiePrices.brownieOptions.heartMessage;
        }
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

  // Get all orders endpoint
  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      // Sort by creation date, newest first
      const sortedOrders = orders.sort((a, b) => 
        new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
      );
      res.json(sortedOrders);
    } catch (error) {
      res.status(500).json({ message: "주문 목록을 불러오는 중 오류가 발생했습니다.", error: error instanceof Error ? error.message : String(error) });
    }
  });

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
            quantity: set.quantity || 1,
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
            quantity: set.quantity || 1,
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

      // 새 주문 푸시 알림 전송 (백그라운드에서 실행)
      if (pushNotificationService.hasSubscriptions()) {
        pushNotificationService.sendNewOrderNotification(orderData.customerName, order.id)
          .then(() => {
            console.log('✅ 새 주문 푸시 알림 전송 완료');
          })
          .catch((error) => {
            console.error('❌ 푸시 알림 전송 실패:', error);
          });
      }

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

  // Generate KakaoTalk message template
  app.post("/api/generate-kakao-message", async (req, res) => {
    try {
      const { orderId, messageType } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ message: "주문 ID가 필요합니다." });
      }
      
      // Get order from storage
      const orders = await storage.getAllOrders();
      const order = orders.find(o => o.id === orderId);
      
      if (!order) {
        return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
      }
      
      // Reconstruct order data for template generation
      const orderData = {
        customerName: order.customerName,
        customerContact: order.customerContact,
        deliveryDate: order.deliveryDate,
        regularCookies: {} as Record<string, number>,
        packaging: undefined as string | undefined,
        brownieCookie: { 
          quantity: 0, 
          customSticker: false, 
          customTopper: false,
          shape: undefined as string | undefined,
          heartMessage: undefined as string | undefined
        },
        twoPackSets: [] as Array<{ selectedCookies: string[], quantity: number }>,
        singleWithDrinkSets: [] as Array<{ selectedCookie: string, selectedDrink: string, quantity: number }>,
        fortuneCookie: 0,
        airplaneSandwich: 0,
      };
      
      // Parse order items back to order data structure
      (order.orderItems as any[]).forEach((item: any) => {
        switch (item.type) {
          case 'regular':
            orderData.regularCookies[item.name] = item.quantity;
            break;
          case 'twopack':
            orderData.twoPackSets.push({
              selectedCookies: item.options?.selectedCookies || [],
              quantity: item.quantity
            });
            break;
          case 'singledrink':
            orderData.singleWithDrinkSets.push({
              selectedCookie: item.options?.selectedCookie || '',
              selectedDrink: item.options?.selectedDrink || '',
              quantity: item.quantity
            });
            break;
          case 'brownie':
            orderData.brownieCookie.quantity = item.quantity;
            if (item.options) {
              orderData.brownieCookie.shape = item.options.shape;
              orderData.brownieCookie.customSticker = item.options.customSticker;
              orderData.brownieCookie.heartMessage = item.options.heartMessage;
              orderData.brownieCookie.customTopper = item.options.customTopper;
            }
            break;
          case 'fortune':
            orderData.fortuneCookie = item.quantity;
            break;
          case 'airplane':
            orderData.airplaneSandwich = item.quantity;
            break;
        }
      });
      
      let message = '';
      
      switch (messageType) {
        case 'order_confirm':
          message = kakaoTemplateService.generateOrderConfirmMessage(orderData, order.totalPrice);
          break;
        case 'payment_confirm':
          message = kakaoTemplateService.generatePaymentConfirmMessage(order.customerName, order.deliveryDate);
          break;
        case 'ready_for_pickup':
          message = kakaoTemplateService.generateReadyForPickupMessage(order.customerName);
          break;
        default:
          return res.status(400).json({ message: "올바른 메시지 타입을 선택해주세요." });
      }
      
      res.json({ message, customerName: order.customerName });
    } catch (error) {
      console.error('Kakao message generation error:', error);
      res.status(500).json({ 
        message: "카카오톡 메시지 생성 중 오류가 발생했습니다.",
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // 푸시 알림 구독 등록
  app.post('/api/push/subscribe', (req, res) => {
    try {
      const subscription = req.body;
      pushNotificationService.addSubscription(subscription);
      res.json({ success: true, message: '푸시 알림 구독이 등록되었습니다.' });
    } catch (error) {
      console.error('Push subscription error:', error);
      res.status(500).json({ 
        success: false, 
        message: '푸시 알림 구독 등록에 실패했습니다.' 
      });
    }
  });

  // 푸시 알림 구독 해제
  app.post('/api/push/unsubscribe', (req, res) => {
    try {
      const subscription = req.body;
      pushNotificationService.removeSubscription(subscription);
      res.json({ success: true, message: '푸시 알림 구독이 해제되었습니다.' });
    } catch (error) {
      console.error('Push unsubscribe error:', error);
      res.status(500).json({ 
        success: false, 
        message: '푸시 알림 구독 해제에 실패했습니다.' 
      });
    }
  });

  // 테스트 푸시 알림 전송
  app.post('/api/push/test', async (req, res) => {
    try {
      await pushNotificationService.sendTestNotification();
      res.json({ 
        success: true, 
        message: '테스트 알림이 전송되었습니다.',
        subscriberCount: pushNotificationService.getSubscriberCount()
      });
    } catch (error) {
      console.error('Test push notification error:', error);
      res.status(500).json({ 
        success: false, 
        message: '테스트 알림 전송에 실패했습니다.' 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
