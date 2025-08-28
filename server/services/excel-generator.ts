import ExcelJS from 'exceljs';
import { type OrderData, cookiePrices } from '@shared/schema';

export class ExcelGenerator {
  async generateQuote(orderData: OrderData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('거래명세서');

    // 스타일 정의
    const borderStyle = {
      top: { style: 'thin' as const },
      left: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      right: { style: 'thin' as const }
    };

    const titleStyle = {
      font: { bold: true, size: 20 },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: borderStyle
    };

    const headerStyle = {
      font: { bold: true, size: 10 },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFD3D3D3' } },
      border: borderStyle
    };

    const cellStyle = {
      font: { size: 10 },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: borderStyle
    };

    const leftAlignStyle = {
      font: { size: 10 },
      alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
      border: borderStyle
    };

    // 1. 제목 - 거래명세서
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = '거래명세서';
    titleCell.style = titleStyle;

    // 2. 좌측 날짜 및 인장 영역
    worksheet.mergeCells('A2:C2');
    const dateCell = worksheet.getCell('A2');
    const currentDate = new Date();
    dateCell.value = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월 ${currentDate.getDate()}일`;
    dateCell.style = cellStyle;

    // 좌측 인장 영역 (빈 공간)
    worksheet.mergeCells('A3:C8');
    const stampArea = worksheet.getCell('A3');
    stampArea.value = '아래와 같이 견적합니다';
    stampArea.style = {
      font: { size: 12 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: borderStyle
    };

    // 3. 우측 공급자 정보 테이블
    // 등록번호
    worksheet.getCell('D2').value = '등록번호';
    worksheet.getCell('D2').style = headerStyle;
    worksheet.getCell('E2').value = '744-71-00172';
    worksheet.getCell('E2').style = cellStyle;
    worksheet.mergeCells('E2:G2');

    // 상호(법인명)
    worksheet.getCell('D3').value = '상호(법인명)';
    worksheet.getCell('D3').style = headerStyle;
    worksheet.getCell('E3').value = 'nothingmatters';
    worksheet.getCell('E3').style = cellStyle;
    worksheet.getCell('F3').value = '성명';
    worksheet.getCell('F3').style = headerStyle;
    worksheet.getCell('G3').value = '낫띵메터스';
    worksheet.getCell('G3').style = cellStyle;

    // 사업장주소
    worksheet.getCell('D4').value = '공급자';
    worksheet.getCell('D4').style = headerStyle;
    worksheet.getCell('E4').value = '사업장주소';
    worksheet.getCell('E4').style = headerStyle;
    worksheet.mergeCells('F4:G4');
    worksheet.getCell('F4').value = '서울특별시 성동구 상원12길19-1층';
    worksheet.getCell('F4').style = leftAlignStyle;

    // 업태, 종목, 품목, 서비스
    worksheet.getCell('E5').value = '업태';
    worksheet.getCell('E5').style = headerStyle;
    worksheet.getCell('F5').value = '카페';
    worksheet.getCell('F5').style = cellStyle;
    worksheet.getCell('G5').value = '품목';
    worksheet.getCell('G5').style = headerStyle;

    worksheet.getCell('E6').value = '종목';
    worksheet.getCell('E6').style = headerStyle;
    worksheet.getCell('F6').value = '서비스';
    worksheet.getCell('F6').style = cellStyle;
    worksheet.getCell('G6').value = '서비스';
    worksheet.getCell('G6').style = cellStyle;

    // 연락처
    worksheet.getCell('E7').value = '연락처';
    worksheet.getCell('E7').style = headerStyle;
    worksheet.mergeCells('F7:G7');
    worksheet.getCell('F7').value = '010-2866-7976';
    worksheet.getCell('F7').style = cellStyle;

    // 합계금액 표시 (상단)
    let totalAmount = 0;

    // 일반 쿠키 계산
    const regularCookieQuantity = Object.values(orderData.regularCookies).reduce((sum, qty) => sum + qty, 0);
    if (regularCookieQuantity > 0) {
      totalAmount += regularCookieQuantity * cookiePrices.regular;
    }

    // 포장비 계산
    if (orderData.packaging) {
      totalAmount += cookiePrices.packaging[orderData.packaging];
    }

    // 브라우니쿠키 계산
    if (orderData.brownieCookie.quantity > 0) {
      let brownieAmount = orderData.brownieCookie.quantity * cookiePrices.brownie;
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
    }

    // 행운쿠키 계산
    if (orderData.fortuneCookie > 0) {
      totalAmount += orderData.fortuneCookie * cookiePrices.fortune;
    }

    // 비행기샌드쿠키 계산
    if (orderData.airplaneSandwich > 0) {
      totalAmount += orderData.airplaneSandwich * cookiePrices.airplane;
    }

    // 상단 합계금액 표시
    worksheet.mergeCells('A9:C9');
    worksheet.getCell('A9').value = '합계금액';
    worksheet.getCell('A9').style = {
      font: { bold: true, size: 12 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFD3D3D3' } },
      border: borderStyle
    };

    worksheet.mergeCells('D9:G9');
    worksheet.getCell('D9').value = `₩${totalAmount.toLocaleString()}.00`;
    worksheet.getCell('D9').style = {
      font: { bold: true, size: 14 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: borderStyle
    };

    // 4. 주문 항목 테이블 헤더 (10행부터)
    const tableHeaders = ['', '규격', '수량', '단가', '가격', 'vat', '합계'];
    let row = 10;
    
    // 테이블 헤더 생성
    tableHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(row, index + 1);
      cell.value = header;
      cell.style = headerStyle;
    });

    row++;

    // 브라우니쿠키 항목
    if (orderData.brownieCookie.quantity > 0) {
      let brownieAmount = orderData.brownieCookie.quantity * cookiePrices.brownie;
      if (orderData.brownieCookie.shape === 'birthdayBear') {
        brownieAmount += orderData.brownieCookie.quantity * cookiePrices.brownieOptions.birthdayBear;
      }
      if (orderData.brownieCookie.customSticker) {
        brownieAmount += cookiePrices.brownieOptions.customSticker;
      }
      if (orderData.brownieCookie.heartMessage) {
        brownieAmount += cookiePrices.brownieOptions.heartMessage;
      }

      worksheet.getCell(row, 1).value = '브라우니쿠키';
      worksheet.getCell(row, 1).style = cellStyle;
      worksheet.getCell(row, 2).value = '50';
      worksheet.getCell(row, 2).style = cellStyle;
      worksheet.getCell(row, 3).value = orderData.brownieCookie.quantity;
      worksheet.getCell(row, 3).style = cellStyle;
      worksheet.getCell(row, 4).value = cookiePrices.brownie;
      worksheet.getCell(row, 4).style = cellStyle;
      worksheet.getCell(row, 5).value = brownieAmount;
      worksheet.getCell(row, 5).style = cellStyle;
      worksheet.getCell(row, 6).value = '';
      worksheet.getCell(row, 6).style = cellStyle;
      worksheet.getCell(row, 7).value = '';
      worksheet.getCell(row, 7).style = cellStyle;
      row++;
    }

    // 레터링 항목 (예시)
    worksheet.getCell(row, 1).value = '레터링';
    worksheet.getCell(row, 1).style = cellStyle;
    worksheet.getCell(row, 2).value = '50';
    worksheet.getCell(row, 2).style = cellStyle;
    worksheet.getCell(row, 3).value = '500';
    worksheet.getCell(row, 3).style = cellStyle;
    worksheet.getCell(row, 4).value = '25,000';
    worksheet.getCell(row, 4).style = cellStyle;
    worksheet.getCell(row, 5).value = '';
    worksheet.getCell(row, 5).style = cellStyle;
    worksheet.getCell(row, 6).value = '';
    worksheet.getCell(row, 6).style = cellStyle;
    worksheet.getCell(row, 7).value = '';
    worksheet.getCell(row, 7).style = cellStyle;
    row++;

    // 스티커제작 항목 (예시)
    worksheet.getCell(row, 1).value = '스티커제작';
    worksheet.getCell(row, 1).style = cellStyle;
    worksheet.getCell(row, 2).value = '1';
    worksheet.getCell(row, 2).style = cellStyle;
    worksheet.getCell(row, 3).value = '15,000';
    worksheet.getCell(row, 3).style = cellStyle;
    worksheet.getCell(row, 4).value = '15,000';
    worksheet.getCell(row, 4).style = cellStyle;
    worksheet.getCell(row, 5).value = '';
    worksheet.getCell(row, 5).style = cellStyle;
    worksheet.getCell(row, 6).value = '';
    worksheet.getCell(row, 6).style = cellStyle;
    worksheet.getCell(row, 7).value = '';
    worksheet.getCell(row, 7).style = cellStyle;
    row++;

    // 빈 행들 추가 (10개 정도)
    for (let i = 0; i < 8; i++) {
      for (let col = 1; col <= 7; col++) {
        worksheet.getCell(row, col).style = cellStyle;
      }
      row++;
    }

    // 하단 계좌번호 영역 (큰 영역으로)
    worksheet.mergeCells(`A${row}:G${row + 2}`);
    const accountCell = worksheet.getCell(`A${row}`);
    accountCell.value = `830501042047336 국민은행(낫띵메터스)`;
    accountCell.style = {
      font: { bold: true, size: 16 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: borderStyle
    };
    row += 3;

    // 최종 합계 테이블
    // 합계 라벨
    worksheet.mergeCells(`A${row}:F${row}`);
    worksheet.getCell(`A${row}`).value = '합계';
    worksheet.getCell(`A${row}`).style = {
      font: { bold: true, size: 12 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFD3D3D3' } },
      border: borderStyle
    };

    // 합계 금액
    worksheet.getCell(`G${row}`).value = totalAmount;
    worksheet.getCell(`G${row}`).style = {
      font: { bold: true, size: 12 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: borderStyle
    };

    row++;

    // 빈 행 추가
    worksheet.getCell(`A${row}`).value = '-';
    worksheet.getCell(`A${row}`).style = {
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: borderStyle
    };
    worksheet.mergeCells(`A${row}:F${row}`);
    worksheet.getCell(`G${row}`).value = '';
    worksheet.getCell(`G${row}`).style = {
      border: borderStyle
    };

    // 컬럼 너비 조정
    worksheet.columns = [
      { width: 15 },  // 품목
      { width: 10 },  // 규격
      { width: 8 },   // 수량
      { width: 10 },  // 단가
      { width: 12 },  // 가격
      { width: 8 },   // vat
      { width: 12 }   // 합계
    ];

    // 행 높이 조정
    for (let i = 1; i <= row; i++) {
      worksheet.getRow(i).height = 25;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
