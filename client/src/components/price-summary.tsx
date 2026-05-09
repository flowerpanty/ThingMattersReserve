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

interface PriceSummaryProps {
  pricing: PricingSummary;
}

const priceRows = [
  ["regularCookies", "일반 쿠키", "price-regular-cookies"],
  ["twoPackSet", "2구 패키지", "price-twopack-set"],
  ["singleWithDrink", "1구 + 음료", "price-single-with-drink"],
  ["brownie", "브라우니쿠키", "price-brownie"],
  ["scone", "스콘", "price-scone"],
  ["fortune", "행운쿠키", "price-fortune"],
  ["airplane", "비행기샌드쿠키", "price-airplane"],
  ["packaging", "포장비", "price-packaging"],
] as const;

export function PriceSummary({ pricing }: PriceSummaryProps) {
  const shouldReduce = useReducedMotion();
  const formatPrice = (price: number) => `${(price || 0).toLocaleString('ko-KR')}원`;

  return (
    <section className="cute-card price-highlight p-6">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-black text-[#7b3f3f]">
        ✨ 지금까지 이만큼이에요
      </h2>

      <div className="mb-6 space-y-3">
        {priceRows.map(([key, label, testId], index) => {
          const amount = pricing[key];
          if (amount <= 0) return null;

          return (
            <motion.div
              key={key}
              initial={shouldReduce ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 24, delay: shouldReduce ? 0 : index * 0.05 }}
              className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/65 px-4 py-3"
            >
              <span className="font-bold text-[#7b3f3f]">{label}</span>
              <span className="font-black text-rose-500 tabular-nums" data-testid={testId}>
                {formatPrice(amount)}
              </span>
            </motion.div>
          );
        })}
      </div>

      <div className="rounded-3xl border border-rose-100 bg-gradient-to-r from-rose-50 to-orange-50 px-4 py-5 shadow-sm">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black text-rose-500">예상 총 금액</p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">옵션 포함 예상 합계입니다</p>
          </div>
          <span className="text-2xl font-black tracking-normal text-[#7b3f3f] tabular-nums md:text-3xl" data-testid="price-total">
            {formatPrice(pricing.total)}
          </span>
        </div>
      </div>

      <div className="mt-4 text-center">
        <span className="inline-flex rounded-full bg-white/70 px-3 py-1.5 text-xs font-black text-rose-400">
          💬 카카오 상담 후 최종 확정
        </span>
      </div>
    </section>
  );
}
