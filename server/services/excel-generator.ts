import ExcelJS from 'exceljs';
import { type OrderData, cookiePrices, cookieTypes, drinkTypes } from '@shared/schema';

export class ExcelGenerator {
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
    worksheet.getCell('A2').value = `고객명: ${orderData.customerName} | 연락처: ${orderData.customerContact}`;
    worksheet.getRow(2).height = 28;

    // 3. 수령 방법과 날짜
    // 병합할 모든 셀에 먼저 테두리 적용
    for (let col = 1; col <= 4; col++) {
      worksheet.getCell(3, col).style = leftAlignStyle;
    }
    worksheet.mergeCells('A3:D3');
    const deliveryMethodText = orderData.deliveryMethod === 'pickup' ? '매장 픽업' : '퀵 배송';
    worksheet.getCell('A3').value = `수령 방법: ${deliveryMethodText} | 수령 희망일: ${orderData.deliveryDate}`;
    worksheet.getRow(3).height = 28;

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
      let totalBrownieAmount = 0;
      let totalBrownieQuantity = 0;
      
      orderData.brownieCookieSets.forEach((set: any) => {
        const quantity = set.quantity || 1;
        let brownieAmount = quantity * cookiePrices.brownie;
        
        // 옵션 추가 비용 계산
        if (set.shape === 'birthdayBear') {
          brownieAmount += quantity * cookiePrices.brownieOptions.birthdayBear;
        }
        if (set.customSticker) {
          brownieAmount += cookiePrices.brownieOptions.customSticker;
        }
        if (set.heartMessage) {
          brownieAmount += cookiePrices.brownieOptions.heartMessage;
        }
        
        totalBrownieAmount += brownieAmount;
        totalBrownieQuantity += quantity;
      });
      
      totalAmount += totalBrownieAmount;
      
      worksheet.getCell(currentRow, 1).value = '브라우니쿠키';
      worksheet.getCell(currentRow, 1).style = cellStyle;
      worksheet.getCell(currentRow, 2).value = totalBrownieQuantity;
      worksheet.getCell(currentRow, 2).style = cellStyle;
      worksheet.getCell(currentRow, 3).value = Math.floor(totalBrownieAmount / totalBrownieQuantity);
      worksheet.getCell(currentRow, 3).style = priceStyle;
      worksheet.getCell(currentRow, 4).value = totalBrownieAmount;
      worksheet.getCell(currentRow, 4).style = priceStyle;
      worksheet.getRow(currentRow).height = 35;
      currentRow++;
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
      const packagingPrice = cookiePrices.packaging[orderData.packaging];
      if (packagingPrice > 0) {
        totalAmount += packagingPrice;
        
        const packagingName = orderData.packaging === 'single_box' ? '1구박스' : 
                             orderData.packaging === 'plastic_wrap' ? '비닐탭포장' : '유산지';
        
        worksheet.getCell(currentRow, 1).value = packagingName;
        worksheet.getCell(currentRow, 1).style = cellStyle;
        worksheet.getCell(currentRow, 2).value = 1;
        worksheet.getCell(currentRow, 2).style = cellStyle;
        worksheet.getCell(currentRow, 3).value = packagingPrice;
        worksheet.getCell(currentRow, 3).style = priceStyle;
        worksheet.getCell(currentRow, 4).value = packagingPrice;
        worksheet.getCell(currentRow, 4).style = priceStyle;
        worksheet.getRow(currentRow).height = 35;
        currentRow++;
      }
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
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    worksheet.getCell(currentRow, 1).value = '주문 상세 옵션';
    worksheet.getCell(currentRow, 1).style = {
      font: { bold: true, size: 11, name: 'Arial' },
      alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF3F4F6' } },
      border: borderStyle
    };
    worksheet.getRow(currentRow).height = 30;
    currentRow++;
    
    // 일반 쿠키 상세
    if (regularCookieQuantity > 0) {
      const selectedCookies = Object.entries(orderData.regularCookies || {})
        .filter(([_, qty]) => qty > 0)
        .map(([type, qty]) => `${type} ${qty}개`)
        .join(', ');
      
      worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
      worksheet.getCell(currentRow, 1).value = `• 일반쿠키: ${selectedCookies}`;
      worksheet.getCell(currentRow, 1).style = leftAlignStyle;
      worksheet.getRow(currentRow).height = 35;
      currentRow++;
    }

    // 2구 패키지 상세 (다중 세트)
    if (orderData.twoPackSets?.length > 0) {
      orderData.twoPackSets.forEach((set, index) => {
        if (set.selectedCookies?.length > 0) {
          worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
          worksheet.getCell(currentRow, 1).value = `• 2구 패키지 세트 ${index + 1} (${set.quantity || 1}개): ${set.selectedCookies.join(', ')}`;
          worksheet.getCell(currentRow, 1).style = leftAlignStyle;
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
        
        worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
        worksheet.getCell(currentRow, 1).value = detailText;
        worksheet.getCell(currentRow, 1).style = leftAlignStyle;
        worksheet.getRow(currentRow).height = 35;
        currentRow++;
      });
    }

    // 브라우니쿠키 상세
    if (orderData.brownieCookieSets?.length > 0) {
      orderData.brownieCookieSets.forEach((set: any, index: number) => {
        let detailText = `• 브라우니쿠키 세트 ${index + 1} (${set.quantity || 1}개)`;
        if (set.shape) {
          const shapeText = set.shape === 'bear' ? '곰' :
                           set.shape === 'rabbit' ? '토끼' : '생일곰';
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
        
        worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
        worksheet.getCell(currentRow, 1).value = detailText;
        worksheet.getCell(currentRow, 1).style = leftAlignStyle;
        worksheet.getRow(currentRow).height = 35;
        currentRow++;
      });
    }
    
    // 포장 옵션 상세
    if (orderData.packaging) {
      const packagingName = orderData.packaging === 'single_box' ? '1구박스 (+500원)' : 
                           orderData.packaging === 'plastic_wrap' ? '비닐탭포장 (+500원)' : '유산지 (무료)';
      
      worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
      worksheet.getCell(currentRow, 1).value = `• 포장 옵션: ${packagingName}`;
      worksheet.getCell(currentRow, 1).style = leftAlignStyle;
      worksheet.getRow(currentRow).height = 35;
      currentRow++;
    }

    // 9. 계좌번호 및 안내사항
    currentRow += 1;
    
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    worksheet.getCell(currentRow, 1).value = '입금 계좌: 830501042047336 국민은행 (낫띵메터스)';
    worksheet.getCell(currentRow, 1).style = {
      font: { bold: true, size: 11, name: 'Arial' },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFEF3C7' } },
      border: borderStyle
    };
    worksheet.getRow(currentRow).height = 35;
    currentRow++;
    
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    worksheet.getCell(currentRow, 1).value = '주문 문의: 카카오톡 @nothingmatters 또는 010-2866-7976';
    worksheet.getCell(currentRow, 1).style = {
      font: { size: 10, name: 'Arial' },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: borderStyle
    };
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