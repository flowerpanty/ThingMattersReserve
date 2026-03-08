import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { orderDataSchema, cookiePrices } from "@shared/schema";
import { ExcelGenerator } from "./services/excel-generator";
import { EmailService } from "./services/email-service";
import { KakaoTemplateService } from "./services/kakao-template";
import { pushNotificationService } from "./services/push-notification-service";
import { kakaoAlimtalkService } from "./services/kakao-alimtalk-service";
import { googleSheetsService } from "./services/google-sheets-service";
import * as ExcelJS from 'exceljs';

export async function registerRoutes(app: Express): Promise<Server> {
  const excelGenerator = new ExcelGenerator();
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

  // Download quote Excel (주문 생성 없이 Excel만 다운로드)
  app.post("/api/download-quote-excel", async (req, res) => {
    try {
      console.log('Excel 견적서 다운로드 요청 받음');

      const { customerName, customerContact, deliveryDate, deliveryMethod, pickupTime, orderItems } = req.body;

      if (!customerName || !customerContact || !orderItems) {
        throw new Error('필수 데이터가 누락되었습니다.');
      }

      // Create workbook with robust fallback for different import styles
      const WorkbookClass = ExcelJS.Workbook || (ExcelJS as any).default?.Workbook;
      if (!WorkbookClass) {
        throw new Error('ExcelJS Workbook class not found');
      }
      const workbook = new WorkbookClass();

      const worksheet = workbook.addWorksheet('견적서');

      // Set column widths
      worksheet.getColumn(1).width = 30;
      worksheet.getColumn(2).width = 10;
      worksheet.getColumn(3).width = 15;
      worksheet.getColumn(4).width = 15;

      // Border style
      const borderStyle = {
        top: { style: 'thin' as const },
        left: { style: 'thin' as const },
        bottom: { style: 'thin' as const },
        right: { style: 'thin' as const }
      };

      // Header
      worksheet.mergeCells('A1:D1');
      worksheet.getCell('A1').value = 'nothingmatters 견적서';
      worksheet.getCell('A1').style = {
        font: { bold: true, size: 16, color: { argb: 'FFFFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } },
        border: borderStyle
      };
      worksheet.getRow(1).height = 35;

      // Customer info
      worksheet.mergeCells('A2:D2');
      worksheet.getCell('A2').value = `고객명: ${customerName} | 연락처: ${customerContact}`;
      worksheet.getCell('A2').style = {
        font: { size: 10 },
        alignment: { horizontal: 'left', vertical: 'middle' },
        border: borderStyle
      };
      worksheet.getRow(2).height = 25;

      // Delivery info
      worksheet.mergeCells('A3:D3');
      const deliveryMethodText = deliveryMethod === 'pickup' ? '매장 픽업' : '퀵 배송';
      let deliveryText = `수령 방법: ${deliveryMethodText} | 수령 희망일: ${deliveryDate}`;
      if (pickupTime) {
        deliveryText += ` | 시간: ${pickupTime}`;
      }
      worksheet.getCell('A3').value = deliveryText;
      worksheet.getCell('A3').style = {
        font: { size: 10 },
        alignment: { horizontal: 'left', vertical: 'middle' },
        border: borderStyle
      };
      worksheet.getRow(3).height = 25;

      // Empty row
      worksheet.getRow(4).height = 10;

      // Table headers
      const headers = ['제품명', '수량', '단가', '합계'];
      headers.forEach((header, index) => {
        const cell = worksheet.getCell(5, index + 1);
        cell.value = header;
        cell.style = {
          font: { bold: true, size: 11 },
          alignment: { horizontal: 'center', vertical: 'middle' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } },
          border: borderStyle
        };
      });
      worksheet.getRow(5).height = 30;

      // Order items
      let currentRow = 6;
      let totalAmount = 0;

      orderItems.forEach((item: any) => {
        const itemTotal = item.price * item.quantity;
        totalAmount += itemTotal;

        worksheet.getCell(currentRow, 1).value = item.name;
        worksheet.getCell(currentRow, 1).style = {
          font: { size: 10 },
          alignment: { horizontal: 'left', vertical: 'middle' },
          border: borderStyle
        };

        worksheet.getCell(currentRow, 2).value = `${item.quantity}개`;
        worksheet.getCell(currentRow, 2).style = {
          font: { size: 10 },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: borderStyle
        };

        worksheet.getCell(currentRow, 3).value = item.price;
        worksheet.getCell(currentRow, 3).style = {
          font: { size: 10 },
          alignment: { horizontal: 'right', vertical: 'middle' },
          border: borderStyle,
          numFmt: '#,##0"원"'
        };

        worksheet.getCell(currentRow, 4).value = itemTotal;
        worksheet.getCell(currentRow, 4).style = {
          font: { size: 10 },
          alignment: { horizontal: 'right', vertical: 'middle' },
          border: borderStyle,
          numFmt: '#,##0"원"'
        };

        worksheet.getRow(currentRow).height = 30;
        currentRow++;
      });

      // Total
      currentRow += 1;
      worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
      worksheet.getCell(currentRow, 1).value = '총 합계';
      worksheet.getCell(currentRow, 1).style = {
        font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } },
        border: borderStyle
      };

      worksheet.getCell(currentRow, 4).value = totalAmount;
      worksheet.getCell(currentRow, 4).style = {
        font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
        alignment: { horizontal: 'right', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } },
        border: borderStyle,
        numFmt: '#,##0"원"'
      };
      worksheet.getRow(currentRow).height = 35;

      // Account info
      currentRow += 2;
      worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
      worksheet.getCell(currentRow, 1).value = '입금 계좌: 83050104204736 국민은행 (낫띵메터스)';
      worksheet.getCell(currentRow, 1).style = {
        font: { bold: true, size: 11 },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } },
        border: borderStyle
      };
      worksheet.getRow(currentRow).height = 35;

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Send Excel file
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="견적서_${customerName}_${new Date().getTime()}.xlsx"`
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

  // Generate and send quote
  app.post("/api/generate-quote", async (req, res) => {
    try {
      console.log('견적서 생성 요청 받음:', JSON.stringify(req.body, null, 2));

      const processPromise = async () => {
        const orderData = orderDataSchema.parse(req.body);

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
        if (pushNotificationService.hasSubscriptions()) {
          pushNotificationService.sendNewOrderNotification(orderData.customerName, order.id)
            .then(() => {
              console.log('✅ 새 주문 푸시 알림 전송 완료');
            })
            .catch((error) => {
              console.error('❌ 푸시 알림 전송 실패:', error);
            });
        }

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

  // 주문 상태 변경
  app.patch('/api/orders/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['pending', 'payment_confirmed', 'in_production', 'completed'].includes(status)) {
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
  app.patch('/api/orders/:id/payment', async (req, res) => {
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
  app.patch('/api/orders/:id/payment-method', async (req, res) => {
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

  // 주문 삭제
  app.delete('/api/orders/:id', async (req, res) => {
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

  // Google Sheets 헤더 초기화 (선택사항 - 최초 1회만 실행)
  app.post('/api/sheets/init-headers', async (req, res) => {
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
  app.get('/api/sheets/test', async (req, res) => {
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
