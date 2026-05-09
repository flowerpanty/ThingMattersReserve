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
    <section className="crayon-card">
      <div className="section-badge">🧮 금액 계산</div>

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
              className="flex items-center justify-between rounded-2xl border-[3px] border-black bg-white px-4 py-3 shadow-[3px_3px_0_#1a1a1a]"
            >
              <span className="flex items-center gap-2 text-base font-black text-[#1a1a1a]">
                <span className="h-3 w-3 rounded-full bg-[var(--crayon-pink)]" />
                {label}
              </span>
              <span className="text-base font-black text-[#1a1a1a] tabular-nums" data-testid={testId}>
                {formatPrice(amount)}
              </span>
            </motion.div>
          );
        })}
      </div>

      <div className="crayon-card mt-4 text-center" style={{ background: "var(--crayon-yellow)" }}>
          <p className="text-sm font-black text-[#1a1a1a]">예상 총 금액</p>
          <span className="text-3xl font-black tracking-normal text-[#1a1a1a] tabular-nums" data-testid="price-total">
            {formatPrice(pricing.total)}
          </span>
          <p className="mt-1 text-center text-sm font-bold text-[#1a1a1a]">
          💬 카카오 상담 후 최종 확정
          </p>
      </div>
    </section>
  );
}
