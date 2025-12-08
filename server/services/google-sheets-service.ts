import { google } from 'googleapis';
import { type Order } from '@shared/schema';

interface GoogleSheetsConfig {
    spreadsheetId: string;
    serviceAccountEmail: string;
    privateKey: string;
}

export class GoogleSheetsService {
    private config: GoogleSheetsConfig;
    private enabled: boolean;
    private sheets: any;

    constructor() {
        // 환경 변수에서 설정 로드
        this.config = {
            spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '',
            serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
            privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
        };

        // 모든 필수 설정이 있는지 확인
        this.enabled = !!(
            this.config.spreadsheetId &&
            this.config.serviceAccountEmail &&
            this.config.privateKey
        );

        if (this.enabled) {
            console.log('[Google Sheets] 서비스 활성화됨');
            this.initializeClient();
        } else {
            console.log('[Google Sheets] 서비스 비활성화됨 (환경 변수 미설정)');
        }
    }

    /**
     * Google Sheets API 클라이언트 초기화
     */
    private initializeClient() {
        try {
            const auth = new google.auth.JWT({
                email: this.config.serviceAccountEmail,
                key: this.config.privateKey,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });

            this.sheets = google.sheets({ version: 'v4', auth });
            console.log('[Google Sheets] API 클라이언트 초기화 완료');
        } catch (error) {
            console.error('[Google Sheets] API 클라이언트 초기화 실패:', error);
            this.enabled = false;
        }
    }

    /**
     * 서비스 활성화 여부 확인
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * 주문 데이터를 Google Sheets에 추가
     */
    async appendOrderToSheet(order: Order): Promise<boolean> {
        if (!this.enabled || !this.sheets) {
            console.log('[Google Sheets] 서비스가 비활성화되어 있어 주문 저장 생략');
            return false;
        }

        try {
            console.log(`[Google Sheets] 주문 데이터 저장 시작 - ID: ${order.id}`);

            // 주문 데이터를 행 데이터로 변환
            const rowData = this.orderToRowData(order);

            // 스프레드시트에 행 추가
            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.config.spreadsheetId,
                range: '주문목록!A:Z', // '주문목록' 시트의 A부터 Z 컬럼까지
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [rowData],
                },
            });

            console.log(`[Google Sheets] 주문 데이터 저장 완료 - ID: ${order.id}`);
            return true;
        } catch (error: any) {
            console.error('[Google Sheets] 주문 데이터 저장 실패:', error);
            if (error.message) {
                console.error('에러 메시지:', error.message);
            }
            return false;
        }
    }

    /**
     * Order 객체를 Google Sheets 행 데이터로 변환
     */
    private orderToRowData(order: Order): any[] {
        const orderItems = order.orderItems as any[];

        // 메타 데이터에서 원본 주문 정보 추출
        const metaItem = orderItems.find(item => item.type === 'meta');
        const orderData = metaItem?.options || {};

        // 일반 쿠키 수량 계산
        const regularCookieQuantity = Object.values(orderData.regularCookies || {})
            .reduce((sum: number, qty: any) => sum + Number(qty || 0), 0);

        // 2구 패키지 수량
        const twoPackQuantity = orderData.twoPackSets?.reduce((sum: number, set: any) =>
            sum + (set.quantity || 1), 0) || 0;

        // 1구+음료 수량
        const singleWithDrinkQuantity = orderData.singleWithDrinkSets?.reduce((sum: number, set: any) =>
            sum + (set.quantity || 1), 0) || 0;

        // 브라우니쿠키 수량 및 옵션
        let brownieQuantity = 0;
        let birthdayBearQuantity = 0;
        let customStickerCount = 0;
        let heartMessageQuantity = 0;
        let hasCustomTopper = false;

        if (orderData.brownieCookieSets?.length > 0) {
            orderData.brownieCookieSets.forEach((set: any) => {
                const qty = set.quantity || 1;
                brownieQuantity += qty;

                if (set.shape === 'birthdayBear') {
                    birthdayBearQuantity += qty;
                }
                if (set.customSticker) {
                    customStickerCount += 1;
                }
                if (set.heartMessage) {
                    heartMessageQuantity += qty;
                }
                if (set.customTopper) {
                    hasCustomTopper = true;
                }
            });
        }

        // 스콘 수량 및 옵션
        let sconeQuantity = 0;
        let strawberryJamQuantity = 0;

        if (orderData.sconeSets?.length > 0) {
            orderData.sconeSets.forEach((set: any) => {
                const qty = set.quantity || 1;
                sconeQuantity += qty;

                if (set.strawberryJam) {
                    strawberryJamQuantity += qty;
                }
            });
        }

        // 포장 정보
        const packagingName = orderData.packaging === 'single_box' ? '1구박스' :
            orderData.packaging === 'plastic_wrap' ? '비닐탭포장' :
                orderData.packaging === 'oil_paper' ? '유산지' : '';

        // 포장 수량 (1구박스, 비닐탭포장은 일반 쿠키 수량만큼, 유산지는 1)
        let packagingQuantity = 0;
        if (orderData.packaging) {
            if (orderData.packaging === 'single_box' || orderData.packaging === 'plastic_wrap') {
                packagingQuantity = regularCookieQuantity;
            } else {
                packagingQuantity = 1;
            }
        }

        // 행운쿠키, 비행기샌드쿠키
        const fortuneCookieQuantity = orderData.fortuneCookie || 0;
        const airplaneSandwichQuantity = orderData.airplaneSandwich || 0;

        // 수령 방법
        const deliveryMethodText = order.deliveryMethod === 'pickup' ? '매장 픽업' :
            order.deliveryMethod === 'quick' ? '퀵 배송' : '픽업';

        // 주문 시간 포맷
        const orderTime = order.createdAt ? new Date(order.createdAt).toLocaleString('ko-KR', {
            timeZone: 'Asia/Seoul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }) : '';

        // 주문 상태
        const orderStatus = order.orderStatus === 'pending' ? '대기중' :
            order.orderStatus === 'payment_confirmed' ? '입금확인' :
                order.orderStatus === 'completed' ? '완료' : order.orderStatus || '';

        // 입금 확인 여부
        const paymentConfirmed = order.paymentConfirmed ? 'Y' : 'N';

        // 행 데이터 생성 (컬럼 순서에 맞게)
        return [
            orderTime,                      // A: 주문 시간
            order.id,                       // B: 주문 ID
            order.customerName,             // C: 고객명
            order.customerContact,          // D: 연락처 (이메일)
            orderData.customerPhone || '',  // E: 전화번호
            order.deliveryDate,             // F: 수령 희망일
            orderData.pickupTime || '',     // G: 수령 시간
            deliveryMethodText,             // H: 수령 방법
            orderData.deliveryAddress || '', // I: 배송 주소
            regularCookieQuantity,          // J: 일반쿠키 수량
            twoPackQuantity,                // K: 2구 패키지 수량
            singleWithDrinkQuantity,        // L: 1구+음료 수량
            brownieQuantity,                // M: 브라우니쿠키 수량
            birthdayBearQuantity,           // N: 생일곰 추가 수량
            customStickerCount,             // O: 커스텀 스티커 수량
            heartMessageQuantity,           // P: 하트 메시지 수량
            hasCustomTopper ? 'Y' : 'N',    // Q: 커스텀 토퍼 여부
            sconeQuantity,                  // R: 스콘 수량
            strawberryJamQuantity,          // S: 딸기잼 추가 수량
            fortuneCookieQuantity,          // T: 행운쿠키 수량
            airplaneSandwichQuantity,       // U: 비행기샌드쿠키 수량
            packagingName,                  // V: 포장 종류
            packagingQuantity,              // W: 포장 수량
            order.totalPrice,               // X: 총 금액
            orderStatus,                    // Y: 주문 상태
            paymentConfirmed,               // Z: 입금 확인
        ];
    }

    /**
     * 스프레드시트 헤더 행 초기화 (최초 1회만 실행)
     */
    async initializeSheetHeaders(): Promise<boolean> {
        if (!this.enabled || !this.sheets) {
            console.log('[Google Sheets] 서비스가 비활성화되어 있어 헤더 초기화 생략');
            return false;
        }

        try {
            const headers = [
                '주문 시간',
                '주문 ID',
                '고객명',
                '이메일',
                '전화번호',
                '수령 희망일',
                '수령 시간',
                '수령 방법',
                '배송 주소',
                '일반쿠키',
                '2구 패키지',
                '1구+음료',
                '브라우니쿠키',
                '생일곰 추가',
                '커스텀 스티커',
                '하트 메시지',
                '커스텀 토퍼',
                '스콘',
                '딸기잼 추가',
                '행운쿠키',
                '비행기샌드쿠키',
                '포장 종류',
                '포장 수량',
                '총 금액',
                '주문 상태',
                '입금 확인',
            ];

            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.config.spreadsheetId,
                range: '주문목록!A1:Z1',
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [headers],
                },
            });

            console.log('[Google Sheets] 헤더 행 초기화 완료');
            return true;
        } catch (error: any) {
            console.error('[Google Sheets] 헤더 행 초기화 실패:', error);
            if (error.message) {
                console.error('에러 메시지:', error.message);
            }
            return false;
        }
    }
}

// 싱글톤 인스턴스
export const googleSheetsService = new GoogleSheetsService();
