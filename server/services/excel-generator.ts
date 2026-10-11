import ExcelJS from 'exceljs';
import { type Order, type OrderData, cookiePrices, cookieTypes, drinkTypes } from '@shared/schema';
import { brookieItemDetails, storedBrookieQuote } from './landing-email-quote';

export class ExcelGenerator {
  async generateQuoteFromStoredItems(order: Order, landingSource: 'cookieFlight' | 'airplaneButter' | 'terminalCookie' | 'brookie'): Promise<Buffer> {
    if (landingSource === 'brookie') storedBrookieQuote(order);
    const items = (Array.isArray(order.orderItems) ? order.orderItems as any[] : [])
      .filter((item) => item?.type !== 'meta' && item?.options?.landingSource === landingSource);
    if (!items.length || items.some((item) =>
      !Number.isSafeInteger(item.quantity) || item.quantity < 1 ||
      !Number.isSafeInteger(item.price) || item.price < 1 ||
      typeof item.name !== 'string' || !item.name.trim())) {
      throw new Error('저장된 주문 항목의 수량 또는 가격을 확인할 수 없습니다.');
    }

    const calculatedTotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    if (!Number.isSafeInteger(calculatedTotal) || calculatedTotal !== order.totalPrice) {
      throw new Error('저장된 주문 항목과 총 금액이 일치하지 않습니다.');
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('nothingmatters 견적서');
    sheet.columns = [
      { width: 36 }, { width: 14 }, { width: 16 }, { width: 18 },
    ];
    const border = {
      top: { style: 'thin' as const }, left: { style: 'thin' as const },
      bottom: { style: 'thin' as const }, right: { style: 'thin' as const },
    };
    const money = '#,##0"원"';

    sheet.mergeCells('A1:D1');
    sheet.getCell('A1').value = 'nothingmatters 견적서';
    sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 35;

    sheet.mergeCells('A2:D2');
    sheet.getCell('A2').value = `고객명: ${order.customerName} | 연락처: ${order.customerContact}`;
    sheet.mergeCells('A3:D3');
    const method = order.deliveryMethod === 'quick' ? '퀵 배송' : '매장 픽업';
    const metadata = (order.orderItems as any[]).find((item) => item?.type === 'meta')?.options || {};
    sheet.getCell('A3').value = `수령 방법: ${method} | 수령 희망일: ${order.deliveryDate}${order.pickupTime ? ` | 시간: ${order.pickupTime}` : ''}${metadata.deliveryAddress ? ` | 주소: ${metadata.deliveryAddress}` : ''}`;
    sheet.getRow(3).height = metadata.deliveryAddress ? 44 : 28;
    sheet.getCell('A3').alignment = { wrapText: true, vertical: 'middle' };

    ['제품명', '수량', '단가', '합계'].forEach((label, index) => {
      const cell = sheet.getCell(5, index + 1);
      cell.value = label;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = border;
    });

    let rowNumber = 6;
    for (const item of items) {
      const row = sheet.getRow(rowNumber++);
      row.values = [item.name, `${item.quantity}${item.options?.unitLabel ?? '개'}`, item.price, item.quantity * item.price];
      row.height = 32;
      row.eachCell((cell) => { cell.border = border; cell.alignment = { vertical: 'middle', wrapText: true }; });
      row.getCell(3).numFmt = money;
      row.getCell(4).numFmt = money;
    }

    rowNumber++;
    sheet.mergeCells(`A${rowNumber}:C${rowNumber}`);
    sheet.getCell(rowNumber, 1).value = '총 합계';
    sheet.getCell(rowNumber, 4).value = calculatedTotal;
    sheet.getCell(rowNumber, 4).numFmt = money;
    sheet.getRow(rowNumber).height = 35;
    for (let column = 1; column <= 4; column++) {
      const cell = sheet.getCell(rowNumber, column);
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.border = border;
    }

    for (const item of items) {
      const options = item.options || {};
      const details = [
        ...(landingSource === 'brookie' ? brookieItemDetails(item) : []),
        options.packageName && `포장: ${options.packageName}`,
        Array.isArray(options.flavors) && `맛 구성: ${options.flavors.join(', ')}`,
        options.individuallyWrapped && '개별 포장',
      ].filter(Boolean);
      if (!details.length) continue;
      rowNumber += 2;
      sheet.mergeCells(`A${rowNumber}:D${rowNumber}`);
      sheet.getCell(rowNumber, 1).value = `${item.name} · ${details.join(' · ')}`;
      sheet.getCell(rowNumber, 1).alignment = { wrapText: true, vertical: 'middle' };
      sheet.getRow(rowNumber).height = Math.max(44, Math.ceil(String(sheet.getCell(rowNumber, 1).value).length / 48) * 18);
    }

    if (landingSource === 'brookie') {
      for (const text of [
        metadata.customerEmail && `이메일: ${metadata.customerEmail}`,
        '입금 계좌: 83050104204736 국민은행 (낫띵메터스)',
        '주문 문의: 카카오톡 @nothingmatters 또는 010-2866-7976',
        '※ 본 견적은 주문 접수용이며 카카오톡 상담 완료 후 주문이 최종 확정됩니다.',
      ].filter(Boolean)) {
        rowNumber += 2;
        sheet.mergeCells(`A${rowNumber}:D${rowNumber}`);
        sheet.getCell(rowNumber, 1).value = String(text);
        sheet.getCell(rowNumber, 1).alignment = { wrapText: true, vertical: 'middle' };
        sheet.getRow(rowNumber).height = 38;
      }
    }

    sheet.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async generateQuote(orderData: OrderData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('nothingmatters 견적서');

    // 개선된 컬럼 너비 설정 (텍스트가 잘리지 않도록)
    worksheet.getColumn(1).width = 28; // 제품명 (더 넓게)
    worksheet.getColumn(2).width = 10; // 수량
    worksheet.getColumn(3).width = 15; // 단가
    worksheet.getColumn(4).width = 15; // 합계

    // 스타일 정의 (모바일 친화적, 명확한 테두리)
    const borderStyle = {
      top: { style: 'thin' as const, color: { argb: 'FF000000' } },
      left: { style: 'thin' as const, color: { argb: 'FF000000' } },
      bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
      right: { style: 'thin' as const, color: { argb: 'FF000000' } }
    };

    const titleStyle = {
      font: { bold: true, size: 16, name: 'Arial', color: { argb: 'FFFFFFFF' } },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4F46E5' } },
      border: borderStyle
    };

    const headerStyle = {
      font: { bold: true, size: 11, name: 'Arial' },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE5E7EB' } },
      border: borderStyle
    };

    const cellStyle = {
      font: { size: 10, name: 'Arial' },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
      border: borderStyle
    };

    const priceStyle = {
      font: { size: 10, name: 'Arial' },
      alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
      border: borderStyle,
      numFmt: '#,##0"원"'
    };

    const leftAlignStyle = {
      font: { size: 10, name: 'Arial' },
      alignment: { horizontal: 'left' as const, vertical: 'middle' as const, wrapText: true },
      border: borderStyle
    };

    const detailStyle = {
      font: { size: 9, name: 'Arial' },
      alignment: { horizontal: 'left' as const, vertical: 'top' as const, wrapText: true },
      border: borderStyle
    };

    // 1. 헤더 - 회사명과 견적서 제목
    // 병합할 모든 셀에 먼저 테두리 적용
    for (let col = 1; col <= 4; col++) {
      worksheet.getCell(1, col).style = titleStyle;
    }
    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value = 'nothingmatters 견적서';
    worksheet.getRow(1).height = 35;

    // 2. 고객 정보
    // 병합할 모든 셀에 먼저 테두리 적용
    for (let col = 1; col <= 4; col++) {
      worksheet.getCell(2, col).style = leftAlignStyle;
    }
    worksheet.mergeCells('A2:D2');
    worksheet.getCell('A2').value = `고객명: ${orderData.customerName} | 이메일: ${orderData.customerContact} | 핸드폰: ${orderData.customerPhone || ''}`.trim();
    worksheet.getRow(2).height = 28;

    // 3. 수령 방법과 날짜
    // 병합할 모든 셀에 먼저 테두리 적용
    for (let col = 1; col <= 4; col++) {
      worksheet.getCell(3, col).style = leftAlignStyle;
    }
    worksheet.mergeCells('A3:D3');
    const deliveryMethodText = orderData.deliveryMethod === 'pickup' ? '매장 픽업' : '퀵 배송';
    let deliveryText = `수령 방법: ${deliveryMethodText} | 수령 희망일: ${orderData.deliveryDate}`;

    if (orderData.pickupTime) {
      deliveryText += ` | 시간: ${orderData.pickupTime}`;
    }

    // 퀵배송 시 주소 추가
    if (orderData.deliveryMethod === 'quick' && orderData.deliveryAddress) {
      deliveryText += `\n배송 주소: ${orderData.deliveryAddress}`;
    }

    worksheet.getCell('A3').value = deliveryText;
    worksheet.getRow(3).height = orderData.deliveryMethod === 'quick' && orderData.deliveryAddress ? 45 : 28;

    // 4. 빈 줄
    worksheet.getRow(4).height = 10;

    // 5. 테이블 헤더
    const headers = ['제품명', '수량', '단가', '합계'];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(5, index + 1);
      cell.value = header;
      cell.style = headerStyle;
    });
    worksheet.getRow(5).height = 30;

    // 6. 주문 항목들 추가
    let currentRow = 6;
    let totalAmount = 0;

    // 일반 쿠키
    const regularCookieQuantity = Object.values(orderData.regularCookies || {}).reduce((sum, qty) => sum + qty, 0);
    if (regularCookieQuantity > 0) {
      const amount = regularCookieQuantity * cookiePrices.regular;
      totalAmount += amount;

      worksheet.getCell(currentRow, 1).value = '일반쿠키';
      worksheet.getCell(currentRow, 1).style = cellStyle;
      worksheet.getCell(currentRow, 2).value = regularCookieQuantity;
      worksheet.getCell(currentRow, 2).style = cellStyle;
      worksheet.getCell(currentRow, 3).value = cookiePrices.regular;
      worksheet.getCell(currentRow, 3).style = priceStyle;
      worksheet.getCell(currentRow, 4).value = amount;
      worksheet.getCell(currentRow, 4).style = priceStyle;
      worksheet.getRow(currentRow).height = 35;
      currentRow++;
    }

    // 2구 패키지 (다중 세트 및 수량)
    if (orderData.twoPackSets?.length > 0) {
      const totalTwoPackQuantity = orderData.twoPackSets.reduce((sum: number, set: any) => sum + (set.quantity || 1), 0);
      const amount = totalTwoPackQuantity * cookiePrices.twoPackSet;
      totalAmount += amount;

      worksheet.getCell(currentRow, 1).value = '2구 패키지';
      worksheet.getCell(currentRow, 1).style = cellStyle;
      worksheet.getCell(currentRow, 2).value = totalTwoPackQuantity;
      worksheet.getCell(currentRow, 2).style = cellStyle;
      worksheet.getCell(currentRow, 3).value = cookiePrices.twoPackSet;
      worksheet.getCell(currentRow, 3).style = priceStyle;
      worksheet.getCell(currentRow, 4).value = amount;
      worksheet.getCell(currentRow, 4).style = priceStyle;
      worksheet.getRow(currentRow).height = 35;
      currentRow++;
    }

    // 1구 + 음료 (다중 세트 및 수량)
    if (orderData.singleWithDrinkSets?.length > 0) {
      const totalSingleWithDrinkQuantity = orderData.singleWithDrinkSets.reduce((sum: number, set: any) => sum + (set.quantity || 1), 0);
      const amount = totalSingleWithDrinkQuantity * cookiePrices.singleWithDrink;
      totalAmount += amount;

      worksheet.getCell(currentRow, 1).value = '1구 + 음료';
      worksheet.getCell(currentRow, 1).style = cellStyle;
      worksheet.getCell(currentRow, 2).value = totalSingleWithDrinkQuantity;
      worksheet.getCell(currentRow, 2).style = cellStyle;
      worksheet.getCell(currentRow, 3).value = cookiePrices.singleWithDrink;
      worksheet.getCell(currentRow, 3).style = priceStyle;
      worksheet.getCell(currentRow, 4).value = amount;
      worksheet.getCell(currentRow, 4).style = priceStyle;
      worksheet.getRow(currentRow).height = 35;
      currentRow++;
    }

    // 브라우니쿠키
    // 브라우니 쿠키 세트들 (다중 세트 및 수량)
    if (orderData.brownieCookieSets?.length > 0) {
      let totalBrownieQuantity = 0;
      let baseBrownieAmount = 0;
      let totalBirthdayBearQuantity = 0;
      let totalCustomStickerCount = 0;
      let totalHeartMessageQuantity = 0;
      let hasCustomTopper = false;

      orderData.brownieCookieSets.forEach((set: any) => {
        const quantity = set.quantity || 1;

        // 기본 브라우니 수량 및 금액
        totalBrownieQuantity += quantity;
        baseBrownieAmount += quantity * cookiePrices.brownie;

        // 생일곰 옵션
        if (set.shape === 'birthdayBear') {
          totalBirthdayBearQuantity += quantity;
        }

        // 커스텀 스티커 (세트당)
        if (set.customSticker) {
          totalCustomStickerCount += 1;
        }

        // 하트 메시지 (수량만큼)
        if (set.heartMessage) {
          totalHeartMessageQuantity += quantity;
        }

        // 커스텀 토퍼 체크
        if (set.customTopper) {
          hasCustomTopper = true;
        }
      });

      // 기본 브라우니쿠키
      totalAmount += baseBrownieAmount;
      worksheet.getCell(currentRow, 1).value = '브라우니쿠키';
      worksheet.getCell(currentRow, 1).style = cellStyle;
      worksheet.getCell(currentRow, 2).value = totalBrownieQuantity;
      worksheet.getCell(currentRow, 2).style = cellStyle;
      worksheet.getCell(currentRow, 3).value = cookiePrices.brownie;
      worksheet.getCell(currentRow, 3).style = priceStyle;
      worksheet.getCell(currentRow, 4).value = baseBrownieAmount;
      worksheet.getCell(currentRow, 4).style = priceStyle;
      worksheet.getRow(currentRow).height = 35;
      currentRow++;

      // 커스텀토퍼 (수량, 단가는 빈칸)
      if (hasCustomTopper) {
        worksheet.getCell(currentRow, 1).value = '└ 커스텀토퍼';
        worksheet.getCell(currentRow, 1).style = cellStyle;
        worksheet.getCell(currentRow, 2).value = '';
        worksheet.getCell(currentRow, 2).style = cellStyle;
        worksheet.getCell(currentRow, 3).value = '';
        worksheet.getCell(currentRow, 3).style = priceStyle;
        worksheet.getCell(currentRow, 4).value = '';
        worksheet.getCell(currentRow, 4).style = priceStyle;
        worksheet.getRow(currentRow).height = 35;
        currentRow++;
      }

      // 생일곰 추가 옵션
      if (totalBirthdayBearQuantity > 0) {
        const birthdayBearAmount = totalBirthdayBearQuantity * cookiePrices.brownieOptions.birthdayBear;
        totalAmount += birthdayBearAmount;

        worksheet.getCell(currentRow, 1).value = '└ 생일곰 추가';
        worksheet.getCell(currentRow, 1).style = cellStyle;
        worksheet.getCell(currentRow, 2).value = totalBirthdayBearQuantity;
        worksheet.getCell(currentRow, 2).style = cellStyle;
        worksheet.getCell(currentRow, 3).value = cookiePrices.brownieOptions.birthdayBear;
        worksheet.getCell(currentRow, 3).style = priceStyle;
        worksheet.getCell(currentRow, 4).value = birthdayBearAmount;
        worksheet.getCell(currentRow, 4).style = priceStyle;
        worksheet.getRow(currentRow).height = 35;
        currentRow++;
      }

      // 커스텀 스티커 옵션
      if (totalCustomStickerCount > 0) {
        const customStickerAmount = totalCustomStickerCount * cookiePrices.brownieOptions.customSticker;
        totalAmount += customStickerAmount;

        worksheet.getCell(currentRow, 1).value = '└ 하단 커스텀 스티커';
        worksheet.getCell(currentRow, 1).style = cellStyle;
        worksheet.getCell(currentRow, 2).value = totalCustomStickerCount;
        worksheet.getCell(currentRow, 2).style = cellStyle;
        worksheet.getCell(currentRow, 3).value = cookiePrices.brownieOptions.customSticker;
        worksheet.getCell(currentRow, 3).style = priceStyle;
        worksheet.getCell(currentRow, 4).value = customStickerAmount;
        worksheet.getCell(currentRow, 4).style = priceStyle;
        worksheet.getRow(currentRow).height = 35;
        currentRow++;
      }

      // 하트 메시지 옵션
      if (totalHeartMessageQuantity > 0) {
        const heartMessageAmount = totalHeartMessageQuantity * cookiePrices.brownieOptions.heartMessage;
        totalAmount += heartMessageAmount;

        worksheet.getCell(currentRow, 1).value = '└ 하트안 문구 추가';
        worksheet.getCell(currentRow, 1).style = cellStyle;
        worksheet.getCell(currentRow, 2).value = totalHeartMessageQuantity;
        worksheet.getCell(currentRow, 2).style = cellStyle;
        worksheet.getCell(currentRow, 3).value = cookiePrices.brownieOptions.heartMessage;
        worksheet.getCell(currentRow, 3).style = priceStyle;
        worksheet.getCell(currentRow, 4).value = heartMessageAmount;
        worksheet.getCell(currentRow, 4).style = priceStyle;
        worksheet.getRow(currentRow).height = 35;
        currentRow++;
      }
    }

    // 스콘 (다중 세트 및 수량)
    if (orderData.sconeSets?.length > 0) {
      let totalSconeQuantity = 0;
      let baseSconeAmount = 0;
      let totalStrawberryJamQuantity = 0;

      orderData.sconeSets.forEach((set: any) => {
        const quantity = set.quantity || 1;

        // 기본 스콘 수량 및 금액
        totalSconeQuantity += quantity;
        baseSconeAmount += quantity * cookiePrices.scone;

        // 딸기잼 추가 (수량만큼)
        if (set.strawberryJam) {
          totalStrawberryJamQuantity += quantity;
        }
      });

      // 기본 스콘
      totalAmount += baseSconeAmount;
      worksheet.getCell(currentRow, 1).value = '스콘';
      worksheet.getCell(currentRow, 1).style = cellStyle;
      worksheet.getCell(currentRow, 2).value = totalSconeQuantity;
      worksheet.getCell(currentRow, 2).style = cellStyle;
      worksheet.getCell(currentRow, 3).value = cookiePrices.scone;
      worksheet.getCell(currentRow, 3).style = priceStyle;
      worksheet.getCell(currentRow, 4).value = baseSconeAmount;
      worksheet.getCell(currentRow, 4).style = priceStyle;
      worksheet.getRow(currentRow).height = 35;
      currentRow++;

      // 딸기잼 추가 옵션
      if (totalStrawberryJamQuantity > 0) {
        const strawberryJamAmount = totalStrawberryJamQuantity * cookiePrices.sconeOptions.strawberryJam;
        totalAmount += strawberryJamAmount;

        worksheet.getCell(currentRow, 1).value = '└ 딸기잼 추가';
        worksheet.getCell(currentRow, 1).style = cellStyle;
        worksheet.getCell(currentRow, 2).value = totalStrawberryJamQuantity;
        worksheet.getCell(currentRow, 2).style = cellStyle;
        worksheet.getCell(currentRow, 3).value = cookiePrices.sconeOptions.strawberryJam;
        worksheet.getCell(currentRow, 3).style = priceStyle;
        worksheet.getCell(currentRow, 4).value = strawberryJamAmount;
        worksheet.getCell(currentRow, 4).style = priceStyle;
        worksheet.getRow(currentRow).height = 35;
        currentRow++;
      }
    }

    // 행운쿠키 (박스당)
    if (orderData.fortuneCookie > 0) {
      const amount = orderData.fortuneCookie * cookiePrices.fortune;
      totalAmount += amount;

      worksheet.getCell(currentRow, 1).value = '행운쿠키';
      worksheet.getCell(currentRow, 1).style = cellStyle;
      worksheet.getCell(currentRow, 2).value = orderData.fortuneCookie + '박스';
      worksheet.getCell(currentRow, 2).style = cellStyle;
      worksheet.getCell(currentRow, 3).value = cookiePrices.fortune;
      worksheet.getCell(currentRow, 3).style = priceStyle;
      worksheet.getCell(currentRow, 4).value = amount;
      worksheet.getCell(currentRow, 4).style = priceStyle;
      worksheet.getRow(currentRow).height = 35;
      currentRow++;
    }

    // 비행기샌드쿠키 (박스당)
    if (orderData.airplaneSandwich > 0) {
      const amount = orderData.airplaneSandwich * cookiePrices.airplane;
      totalAmount += amount;

      worksheet.getCell(currentRow, 1).value = '비행기샌드쿠키';
      worksheet.getCell(currentRow, 1).style = cellStyle;
      worksheet.getCell(currentRow, 2).value = orderData.airplaneSandwich + '박스';
      worksheet.getCell(currentRow, 2).style = cellStyle;
      worksheet.getCell(currentRow, 3).value = cookiePrices.airplane;
      worksheet.getCell(currentRow, 3).style = priceStyle;
      worksheet.getCell(currentRow, 4).value = amount;
      worksheet.getCell(currentRow, 4).style = priceStyle;
      worksheet.getRow(currentRow).height = 35;
      currentRow++;
    }

    // 포장비
    if (orderData.packaging) {
      const packagingPricePerItem = cookiePrices.packaging[orderData.packaging];
      const packagingName = orderData.packaging === 'single_box' ? '1구박스' :
        orderData.packaging === 'plastic_wrap' ? '비닐탭포장' : '유산지';

      // 수량과 총액 계산 (routes.ts의 로직과 동일)
      let packagingQuantity;
      let totalPackagingPrice;

      if (orderData.packaging === 'single_box' || orderData.packaging === 'plastic_wrap') {
        // 1구박스와 비닐탭포장은 일반 쿠키 개수만큼 계산
        packagingQuantity = regularCookieQuantity;
        totalPackagingPrice = regularCookieQuantity * packagingPricePerItem;
      } else {
        // 유산지는 전체 주문당 1번만
        packagingQuantity = 1;
        totalPackagingPrice = packagingPricePerItem;
      }

      if (totalPackagingPrice > 0) {
        totalAmount += totalPackagingPrice;

        worksheet.getCell(currentRow, 1).value = packagingName;
        worksheet.getCell(currentRow, 1).style = cellStyle;
        worksheet.getCell(currentRow, 2).value = packagingQuantity;
        worksheet.getCell(currentRow, 2).style = cellStyle;
        worksheet.getCell(currentRow, 3).value = packagingPricePerItem;
        worksheet.getCell(currentRow, 3).style = priceStyle;
        worksheet.getCell(currentRow, 4).value = totalPackagingPrice;
        worksheet.getCell(currentRow, 4).style = priceStyle;
        worksheet.getRow(currentRow).height = 35;
        currentRow++;
      }
    }

    // 배송비 (퀵배송인 경우)
    if (orderData.deliveryMethod === 'quick') {
      worksheet.getCell(currentRow, 1).value = '배송비';
      worksheet.getCell(currentRow, 1).style = cellStyle;
      worksheet.getCell(currentRow, 2).value = '';
      worksheet.getCell(currentRow, 2).style = cellStyle;
      worksheet.getCell(currentRow, 3).value = '';
      worksheet.getCell(currentRow, 3).style = priceStyle;
      worksheet.getCell(currentRow, 4).value = '';
      worksheet.getCell(currentRow, 4).style = priceStyle;
      worksheet.getRow(currentRow).height = 35;
      currentRow++;
    }

    // 7. 전체 합계
    currentRow += 1;

    // 합계 선 - 병합할 모든 셀에 먼저 테두리 적용
    const totalStyle = {
      font: { bold: true, size: 12, name: 'Arial', color: { argb: 'FFFFFFFF' } },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4F46E5' } },
      border: borderStyle
    };

    for (let col = 1; col <= 3; col++) {
      worksheet.getCell(currentRow, col).style = totalStyle;
    }
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    worksheet.getCell(currentRow, 1).value = '총 합계';

    worksheet.getCell(currentRow, 4).value = totalAmount;
    worksheet.getCell(currentRow, 4).style = {
      font: { bold: true, size: 12, name: 'Arial', color: { argb: 'FFFFFFFF' } },
      alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4F46E5' } },
      border: borderStyle,
      numFmt: '#,##0"원"'
    };
    worksheet.getRow(currentRow).height = 35;

    currentRow += 2;

    // 8. 주문 상세 옵션
    // 병합할 모든 셀에 먼저 테두리 적용
    const detailHeaderStyle = {
      font: { bold: true, size: 11, name: 'Arial' },
      alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF3F4F6' } },
      border: borderStyle
    };

    for (let col = 1; col <= 4; col++) {
      worksheet.getCell(currentRow, col).style = detailHeaderStyle;
    }
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    worksheet.getCell(currentRow, 1).value = '주문 상세 옵션';
    worksheet.getRow(currentRow).height = 30;
    currentRow++;

    // 일반 쿠키 상세
    if (regularCookieQuantity > 0) {
      const selectedCookies = Object.entries(orderData.regularCookies || {})
        .filter(([_, qty]) => qty > 0)
        .map(([type, qty]) => `${type} ${qty}개`)
        .join(', ');

      // 병합할 모든 셀에 먼저 테두리 적용
      for (let col = 1; col <= 4; col++) {
        worksheet.getCell(currentRow, col).style = leftAlignStyle;
      }
      worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
      worksheet.getCell(currentRow, 1).value = `• 일반쿠키: ${selectedCookies}`;
      worksheet.getRow(currentRow).height = 35;
      currentRow++;
    }

    // 2구 패키지 상세 (다중 세트)
    if (orderData.twoPackSets?.length > 0) {
      orderData.twoPackSets.forEach((set, index) => {
        if (set.selectedCookies?.length > 0) {
          // 병합할 모든 셀에 먼저 테두리 적용
          for (let col = 1; col <= 4; col++) {
            worksheet.getCell(currentRow, col).style = leftAlignStyle;
          }
          worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
          worksheet.getCell(currentRow, 1).value = `• 2구 패키지 세트 ${index + 1} (${set.quantity || 1}개): ${set.selectedCookies.join(', ')}`;
          worksheet.getRow(currentRow).height = 35;
          currentRow++;
        }
      });
    }

    // 1구 + 음료 상세 (다중 세트)
    if (orderData.singleWithDrinkSets?.length > 0) {
      orderData.singleWithDrinkSets.forEach((set, index) => {
        let detailText = `• 1구 + 음료 세트 ${index + 1} (${set.quantity || 1}개)`;
        if (set.selectedCookie || set.selectedDrink) {
          detailText += ': ';
          if (set.selectedCookie) {
            detailText += `쿠키(${set.selectedCookie})`;
          }
          if (set.selectedDrink) {
            if (set.selectedCookie) detailText += ', ';
            detailText += `음료(${set.selectedDrink})`;
          }
        }

        // 병합할 모든 셀에 먼저 테두리 적용
        for (let col = 1; col <= 4; col++) {
          worksheet.getCell(currentRow, col).style = leftAlignStyle;
        }
        worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
        worksheet.getCell(currentRow, 1).value = detailText;
        worksheet.getRow(currentRow).height = 35;
        currentRow++;
      });
    }

    // 브라우니쿠키 상세
    if (orderData.brownieCookieSets?.length > 0) {
      orderData.brownieCookieSets.forEach((set: any, index: number) => {
        let detailText = `• 브라우니쿠키 세트 ${index + 1} (${set.quantity || 1}개)`;
        if (set.shape) {
          const shapeMap: Record<string, string> = {
            'bear': '곰',
            'rabbit': '토끼',
            'tiger': '호랑이',
            'birthdayBear': '생일곰'
          };
          const shapeText = shapeMap[set.shape] || set.shape;
          detailText += `: ${shapeText} 모양`;
        }
        if (set.customSticker) {
          detailText += ', 커스텀스티커';
        }
        if (set.heartMessage) {
          detailText += `, 하트메시지: ${set.heartMessage}`;
        }
        if (set.customTopper) {
          detailText += ', 커스텀토퍼';
        }

        // 병합할 모든 셀에 먼저 테두리 적용
        for (let col = 1; col <= 4; col++) {
          worksheet.getCell(currentRow, col).style = leftAlignStyle;
        }
        worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
        worksheet.getCell(currentRow, 1).value = detailText;
        worksheet.getRow(currentRow).height = 35;
        currentRow++;
      });
    }

    // 스콘 상세
    if (orderData.sconeSets?.length > 0) {
      orderData.sconeSets.forEach((set: any, index: number) => {
        let detailText = `• 스콘 세트 ${index + 1} (${set.quantity || 1}개)`;
        if (set.flavor) {
          const flavorText = set.flavor === 'chocolate' ? '초코맛' : '고메버터맛';
          detailText += `: ${flavorText}`;
        }
        if (set.strawberryJam) {
          detailText += ', 딸기잼 추가';
        }

        // 병합할 모든 셀에 먼저 테두리 적용
        for (let col = 1; col <= 4; col++) {
          worksheet.getCell(currentRow, col).style = leftAlignStyle;
        }
        worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
        worksheet.getCell(currentRow, 1).value = detailText;
        worksheet.getRow(currentRow).height = 35;
        currentRow++;
      });
    }

    // 포장 옵션 상세
    if (orderData.packaging) {
      const packagingName = orderData.packaging === 'single_box' ? '1구박스 (+500원)' :
        orderData.packaging === 'plastic_wrap' ? '비닐탭포장 (+500원)' : '유산지 (무료)';

      // 병합할 모든 셀에 먼저 테두리 적용
      for (let col = 1; col <= 4; col++) {
        worksheet.getCell(currentRow, col).style = leftAlignStyle;
      }
      worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
      worksheet.getCell(currentRow, 1).value = `• 포장 옵션: ${packagingName}`;
      worksheet.getRow(currentRow).height = 35;
      currentRow++;
    }

    // 9. 계좌번호 및 안내사항
    currentRow += 1;

    // 병합할 모든 셀에 먼저 테두리 적용
    const accountStyle = {
      font: { bold: true, size: 11, name: 'Arial' },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFEF3C7' } },
      border: borderStyle
    };

    for (let col = 1; col <= 4; col++) {
      worksheet.getCell(currentRow, col).style = accountStyle;
    }
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    worksheet.getCell(currentRow, 1).value = '입금 계좌: 83050104204736 국민은행 (낫띵메터스)';
    worksheet.getRow(currentRow).height = 35;
    currentRow++;

    // 병합할 모든 셀에 먼저 테두리 적용
    const contactStyle = {
      font: { size: 10, name: 'Arial' },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: borderStyle
    };

    for (let col = 1; col <= 4; col++) {
      worksheet.getCell(currentRow, col).style = contactStyle;
    }
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    worksheet.getCell(currentRow, 1).value = '주문 문의: 카카오톡 @nothingmatters 또는 010-2866-7976';
    worksheet.getRow(currentRow).height = 30;

    // 10. 모바일 친화적 사이즈 조정
    worksheet.pageSetup = {
      paperSize: 9, // A4 사이즈
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.5,
        bottom: 0.5,
        header: 0.3,
        footer: 0.3
      }
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
