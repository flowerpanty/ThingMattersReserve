import ExcelJS from 'exceljs';
import { type OrderData, cookiePrices, cookieTypes, drinkTypes } from '@shared/schema';

export class ExcelGenerator {
  async generateQuote(orderData: OrderData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('nothingmatters 견적서');

    // 모바일 최적화 컬럼 너비 설정
    worksheet.getColumn(1).width = 16; // 제품명
    worksheet.getColumn(2).width = 8;  // 수량
    worksheet.getColumn(3).width = 12; // 단가
    worksheet.getColumn(4).width = 12; // 합계

    // 스타일 정의 (모바일 친화적)
    const borderStyle = {
      top: { style: 'thin' as const },
      left: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      right: { style: 'thin' as const }
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
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
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
      alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
      border: borderStyle
    };

    // 1. 헤더 - 회사명과 견적서 제목
    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value = 'nothingmatters 견적서';
    worksheet.getCell('A1').style = titleStyle;
    worksheet.getRow(1).height = 25;

    // 2. 고객 정보
    worksheet.mergeCells('A2:D2');
    worksheet.getCell('A2').value = `고객명: ${orderData.customerName} | 연락처: ${orderData.customerContact}`;
    worksheet.getCell('A2').style = leftAlignStyle;
    worksheet.getRow(2).height = 20;

    // 3. 수령 날짜
    worksheet.mergeCells('A3:D3');
    worksheet.getCell('A3').value = `수령 희망일: ${orderData.deliveryDate}`;
    worksheet.getCell('A3').style = leftAlignStyle;
    worksheet.getRow(3).height = 20;

    // 4. 빈 줄
    worksheet.getRow(4).height = 10;

    // 5. 테이블 헤더
    const headers = ['제품명', '수량', '단가', '합계'];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(5, index + 1);
      cell.value = header;
      cell.style = headerStyle;
    });
    worksheet.getRow(5).height = 22;

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
      worksheet.getRow(currentRow).height = 18;
      currentRow++;
    }
    
    // 2구 패키지 (다중 세트)
    if (orderData.twoPackSets?.length > 0) {
      const amount = orderData.twoPackSets.length * cookiePrices.twoPackSet;
      totalAmount += amount;
      
      worksheet.getCell(currentRow, 1).value = '2구 패키지';
      worksheet.getCell(currentRow, 1).style = cellStyle;
      worksheet.getCell(currentRow, 2).value = orderData.twoPackSets.length;
      worksheet.getCell(currentRow, 2).style = cellStyle;
      worksheet.getCell(currentRow, 3).value = cookiePrices.twoPackSet;
      worksheet.getCell(currentRow, 3).style = priceStyle;
      worksheet.getCell(currentRow, 4).value = amount;
      worksheet.getCell(currentRow, 4).style = priceStyle;
      worksheet.getRow(currentRow).height = 18;
      currentRow++;
    }
    
    // 1구 + 음료 (다중 세트)
    if (orderData.singleWithDrinkSets?.length > 0) {
      const amount = orderData.singleWithDrinkSets.length * cookiePrices.singleWithDrink;
      totalAmount += amount;
      
      worksheet.getCell(currentRow, 1).value = '1구 + 음료';
      worksheet.getCell(currentRow, 1).style = cellStyle;
      worksheet.getCell(currentRow, 2).value = orderData.singleWithDrinkSets.length;
      worksheet.getCell(currentRow, 2).style = cellStyle;
      worksheet.getCell(currentRow, 3).value = cookiePrices.singleWithDrink;
      worksheet.getCell(currentRow, 3).style = priceStyle;
      worksheet.getCell(currentRow, 4).value = amount;
      worksheet.getCell(currentRow, 4).style = priceStyle;
      worksheet.getRow(currentRow).height = 18;
      currentRow++;
    }

    // 브라우니쿠키
    if (orderData.brownieCookie?.quantity > 0) {
      let brownieAmount = orderData.brownieCookie.quantity * cookiePrices.brownie;
      
      // 옵션 추가 비용 계산
      if (orderData.brownieCookie.shape === 'birthdayBear') {
        brownieAmount += orderData.brownieCookie.quantity * cookiePrices.brownieOptions.birthdayBear;
      }
      if (orderData.brownieCookie.customSticker) {
        brownieAmount += cookiePrices.brownieOptions.customSticker;
      }
      if (orderData.brownieCookie.heartMessage) {
        brownieAmount += cookiePrices.brownieOptions.heartMessage;
      }
      
      totalAmount += brownieAmount;
      
      worksheet.getCell(currentRow, 1).value = '브라우니쿠키';
      worksheet.getCell(currentRow, 1).style = cellStyle;
      worksheet.getCell(currentRow, 2).value = orderData.brownieCookie.quantity;
      worksheet.getCell(currentRow, 2).style = cellStyle;
      worksheet.getCell(currentRow, 3).value = Math.floor(brownieAmount / orderData.brownieCookie.quantity);
      worksheet.getCell(currentRow, 3).style = priceStyle;
      worksheet.getCell(currentRow, 4).value = brownieAmount;
      worksheet.getCell(currentRow, 4).style = priceStyle;
      worksheet.getRow(currentRow).height = 18;
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
      worksheet.getRow(currentRow).height = 18;
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
      worksheet.getRow(currentRow).height = 18;
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
        worksheet.getRow(currentRow).height = 18;
        currentRow++;
      }
    }

    // 7. 전체 합계
    currentRow += 1;
    
    // 합계 선
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    worksheet.getCell(currentRow, 1).value = '총 합계';
    worksheet.getCell(currentRow, 1).style = {
      font: { bold: true, size: 12, name: 'Arial', color: { argb: 'FFFFFFFF' } },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4F46E5' } },
      border: borderStyle
    };
    
    worksheet.getCell(currentRow, 4).value = totalAmount;
    worksheet.getCell(currentRow, 4).style = {
      font: { bold: true, size: 12, name: 'Arial', color: { argb: 'FFFFFFFF' } },
      alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4F46E5' } },
      border: borderStyle,
      numFmt: '#,##0"원"'
    };
    worksheet.getRow(currentRow).height = 25;
    
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
    worksheet.getRow(currentRow).height = 20;
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
      worksheet.getRow(currentRow).height = 18;
      currentRow++;
    }

    // 2구 패키지 상세 (다중 세트)
    if (orderData.twoPackSets?.length > 0) {
      orderData.twoPackSets.forEach((set, index) => {
        if (set.selectedCookies?.length > 0) {
          worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
          worksheet.getCell(currentRow, 1).value = `• 2구 패키지 세트 ${index + 1}: ${set.selectedCookies.join(', ')}`;
          worksheet.getCell(currentRow, 1).style = leftAlignStyle;
          worksheet.getRow(currentRow).height = 18;
          currentRow++;
        }
      });
    }
    
    // 1구 + 음료 상세 (다중 세트)
    if (orderData.singleWithDrinkSets?.length > 0) {
      orderData.singleWithDrinkSets.forEach((set, index) => {
        let detailText = `• 1구 + 음료 세트 ${index + 1}`;
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
        worksheet.getRow(currentRow).height = 18;
        currentRow++;
      });
    }

    // 브라우니쿠키 상세
    if (orderData.brownieCookie?.quantity > 0) {
      let detailText = '• 브라우니쿠키';
      if (orderData.brownieCookie.shape) {
        const shapeText = orderData.brownieCookie.shape === 'bear' ? '곰' :
                         orderData.brownieCookie.shape === 'rabbit' ? '토끼' : '생일곰';
        detailText += `: ${shapeText} 모양`;
      }
      if (orderData.brownieCookie.customSticker) {
        detailText += ', 커스텀스티커';
      }
      if (orderData.brownieCookie.heartMessage) {
        detailText += ', 하트메시지';
      }
      if (orderData.brownieCookie.customTopper) {
        detailText += ', 커스텀토퍼';
      }
      
      worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
      worksheet.getCell(currentRow, 1).value = detailText;
      worksheet.getCell(currentRow, 1).style = leftAlignStyle;
      worksheet.getRow(currentRow).height = 18;
      currentRow++;
    }
    
    // 포장 옵션 상세
    if (orderData.packaging) {
      const packagingName = orderData.packaging === 'single_box' ? '1구박스 (+500원)' : 
                           orderData.packaging === 'plastic_wrap' ? '비닐탭포장 (+500원)' : '유산지 (무료)';
      
      worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
      worksheet.getCell(currentRow, 1).value = `• 포장 옵션: ${packagingName}`;
      worksheet.getCell(currentRow, 1).style = leftAlignStyle;
      worksheet.getRow(currentRow).height = 18;
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
    worksheet.getRow(currentRow).height = 25;
    currentRow++;
    
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    worksheet.getCell(currentRow, 1).value = '주문 문의: 카카오톡 @nothingmatters 또는 010-2866-7976';
    worksheet.getCell(currentRow, 1).style = {
      font: { size: 10, name: 'Arial' },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: borderStyle
    };
    worksheet.getRow(currentRow).height = 20;

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