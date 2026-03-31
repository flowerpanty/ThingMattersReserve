import React from 'react';
import { cookiePrices, type OrderData } from '@shared/schema';

interface OrderItem {
  type: string;
  name: string;
  quantity: number;
  price: number;
  options?: any;
}

interface Order {
  id: string;
  customerName: string;
  customerContact: string;
  deliveryDate: string;
  deliveryMethod?: string;
  pickupTime?: string;
  orderItems: OrderItem[];
  totalPrice: number;
  createdAt: string;
}

interface QuoteRow {
  name: string;
  quantity: number | string;
  price: number | '';
  amount: number | '';
}

interface QuoteImageTemplateProps {
  order: Order;
}

function asArray<T>(value: unknown): T[] | null {
  return Array.isArray(value) ? (value as T[]) : null;
}

function buildOrderDataFromOrder(order: Order): OrderData {
  const orderItems = Array.isArray(order.orderItems) ? order.orderItems : [];
  const metaItem = orderItems.find((item) => item.type === 'meta');
  const metaOptions = (metaItem?.options || {}) as Record<string, any>;

  const regularCookies: Record<string, number> = {};
  const twoPackSets: OrderData['twoPackSets'] = [];
  const singleWithDrinkSets: OrderData['singleWithDrinkSets'] = [];
  const brownieCookieSets: OrderData['brownieCookieSets'] = [];
  const sconeSets: OrderData['sconeSets'] = [];

  let packaging: OrderData['packaging'];
  let fortuneCookie = 0;
  let airplaneSandwich = 0;

  if (metaOptions.packaging) {
    packaging = metaOptions.packaging;
  }

  for (const item of orderItems) {
    if (!item || item.type === 'meta') continue;

    const quantity = Number(item.quantity || 0);
    const itemName = typeof item.name === 'string' ? item.name : '';

    if (item.type === 'regular' && itemName && itemName !== 'metadata') {
      regularCookies[itemName] = (regularCookies[itemName] || 0) + quantity;
      continue;
    }

    if (item.type === 'twopack' || item.type === 'twoPack' || itemName.includes('2구 패키지')) {
      twoPackSets.push({
        selectedCookies: item.options?.selectedCookies || [],
        quantity: quantity || 1,
      });
      continue;
    }

    if (item.type === 'singledrink' || item.type === 'singleDrink' || itemName.includes('1구 + 음료')) {
      singleWithDrinkSets.push({
        selectedCookie: item.options?.selectedCookie || '',
        selectedDrink: item.options?.selectedDrink || '',
        quantity: quantity || 1,
      });
      continue;
    }

    if (item.type === 'brownie' || itemName.includes('브라우니')) {
      brownieCookieSets.push({
        quantity: quantity || 1,
        shape: item.options?.shape,
        customSticker: !!item.options?.customSticker,
        heartMessage: item.options?.heartMessage,
        customTopper: !!item.options?.customTopper,
      });
      continue;
    }

    if (item.type === 'scone' || itemName.includes('스콘')) {
      sconeSets.push({
        quantity: quantity || 1,
        flavor: item.options?.flavor || 'chocolate',
        strawberryJam: !!item.options?.strawberryJam,
      });
      continue;
    }

    if (item.type === 'fortune' || itemName.includes('행운쿠키')) {
      fortuneCookie += quantity;
      continue;
    }

    if (item.type === 'airplane' || itemName.includes('비행기')) {
      airplaneSandwich += quantity;
      continue;
    }

    if (
      item.type === 'packaging' ||
      itemName.includes('1구박스') ||
      itemName.includes('비닐탭포장') ||
      itemName.includes('유산지')
    ) {
      if (itemName.includes('1구박스')) {
        packaging = 'single_box';
      } else if (itemName.includes('비닐탭포장')) {
        packaging = 'plastic_wrap';
      } else if (itemName.includes('유산지')) {
        packaging = 'oil_paper';
      }
    }
  }

  return {
    customerName: order.customerName,
    customerContact: order.customerContact,
    customerPhone: typeof metaOptions.customerPhone === 'string' ? metaOptions.customerPhone : '',
    deliveryDate: order.deliveryDate,
    deliveryMethod: order.deliveryMethod === 'quick' ? 'quick' : 'pickup',
    pickupTime: order.pickupTime || (typeof metaOptions.pickupTime === 'string' ? metaOptions.pickupTime : ''),
    deliveryAddress: typeof metaOptions.deliveryAddress === 'string' ? metaOptions.deliveryAddress : '',
    regularCookies:
      (metaOptions.regularCookies && typeof metaOptions.regularCookies === 'object'
        ? metaOptions.regularCookies
        : regularCookies) as Record<string, number>,
    packaging:
      metaOptions.packaging === 'single_box' ||
      metaOptions.packaging === 'plastic_wrap' ||
      metaOptions.packaging === 'oil_paper'
        ? metaOptions.packaging
        : packaging,
    brownieCookieSets: (asArray<OrderData['brownieCookieSets'][number]>(metaOptions.brownieCookieSets) || brownieCookieSets),
    twoPackSets: (asArray<OrderData['twoPackSets'][number]>(metaOptions.twoPackSets) || twoPackSets),
    singleWithDrinkSets:
      asArray<OrderData['singleWithDrinkSets'][number]>(metaOptions.singleWithDrinkSets) || singleWithDrinkSets,
    sconeSets: (asArray<OrderData['sconeSets'][number]>(metaOptions.sconeSets) || sconeSets),
    fortuneCookie: typeof metaOptions.fortuneCookie === 'number' ? metaOptions.fortuneCookie : fortuneCookie,
    airplaneSandwich:
      typeof metaOptions.airplaneSandwich === 'number' ? metaOptions.airplaneSandwich : airplaneSandwich,
  };
}

function buildQuoteRows(orderData: OrderData) {
  const rows: QuoteRow[] = [];
  let totalAmount = 0;

  const regularCookieQuantity = Object.values(orderData.regularCookies || {}).reduce((sum, qty) => sum + qty, 0);
  if (regularCookieQuantity > 0) {
    const amount = regularCookieQuantity * cookiePrices.regular;
    totalAmount += amount;
    rows.push({
      name: '일반쿠키',
      quantity: regularCookieQuantity,
      price: cookiePrices.regular,
      amount,
    });
  }

  if (orderData.twoPackSets?.length > 0) {
    const quantity = orderData.twoPackSets.reduce((sum, set) => sum + (set.quantity || 1), 0);
    const amount = quantity * cookiePrices.twoPackSet;
    totalAmount += amount;
    rows.push({
      name: '2구 패키지',
      quantity,
      price: cookiePrices.twoPackSet,
      amount,
    });
  }

  if (orderData.singleWithDrinkSets?.length > 0) {
    const quantity = orderData.singleWithDrinkSets.reduce((sum, set) => sum + (set.quantity || 1), 0);
    const amount = quantity * cookiePrices.singleWithDrink;
    totalAmount += amount;
    rows.push({
      name: '1구 + 음료',
      quantity,
      price: cookiePrices.singleWithDrink,
      amount,
    });
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
    rows.push({
      name: '브라우니쿠키',
      quantity: totalBrownieQuantity,
      price: cookiePrices.brownie,
      amount: baseBrownieAmount,
    });

    if (hasCustomTopper) {
      rows.push({
        name: '└ 커스텀토퍼',
        quantity: '',
        price: '',
        amount: '',
      });
    }

    if (totalBirthdayBearQuantity > 0) {
      const amount = totalBirthdayBearQuantity * cookiePrices.brownieOptions.birthdayBear;
      totalAmount += amount;
      rows.push({
        name: '└ 생일곰 추가',
        quantity: totalBirthdayBearQuantity,
        price: cookiePrices.brownieOptions.birthdayBear,
        amount,
      });
    }

    if (totalCustomStickerCount > 0) {
      const amount = totalCustomStickerCount * cookiePrices.brownieOptions.customSticker;
      totalAmount += amount;
      rows.push({
        name: '└ 하단 커스텀 스티커',
        quantity: totalCustomStickerCount,
        price: cookiePrices.brownieOptions.customSticker,
        amount,
      });
    }

    if (totalHeartMessageQuantity > 0) {
      const amount = totalHeartMessageQuantity * cookiePrices.brownieOptions.heartMessage;
      totalAmount += amount;
      rows.push({
        name: '└ 하트안 문구 추가',
        quantity: totalHeartMessageQuantity,
        price: cookiePrices.brownieOptions.heartMessage,
        amount,
      });
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
    rows.push({
      name: '스콘',
      quantity: totalSconeQuantity,
      price: cookiePrices.scone,
      amount: baseSconeAmount,
    });

    if (totalStrawberryJamQuantity > 0) {
      const amount = totalStrawberryJamQuantity * cookiePrices.sconeOptions.strawberryJam;
      totalAmount += amount;
      rows.push({
        name: '└ 딸기잼 추가',
        quantity: totalStrawberryJamQuantity,
        price: cookiePrices.sconeOptions.strawberryJam,
        amount,
      });
    }
  }

  if (orderData.fortuneCookie > 0) {
    const amount = orderData.fortuneCookie * cookiePrices.fortune;
    totalAmount += amount;
    rows.push({
      name: '행운쿠키',
      quantity: `${orderData.fortuneCookie}박스`,
      price: cookiePrices.fortune,
      amount,
    });
  }

  if (orderData.airplaneSandwich > 0) {
    const amount = orderData.airplaneSandwich * cookiePrices.airplane;
    totalAmount += amount;
    rows.push({
      name: '비행기샌드쿠키',
      quantity: `${orderData.airplaneSandwich}박스`,
      price: cookiePrices.airplane,
      amount,
    });
  }

  if (orderData.packaging) {
    const packagingPricePerItem = cookiePrices.packaging[orderData.packaging];
    const packagingName =
      orderData.packaging === 'single_box'
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
    rows.push({
      name: '배송비',
      quantity: '',
      price: '',
      amount: '',
    });
  }

  return { rows, totalAmount, regularCookieQuantity };
}

function buildDetailLines(orderData: OrderData, regularCookieQuantity: number): string[] {
  const lines: string[] = [];

  if (regularCookieQuantity > 0) {
    const selectedCookies = Object.entries(orderData.regularCookies || {})
      .filter(([, qty]) => qty > 0)
      .map(([type, qty]) => `${type} ${qty}개`)
      .join(', ');

    lines.push(`• 일반쿠키: ${selectedCookies}`);
  }

  if (orderData.twoPackSets?.length > 0) {
    orderData.twoPackSets.forEach((set, index) => {
      if (set.selectedCookies?.length > 0) {
        lines.push(`• 2구 패키지 세트 ${index + 1} (${set.quantity || 1}개): ${set.selectedCookies.join(', ')}`);
      }
    });
  }

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
      lines.push(detailText);
    });
  }

  if (orderData.brownieCookieSets?.length > 0) {
    orderData.brownieCookieSets.forEach((set, index) => {
      let detailText = `• 브라우니쿠키 세트 ${index + 1} (${set.quantity || 1}개)`;
      if (set.shape) {
        const shapeMap: Record<string, string> = {
          bear: '곰',
          rabbit: '토끼',
          tiger: '호랑이',
          birthdayBear: '생일곰',
        };
        const shapeText = shapeMap[set.shape] || set.shape;
        detailText += `: ${shapeText} 모양`;
      }
      if (set.customSticker) detailText += ', 커스텀스티커';
      if (set.heartMessage) detailText += `, 하트메시지: ${set.heartMessage}`;
      if (set.customTopper) detailText += ', 커스텀토퍼';
      lines.push(detailText);
    });
  }

  if (orderData.sconeSets?.length > 0) {
    orderData.sconeSets.forEach((set, index) => {
      let detailText = `• 스콘 세트 ${index + 1} (${set.quantity || 1}개)`;
      if (set.flavor) {
        const flavorText = set.flavor === 'chocolate' ? '초코맛' : '고메버터맛';
        detailText += `: ${flavorText}`;
      }
      if (set.strawberryJam) detailText += ', 딸기잼 추가';
      lines.push(detailText);
    });
  }

  if (orderData.packaging) {
    const packagingName =
      orderData.packaging === 'single_box'
        ? '1구박스 (+500원)'
        : orderData.packaging === 'plastic_wrap'
          ? '비닐탭포장 (+500원)'
          : '유산지 (무료)';
    lines.push(`• 포장 옵션: ${packagingName}`);
  }

  return lines;
}

function formatCurrency(value: number | '') {
  if (typeof value !== 'number') return '';
  return `${value.toLocaleString('ko-KR')}원`;
}

function renderQuantity(value: number | string) {
  if (value === '') return '';
  return String(value);
}

export const QuoteImageTemplate = React.forwardRef<HTMLDivElement, QuoteImageTemplateProps>(({ order }, ref) => {
  const orderData = buildOrderDataFromOrder(order);
  const { rows, totalAmount, regularCookieQuantity } = buildQuoteRows(orderData);
  const detailLines = buildDetailLines(orderData, regularCookieQuantity);

  const deliveryMethodText = orderData.deliveryMethod === 'pickup' ? '매장 픽업' : '퀵 배송';
  let deliveryText = `수령 방법: ${deliveryMethodText} | 수령 희망일: ${orderData.deliveryDate}`;
  if (orderData.pickupTime) {
    deliveryText += ` | 시간: ${orderData.pickupTime}`;
  }
  if (orderData.deliveryMethod === 'quick' && orderData.deliveryAddress) {
    deliveryText += `\n배송 주소: ${orderData.deliveryAddress}`;
  }

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        color: '#111827',
        fontFamily: 'Arial, "Noto Sans KR", sans-serif',
        padding: '0',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          fontSize: '14px',
        }}
      >
        <tbody>
          <tr>
            <td
              colSpan={4}
              style={{
                border: '1px solid #000000',
                backgroundColor: '#4F46E5',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '24px',
                textAlign: 'center',
                padding: '12px 8px',
              }}
            >
              nothingmatters 견적서
            </td>
          </tr>

          <tr>
            <td
              colSpan={4}
              style={{
                border: '1px solid #000000',
                padding: '10px 12px',
                fontSize: '13px',
              }}
            >
              {`고객명: ${orderData.customerName} | 이메일: ${orderData.customerContact} | 핸드폰: ${orderData.customerPhone || ''}`.trim()}
            </td>
          </tr>

          <tr>
            <td
              colSpan={4}
              style={{
                border: '1px solid #000000',
                padding: '10px 12px',
                fontSize: '13px',
                whiteSpace: 'pre-line',
              }}
            >
              {deliveryText}
            </td>
          </tr>

          <tr>
            <td colSpan={4} style={{ height: '10px' }} />
          </tr>

          <tr>
            {['제품명', '수량', '단가', '합계'].map((header, index) => (
              <th
                key={header}
                style={{
                  border: '1px solid #000000',
                  backgroundColor: '#E5E7EB',
                  fontWeight: 700,
                  fontSize: '14px',
                  textAlign: 'center',
                  padding: '10px 8px',
                  width: index === 0 ? '45%' : index === 1 ? '15%' : '20%',
                }}
              >
                {header}
              </th>
            ))}
          </tr>

          {rows.map((row, index) => (
            <tr key={`${row.name}-${index}`}>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '10px 8px',
                  textAlign: row.name.startsWith('└') ? 'left' : 'center',
                  paddingLeft: row.name.startsWith('└') ? '20px' : '8px',
                }}
              >
                {row.name}
              </td>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '10px 8px',
                  textAlign: 'center',
                }}
              >
                {renderQuantity(row.quantity)}
              </td>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '10px 8px',
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatCurrency(row.price)}
              </td>
              <td
                style={{
                  border: '1px solid #000000',
                  padding: '10px 8px',
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatCurrency(row.amount)}
              </td>
            </tr>
          ))}

          <tr>
            <td colSpan={4} style={{ height: '10px' }} />
          </tr>

          <tr>
            <td
              colSpan={3}
              style={{
                border: '1px solid #000000',
                backgroundColor: '#4F46E5',
                color: '#FFFFFF',
                fontWeight: 700,
                textAlign: 'center',
                padding: '12px 8px',
              }}
            >
              총 합계
            </td>
            <td
              style={{
                border: '1px solid #000000',
                backgroundColor: '#4F46E5',
                color: '#FFFFFF',
                fontWeight: 700,
                textAlign: 'right',
                padding: '12px 8px',
                whiteSpace: 'nowrap',
              }}
            >
              {formatCurrency(totalAmount)}
            </td>
          </tr>

          <tr>
            <td colSpan={4} style={{ height: '12px' }} />
          </tr>

          <tr>
            <td
              colSpan={4}
              style={{
                border: '1px solid #000000',
                backgroundColor: '#F3F4F6',
                fontWeight: 700,
                textAlign: 'left',
                padding: '10px 8px',
              }}
            >
              주문 상세 옵션
            </td>
          </tr>

          {detailLines.length > 0 ? (
            detailLines.map((line, index) => (
              <tr key={`detail-${index}`}>
                <td
                  colSpan={4}
                  style={{
                    border: '1px solid #000000',
                    padding: '10px 8px',
                    fontSize: '13px',
                  }}
                >
                  {line}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={4}
                style={{
                  border: '1px solid #000000',
                  padding: '10px 8px',
                  fontSize: '13px',
                }}
              >
                상세 옵션 없음
              </td>
            </tr>
          )}

          <tr>
            <td colSpan={4} style={{ height: '12px' }} />
          </tr>

          <tr>
            <td
              colSpan={4}
              style={{
                border: '1px solid #000000',
                backgroundColor: '#FEF3C7',
                fontWeight: 700,
                textAlign: 'center',
                padding: '12px 8px',
              }}
            >
              입금 계좌: 83050104204736 국민은행 (낫띵메터스)
            </td>
          </tr>

          <tr>
            <td
              colSpan={4}
              style={{
                border: '1px solid #000000',
                textAlign: 'center',
                padding: '10px 8px',
                fontSize: '13px',
              }}
            >
              주문 문의: 카카오톡 @nothingmatters 또는 010-2866-7976
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
});

QuoteImageTemplate.displayName = 'QuoteImageTemplate';
