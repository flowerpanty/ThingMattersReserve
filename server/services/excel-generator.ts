import ExcelJS from 'exceljs';
import { type OrderData, cookiePrices } from '@shared/schema';

export class ExcelGenerator {
  async generateQuote(orderData: OrderData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('견적서');

    // 헤더 스타일
    const headerStyle = {
      font: { bold: true, size: 14 },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE6F3FF' } },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
    };

    const subHeaderStyle = {
      font: { bold: true, size: 12 },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF0F8FF' } },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
    };

    // 제목
    worksheet.mergeCells('A1:E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'nothingmatters 쿠키 견적서';
    titleCell.style = {
      font: { bold: true, size: 16 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4B8D8' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };

    // 고객 정보
    worksheet.getCell('A3').value = '고객명';
    worksheet.getCell('A3').style = subHeaderStyle;
    worksheet.getCell('B3').value = orderData.customerName;
    
    worksheet.getCell('A4').value = '연락처';
    worksheet.getCell('A4').style = subHeaderStyle;
    worksheet.getCell('B4').value = orderData.customerContact;
    
    worksheet.getCell('A5').value = '수령희망일';
    worksheet.getCell('A5').style = subHeaderStyle;
    worksheet.getCell('B5').value = orderData.deliveryDate;

    // 주문 항목 헤더
    let row = 7;
    const headers = ['항목', '종류/옵션', '수량', '단가', '금액'];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(row, index + 1);
      cell.value = header;
      cell.style = headerStyle;
    });

    row++;
    let totalAmount = 0;

    // 일반 쿠키
    const regularCookieQuantity = Object.values(orderData.regularCookies).reduce((sum, qty) => sum + qty, 0);
    if (regularCookieQuantity > 0) {
      worksheet.getCell(row, 1).value = '일반 쿠키';
      
      const cookieDetails = Object.entries(orderData.regularCookies)
        .filter(([_, qty]) => qty > 0)
        .map(([type, qty]) => `${type} ${qty}개`)
        .join(', ');
      
      worksheet.getCell(row, 2).value = cookieDetails;
      worksheet.getCell(row, 3).value = regularCookieQuantity;
      worksheet.getCell(row, 4).value = cookiePrices.regular;
      
      const regularAmount = regularCookieQuantity * cookiePrices.regular;
      worksheet.getCell(row, 5).value = regularAmount;
      totalAmount += regularAmount;
      row++;
    }

    // 포장비
    if (orderData.packaging) {
      worksheet.getCell(row, 1).value = '포장비';
      worksheet.getCell(row, 2).value = orderData.packaging === '1box' ? '1구 박스' : 
                                       orderData.packaging === '2box' ? '2구 박스' : '4구 박스';
      worksheet.getCell(row, 3).value = 1;
      worksheet.getCell(row, 4).value = cookiePrices.packaging[orderData.packaging];
      worksheet.getCell(row, 5).value = cookiePrices.packaging[orderData.packaging];
      totalAmount += cookiePrices.packaging[orderData.packaging];
      row++;
    }

    // 브라우니쿠키
    if (orderData.brownieCookie.quantity > 0) {
      let brownieAmount = orderData.brownieCookie.quantity * cookiePrices.brownie;
      
      let brownieOptions = '';
      if (orderData.brownieCookie.shape === 'birthdayBear') {
        brownieAmount += orderData.brownieCookie.quantity * cookiePrices.brownieOptions.birthdayBear;
        brownieOptions += '생일곰 ';
      } else if (orderData.brownieCookie.shape) {
        brownieOptions += orderData.brownieCookie.shape === 'bear' ? '곰돌이 ' : '토끼 ';
      }
      
      if (orderData.brownieCookie.customSticker) {
        brownieAmount += cookiePrices.brownieOptions.customSticker;
        brownieOptions += '하단스티커 ';
      }
      
      if (orderData.brownieCookie.heartMessage) {
        brownieAmount += cookiePrices.brownieOptions.heartMessage;
        brownieOptions += `하트문구(${orderData.brownieCookie.heartMessage}) `;
      }
      
      if (orderData.brownieCookie.customTopper) {
        brownieOptions += '토퍼제작 ';
      }

      worksheet.getCell(row, 1).value = '브라우니쿠키';
      worksheet.getCell(row, 2).value = brownieOptions.trim() || '기본';
      worksheet.getCell(row, 3).value = orderData.brownieCookie.quantity;
      worksheet.getCell(row, 4).value = Math.floor(brownieAmount / orderData.brownieCookie.quantity);
      worksheet.getCell(row, 5).value = brownieAmount;
      totalAmount += brownieAmount;
      row++;
    }

    // 행운쿠키
    if (orderData.fortuneCookie > 0) {
      const fortuneAmount = orderData.fortuneCookie * cookiePrices.fortune;
      worksheet.getCell(row, 1).value = '행운쿠키';
      worksheet.getCell(row, 2).value = '기본';
      worksheet.getCell(row, 3).value = orderData.fortuneCookie;
      worksheet.getCell(row, 4).value = cookiePrices.fortune;
      worksheet.getCell(row, 5).value = fortuneAmount;
      totalAmount += fortuneAmount;
      row++;
    }

    // 비행기샌드쿠키
    if (orderData.airplaneSandwich > 0) {
      const airplaneAmount = orderData.airplaneSandwich * cookiePrices.airplane;
      worksheet.getCell(row, 1).value = '비행기샌드쿠키';
      worksheet.getCell(row, 2).value = '기본';
      worksheet.getCell(row, 3).value = orderData.airplaneSandwich;
      worksheet.getCell(row, 4).value = cookiePrices.airplane;
      worksheet.getCell(row, 5).value = airplaneAmount;
      totalAmount += airplaneAmount;
      row++;
    }

    // 총액
    row++;
    worksheet.mergeCells(`A${row}:D${row}`);
    const totalLabelCell = worksheet.getCell(`A${row}`);
    totalLabelCell.value = '총 금액';
    totalLabelCell.style = {
      font: { bold: true, size: 14 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4B8D8' } },
      alignment: { horizontal: 'right', vertical: 'middle' }
    };

    const totalCell = worksheet.getCell(`E${row}`);
    totalCell.value = totalAmount;
    totalCell.style = {
      font: { bold: true, size: 14 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4B8D8' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };

    // 안내 문구
    row += 2;
    worksheet.mergeCells(`A${row}:E${row}`);
    const noteCell = worksheet.getCell(`A${row}`);
    noteCell.value = '※ 본 견적서는 예약 확정이 아닙니다. 카카오톡 상담 후 최종 확정됩니다.';
    noteCell.style = {
      font: { italic: true, size: 10 },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };

    // 컬럼 너비 조정
    worksheet.columns = [
      { width: 15 },
      { width: 30 },
      { width: 10 },
      { width: 12 },
      { width: 15 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
