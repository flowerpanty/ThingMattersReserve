import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

interface CustomerInfoProps {
  customerName: string;
  customerContact: string;
  customerPhone?: string;
  onUpdate: (field: 'customerName' | 'customerContact' | 'customerPhone', value: string) => void;
}

interface CuteFieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  placeholder: string;
  testId: string;
  required?: boolean;
  helper?: string;
  onChange: (value: string) => void;
}

function CuteField({ id, label, type, value, placeholder, testId, required, helper, onChange }: CuteFieldProps) {
  const shouldReduce = useReducedMotion();
  const isFilled = value.trim().length > 0;

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="block text-base font-black text-[#1a1a1a]">
        {label}{required ? " *" : ""}
      </Label>
      <motion.div
        animate={isFilled && !shouldReduce ? { scale: [1, 1.015, 1] } : undefined}
        transition={{ type: "spring", stiffness: 360, damping: 24 }}
        className={`crayon-input relative ${isFilled ? "crayon-input-filled" : ""}`}
      >
        <Input
          id={id}
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-14 w-full border-0 bg-transparent px-0 pr-11 text-base font-black shadow-none outline-none placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
          data-testid={testId}
        />
        <AnimatePresence>
          {isFilled && (
            <motion.span
              initial={shouldReduce ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={shouldReduce ? undefined : { scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
              className="bounce-in absolute right-3 top-1/2 -translate-y-1/2 text-xl font-black"
              aria-hidden="true"
            >
              ✅
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
      {helper && <p className="text-sm font-black text-[var(--crayon-blue)]">{helper}</p>}
    </div>
  );
}

export function CustomerInfo({ customerName, customerContact, customerPhone, onUpdate }: CustomerInfoProps) {
  return (
    <section className="crayon-card">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="section-badge">👤 주문자 정보</div>
        <span className="count-badge bg-[var(--crayon-blue)]">
          견적서 받을 곳
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <CuteField
          id="customerName"
          label="이름"
          type="text"
          required
          value={customerName}
          onChange={(value) => onUpdate('customerName', value)}
          placeholder="홍길동"
          testId="input-customer-name"
        />

        <CuteField
          id="customerContact"
          label="이메일 주소"
          type="email"
          required
          value={customerContact}
          onChange={(value) => onUpdate('customerContact', value)}
          placeholder="달콤한 알림을 받을 이메일"
          helper="📧 견적서를 이 주소로 보내드려요"
          testId="input-customer-contact"
        />

        <CuteField
          id="customerPhone"
          label="핸드폰번호"
          type="tel"
          value={customerPhone || ''}
          onChange={(value) => onUpdate('customerPhone', value)}
          placeholder="010-xxxx-xxxx"
          testId="input-customer-phone"
        />
      </div>
    </section>
  );
}
