import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
    description: "직접 오시면 제일 신선해요!",
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
    <section className="cute-card p-6">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-black text-[#7b3f3f]">
        🚗 수령 방법
      </h2>

      <RadioGroup
        value={deliveryMethod}
        onValueChange={(value) => onUpdate('deliveryMethod', value)}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        {(["pickup", "quick"] as const).map((method) => {
          const copy = methodCopy[method];
          const selected = deliveryMethod === method;

          return (
            <motion.div
              key={method}
              whileTap={shouldReduce ? undefined : { scale: 0.96 }}
              transition={{ type: "spring", stiffness: 360, damping: 24 }}
              className="relative"
            >
              <RadioGroupItem
                value={method}
                id={method}
                data-testid={method === "pickup" ? "radio-pickup" : "radio-quick"}
                className="sr-only"
              />
              <Label
                htmlFor={method}
                className={`selection-card block min-h-[112px] ${selected ? "selected" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl" aria-hidden="true">{copy.emoji}</span>
                  <span className="flex-1">
                    <span className="block text-base font-black text-[#7b3f3f]">{copy.title}</span>
                    <span className="mt-1 block text-sm font-medium text-muted-foreground">{copy.description}</span>
                  </span>
                  {selected && (
                    <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-black text-rose-500">
                      선택
                    </span>
                  )}
                </div>
              </Label>
            </motion.div>
          );
        })}
      </RadioGroup>

      <div className="mt-6 rounded-3xl border border-rose-100 bg-rose-50/70 p-4">
        <Label className="mb-3 block text-sm font-black text-[#7b3f3f]">
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
                className={`min-h-11 flex-shrink-0 rounded-full border px-4 text-sm font-black tabular-nums transition-colors ${selected
                  ? "border-rose-300 bg-white text-rose-500 shadow-sm"
                  : "border-rose-100 bg-white/65 text-[#9a5f69] hover:border-rose-300"
                  }`}
              >
                {time}
              </motion.button>
            );
          })}
        </div>
        <p className="mt-2 text-xs font-medium text-muted-foreground">
          * 매장 운영 시간: 10:00 ~ 17:00
        </p>
      </div>

      {deliveryMethod === 'quick' && (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 24 }}
          className="mt-4 rounded-3xl border border-rose-100 bg-white/70 p-4"
        >
          <Label htmlFor="delivery-address" className="mb-2 block text-sm font-black text-[#7b3f3f]">
            배송 받을 주소 *
          </Label>
          <div className="cute-input">
            <Input
              id="delivery-address"
              placeholder="배송받을 주소를 입력해주세요"
              value={deliveryAddress}
              onChange={(e) => onUpdate('deliveryAddress', e.target.value)}
              data-testid="input-delivery-address"
              className="h-12 w-full border-0 bg-transparent px-4 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            정확한 주소를 입력해주시면 배송비 산정에 도움이 됩니다.
          </p>
        </motion.div>
      )}

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs font-bold text-amber-700">
          💡 퀵 배송의 경우 별도 배송비가 발생할 수 있어요. 정확한 배송비는 견적서에서 확인해주세요.
        </p>
      </div>
    </section>
  );
}
