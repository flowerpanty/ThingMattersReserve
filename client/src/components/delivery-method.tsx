import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { orderOperatingSettings } from "@shared/schema";
import { motion, useReducedMotion } from "motion/react";

interface DeliveryMethodProps {
  deliveryMethod: string;
  deliveryAddress: string;
  pickupTime?: string;
  onUpdate: (field: 'deliveryMethod' | 'deliveryAddress' | 'pickupTime', value: string) => void;
}

const methodCopy = {
  pickup: {
    emoji: "🏪",
    title: "매장 픽업",
    description: "강서구 공항동 송정로 25",
  },
  quick: {
    emoji: "🛵",
    title: "퀵 배송",
    description: "집에서 편하게 받아보세요",
  },
};

export function DeliveryMethod({ deliveryMethod, deliveryAddress, pickupTime, onUpdate }: DeliveryMethodProps) {
  const timeOptions = orderOperatingSettings.pickupTimeOptions;
  const shouldReduce = useReducedMotion();

  return (
    <section className="crayon-card">
      <div className="section-badge">🚗 수령 방법</div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(["pickup", "quick"] as const).map((method) => {
          const copy = methodCopy[method];
          const selected = deliveryMethod === method;
          const selectedClass = method === "pickup" ? "selected-blue" : "selected-purple";

          return (
            <motion.button
              key={method}
              type="button"
              onClick={() => onUpdate('deliveryMethod', method)}
              whileTap={shouldReduce ? undefined : { scale: 0.96 }}
              transition={{ type: "spring", stiffness: 360, damping: 24 }}
              className={`crayon-select-card min-h-[154px] ${selected ? `selected ${selectedClass}` : ""}`}
              data-testid={method === "pickup" ? "radio-pickup" : "radio-quick"}
            >
              <span className="text-5xl" aria-hidden="true">{copy.emoji}</span>
              <p className="text-lg font-black text-[#1a1a1a]">{copy.title}</p>
              <p className="text-sm font-bold text-gray-600">{copy.description}</p>
              {selected && <span className="count-badge">✓ 선택됨</span>}
            </motion.button>
          );
        })}
      </div>

      <div className="mt-6 rounded-3xl border-[3px] border-black bg-white p-4 shadow-[3px_3px_0_#1a1a1a]">
        <Label className="mb-3 block text-base font-black text-[#1a1a1a]">
          {deliveryMethod === 'pickup' ? '픽업 시간 선택 *' : '퀵 배송 희망 시간 *'}
        </Label>
        <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
          {timeOptions.map((time) => {
            const selected = pickupTime === time;

            return (
              <motion.button
                key={time}
                type="button"
                onClick={() => onUpdate('pickupTime', time)}
                whileTap={shouldReduce ? undefined : { scale: 0.94 }}
                transition={{ type: "spring", stiffness: 380, damping: 24 }}
                className={`min-h-14 flex-shrink-0 rounded-full border-[3px] border-black px-4 text-base font-black tabular-nums transition-colors ${selected
                  ? "bg-[var(--crayon-green)] text-white shadow-[3px_3px_0_#1a1a1a]"
                  : "bg-white text-[#1a1a1a] hover:bg-yellow-100"
                  }`}
              >
                {time}
              </motion.button>
            );
          })}
        </div>
        <p className="mt-2 text-sm font-bold text-gray-600">
          * 매장 운영 시간: 10:00 ~ 17:00
        </p>
      </div>

      {deliveryMethod === 'quick' && (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 24 }}
          className="mt-4 rounded-3xl border-[3px] border-black bg-white p-4 shadow-[3px_3px_0_#1a1a1a]"
        >
          <Label htmlFor="delivery-address" className="mb-2 block text-base font-black text-[#1a1a1a]">
            배송 받을 주소 *
          </Label>
          <div className={`crayon-input ${deliveryAddress.trim() ? "crayon-input-filled" : ""}`}>
            <Input
              id="delivery-address"
              placeholder="배송받을 주소를 입력해주세요"
              value={deliveryAddress}
              onChange={(e) => onUpdate('deliveryAddress', e.target.value)}
              data-testid="input-delivery-address"
              className="h-14 w-full border-0 bg-transparent px-0 text-base font-black shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <p className="mt-2 text-sm font-bold text-gray-600">
            정확한 주소를 입력해주시면 배송비 산정에 도움이 됩니다.
          </p>
        </motion.div>
      )}

      <div className="mt-4 rounded-2xl border-[3px] border-black bg-yellow-100 p-3 shadow-[3px_3px_0_#1a1a1a]">
        <p className="text-sm font-black text-[#1a1a1a]">
          💡 퀵 배송의 경우 별도 배송비가 발생할 수 있어요. 정확한 배송비는 견적서에서 확인해주세요.
        </p>
      </div>
    </section>
  );
}
