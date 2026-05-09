import { cookiePrices, type OrderData } from "@shared/schema";
import { motion, useReducedMotion } from "motion/react";

interface PricingSummary {
  regularCookies: number;
  twoPackSet: number;
  singleWithDrink: number;
  packaging: number;
  brownie: number;
  scone: number;
  fortune: number;
  airplane: number;
  total: number;
}

interface QuotePreviewProps {
  formData: OrderData;
  pricing: PricingSummary;
}

interface PreviewRow {
  title: string;
  summary: string;
  quantityLabel: string;
  amount: number;
}

const packagingLabels: Record<NonNullable<OrderData["packaging"]>, string> = {
  single_box: "1구박스",
  plastic_wrap: "비닐탭포장",
  oil_paper: "유산지",
};

const shapeLabels: Record<NonNullable<OrderData["brownieCookieSets"][number]["shape"]>, string> = {
  bear: "곰",
  rabbit: "토끼",
  tiger: "호랑이",
  birthdayBear: "생일곰",
};

const sconeFlavorLabels: Record<OrderData["sconeSets"][number]["flavor"], string> = {
  chocolate: "초코맛",
  gourmetButter: "고메버터맛",
};

function formatPrice(price: number) {
  return `${price.toLocaleString("ko-KR")}원`;
}

function formatDeliveryDate(deliveryDate: string) {
  if (!deliveryDate) {
    return "미선택";
  }

  return new Date(`${deliveryDate}T00:00:00`).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function displayValue(value?: string, fallback = "미입력") {
  return value?.trim() ? value : fallback;
}

function buildPreviewRows(formData: OrderData): { rows: PreviewRow[]; totalAmount: number } {
  const rows: PreviewRow[] = [];
  let totalAmount = 0;

  const regularSelections = Object.entries(formData.regularCookies || {}).filter(
    ([, quantity]) => quantity > 0
  );
  const regularCookieQuantity = regularSelections.reduce((sum, [, quantity]) => sum + quantity, 0);

  if (regularSelections.length > 0) {
    const amount = regularCookieQuantity * cookiePrices.regular;
    totalAmount += amount;
    rows.push({
      title: "일반 쿠키",
      summary: regularSelections
        .map(([name, quantity]) => `${name} ${quantity}개`)
        .join(", "),
      quantityLabel: `총 ${regularCookieQuantity}개`,
      amount,
    });
  }

  if (formData.twoPackSets.length > 0) {
    const quantity = formData.twoPackSets.reduce((sum, set) => sum + (set.quantity || 1), 0);
    const amount = quantity * cookiePrices.twoPackSet;
    totalAmount += amount;
    rows.push({
      title: "2구 패키지",
      summary: formData.twoPackSets
        .map((set, index) => {
          const cookies = set.selectedCookies.join(" + ");
          return `세트 ${index + 1}: ${cookies} (${set.quantity || 1}개)`;
        })
        .join(" / "),
      quantityLabel: `총 ${quantity}개`,
      amount,
    });
  }

  if (formData.singleWithDrinkSets.length > 0) {
    const quantity = formData.singleWithDrinkSets.reduce((sum, set) => sum + (set.quantity || 1), 0);
    const amount = quantity * cookiePrices.singleWithDrink;
    totalAmount += amount;
    rows.push({
      title: "1구 + 음료",
      summary: formData.singleWithDrinkSets
        .map((set, index) => {
          return `세트 ${index + 1}: 쿠키(${set.selectedCookie || "미선택"}), 음료(${set.selectedDrink || "미선택"}) (${set.quantity || 1}개)`;
        })
        .join(" / "),
      quantityLabel: `총 ${quantity}개`,
      amount,
    });
  }

  if (formData.brownieCookieSets.length > 0) {
    const totalQuantity = formData.brownieCookieSets.reduce((sum, set) => sum + (set.quantity || 1), 0);
    const amount = formData.brownieCookieSets.reduce((sum, set) => {
      const quantity = set.quantity || 1;
      let lineAmount = quantity * cookiePrices.brownie;

      if (set.shape === "birthdayBear") {
        lineAmount += quantity * cookiePrices.brownieOptions.birthdayBear;
      }
      if (set.customSticker) {
        lineAmount += cookiePrices.brownieOptions.customSticker;
      }
      if (set.heartMessage) {
        lineAmount += quantity * cookiePrices.brownieOptions.heartMessage;
      }

      return sum + lineAmount;
    }, 0);

    totalAmount += amount;
    rows.push({
      title: "브라우니쿠키",
      summary: formData.brownieCookieSets
        .map((set, index) => {
          const optionParts: string[] = [];

          if (set.shape) {
            optionParts.push(`${shapeLabels[set.shape] || set.shape} 모양`);
          }
          if (set.customSticker) {
            optionParts.push("커스텀 스티커");
          }
          if (set.heartMessage) {
            optionParts.push(`하트메시지: ${set.heartMessage}`);
          }
          if (set.customTopper) {
            optionParts.push("커스텀 토퍼");
          }

          return `세트 ${index + 1}: ${set.quantity || 1}개${optionParts.length > 0 ? ` · ${optionParts.join(", ")}` : ""}`;
        })
        .join(" / "),
      quantityLabel: `총 ${totalQuantity}개`,
      amount,
    });
  }

  if (formData.sconeSets.length > 0) {
    const totalQuantity = formData.sconeSets.reduce((sum, set) => sum + (set.quantity || 1), 0);
    const amount = formData.sconeSets.reduce((sum, set) => {
      const quantity = set.quantity || 1;
      const jamAmount = set.strawberryJam
        ? quantity * cookiePrices.sconeOptions.strawberryJam
        : 0;

      return sum + quantity * cookiePrices.scone + jamAmount;
    }, 0);

    totalAmount += amount;
    rows.push({
      title: "스콘",
      summary: formData.sconeSets
        .map((set, index) => {
          const optionParts = [sconeFlavorLabels[set.flavor] || set.flavor];

          if (set.strawberryJam) {
            optionParts.push("딸기잼 추가");
          }

          return `세트 ${index + 1}: ${set.quantity || 1}개 · ${optionParts.join(", ")}`;
        })
        .join(" / "),
      quantityLabel: `총 ${totalQuantity}개`,
      amount,
    });
  }

  if (formData.fortuneCookie > 0) {
    const amount = formData.fortuneCookie * cookiePrices.fortune;
    totalAmount += amount;
    rows.push({
      title: "행운쿠키",
      summary: `${formData.fortuneCookie}박스`,
      quantityLabel: `총 ${formData.fortuneCookie}박스`,
      amount,
    });
  }

  if (formData.airplaneSandwich > 0) {
    const amount = formData.airplaneSandwich * cookiePrices.airplane;
    totalAmount += amount;
    rows.push({
      title: "비행기샌드쿠키",
      summary: `${formData.airplaneSandwich}박스`,
      quantityLabel: `총 ${formData.airplaneSandwich}박스`,
      amount,
    });
  }

  if (formData.packaging) {
    const packagingPrice = cookiePrices.packaging[formData.packaging];
    const packagingQuantity =
      formData.packaging === "single_box" || formData.packaging === "plastic_wrap"
        ? regularCookieQuantity
        : regularCookieQuantity > 0
          ? regularCookieQuantity
          : 1;
    const amount =
      formData.packaging === "single_box" || formData.packaging === "plastic_wrap"
        ? packagingQuantity * packagingPrice
        : 0;

    totalAmount += amount;
    rows.push({
      title: "포장 옵션",
      summary: packagingLabels[formData.packaging],
      quantityLabel: packagingQuantity > 0 ? `${packagingQuantity}개 기준` : "선택됨",
      amount,
    });
  }

  return { rows, totalAmount };
}

export function QuotePreview({ formData, pricing }: QuotePreviewProps) {
  const shouldReduce = useReducedMotion();
  const { rows, totalAmount } = buildPreviewRows(formData);
  const displayTotal = pricing.total > 0 ? pricing.total : totalAmount;

  return (
    <section className="crayon-card">
        <div className="flex flex-col gap-6">
          <div>
            <div className="section-badge">📦 주문 내역</div>
            <p className="text-base font-bold text-gray-600">
              선택한 제품과 옵션을 한 번 더 확인해주세요.
            </p>
          </div>

          <div className="space-y-3">
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <motion.div
                  key={`${row.title}-${row.summary}`}
                  initial={shouldReduce ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 360, damping: 24, delay: shouldReduce ? 0 : index * 0.05 }}
                  className="rounded-2xl border-[3px] border-black bg-white px-4 py-4 shadow-[3px_3px_0_#1a1a1a]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-black text-[#1a1a1a]">{row.title}</p>
                      <p className="mt-1 break-words text-sm font-bold leading-relaxed text-gray-600">
                        {row.summary}
                      </p>
                      <p className="count-badge mt-2 inline-flex tabular-nums">{row.quantityLabel}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-black text-[#1a1a1a] tabular-nums">
                        {row.amount > 0 ? formatPrice(row.amount) : "무료"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="rounded-2xl border-[3px] border-dashed border-black bg-yellow-100 px-4 py-8 text-center text-base font-black text-[#1a1a1a]">
                선택한 제품이 아직 없습니다. 이전 단계에서 제품을 추가하면 여기에서 바로 확인할 수 있어요.
              </div>
            )}
          </div>

          <div className="rounded-3xl border-[3px] border-black bg-white px-5 py-5 shadow-[3px_3px_0_#1a1a1a]">
            <div className="flex flex-col gap-1 mb-4">
              <h4 className="text-lg font-black text-[#1a1a1a]">고객 및 수령 정보</h4>
              <p className="text-sm font-bold text-gray-600">
                이메일로 같은 내용의 견적서가 전송됩니다.
              </p>
            </div>

            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
                <span className="font-bold text-gray-600">주문자</span>
                <span className="font-bold text-right">{displayValue(formData.customerName)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
                <span className="font-bold text-gray-600">이메일</span>
                <span className="font-bold text-right">{displayValue(formData.customerContact)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
                <span className="font-bold text-gray-600">핸드폰</span>
                <span className="font-bold text-right">{displayValue(formData.customerPhone, "미입력")}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
                <span className="font-bold text-gray-600">수령일</span>
                <span className="font-bold text-right">{formatDeliveryDate(formData.deliveryDate)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
                <span className="font-bold text-gray-600">시간</span>
                <span className="font-bold text-right tabular-nums">{displayValue(formData.pickupTime, "미선택")}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
                <span className="font-bold text-gray-600">수령방법</span>
                <span className="font-bold text-right">
                  {formData.deliveryMethod === "pickup" ? "매장 픽업" : "퀵 배송"}
                </span>
              </div>
              {formData.deliveryMethod === "quick" && (
                <div className="flex items-start justify-between gap-4">
                  <span className="font-bold text-gray-600">배송 주소</span>
                  <span className="font-bold text-right break-words max-w-[70%]">
                    {displayValue(formData.deliveryAddress, "미입력")}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="crayon-card text-center" style={{ background: "var(--crayon-yellow)" }}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-base font-black text-[#1a1a1a]">예상 총 금액</p>
                <p className="mt-1 text-sm font-bold text-[#1a1a1a]">
                  {formData.deliveryMethod === "quick"
                    ? "퀵 배송비는 상담 후 별도로 안내됩니다."
                    : "옵션 포함 예상 합계입니다."}
                </p>
              </div>
              <span className="text-3xl font-black tracking-normal text-[#1a1a1a] tabular-nums">
                {formatPrice(displayTotal)}
              </span>
            </div>
          </div>
        </div>
    </section>
  );
}
