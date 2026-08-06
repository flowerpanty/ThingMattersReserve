import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { cookiePrices, minimumOrderQuantities, orderDataSchema } from "@shared/schema";
import { ExcelGenerator } from "./services/excel-generator";
import { EmailService } from "./services/email-service";
import { KakaoTemplateService } from "./services/kakao-template";
import { pushNotificationService } from "./services/push-notification-service";
import { kakaoAlimtalkService } from "./services/kakao-alimtalk-service";
import { googleSheetsService } from "./services/google-sheets-service";
import { buildOrderDataFromOrder } from "./services/order-data-utils";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    adminAuthenticated?: boolean;
  }
}

function toAsciiFallbackFileName(fileName: string): string {
  const fallback = fileName
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\/:;*?<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  return fallback || "quote.xlsx";
}

function createAttachmentHeader(fileName: string): string {
  const asciiFallback = toAsciiFallbackFileName(fileName);
  const encoded = encodeURIComponent(fileName)
    .replace(/['()]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/\*/g, "%2A");

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const excelGenerator = new ExcelGenerator();
  const kakaoTemplateService = new KakaoTemplateService();
  const landingSourceLabels: Record<string, string> = {
    brookie: '브루키',
    cookie7: '수제꾸덕쿠키',
    lucky: '행운쿠키',
  };

  const priceCalculationSchema = z.object({
    regularCookies: z.record(z.number().min(0)).default({}),
    packaging: z.enum(['single_box', 'plastic_wrap', 'oil_paper']).optional(),
    brownieCookieSets: z.array(z.object({
      quantity: z.number().min(0).default(0),
      shape: z.string().optional(),
      customSticker: z.boolean().optional().default(false),
      heartMessage: z.string().optional(),
      customTopper: z.boolean().optional().default(false),
    })).default([]),
    twoPackSets: z.array(z.object({
      selectedCookies: z.array(z.string()).optional().default([]),
      quantity: z.number().min(0).default(1),
    })).default([]),
    singleWithDrinkSets: z.array(z.object({
      selectedCookie: z.string().optional().default(''),
      selectedDrink: z.string().optional().default(''),
      quantity: z.number().min(0).default(1),
    })).default([]),
    sconeSets: z.array(z.object({
      flavor: z.string().optional().default('chocolate'),
      quantity: z.number().min(0).default(1),
      strawberryJam: z.boolean().optional().default(false),
    })).default([]),
    fortuneCookie: z.number().min(0).default(0),
    airplaneSandwich: z.number().min(0).default(0),
  });
  const brookieMinimumQuantity = minimumOrderQuantities.brookieLanding;

  const toPositiveInt = (value: any, fallback = 0) => {
    const next = Math.floor(Number(value));
    return Number.isFinite(next) && next > 0 ? next : fallback;
  };

  const asText = (value: any) => (typeof value === 'string' ? value.trim() : '');

  const requireAdmin: RequestHandler = (req, res, next) => {
    if (req.session.adminAuthenticated === true) {
      return next();
    }

    return res.status(401).json({ message: "관리자 로그인이 필요합니다." });
  };

  app.get("/api/admin/me", (req, res) => {
    res.json({ authenticated: req.session.adminAuthenticated === true });
  });

  app.post("/api/admin/login", (req, res) => {
    const adminPassword = asText(process.env.ADMIN_PASSWORD);

    if (!adminPassword) {
      return res.status(503).json({
        message: "ADMIN_PASSWORD 환경변수가 설정되어 있지 않습니다.",
      });
    }

    if (asText(req.body?.password) !== adminPassword) {
      return res.status(401).json({ message: "관리자 비밀번호가 올바르지 않습니다." });
    }

    req.session.regenerate((regenerateError) => {
      if (regenerateError) {
        return res.status(500).json({ message: "관리자 세션을 만들지 못했습니다." });
      }

      req.session.adminAuthenticated = true;
      req.session.save((saveError) => {
        if (saveError) {
          return res.status(500).json({ message: "관리자 세션을 저장하지 못했습니다." });
        }

        return res.json({ authenticated: true });
      });
    });
  });

  app.post("/api/admin/logout", requireAdmin, (req, res) => {
    req.session.destroy((error) => {
      res.clearCookie("nm.sid");

      if (error) {
        return res.status(500).json({ message: "로그아웃 처리 중 오류가 발생했습니다." });
      }

      return res.json({ authenticated: false });
    });
  });

  const normalizeDeliveryMethod = (value: any) => {
    const text = asText(value);
    return text === 'quick' || text.includes('퀵') || text.includes('배송') ? 'quick' : 'pickup';
  };

  const getLandingCustomer = (body: any) => {
    const customerName = asText(body.customerName);
    const customerEmail = asText(body.customerEmail || body.customerContact);
    const customerPhone = asText(body.customerPhone);
    const customerContact = customerEmail || customerPhone;
    const deliveryDate = asText(body.deliveryDate || body.date);

    if (!customerName) {
      throw new Error('고객명을 입력해주세요.');
    }
    if (!customerContact) {
      throw new Error('연락처를 입력해주세요.');
    }
    if (!deliveryDate) {
      throw new Error('수령 희망일을 선택해주세요.');
    }

    return {
      customerName,
      customerContact,
      customerEmail,
      customerPhone,
      deliveryDate,
      deliveryMethod: normalizeDeliveryMethod(body.deliveryMethod || body.method),
      pickupTime: asText(body.pickupTime || body.time),
      deliveryAddress: asText(body.deliveryAddress || body.address),
      request: asText(body.request),
    };
  };

  const buildCookie7LandingItems = (body: any) => {
    const flavorLabels: Record<string, string> = {
      'double-choco': '더블초코',
      'walnut-choco': '호두초코',
      'oreo-choco': '오레오초코',
      butterscotch: '버터스카치',
      'black-peanut': '블랙피넛',
      'lotus-caramel': '로투스카라멜',
      'matcha-macadamia': '말차마카다미아',
    };
    const packageMap: Record<string, { name: string; fee: number; unit: number }> = {
      'one-box': { name: '1구박스', fee: 600, unit: 1 },
      'vinyl-tag': { name: '비닐탭 포장', fee: 500, unit: 1 },
      'drink-set': { name: '1구+음료세트', fee: 6500, unit: 1 },
      'two-box': { name: '2구박스', fee: 1500, unit: 2 },
      'four-box': { name: '4구박스', fee: 0, unit: 4 },
    };
    const groups = Array.isArray(body.items) && body.items.length
      ? body.items
      : [{ packageId: body.packageId, flavorQty: body.flavorQty, drink: body.drink, ribbon: body.ribbon }];
    const orderItems: any[] = [];
    let totalPrice = 0;

    groups.forEach((group: any, index: number) => {
      const flavorQty = group?.flavorQty && typeof group.flavorQty === 'object' ? group.flavorQty : {};
      const flavors = Object.entries(flavorQty)
        .map(([id, qty]) => ({ id, name: flavorLabels[id] || id, quantity: toPositiveInt(qty) }))
        .filter((item) => item.quantity > 0);
      const cookieQuantity = flavors.reduce((sum, item) => sum + item.quantity, 0);
      if (cookieQuantity <= 0) return;

      const pkg = packageMap[asText(group?.packageId)] || packageMap['one-box'];
      const boxQuantity = Math.max(1, Math.ceil(cookieQuantity / pkg.unit));
      const flavorText = flavors.map((item) => `${item.name} ${item.quantity}개`).join(', ');

      orderItems.push({
        type: 'regular',
        name: `${pkg.name} 쿠키${groups.length > 1 ? ` 세트 ${index + 1}` : ''}`,
        quantity: cookieQuantity,
        price: cookiePrices.regular,
        options: {
          landingSource: 'cookie7',
          packageName: pkg.name,
          packageId: group?.packageId,
          flavors,
          flavorText,
          drink: asText(group?.drink),
          ribbon: !!group?.ribbon,
        },
      });
      totalPrice += cookieQuantity * cookiePrices.regular;

      if (pkg.fee > 0) {
        orderItems.push({
          type: 'packaging',
          name: pkg.name,
          quantity: boxQuantity,
          price: pkg.fee,
          options: { landingSource: 'cookie7', packageId: group.packageId },
        });
        totalPrice += boxQuantity * pkg.fee;
      }

      if (group?.ribbon) {
        orderItems.push({
          type: 'packaging',
          name: '리본 추가',
          quantity: boxQuantity,
          price: 500,
          options: { landingSource: 'cookie7', packageId: group?.packageId },
        });
        totalPrice += boxQuantity * 500;
      }
    });

    if (body.sticker) {
      orderItems.push({
        type: 'addon',
        name: '스티커 제작',
        quantity: 1,
        price: 20000,
        options: { landingSource: 'cookie7' },
      });
      totalPrice += 20000;
    }

    return { orderItems, totalPrice };
  };

  const buildBrookieLandingItems = (body: any) => {
    const characterLabels: Record<string, string> = {
      bear: '곰돌이',
      rabbit: '토끼',
      tiger: '호랑이',
      birthday_bear: '생일곰',
      miss_bear: '미스곰',
      horse: '말',
    };
    const paperLabels: Record<string, string> = {
      navy: '네이비',
      red: '레드',
      green: '초록',
      white: '화이트',
      black: '블랙',
      custom: '커스텀 종이',
    };
    const premiumCharacters = new Set(['birthday_bear', 'miss_bear', 'horse']);
    const shapeMap: Record<string, string> = {
      bear: 'bear',
      rabbit: 'rabbit',
      tiger: 'tiger',
      birthday_bear: 'birthdayBear',
    };
    const combos = Array.isArray(body.combos) && body.combos.length
      ? body.combos
      : [{
        character: body.character,
        paper: body.paper,
        heartTextEnabled: body.heartTextEnabled,
        heartText: body.heartText,
        customPaperLine1: body.customPaperLine1,
        customPaperLine2: body.customPaperLine2,
        qty: body.qty,
      }];
    const orderItems: any[] = [];
    let totalPrice = 0;
    let totalQuantity = 0;

    combos.forEach((combo: any, index: number) => {
      const quantity = toPositiveInt(combo.qty || combo.quantity, 1);
      const character = asText(combo.character) || 'bear';
      const paper = asText(combo.paper) || 'navy';
      const heartText = asText(combo.heartText);
      const hasHeartText = !!combo.heartTextEnabled && !!heartText;
      const unitAddons =
        (premiumCharacters.has(character) ? 500 : 0) +
        (hasHeartText ? 500 : 0) +
        (paper === 'custom' ? 700 : 0);
      const unitPrice = cookiePrices.brownie + unitAddons;

      orderItems.push({
        type: 'brownie',
        name: `브루키 ${characterLabels[character] || character}${combos.length > 1 ? ` 조합 ${index + 1}` : ''}`,
        quantity,
        price: unitPrice,
        options: {
          landingSource: 'brookie',
          character,
          characterName: characterLabels[character] || character,
          shape: shapeMap[character],
          paper,
          paperName: paperLabels[paper] || paper,
          heartMessage: hasHeartText ? heartText : undefined,
          customPaperLine1: asText(combo.customPaperLine1),
          customPaperLine2: asText(combo.customPaperLine2),
          premiumCharacter: premiumCharacters.has(character),
          customPaper: paper === 'custom',
        },
      });
      totalQuantity += quantity;
      totalPrice += unitPrice * quantity;
    });

    if (totalQuantity < brookieMinimumQuantity) {
      throw new Error(`브루키는 최소 ${brookieMinimumQuantity}개부터 주문 가능해요.`);
    }

    if (body.topper) {
      orderItems.push({
        type: 'addon',
        name: '토퍼 추가',
        quantity: totalQuantity,
        price: 700,
        options: { landingSource: 'brookie', topperKind: asText(body.topperKind) },
      });
      totalPrice += totalQuantity * 700;
    }

    if (body.sticker) {
      orderItems.push({
        type: 'addon',
        name: '스티커 제작',
        quantity: 1,
        price: 20000,
        options: { landingSource: 'brookie' },
      });
      totalPrice += 20000;
    }

    return { orderItems, totalPrice };
  };

  const buildLuckyLandingItems = (body: any) => {
    const quantity = toPositiveInt(body.quantity, 1);
    return {
      orderItems: [{
        type: 'fortune',
        name: '행운쿠키 4가지맛 세트',
        quantity,
        price: cookiePrices.fortune,
        options: {
          landingSource: 'lucky',
          flavors: ['HAPPY 곰돌이', 'RESET 금붕어', 'MONEY 복돼지', 'UP 하트'],
        },
      }],
      totalPrice: quantity * cookiePrices.fortune,
    };
  };

  const validateOrderBusinessRules = (orderData: any) => {
    const singleWithDrinkQuantity = (orderData.singleWithDrinkSets || [])
      .reduce((sum: number, set: any) => sum + (set.quantity || 0), 0);
    if (singleWithDrinkQuantity > 0 && singleWithDrinkQuantity < minimumOrderQuantities.singleWithDrink) {
      throw new Error(`1구+음료는 최소 ${minimumOrderQuantities.singleWithDrink}개 이상 주문해주세요.`);
    }

    const brownieQuantity = (orderData.brownieCookieSets || [])
      .reduce((sum: number, set: any) => sum + (set.quantity || 0), 0);
    if (brownieQuantity > 0 && brownieQuantity < minimumOrderQuantities.brownie) {
      throw new Error(`브라우니쿠키는 최소 ${minimumOrderQuantities.brownie}개 이상 주문해주세요.`);
    }

    const sconeQuantity = (orderData.sconeSets || [])
      .reduce((sum: number, set: any) => sum + (set.quantity || 0), 0);
    if (sconeQuantity > 0 && sconeQuantity < minimumOrderQuantities.scone) {
      throw new Error(`스콘은 최소 ${minimumOrderQuantities.scone}개 이상 주문해주세요.`);
    }
  };

  // Calculate price function
  const calculatePrice = (orderData: any) => {
    let totalPrice = 0;
    let breakdown = {
      regularCookies: 0,
      twoPackSet: 0,
      singleWithDrink: 0,
      packaging: 0,
      brownie: 0,
      scone: 0,
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
      console.log('🍪 브라우니쿠키 계산 시작:', orderData.brownieCookieSets);

      for (const set of orderData.brownieCookieSets) {
        // 기본 가격 (수량 * 개당 가격)
        const basePrice = set.quantity * cookiePrices.brownie;
        breakdown.brownie += basePrice;
        console.log(`  - 세트: 수량=${set.quantity}, 모양=${set.shape}, 기본가격=${basePrice}원`);

        // 생일곰 추가 비용
        if (set.shape === 'birthdayBear') {
          const birthdayBearPrice = set.quantity * cookiePrices.brownieOptions.birthdayBear;
          breakdown.brownie += birthdayBearPrice;
          console.log(`    ✓ 생일곰 추가: ${birthdayBearPrice}원 (${set.quantity}개 × 500원)`);
        } else {
          console.log(`    ✗ 생일곰 아님 (shape: ${set.shape})`);
        }

        // 커스텀 스티커 (세트당)
        if (set.customSticker) {
          breakdown.brownie += cookiePrices.brownieOptions.customSticker;
        }

        // 하트 메시지 (수량만큼)
        if (set.heartMessage) {
          breakdown.brownie += set.quantity * cookiePrices.brownieOptions.heartMessage;
        }
      }

      console.log(`🍪 브라우니쿠키 총액: ${breakdown.brownie}원`);
      totalPrice += breakdown.brownie;
    }

    // Scones (다중 세트)
    if (orderData.sconeSets?.length > 0) {
      breakdown.scone = 0;

      for (const set of orderData.sconeSets) {
        // 기본 가격 (수량 * 개당 가격)
        breakdown.scone += set.quantity * cookiePrices.scone;

        // 딸기잼 추가 (수량만큼)
        if (set.strawberryJam) {
          breakdown.scone += set.quantity * cookiePrices.sconeOptions.strawberryJam;
        }
      }

      totalPrice += breakdown.scone;
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


  // Dynamic manifest for PWA - supports different start URLs
  app.get("/api/manifest.json", (req, res) => {
    const startUrl = req.query.startUrl as string || "/";
    const isAdmin = startUrl.includes('/dashboard');

    const manifest = {
      id: startUrl,
      name: isAdmin ? "낫띵메터스 관리자" : "낫띵메터스 쿠키 주문",
      short_name: isAdmin ? "관리자" : "낫띵메터스",
      description: isAdmin ? "주문 관리 시스템" : "수제 쿠키 예약 주문 시스템",
      start_url: startUrl,
      display: "standalone",
      background_color: "#ffffff",
      theme_color: isAdmin ? "#DC2626" : "#4F46E5",
      orientation: "portrait",
      scope: "/",
      icons: [
        {
          src: "/icon-72x72.png",
          sizes: "72x72",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icon-96x96.png",
          sizes: "96x96",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icon-128x128.png",
          sizes: "128x128",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icon-144x144.png",
          sizes: "144x144",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icon-152x152.png",
          sizes: "152x152",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icon-180x180.png",
          sizes: "180x180",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icon-192x192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: "/icon-384x384.png",
          sizes: "384x384",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "/icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ]
    };

    res.setHeader('Content-Type', 'application/json');
    res.json(manifest);
  });

  // Get all orders endpoint
  app.get("/api/orders", requireAdmin, async (req, res) => {
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
      const orderData = priceCalculationSchema.parse(req.body);
      const result = calculatePrice(orderData);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: "잘못된 요청입니다.", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.options("/api/landing-orders", (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).end();
  });

  // Landing pages submit here before sending users to KakaoTalk.
  app.post("/api/landing-orders", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    try {
      const body = req.body || {};
      const source = asText(body.source);
      const sourceLabel = landingSourceLabels[source];

      if (!sourceLabel) {
        return res.status(400).json({ message: "지원하지 않는 랜딩페이지 주문입니다." });
      }

      const customer = getLandingCustomer(body);
      const built = source === 'brookie'
        ? buildBrookieLandingItems(body)
        : source === 'cookie7'
          ? buildCookie7LandingItems(body)
          : buildLuckyLandingItems(body);

      if (!built.orderItems.length || built.totalPrice <= 0) {
        return res.status(400).json({ message: "주문할 상품을 선택해주세요." });
      }

      const orderItems = [
        ...built.orderItems,
        {
          type: 'meta' as const,
          name: 'metadata',
          quantity: 0,
          price: 0,
          options: {
            ...body,
            source,
            landingSource: source,
            landingSourceLabel: sourceLabel,
            customerPhone: customer.customerPhone,
            customerEmail: customer.customerEmail,
            deliveryAddress: customer.deliveryAddress,
            request: customer.request,
            serverCalculatedTotal: built.totalPrice,
          },
        },
      ];

      const order = await storage.createOrder({
        customerName: customer.customerName,
        customerContact: customer.customerContact,
        deliveryDate: customer.deliveryDate,
        deliveryMethod: customer.deliveryMethod,
        pickupTime: customer.pickupTime,
        orderItems,
        totalPrice: built.totalPrice,
      });

      const emailService = new EmailService();
      emailService.sendLandingAdminNotification({
        order,
        sourceLabel,
        customerPhone: customer.customerPhone,
        customerEmail: customer.customerEmail,
        deliveryAddress: customer.deliveryAddress,
        request: customer.request,
      })
        .catch((error) => console.error('❌ 랜딩 주문 관리자 이메일 전송 실패:', error));

      pushNotificationService.sendNewOrderNotification(customer.customerName, order.id)
        .catch((error) => console.error('❌ 랜딩 주문 푸시 알림 전송 실패:', error));

      if (kakaoAlimtalkService.isEnabled()) {
        kakaoAlimtalkService.sendAdminNotification({
          customerName: customer.customerName,
          customerContact: customer.customerContact,
          deliveryDate: customer.deliveryDate,
          deliveryMethod: customer.deliveryMethod,
          totalPrice: built.totalPrice,
        }).catch((error) => console.error('❌ 랜딩 주문 관리자 알림톡 실패:', error));
      }

      if (googleSheetsService.isEnabled()) {
        googleSheetsService.appendOrderToSheet(order)
          .catch((error) => console.error('❌ 랜딩 주문 Google Sheets 저장 실패:', error));
      }

      res.json({
        success: true,
        message: "주문이 관리자 대시보드에 저장되었습니다.",
        orderId: order.id,
        totalPrice: built.totalPrice,
      });
    } catch (error) {
      console.error('Landing order error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "주문 저장 중 오류가 발생했습니다.",
      });
    }
  });

  // Download quote Excel (주문 생성 없이 Excel만 다운로드)
  app.post("/api/download-quote-excel", async (req, res) => {
    try {
      console.log('Excel 견적서 다운로드 요청 받음');
      const orderData = orderDataSchema.parse(req.body);
      validateOrderBusinessRules(orderData);
      const buffer = await excelGenerator.generateQuote(orderData);
      const fileName = `견적서_${orderData.customerName}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Send Excel file
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        createAttachmentHeader(fileName)
      );
      res.send(Buffer.from(buffer));
      console.log('Excel 파일 전송 완료');
    } catch (error) {
      console.error('Excel 다운로드 오류:', error);
      res.status(500).json({
        message: "견적서 다운로드 중 오류가 발생했습니다.",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/orders/:id/quote-excel", requireAdmin, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
      }

      const orderData = orderDataSchema.parse(buildOrderDataFromOrder(order));
      const buffer = await excelGenerator.generateQuote(orderData);
      const fileName = `견적서_${order.customerName}_${new Date().toISOString().split('T')[0]}.xlsx`;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        createAttachmentHeader(fileName)
      );
      res.send(Buffer.from(buffer));
      console.log(`[API] 주문 견적서 파일 전송 완료: ${req.params.id}`);
    } catch (error) {
      console.error('주문 견적서 다운로드 오류:', error);
      res.status(500).json({
        message: "견적서 다운로드 중 오류가 발생했습니다.",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Generate and send quote
  app.post("/api/generate-quote", async (req, res) => {
    try {
      console.log('견적서 생성 요청 받음:', JSON.stringify(req.body, null, 2));

      const processPromise = async () => {
        const orderData = orderDataSchema.parse(req.body);
        validateOrderBusinessRules(orderData);

        // Validate email for sending quote
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(orderData.customerContact)) {
          throw new Error("견적서 전송을 위해 올바른 이메일 주소를 입력해주세요.");
        }

        console.log('주문 데이터 파싱 성공:', orderData);

        // Calculate total price
        const { totalPrice } = calculatePrice(orderData);
        console.log('총 금액 계산 완료:', totalPrice);

        // Generate Excel quote
        console.log('Excel 견적서 생성 시작...');
        const quoteBuffer = await excelGenerator.generateQuote(orderData);
        console.log('Excel 견적서 생성 완료, 크기:', quoteBuffer.length, 'bytes');

        // Send email via Gmail API (Replit 통합) - Background processing
        console.log('이메일 전송 시작 (백그라운드)...');
        console.log('환경 변수 확인 - GMAIL_USER:', process.env.GMAIL_USER ? '설정됨' : '없음');
        console.log('환경 변수 확인 - GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '설정됨' : '없음');

        const emailService = new EmailService();

        // 30초 timeout 추가
        const emailTimeout = setTimeout(() => {
          console.error('⏰ 이메일 전송 타임아웃 (30초 초과)');
        }, 30000);

        // await 제거하여 비동기로 처리 (Fire-and-forget)
        emailService.sendQuote(orderData, quoteBuffer)
          .then(() => {
            clearTimeout(emailTimeout);
            console.log('✅ 이메일 전송 완료');
          })
          .catch((emailError) => {
            clearTimeout(emailTimeout);
            console.error('❌ 이메일 전송 실패:', emailError);
            console.error('에러 상세:', emailError.message);
            if (emailError.stack) {
              console.error('스택 트레이스:', emailError.stack);
            }
          });

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

        // Add brownie cookie sets (multiple sets)
        if (orderData.brownieCookieSets?.length > 0) {
          orderData.brownieCookieSets.forEach((set, index) => {
            orderItems.push({
              type: 'brownie' as const,
              name: `브라우니쿠키 세트 ${index + 1}`,
              quantity: set.quantity || 1,
              price: cookiePrices.brownie,
              options: {
                shape: set.shape,
                customSticker: set.customSticker,
                heartMessage: set.heartMessage,
                customTopper: set.customTopper,
              },
            });
          });
        }

        // Add scone sets (multiple sets)
        if (orderData.sconeSets?.length > 0) {
          orderData.sconeSets.forEach((set, index) => {
            orderItems.push({
              type: 'scone' as const,
              name: `스콘 세트 ${index + 1}`,
              quantity: set.quantity || 1,
              price: cookiePrices.scone,
              options: {
                flavor: set.flavor,
                strawberryJam: set.strawberryJam,
              },
            });
          });
        }

        // Add packaging
        if (orderData.packaging) {
          const packagingName = orderData.packaging === 'single_box' ? '1구박스' :
            orderData.packaging === 'plastic_wrap' ? '비닐탭포장' : '유산지';
          const packagingPrice = cookiePrices.packaging[orderData.packaging];

          // 포장 수량 계산 (일반 쿠키 수량과 동일하거나 1개)
          let packagingQuantity = 1;
          if (orderData.packaging === 'single_box' || orderData.packaging === 'plastic_wrap') {
            const regularQty = Object.values(orderData.regularCookies || {}).reduce((sum, q) => sum + q, 0);
            packagingQuantity = regularQty > 0 ? regularQty : 1;
          }

          if (packagingPrice > 0 || orderData.packaging === 'oil_paper') {
            orderItems.push({
              type: 'packaging' as const,
              name: packagingName,
              quantity: packagingQuantity,
              price: packagingPrice,
            });
          }
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

        // 메타 데이터 저장 (DB 스키마 변경 없이 원본 데이터 보존)
        orderItems.push({
          type: 'meta' as const,
          name: 'metadata',
          quantity: 0,
          price: 0,
          options: orderData
        });

        const order = await storage.createOrder({
          customerName: orderData.customerName,
          customerContact: orderData.customerContact,
          deliveryDate: orderData.deliveryDate,
          deliveryMethod: orderData.deliveryMethod,
          pickupTime: orderData.pickupTime,
          orderItems,
          totalPrice,
        });
        console.log(`[API] 주문 생성 완료: ID=${order.id}, PickupTime=${orderData.pickupTime}`);

        // 새 주문 푸시 알림 전송 (백그라운드에서 실행)
        pushNotificationService.sendNewOrderNotification(orderData.customerName, order.id)
          .then(() => {
            console.log('✅ 새 주문 푸시 알림 전송 완료');
          })
          .catch((error) => {
            console.error('❌ 푸시 알림 전송 실패:', error);
          });

        // 카카오톡 알림톡 전송 (백그라운드에서 실행)
        if (kakaoAlimtalkService.isEnabled()) {
          // 관리자 알림
          kakaoAlimtalkService.sendAdminNotification({
            customerName: orderData.customerName,
            customerContact: orderData.customerContact,
            deliveryDate: orderData.deliveryDate,
            deliveryMethod: orderData.deliveryMethod || 'pickup',
            totalPrice,
          })
            .then((success) => {
              if (success) {
                console.log('✅ 관리자 알림톡 전송 완료');
              }
            })
            .catch((error) => {
              console.error('❌ 관리자 알림톡 전송 실패:', error);
            });

          // 고객 알림 (선택사항)
          const orderItemsText = orderItems.map(item => `${item.name} x${item.quantity}`).join(', ');
          kakaoAlimtalkService.sendCustomerNotification({
            customerName: orderData.customerName,
            customerContact: orderData.customerContact,
            orderItems: orderItemsText,
            deliveryDate: orderData.deliveryDate,
            totalPrice,
          })
            .then((success) => {
              if (success) {
                console.log('✅ 고객 알림톡 전송 완료');
              }
            })
            .catch((error) => {
              console.error('❌ 고객 알림톡 전송 실패:', error);
            });
        }

        // Google Sheets에 주문 저장 (백그라운드에서 실행)
        if (googleSheetsService.isEnabled()) {
          googleSheetsService.appendOrderToSheet(order)
            .then((success) => {
              if (success) {
                console.log('✅ Google Sheets 주문 저장 완료');
              }
            })
            .catch((error) => {
              console.error('❌ Google Sheets 주문 저장 실패:', error);
            });
        }

        return {
          message: "견적서가 이메일로 전송되었습니다!",
          orderId: order.id
        };
      };

      // 타임아웃 제거하고 바로 실행
      const result = await processPromise();
      res.json(result);

    } catch (error) {
      console.error('Quote generation error:', error);
      res.status(500).json({
        message: "견적서 생성 중 오류가 발생했습니다. 다시 시도해주세요.",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Generate KakaoTalk message template
  app.post("/api/generate-kakao-message", requireAdmin, async (req, res) => {
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
        deliveryMethod: (order as any).deliveryMethod || 'pickup',
        regularCookies: {} as Record<string, number>,
        packaging: undefined as 'single_box' | 'plastic_wrap' | 'oil_paper' | undefined,
        brownieCookieSets: [] as Array<{ quantity: number, shape?: 'bear' | 'rabbit' | 'birthdayBear', customSticker: boolean, heartMessage?: string, customTopper: boolean }>,
        sconeSets: [] as Array<{ quantity: number, flavor: 'chocolate' | 'gourmetButter', strawberryJam: boolean }>,
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
            orderData.brownieCookieSets.push({
              quantity: item.quantity,
              shape: item.options?.shape as 'bear' | 'rabbit' | 'birthdayBear' | undefined,
              customSticker: item.options?.customSticker || false,
              heartMessage: item.options?.heartMessage,
              customTopper: item.options?.customTopper || false,
            });
            break;
          case 'fortune':
            orderData.fortuneCookie = item.quantity;
            break;
          case 'airplane':
            orderData.airplaneSandwich = item.quantity;
            break;
          case 'scone':
            orderData.sconeSets.push({
              quantity: item.quantity,
              flavor: item.options?.flavor || 'chocolate',
              strawberryJam: item.options?.strawberryJam || false,
            });
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
  app.post('/api/push/subscribe', requireAdmin, async (req, res) => {
    try {
      const subscription = req.body;
      await pushNotificationService.addSubscription(subscription, req.get('user-agent'));
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
  app.post('/api/push/unsubscribe', requireAdmin, async (req, res) => {
    try {
      const subscription = req.body;
      await pushNotificationService.removeSubscription(subscription);
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
  app.post('/api/push/test', requireAdmin, async (req, res) => {
    try {
      const subscriberCount = await pushNotificationService.sendTestNotification();
      res.json({
        success: true,
        message: '테스트 알림이 전송되었습니다.',
        subscriberCount
      });
    } catch (error) {
      console.error('Test push notification error:', error);
      const subscriberCount = await pushNotificationService.getSubscriberCount().catch(() => 0);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '테스트 알림 전송에 실패했습니다.',
        subscriberCount,
      });
    }
  });

  // 주문 상태 변경
  app.patch('/api/orders/:id/status', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['pending', 'order_confirmed', 'payment_confirmed', 'in_production', 'completed'].includes(status)) {
        return res.status(400).json({ message: '올바른 상태 값이 아닙니다.' });
      }

      const updatedOrder = await storage.updateOrderStatus(id, status);

      if (!updatedOrder) {
        return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
      }

      res.json(updatedOrder);
    } catch (error) {
      console.error('주문 상태 업데이트 오류:', error);
      res.status(500).json({
        message: '주문 상태 업데이트 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 입금 확인 상태 변경
  app.patch('/api/orders/:id/payment', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { confirmed } = req.body;

      if (typeof confirmed !== 'boolean') {
        return res.status(400).json({ message: 'confirmed는 boolean 값이어야 합니다.' });
      }

      const updatedOrder = await storage.updatePaymentStatus(id, confirmed);

      if (!updatedOrder) {
        return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
      }

      res.json(updatedOrder);
    } catch (error) {
      console.error('입금 상태 업데이트 오류:', error);
      res.status(500).json({
        message: '입금 상태 업데이트 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 결제 방법 업데이트
  app.patch('/api/orders/:id/payment-method', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { method } = req.body;

      if (method !== null && !['card', 'cash', 'transfer'].includes(method)) {
        return res.status(400).json({ message: '올바른 결제 방법이 아닙니다. (card, cash, transfer)' });
      }

      const updatedOrder = await storage.updatePaymentMethod(id, method);

      if (!updatedOrder) {
        return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
      }

      res.json(updatedOrder);
    } catch (error) {
      console.error('결제 방법 업데이트 오류:', error);
      res.status(500).json({
        message: '결제 방법 업데이트 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 주문 일괄 삭제
  app.post('/api/orders/bulk-delete', requireAdmin, async (req, res) => {
    try {
      const ids = Array.isArray(req.body?.ids)
        ? req.body.ids.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
        : [];

      const uniqueIds: string[] = Array.from(new Set<string>(ids));

      if (uniqueIds.length === 0) {
        return res.status(400).json({ message: '삭제할 주문을 선택해주세요.' });
      }

      const deletedIds = await storage.deleteOrders(uniqueIds);

      if (deletedIds.length === 0) {
        return res.status(404).json({
          message: '삭제할 주문을 찾을 수 없습니다.',
          success: false,
          deletedCount: 0,
          deletedIds: [],
        });
      }

      res.json({
        message: `${deletedIds.length}건 주문이 삭제되었습니다.`,
        success: true,
        deletedCount: deletedIds.length,
        deletedIds,
      });
    } catch (error) {
      console.error('주문 일괄 삭제 오류:', error);
      res.status(500).json({
        message: '주문 일괄 삭제 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // 주문 삭제
  app.delete('/api/orders/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const success = await storage.deleteOrder(id);

      if (!success) {
        return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
      }

      res.json({ message: '주문이 삭제되었습니다.', success: true });
    } catch (error) {
      console.error('주문 삭제 오류:', error);
      res.status(500).json({
        message: '주문 삭제 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 기존 주문으로 Google Sheets 견적서 탭 생성
  app.post('/api/sheets/orders/:id/append', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      if (!googleSheetsService.isEnabled()) {
        return res.status(400).json({
          success: false,
          message: 'Google Sheets 서비스가 비활성화되어 있습니다. 환경 변수를 확인하세요.'
        });
      }

      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: '주문을 찾을 수 없습니다.'
        });
      }

      const quoteSheet = await googleSheetsService.createQuoteSheet(order);

      if (!quoteSheet) {
        return res.status(500).json({
          success: false,
          message: 'Google Sheets에 견적서 시트를 만들지 못했습니다. 시트 권한과 서비스 계정을 확인해주세요.'
        });
      }

      res.json({
        success: true,
        message: 'Google Sheets에 견적서 시트가 저장되었습니다.',
        orderId: id,
        sheetId: quoteSheet.sheetId,
        sheetTitle: quoteSheet.sheetTitle,
        sheetUrl: quoteSheet.sheetUrl,
      });
    } catch (error) {
      console.error('Google Sheets 견적서 시트 생성 오류:', error);
      res.status(500).json({
        success: false,
        message: 'Google Sheets 견적서 시트 생성 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Google Sheets 헤더 초기화 (선택사항 - 최초 1회만 실행)
  app.post('/api/sheets/init-headers', requireAdmin, async (req, res) => {
    try {
      if (!googleSheetsService.isEnabled()) {
        return res.status(400).json({
          message: 'Google Sheets 서비스가 비활성화되어 있습니다. 환경 변수를 확인하세요.'
        });
      }

      const success = await googleSheetsService.initializeSheetHeaders();

      if (success) {
        res.json({
          message: 'Google Sheets 헤더가 성공적으로 초기화되었습니다.',
          success: true
        });
      } else {
        res.status(500).json({
          message: 'Google Sheets 헤더 초기화에 실패했습니다.',
          success: false
        });
      }
    } catch (error) {
      console.error('Google Sheets 헤더 초기화 오류:', error);
      res.status(500).json({
        message: 'Google Sheets 헤더 초기화 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Google Sheets 연동 테스트
  app.get('/api/sheets/test', requireAdmin, async (req, res) => {
    try {
      console.log('=== Google Sheets 테스트 시작 ===');

      // 1. 환경 변수 확인
      const config = {
        spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
        serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        privateKeyExists: !!process.env.GOOGLE_PRIVATE_KEY,
        privateKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length || 0,
      };

      console.log('환경 변수 상태:', {
        spreadsheetId: config.spreadsheetId ? '설정됨' : '없음',
        serviceAccountEmail: config.serviceAccountEmail ? '설정됨' : '없음',
        privateKey: config.privateKeyExists ? `설정됨 (${config.privateKeyLength}자)` : '없음',
      });

      // 2. 서비스 활성화 상태 확인
      const isEnabled = googleSheetsService.isEnabled();
      console.log('Google Sheets 서비스 활성화:', isEnabled);

      if (!isEnabled) {
        return res.status(400).json({
          success: false,
          message: 'Google Sheets 서비스가 비활성화되어 있습니다.',
          config: {
            spreadsheetId: config.spreadsheetId ? '설정됨' : '❌ 없음',
            serviceAccountEmail: config.serviceAccountEmail ? '설정됨' : '❌ 없음',
            privateKey: config.privateKeyExists ? '설정됨' : '❌ 없음',
          }
        });
      }

      // 3. 테스트 주문 데이터 생성
      const testOrder = {
        id: 'TEST-' + Date.now(),
        customerName: '테스트 고객',
        customerContact: 'test@example.com',
        deliveryDate: new Date().toISOString().split('T')[0],
        deliveryMethod: 'pickup' as const,
        pickupTime: '12:00',
        totalPrice: 10000,
        orderStatus: 'pending' as const,
        paymentConfirmed: false,
        createdAt: new Date().toISOString(),
        orderItems: [{
          type: 'meta' as const,
          name: 'metadata',
          quantity: 0,
          price: 0,
          options: {
            customerName: '테스트 고객',
            customerContact: 'test@example.com',
            deliveryDate: new Date().toISOString().split('T')[0],
            deliveryMethod: 'pickup' as const,
            pickupTime: '12:00',
            customerPhone: '010-1234-5678',
            regularCookies: { '초코칩': 1 },
            packaging: 'plastic_wrap' as const,
          }
        }]
      };

      // 4. 스프레드시트에 테스트 주문 저장
      console.log('테스트 주문 저장 시도...');
      const success = await googleSheetsService.appendOrderToSheet(testOrder as any);

      if (success) {
        console.log('✅ 테스트 주문 저장 성공');
        res.json({
          success: true,
          message: '✅ Google Sheets 연동 테스트 성공!',
          testOrder: {
            id: testOrder.id,
            customerName: testOrder.customerName,
            spreadsheetId: config.spreadsheetId,
          },
          config: {
            spreadsheetId: config.spreadsheetId,
            serviceAccountEmail: config.serviceAccountEmail,
          }
        });
      } else {
        console.log('❌ 테스트 주문 저장 실패');
        res.status(500).json({
          success: false,
          message: '❌ Google Sheets에 데이터 저장 실패',
          config: {
            spreadsheetId: config.spreadsheetId,
            serviceAccountEmail: config.serviceAccountEmail,
          }
        });
      }

    } catch (error) {
      console.error('❌ Google Sheets 테스트 오류:', error);
      res.status(500).json({
        success: false,
        message: 'Google Sheets 테스트 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
