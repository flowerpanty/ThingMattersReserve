import { google } from 'googleapis';
import { type Order, cookiePrices } from '@shared/schema';
import { buildOrderDataFromOrder } from './order-data-utils';

interface GoogleSheetsConfig {
    spreadsheetId: string;
    serviceAccountEmail: string;
    privateKey: string;
    sheetName: string;
}

interface QuoteSheetRow {
    name: string;
    quantity: number | string;
    price: number | '';
    amount: number | '';
    height?: number;
}

interface QuoteSheetResult {
    sheetId: number;
    sheetTitle: string;
    sheetUrl: string;
}

export class GoogleSheetsService {
    private config: GoogleSheetsConfig;
    private enabled: boolean;
    private sheets: any;
    private resolvedSheetName: string | null = null;

    constructor() {
        // 환경 변수에서 설정 로드
        let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';

        // Private key 포맷 정리: 이중 이스케이프와 단일 이스케이프 모두 처리
        if (privateKey) {
            // 따옴표 제거
            privateKey = privateKey.replace(/^["']|["']$/g, '');
            // \\n을 실제 개행 문자로 변환 (이중 이스케이프 처리)
            privateKey = privateKey.replace(/\\\\n/g, '\n');
            // \n을 실제 개행 문자로 변환 (단일 이스케이프 처리)
            privateKey = privateKey.replace(/\\n/g, '\n');
        }

        this.config = {
            spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '',
            serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
            privateKey: privateKey,
            sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || process.env.GOOGLE_SHEETS_TAB_NAME || '주문목록',
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

    private formatSheetRange(sheetName: string, range: string): string {
        const escapedName = sheetName.replace(/'/g, "''");
        return `'${escapedName}'!${range}`;
    }

    private async resolveSheetName(): Promise<string> {
        if (this.resolvedSheetName) {
            return this.resolvedSheetName;
        }

        if (!this.sheets) {
            return this.config.sheetName;
        }

        try {
            const response = await this.sheets.spreadsheets.get({
                spreadsheetId: this.config.spreadsheetId,
            });

            const sheetTitles = (response.data.sheets || [])
                .map((sheet: any) => sheet.properties?.title)
                .filter((title: any): title is string => Boolean(title));

            if (sheetTitles.includes(this.config.sheetName)) {
                this.resolvedSheetName = this.config.sheetName;
            } else if (sheetTitles.length > 0) {
                this.resolvedSheetName = sheetTitles[0];
                console.warn(
                    `[Google Sheets] 시트 "${this.config.sheetName}"를 찾지 못해 "${this.resolvedSheetName}" 시트를 사용합니다.`
                );
            } else {
                this.resolvedSheetName = this.config.sheetName;
            }
        } catch (error) {
            console.warn('[Google Sheets] 시트 목록 조회 실패, 기본 시트명을 사용합니다:', error);
            this.resolvedSheetName = this.config.sheetName;
        }

        return this.resolvedSheetName ?? this.config.sheetName;
    }

    private sanitizeSheetTitle(title: string): string {
        const cleaned = title
            .replace(/[\\/?*[\]:]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        return (cleaned || `견적서 ${Date.now()}`).slice(0, 90);
    }

    private formatWon(value: number | ''): string {
        return typeof value === 'number' ? `${value.toLocaleString('ko-KR')}원` : '';
    }

    private buildSavedItemName(item: any): string {
        const options = item?.options || {};

        if (options.landingSource === 'brookie') {
            const details = [
                options.characterName,
                options.paperName ? `종이 ${options.paperName}` : '',
                options.heartMessage ? `하트 ${options.heartMessage}` : '',
                [options.customPaperLine1, options.customPaperLine2].filter(Boolean).join(' / '),
            ].filter(Boolean);

            return details.length ? `${item.name} (${details.join(' · ')})` : item.name;
        }

        return item.name || item.type;
    }

    private buildSavedDetailLines(order: Order): string[] {
        return (Array.isArray(order.orderItems) ? (order.orderItems as any[]) : [])
            .filter((item) => item && item.type !== 'meta' && item.options?.landingSource === 'brookie')
            .map((item) => {
                const options = item.options || {};
                const details = [
                    options.characterName ? `캐릭터 ${options.characterName}` : '',
                    options.paperName ? `종이 ${options.paperName}` : '',
                    options.heartMessage ? `하트 문구 ${options.heartMessage}` : '',
                    [options.customPaperLine1, options.customPaperLine2].filter(Boolean).join(' / '),
                    options.topperKind ? `토퍼 ${options.topperKind}` : '',
                ].filter(Boolean);

                return details.length ? `• ${item.name}: ${details.join(', ')}` : `• ${item.name}`;
            });
    }

    private buildQuoteRowsFromStoredItems(order: Order) {
        const storedItems = Array.isArray(order.orderItems)
            ? (order.orderItems as any[]).filter((item) => item && item.type !== 'meta')
            : [];

        if (storedItems.length === 0) {
            return null;
        }

        const rows: QuoteSheetRow[] = [];
        let totalAmount = 0;
        let regularCookieQuantity = 0;

        storedItems.forEach((item) => {
            const quantity = Number(item.quantity || 0);
            const price = Number(item.price || 0);
            const amount = price * quantity;

            if (!Number.isFinite(quantity) || !Number.isFinite(price)) {
                return;
            }

            if (item.type === 'regular') {
                regularCookieQuantity += quantity;
            }

            const name = this.buildSavedItemName(item);

            rows.push({
                name,
                quantity,
                price,
                amount,
                height: name.length > 28 ? 60 : undefined,
            });
            totalAmount += amount;
        });

        const orderTotal = Number(order.totalPrice);
        const diff = Number.isFinite(orderTotal) ? orderTotal - totalAmount : 0;
        if (rows.length > 0 && diff !== 0) {
            rows.push({
                name: diff > 0 ? '추가 금액' : '할인/조정',
                quantity: '',
                price: '',
                amount: diff,
            });
            totalAmount = orderTotal;
        }

        return {
            rows,
            totalAmount,
            regularCookieQuantity,
            detailLines: this.buildSavedDetailLines(order),
        };
    }

    private buildQuoteRows(order: Order) {
        const orderData = buildOrderDataFromOrder(order);
        const storedItemQuote = this.buildQuoteRowsFromStoredItems(order);

        const rows: QuoteSheetRow[] = [];
        let totalAmount = 0;

        const regularCookieQuantity = Object.values(orderData.regularCookies || {}).reduce((sum, qty) => sum + qty, 0);
        if (regularCookieQuantity > 0) {
            const amount = regularCookieQuantity * cookiePrices.regular;
            totalAmount += amount;
            rows.push({ name: '일반쿠키', quantity: regularCookieQuantity, price: cookiePrices.regular, amount });
        }

        if (orderData.twoPackSets?.length > 0) {
            const quantity = orderData.twoPackSets.reduce((sum, set) => sum + (set.quantity || 1), 0);
            const amount = quantity * cookiePrices.twoPackSet;
            totalAmount += amount;
            rows.push({ name: '2구 패키지', quantity, price: cookiePrices.twoPackSet, amount });
        }

        if (orderData.singleWithDrinkSets?.length > 0) {
            const quantity = orderData.singleWithDrinkSets.reduce((sum, set) => sum + (set.quantity || 1), 0);
            const amount = quantity * cookiePrices.singleWithDrink;
            totalAmount += amount;
            rows.push({ name: '1구 + 음료', quantity, price: cookiePrices.singleWithDrink, amount });
        }

        if (orderData.brownieCookieSets?.length > 0) {
            let totalBrownieQuantity = 0;
            let baseBrownieAmount = 0;
            let totalBirthdayBearQuantity = 0;
            let totalCustomStickerCount = 0;
            let totalHeartMessageQuantity = 0;
            let hasCustomTopper = false;

            orderData.brownieCookieSets.forEach((set) => {
                const quantity = set.quantity || 1;
                totalBrownieQuantity += quantity;
                baseBrownieAmount += quantity * cookiePrices.brownie;

                if (set.shape === 'birthdayBear') {
                    totalBirthdayBearQuantity += quantity;
                }
                if (set.customSticker) {
                    totalCustomStickerCount += 1;
                }
                if (set.heartMessage) {
                    totalHeartMessageQuantity += quantity;
                }
                if (set.customTopper) {
                    hasCustomTopper = true;
                }
            });

            totalAmount += baseBrownieAmount;
            rows.push({ name: '브라우니쿠키', quantity: totalBrownieQuantity, price: cookiePrices.brownie, amount: baseBrownieAmount });

            if (hasCustomTopper) {
                rows.push({ name: '└ 커스텀토퍼', quantity: '', price: '', amount: '' });
            }

            if (totalBirthdayBearQuantity > 0) {
                const amount = totalBirthdayBearQuantity * cookiePrices.brownieOptions.birthdayBear;
                totalAmount += amount;
                rows.push({ name: '└ 생일곰 추가', quantity: totalBirthdayBearQuantity, price: cookiePrices.brownieOptions.birthdayBear, amount });
            }

            if (totalCustomStickerCount > 0) {
                const amount = totalCustomStickerCount * cookiePrices.brownieOptions.customSticker;
                totalAmount += amount;
                rows.push({ name: '└ 하단 커스텀 스티커', quantity: totalCustomStickerCount, price: cookiePrices.brownieOptions.customSticker, amount });
            }

            if (totalHeartMessageQuantity > 0) {
                const amount = totalHeartMessageQuantity * cookiePrices.brownieOptions.heartMessage;
                totalAmount += amount;
                rows.push({ name: '└ 하트안 문구 추가', quantity: totalHeartMessageQuantity, price: cookiePrices.brownieOptions.heartMessage, amount });
            }
        }

        if (orderData.sconeSets?.length > 0) {
            let totalSconeQuantity = 0;
            let baseSconeAmount = 0;
            let totalStrawberryJamQuantity = 0;

            orderData.sconeSets.forEach((set) => {
                const quantity = set.quantity || 1;
                totalSconeQuantity += quantity;
                baseSconeAmount += quantity * cookiePrices.scone;

                if (set.strawberryJam) {
                    totalStrawberryJamQuantity += quantity;
                }
            });

            totalAmount += baseSconeAmount;
            rows.push({ name: '스콘', quantity: totalSconeQuantity, price: cookiePrices.scone, amount: baseSconeAmount });

            if (totalStrawberryJamQuantity > 0) {
                const amount = totalStrawberryJamQuantity * cookiePrices.sconeOptions.strawberryJam;
                totalAmount += amount;
                rows.push({ name: '└ 딸기잼 추가', quantity: totalStrawberryJamQuantity, price: cookiePrices.sconeOptions.strawberryJam, amount });
            }
        }

        if (orderData.fortuneCookie > 0) {
            const amount = orderData.fortuneCookie * cookiePrices.fortune;
            totalAmount += amount;
            rows.push({ name: '행운쿠키', quantity: `${orderData.fortuneCookie}박스`, price: cookiePrices.fortune, amount });
        }

        if (orderData.airplaneSandwich > 0) {
            const amount = orderData.airplaneSandwich * cookiePrices.airplane;
            totalAmount += amount;
            rows.push({ name: '비행기샌드쿠키', quantity: `${orderData.airplaneSandwich}박스`, price: cookiePrices.airplane, amount });
        }

        if (orderData.packaging) {
            const packagingPricePerItem = cookiePrices.packaging[orderData.packaging];
            const packagingName = orderData.packaging === 'single_box'
                ? '1구박스'
                : orderData.packaging === 'plastic_wrap'
                    ? '비닐탭포장'
                    : '유산지';

            let packagingQuantity = 1;
            let totalPackagingPrice = packagingPricePerItem;

            if (orderData.packaging === 'single_box' || orderData.packaging === 'plastic_wrap') {
                packagingQuantity = regularCookieQuantity;
                totalPackagingPrice = regularCookieQuantity * packagingPricePerItem;
            }

            if (totalPackagingPrice > 0) {
                totalAmount += totalPackagingPrice;
                rows.push({
                    name: packagingName,
                    quantity: packagingQuantity,
                    price: packagingPricePerItem,
                    amount: totalPackagingPrice,
                });
            }
        }

        if (orderData.deliveryMethod === 'quick') {
            rows.push({ name: '배송비', quantity: '', price: '', amount: '' });
        }

        const detailLines: string[] = [];

        if (regularCookieQuantity > 0) {
            const selectedCookies = Object.entries(orderData.regularCookies || {})
                .filter(([, qty]) => qty > 0)
                .map(([type, qty]) => `${type} ${qty}개`)
                .join(', ');
            detailLines.push(`• 일반쿠키: ${selectedCookies}`);
        }

        if (orderData.twoPackSets?.length > 0) {
            orderData.twoPackSets.forEach((set, index) => {
                if (set.selectedCookies?.length > 0) {
                    detailLines.push(`• 2구 패키지 세트 ${index + 1} (${set.quantity || 1}개): ${set.selectedCookies.join(', ')}`);
                }
            });
        }

        if (orderData.singleWithDrinkSets?.length > 0) {
            orderData.singleWithDrinkSets.forEach((set, index) => {
                let line = `• 1구 + 음료 세트 ${index + 1} (${set.quantity || 1}개)`;
                if (set.selectedCookie || set.selectedDrink) {
                    line += ': ';
                    if (set.selectedCookie) {
                        line += `쿠키(${set.selectedCookie})`;
                    }
                    if (set.selectedDrink) {
                        if (set.selectedCookie) line += ', ';
                        line += `음료(${set.selectedDrink})`;
                    }
                }
                detailLines.push(line);
            });
        }

        if (orderData.brownieCookieSets?.length > 0) {
            orderData.brownieCookieSets.forEach((set, index) => {
                const shapeMap: Record<string, string> = {
                    bear: '곰',
                    rabbit: '토끼',
                    tiger: '호랑이',
                    birthdayBear: '생일곰',
                };

                let line = `• 브라우니쿠키 세트 ${index + 1} (${set.quantity || 1}개)`;
                if (set.shape) {
                    line += `: ${shapeMap[set.shape] || set.shape} 모양`;
                }
                if (set.customSticker) line += ', 커스텀스티커';
                if (set.heartMessage) line += `, 하트메시지: ${set.heartMessage}`;
                if (set.customTopper) line += ', 커스텀토퍼';
                detailLines.push(line);
            });
        }

        if (orderData.sconeSets?.length > 0) {
            orderData.sconeSets.forEach((set, index) => {
                let line = `• 스콘 세트 ${index + 1} (${set.quantity || 1}개)`;
                if (set.flavor) {
                    line += `: ${set.flavor === 'chocolate' ? '초코맛' : '고메버터맛'}`;
                }
                if (set.strawberryJam) line += ', 딸기잼 추가';
                detailLines.push(line);
            });
        }

        if (orderData.packaging) {
            const packagingLabel = orderData.packaging === 'single_box'
                ? '1구박스 (+500원)'
                : orderData.packaging === 'plastic_wrap'
                    ? '비닐탭포장 (+500원)'
                    : '유산지 (무료)';
            detailLines.push(`• 포장 옵션: ${packagingLabel}`);
        }

        if (storedItemQuote?.rows.length) {
            return {
                orderData,
                rows: storedItemQuote.rows,
                totalAmount: storedItemQuote.totalAmount,
                detailLines: storedItemQuote.detailLines.length
                    ? storedItemQuote.detailLines
                    : detailLines,
            };
        }

        return { orderData, rows, totalAmount, detailLines };
    }

    async createQuoteSheet(order: Order): Promise<QuoteSheetResult | null> {
        if (!this.enabled || !this.sheets) {
            console.log('[Google Sheets] 서비스가 비활성화되어 있어 견적서 시트 생성 생략');
            return null;
        }

        try {
            const { orderData, rows, totalAmount, detailLines } = this.buildQuoteRows(order);
            const sheetTitle = this.sanitizeSheetTitle(`견적서 ${order.customerName} ${order.id.slice(0, 8)}`);
            const requiredRowCount = Math.max(60, rows.length + detailLines.length + 20);

            const spreadsheet = await this.sheets.spreadsheets.get({
                spreadsheetId: this.config.spreadsheetId,
            });

            const existingSheets = spreadsheet.data.sheets || [];
            const existingSheet = existingSheets.find((sheet: any) => sheet.properties?.title === sheetTitle);

            const requests: any[] = [];
            if (existingSheet?.properties?.sheetId && existingSheets.length > 1) {
                requests.push({
                    deleteSheet: {
                        sheetId: existingSheet.properties.sheetId,
                    },
                });
            }

            requests.push({
                addSheet: {
                    properties: {
                        title: sheetTitle,
                        gridProperties: {
                            rowCount: requiredRowCount,
                            columnCount: 4,
                        },
                    },
                },
            });

            const createResponse = await this.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.config.spreadsheetId,
                requestBody: { requests },
            });

            const addSheetReply = createResponse.data.replies?.find((reply: any) => reply.addSheet?.properties);
            const sheetId = addSheetReply?.addSheet?.properties?.sheetId;

            if (typeof sheetId !== 'number') {
                throw new Error('견적서 시트 ID를 가져오지 못했습니다.');
            }

            let deliveryText = `수령 방법: ${orderData.deliveryMethod === 'pickup' ? '매장 픽업' : '퀵 배송'} | 수령 희망일: ${orderData.deliveryDate}`;
            if (orderData.pickupTime) {
                deliveryText += ` | 시간: ${orderData.pickupTime}`;
            }
            if (orderData.deliveryMethod === 'quick' && orderData.deliveryAddress) {
                deliveryText += `\n배송 주소: ${orderData.deliveryAddress}`;
            }

            const values: string[][] = [
                ['nothingmatters 견적서', '', '', ''],
                [`고객명: ${orderData.customerName} | 이메일: ${orderData.customerContact} | 핸드폰: ${orderData.customerPhone || ''}`.trim(), '', '', ''],
                [deliveryText, '', '', ''],
                ['', '', '', ''],
                ['제품명', '수량', '단가', '합계'],
                ...rows.map((row) => [
                    row.name,
                    row.quantity === '' ? '' : String(row.quantity),
                    this.formatWon(row.price),
                    this.formatWon(row.amount),
                ]),
                ['', '', '', ''],
                ['총 합계', '', '', this.formatWon(totalAmount)],
                ['', '', '', ''],
                ['주문 상세 옵션', '', '', ''],
                ...(detailLines.length > 0 ? detailLines : ['상세 옵션 없음']).map((line) => [line, '', '', '']),
                ['', '', '', ''],
                ['입금 계좌: 83050104204736 국민은행 (낫띵메터스)', '', '', ''],
                ['주문 문의: 카카오톡 @nothingmatters 또는 010-2866-7976', '', '', ''],
            ];

            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.config.spreadsheetId,
                range: this.formatSheetRange(sheetTitle, `A1:D${values.length}`),
                valueInputOption: 'USER_ENTERED',
                requestBody: { values },
            });

            const itemStartRow = 6;
            const itemEndRow = itemStartRow + rows.length - 1;
            const totalRow = itemEndRow + 2;
            const detailHeaderRow = totalRow + 2;
            const detailStartRow = detailHeaderRow + 1;
            const detailEndRow = detailStartRow + Math.max(detailLines.length, 1) - 1;
            const accountRow = detailEndRow + 2;
            const contactRow = accountRow + 1;
            const sheetEndRow = contactRow;
            const hasDeliveryAddress = orderData.deliveryMethod === 'quick' && Boolean(orderData.deliveryAddress);

            const styleRequests: any[] = [
                {
                    updateSheetProperties: {
                        properties: {
                            sheetId,
                            gridProperties: {
                                hideGridlines: true,
                            },
                        },
                        fields: 'gridProperties.hideGridlines',
                    },
                },
                {
                    updateDimensionProperties: {
                        range: {
                            sheetId,
                            dimension: 'COLUMNS',
                            startIndex: 0,
                            endIndex: 1,
                        },
                        properties: { pixelSize: 324 },
                        fields: 'pixelSize',
                    },
                },
                {
                    updateDimensionProperties: {
                        range: {
                            sheetId,
                            dimension: 'COLUMNS',
                            startIndex: 1,
                            endIndex: 2,
                        },
                        properties: { pixelSize: 108 },
                        fields: 'pixelSize',
                    },
                },
                {
                    updateDimensionProperties: {
                        range: {
                            sheetId,
                            dimension: 'COLUMNS',
                            startIndex: 2,
                            endIndex: 4,
                        },
                        properties: { pixelSize: 144 },
                        fields: 'pixelSize',
                    },
                },
                {
                    updateDimensionProperties: {
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: 0,
                            endIndex: 1,
                        },
                        properties: { pixelSize: 52 },
                        fields: 'pixelSize',
                    },
                },
                {
                    updateDimensionProperties: {
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: 1,
                            endIndex: 2,
                        },
                        properties: { pixelSize: 36 },
                        fields: 'pixelSize',
                    },
                },
                {
                    updateDimensionProperties: {
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: 2,
                            endIndex: 3,
                        },
                        properties: { pixelSize: hasDeliveryAddress ? 56 : 36 },
                        fields: 'pixelSize',
                    },
                },
                {
                    updateDimensionProperties: {
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: 4,
                            endIndex: 5,
                        },
                        properties: { pixelSize: 36 },
                        fields: 'pixelSize',
                    },
                },
                {
                    repeatCell: {
                        range: {
                            sheetId,
                            startRowIndex: 0,
                            endRowIndex: sheetEndRow,
                            startColumnIndex: 0,
                            endColumnIndex: 4,
                        },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: { red: 1, green: 1, blue: 1 },
                                borders: {
                                    top: { style: 'SOLID', color: { red: 0, green: 0, blue: 0 } },
                                    bottom: { style: 'SOLID', color: { red: 0, green: 0, blue: 0 } },
                                    left: { style: 'SOLID', color: { red: 0, green: 0, blue: 0 } },
                                    right: { style: 'SOLID', color: { red: 0, green: 0, blue: 0 } },
                                },
                                textFormat: {
                                    fontFamily: 'Arial',
                                    fontSize: 12,
                                    foregroundColor: { red: 0.1, green: 0.13, blue: 0.2 },
                                },
                                verticalAlignment: 'MIDDLE',
                            },
                        },
                        fields: 'userEnteredFormat(backgroundColor,borders,textFormat,verticalAlignment)',
                    },
                },
                {
                    mergeCells: {
                        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 4 },
                        mergeType: 'MERGE_ALL',
                    },
                },
                {
                    mergeCells: {
                        range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 4 },
                        mergeType: 'MERGE_ALL',
                    },
                },
                {
                    mergeCells: {
                        range: { sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 4 },
                        mergeType: 'MERGE_ALL',
                    },
                },
                {
                    repeatCell: {
                        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 4 },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: { red: 0.31, green: 0.27, blue: 0.9 },
                                horizontalAlignment: 'CENTER',
                                textFormat: {
                                    fontFamily: 'Arial',
                                    fontSize: 22,
                                    bold: true,
                                    foregroundColor: { red: 1, green: 1, blue: 1 },
                                },
                            },
                        },
                        fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,textFormat)',
                    },
                },
                {
                    repeatCell: {
                        range: { sheetId, startRowIndex: 1, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 4 },
                        cell: {
                            userEnteredFormat: {
                                horizontalAlignment: 'LEFT',
                                wrapStrategy: 'WRAP',
                                textFormat: {
                                    fontFamily: 'Arial',
                                    fontSize: 13,
                                    foregroundColor: { red: 0.1, green: 0.13, blue: 0.2 },
                                },
                            },
                        },
                        fields: 'userEnteredFormat(horizontalAlignment,wrapStrategy,textFormat)',
                    },
                },
                {
                    repeatCell: {
                        range: { sheetId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 0, endColumnIndex: 4 },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: { red: 0.9, green: 0.91, blue: 0.93 },
                                horizontalAlignment: 'CENTER',
                                textFormat: {
                                    fontFamily: 'Arial',
                                    fontSize: 14,
                                    bold: true,
                                    foregroundColor: { red: 0.1, green: 0.13, blue: 0.2 },
                                },
                            },
                        },
                        fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,textFormat)',
                    },
                },
                {
                    mergeCells: {
                        range: { sheetId, startRowIndex: totalRow - 1, endRowIndex: totalRow, startColumnIndex: 0, endColumnIndex: 3 },
                        mergeType: 'MERGE_ALL',
                    },
                },
                {
                    repeatCell: {
                        range: { sheetId, startRowIndex: totalRow - 1, endRowIndex: totalRow, startColumnIndex: 0, endColumnIndex: 4 },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: { red: 0.31, green: 0.27, blue: 0.9 },
                                textFormat: {
                                    fontFamily: 'Arial',
                                    fontSize: 14,
                                    bold: true,
                                    foregroundColor: { red: 1, green: 1, blue: 1 },
                                },
                            },
                        },
                        fields: 'userEnteredFormat(backgroundColor,textFormat)',
                    },
                },
                {
                    repeatCell: {
                        range: { sheetId, startRowIndex: totalRow - 1, endRowIndex: totalRow, startColumnIndex: 0, endColumnIndex: 3 },
                        cell: {
                            userEnteredFormat: { horizontalAlignment: 'CENTER' },
                        },
                        fields: 'userEnteredFormat(horizontalAlignment)',
                    },
                },
                {
                    repeatCell: {
                        range: { sheetId, startRowIndex: totalRow - 1, endRowIndex: totalRow, startColumnIndex: 3, endColumnIndex: 4 },
                        cell: {
                            userEnteredFormat: { horizontalAlignment: 'RIGHT' },
                        },
                        fields: 'userEnteredFormat(horizontalAlignment)',
                    },
                },
                {
                    mergeCells: {
                        range: { sheetId, startRowIndex: detailHeaderRow - 1, endRowIndex: detailHeaderRow, startColumnIndex: 0, endColumnIndex: 4 },
                        mergeType: 'MERGE_ALL',
                    },
                },
                {
                    repeatCell: {
                        range: { sheetId, startRowIndex: detailHeaderRow - 1, endRowIndex: detailHeaderRow, startColumnIndex: 0, endColumnIndex: 4 },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: { red: 0.95, green: 0.96, blue: 0.96 },
                                horizontalAlignment: 'LEFT',
                                textFormat: {
                                    fontFamily: 'Arial',
                                    fontSize: 13,
                                    bold: true,
                                },
                            },
                        },
                        fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,textFormat)',
                    },
                },
            ];

            if (rows.length > 0) {
                styleRequests.push(
                    {
                        updateDimensionProperties: {
                            range: {
                                sheetId,
                                dimension: 'ROWS',
                                startIndex: itemStartRow - 1,
                                endIndex: itemEndRow,
                            },
                            properties: { pixelSize: 44 },
                            fields: 'pixelSize',
                        },
                    },
                    {
                        repeatCell: {
                            range: { sheetId, startRowIndex: itemStartRow - 1, endRowIndex: itemEndRow, startColumnIndex: 0, endColumnIndex: 1 },
                            cell: {
                                userEnteredFormat: {
                                    horizontalAlignment: 'CENTER',
                                    wrapStrategy: 'WRAP',
                                },
                            },
                            fields: 'userEnteredFormat(horizontalAlignment,wrapStrategy)',
                        },
                    },
                    {
                        repeatCell: {
                            range: { sheetId, startRowIndex: itemStartRow - 1, endRowIndex: itemEndRow, startColumnIndex: 1, endColumnIndex: 2 },
                            cell: {
                                userEnteredFormat: { horizontalAlignment: 'CENTER' },
                            },
                            fields: 'userEnteredFormat(horizontalAlignment)',
                        },
                    },
                    {
                        repeatCell: {
                            range: { sheetId, startRowIndex: itemStartRow - 1, endRowIndex: itemEndRow, startColumnIndex: 2, endColumnIndex: 4 },
                            cell: {
                                userEnteredFormat: { horizontalAlignment: 'RIGHT' },
                            },
                            fields: 'userEnteredFormat(horizontalAlignment)',
                        },
                    },
                );

                rows.forEach((row, index) => {
                    const rowStartIndex = itemStartRow - 1 + index;

                    if (row.name.startsWith('└')) {
                        styleRequests.push({
                            repeatCell: {
                                range: {
                                    sheetId,
                                    startRowIndex: rowStartIndex,
                                    endRowIndex: rowStartIndex + 1,
                                    startColumnIndex: 0,
                                    endColumnIndex: 1,
                                },
                                cell: {
                                    userEnteredFormat: {
                                        horizontalAlignment: 'LEFT',
                                    },
                                },
                                fields: 'userEnteredFormat.horizontalAlignment',
                            },
                        });
                    }

                    if (row.height && row.height > 44) {
                        styleRequests.push({
                            updateDimensionProperties: {
                                range: {
                                    sheetId,
                                    dimension: 'ROWS',
                                    startIndex: rowStartIndex,
                                    endIndex: rowStartIndex + 1,
                                },
                                properties: { pixelSize: row.height },
                                fields: 'pixelSize',
                            },
                        });
                    }
                });
            }

            for (let rowIndex = detailStartRow; rowIndex <= detailEndRow; rowIndex++) {
                styleRequests.push({
                    mergeCells: {
                        range: { sheetId, startRowIndex: rowIndex - 1, endRowIndex: rowIndex, startColumnIndex: 0, endColumnIndex: 4 },
                        mergeType: 'MERGE_ALL',
                    },
                });
                styleRequests.push({
                    repeatCell: {
                        range: { sheetId, startRowIndex: rowIndex - 1, endRowIndex: rowIndex, startColumnIndex: 0, endColumnIndex: 4 },
                        cell: {
                            userEnteredFormat: {
                                horizontalAlignment: 'LEFT',
                                wrapStrategy: 'WRAP',
                                textFormat: {
                                    fontFamily: 'Arial',
                                    fontSize: 13,
                                },
                            },
                        },
                        fields: 'userEnteredFormat(horizontalAlignment,wrapStrategy,textFormat)',
                    },
                });
            }

            styleRequests.push(
                {
                    mergeCells: {
                        range: { sheetId, startRowIndex: accountRow - 1, endRowIndex: accountRow, startColumnIndex: 0, endColumnIndex: 4 },
                        mergeType: 'MERGE_ALL',
                    },
                },
                {
                    repeatCell: {
                        range: { sheetId, startRowIndex: accountRow - 1, endRowIndex: accountRow, startColumnIndex: 0, endColumnIndex: 4 },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: { red: 0.996, green: 0.953, blue: 0.78 },
                                horizontalAlignment: 'CENTER',
                                textFormat: {
                                    fontFamily: 'Arial',
                                    fontSize: 13,
                                    bold: true,
                                },
                            },
                        },
                        fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,textFormat)',
                    },
                },
                {
                    mergeCells: {
                        range: { sheetId, startRowIndex: contactRow - 1, endRowIndex: contactRow, startColumnIndex: 0, endColumnIndex: 4 },
                        mergeType: 'MERGE_ALL',
                    },
                },
                {
                    repeatCell: {
                        range: { sheetId, startRowIndex: contactRow - 1, endRowIndex: contactRow, startColumnIndex: 0, endColumnIndex: 4 },
                        cell: {
                            userEnteredFormat: {
                                horizontalAlignment: 'CENTER',
                                textFormat: {
                                    fontFamily: 'Arial',
                                    fontSize: 13,
                                },
                            },
                        },
                        fields: 'userEnteredFormat(horizontalAlignment,textFormat)',
                    },
                },
            );

            styleRequests.push(
                {
                    updateDimensionProperties: {
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: totalRow - 1,
                            endIndex: totalRow,
                        },
                        properties: { pixelSize: 42 },
                        fields: 'pixelSize',
                    },
                },
                {
                    updateDimensionProperties: {
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: detailHeaderRow - 1,
                            endIndex: detailHeaderRow,
                        },
                        properties: { pixelSize: 34 },
                        fields: 'pixelSize',
                    },
                },
                {
                    updateDimensionProperties: {
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: detailStartRow - 1,
                            endIndex: detailEndRow,
                        },
                        properties: { pixelSize: 40 },
                        fields: 'pixelSize',
                    },
                },
                {
                    updateDimensionProperties: {
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: accountRow - 1,
                            endIndex: accountRow,
                        },
                        properties: { pixelSize: 40 },
                        fields: 'pixelSize',
                    },
                },
                {
                    updateDimensionProperties: {
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: contactRow - 1,
                            endIndex: contactRow,
                        },
                        properties: { pixelSize: 34 },
                        fields: 'pixelSize',
                    },
                },
            );

            await this.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.config.spreadsheetId,
                requestBody: { requests: styleRequests },
            });

            console.log(`[Google Sheets] 견적서 시트 생성 완료 - ID: ${order.id}, Title: ${sheetTitle}`);

            return {
                sheetId,
                sheetTitle,
                sheetUrl: `https://docs.google.com/spreadsheets/d/${this.config.spreadsheetId}/edit#gid=${sheetId}`,
            };
        } catch (error: any) {
            console.error('[Google Sheets] 견적서 시트 생성 실패:', error);
            if (error.message) {
                console.error('에러 메시지:', error.message);
            }
            return null;
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
            const sheetName = await this.resolveSheetName();

            // 스프레드시트에 행 추가
            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.config.spreadsheetId,
                range: this.formatSheetRange(sheetName, 'A:Z'),
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
        const orderData = buildOrderDataFromOrder(order);

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
        const orderStatus = order.orderStatus === 'pending' ? '주문접수' :
            order.orderStatus === 'order_confirmed' ? '주문확인' :
                order.orderStatus === 'payment_confirmed' ? '입금확인' :
                    order.orderStatus === 'in_production' ? '제품제작' :
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
            const sheetName = await this.resolveSheetName();
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
                range: this.formatSheetRange(sheetName, 'A1:Z1'),
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
