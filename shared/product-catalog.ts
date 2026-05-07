export const minimumOrderQuantities = {
  singleWithDrink: 12,
  brownie: 12,
  scone: 12,
  brookieLanding: 12,
} as const;

export const orderOperatingSettings = {
  minimumLeadDays: 1,
  unavailableDates: [] as string[],
  pickupTimeOptions: [
    "10:00~11:00",
    "11:00~12:00",
    "12:00~13:00",
    "13:00~14:00",
    "14:00~15:00",
    "15:00~16:00",
    "16:00~17:00",
  ],
} as const;

export const cookieTypes = [
  "호두초코",
  "더블초코",
  "블랙피넛",
  "로투스",
  "버터스카치",
  "호레오",
  "말차마카다미아",
] as const;

export const drinkTypes = [
  "콜드브루",
  "수제초코우유",
  "밀크티",
] as const;

export const cookiePrices = {
  regular: 4500,
  brownie: 7800,
  scone: 5000,
  fortune: 15000,
  airplane: 22000,
  twoPackSet: 10500,
  singleWithDrink: 11000,
  packaging: {
    single_box: 600,
    plastic_wrap: 500,
    oil_paper: 0,
  },
  brownieOptions: {
    birthdayBear: 500,
    customSticker: 20000,
    heartMessage: 500,
  },
  sconeOptions: {
    strawberryJam: 500,
  },
} as const;

export const productCatalog = {
  regular: {
    label: "일반 쿠키",
    unitLabel: "개",
    price: cookiePrices.regular,
  },
  twoPackSet: {
    label: "2구 패키지",
    unitLabel: "세트",
    price: cookiePrices.twoPackSet,
  },
  singleWithDrink: {
    label: "1구+음료",
    unitLabel: "세트",
    price: cookiePrices.singleWithDrink,
    minimumQuantity: minimumOrderQuantities.singleWithDrink,
  },
  brownie: {
    label: "브라우니쿠키",
    unitLabel: "개",
    price: cookiePrices.brownie,
    minimumQuantity: minimumOrderQuantities.brownie,
  },
  scone: {
    label: "스콘",
    unitLabel: "개",
    price: cookiePrices.scone,
    minimumQuantity: minimumOrderQuantities.scone,
  },
  fortune: {
    label: "행운쿠키",
    unitLabel: "박스",
    price: cookiePrices.fortune,
  },
  airplane: {
    label: "비행기샌드쿠키",
    unitLabel: "박스",
    price: cookiePrices.airplane,
  },
} as const;

export function formatWon(price: number) {
  return `${price.toLocaleString("ko-KR")}원`;
}

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMinimumDeliveryDate(baseDate = new Date()) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + orderOperatingSettings.minimumLeadDays);
  return toDateInputValue(next);
}

export function isUnavailableDeliveryDate(dateString: string) {
  return orderOperatingSettings.unavailableDates.includes(dateString);
}
