import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMinimumDeliveryDate, isUnavailableDeliveryDate } from "@shared/schema";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

interface DeliveryDateProps {
  deliveryDate: string;
  onUpdate: (value: string) => void;
}

export function DeliveryDate({ deliveryDate, onUpdate }: DeliveryDateProps) {
  const minDate = getMinimumDeliveryDate();
  const shouldReduce = useReducedMotion();

  // Handle date change with validation
  const handleDateChange = (value: string) => {
    if (isUnavailableDeliveryDate(value)) {
      alert('선택하신 날짜는 수령이 불가능합니다. 다른 날짜를 선택해주세요.');
      return;
    }
    onUpdate(value);
  };

  const selectedLabel = deliveryDate
    ? new Date(deliveryDate + 'T00:00:00').toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    })
    : "";

  return (
    <section className="cute-card p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-black text-[#7b3f3f]">
          📅 수령 희망일
        </h2>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-600">
          최소 1일 전
        </span>
      </div>

      <div className="mx-auto max-w-md">
        <div className="mb-5 text-center">
          <Label htmlFor="deliveryDate" className="block text-lg font-black text-[#7b3f3f] mb-2">
            {deliveryDate ? "🎀 선택된 수령일" : "📅 수령 날짜 선택"}
          </Label>
          {!deliveryDate && (
            <p className="text-sm font-medium text-muted-foreground">
              가장 설레는 날짜를 골라주세요
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="cute-input">
            <Input
              id="deliveryDate"
              type="date"
              required
              value={deliveryDate}
              min={minDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="date-input h-12 w-full border-0 bg-transparent px-4 text-center text-base font-bold shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              data-testid="input-delivery-date"
            />
          </div>

          <AnimatePresence>
            {deliveryDate && (
              <motion.div
                initial={shouldReduce ? false : { opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={shouldReduce ? undefined : { opacity: 0, scale: 0.94 }}
                transition={{ type: "spring", stiffness: 360, damping: 24 }}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3"
              >
                <p className="text-center text-sm font-black text-emerald-700">
                  ✅ {selectedLabel} 선택완료
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-center text-xs font-bold text-amber-700">
              🧈 제작 시간을 위해 최소 1일 전 주문이 필요해요
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
