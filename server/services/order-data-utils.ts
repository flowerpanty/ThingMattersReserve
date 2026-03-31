import { type Order, type OrderData } from '@shared/schema';

export function buildOrderDataFromOrder(order: Order): OrderData {
  const orderItems = Array.isArray(order.orderItems) ? (order.orderItems as any[]) : [];
  const metaItem = orderItems.find((item: any) => item.type === 'meta');
  const metaOptions = (metaItem?.options || {}) as Record<string, any>;

  const regularCookies: Record<string, number> = {};
  const twoPackSets: Array<{ selectedCookies: string[]; quantity: number }> = [];
  const singleWithDrinkSets: Array<{ selectedCookie: string; selectedDrink: string; quantity: number }> = [];
  const brownieCookieSets: Array<{
    quantity: number;
    shape?: 'bear' | 'rabbit' | 'birthdayBear' | 'tiger';
    customSticker: boolean;
    heartMessage?: string;
    customTopper: boolean;
  }> = [];
  const sconeSets: Array<{
    quantity: number;
    flavor: 'chocolate' | 'gourmetButter';
    strawberryJam: boolean;
  }> = [];

  let packaging: 'single_box' | 'plastic_wrap' | 'oil_paper' | undefined;
  let fortuneCookie = 0;
  let airplaneSandwich = 0;

  if (metaOptions.packaging) {
    packaging = metaOptions.packaging;
  }

  for (const item of orderItems) {
    if (!item || item.type === 'meta') {
      continue;
    }

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

    if (item.type === 'packaging' || itemName.includes('1구박스') || itemName.includes('비닐탭포장') || itemName.includes('유산지')) {
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
    customerPhone: metaOptions.customerPhone || '',
    deliveryDate: order.deliveryDate,
    deliveryMethod: order.deliveryMethod || metaOptions.deliveryMethod || 'pickup',
    pickupTime: order.pickupTime || metaOptions.pickupTime || '',
    deliveryAddress: metaOptions.deliveryAddress || '',
    regularCookies: metaOptions.regularCookies || regularCookies,
    packaging,
    brownieCookieSets: metaOptions.brownieCookieSets || brownieCookieSets,
    twoPackSets: metaOptions.twoPackSets || twoPackSets,
    singleWithDrinkSets: metaOptions.singleWithDrinkSets || singleWithDrinkSets,
    sconeSets: metaOptions.sconeSets || sconeSets,
    fortuneCookie: metaOptions.fortuneCookie ?? fortuneCookie,
    airplaneSandwich: metaOptions.airplaneSandwich ?? airplaneSandwich,
  };
}
