import { AnimatePresence, LazyMotion, domAnimation, motion, useReducedMotion } from "motion/react";
import { ChevronRight, Loader2, ShoppingCart } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface FloatingSummaryProps {
    totalItems: number;
    totalPrice: number;
    currentStep: number;
    onNext: () => void;
    onPrev: () => void;
    isSubmitting?: boolean;
    disableNext?: boolean;
}

const emptyMessages = {
    1: "🍪 쿠키를 골라보세요!",
    2: "📝 이름이랑 날짜를 적어주세요!",
    3: "✅ 주문 내역을 확인해요!",
};

export function FloatingSummary({
    totalItems,
    totalPrice,
    currentStep,
    onNext,
    onPrev,
    isSubmitting,
    disableNext,
}: FloatingSummaryProps) {
    const shouldReduce = useReducedMotion();
    const previousPrice = useRef(totalPrice);
    const [pricePop, setPricePop] = useState(false);

    useEffect(() => {
        if (previousPrice.current !== totalPrice && totalPrice > 0) {
            setPricePop(true);
            const timeout = window.setTimeout(() => setPricePop(false), 400);
            previousPrice.current = totalPrice;
            return () => window.clearTimeout(timeout);
        }

        previousPrice.current = totalPrice;
        return undefined;
    }, [totalPrice]);

    const progressPercent = currentStep === 1 ? 33 : currentStep === 2 ? 66 : 100;
    const isLastStep = currentStep === 3;
    const isFirstStep = currentStep === 1;
    const hasItems = totalItems > 0;
    const totalLabel = `${(totalPrice || 0).toLocaleString("ko-KR")}원`;

    return (
        <LazyMotion features={domAnimation}>
            <motion.div
                className="floating-summary-bar"
                initial={shouldReduce ? false : { y: 90, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 280, damping: 22 }}
            >
                <div className="absolute left-0 right-0 top-0 h-[4px] overflow-hidden border-b-2 border-black bg-white" aria-hidden="true">
                    <motion.div
                        className="floating-progress-strip h-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: shouldReduce ? 0 : 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                    />
                </div>

                <div className="max-w-4xl mx-auto px-4 flex items-center justify-between gap-3">
                    <div className="w-[76px] flex-shrink-0">
                        <AnimatePresence initial={false}>
                            {!isFirstStep && (
                                <motion.button
                                    type="button"
                                    onClick={onPrev}
                                    initial={shouldReduce ? false : { opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={shouldReduce ? undefined : { opacity: 0, x: -8 }}
                                    whileTap={shouldReduce ? undefined : { scale: 0.96 }}
                                    className="crayon-btn crayon-btn-blue min-h-14 px-3 text-sm"
                                >
                                    ← 뒤로
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex min-w-0 flex-1 items-center justify-center">
                        <AnimatePresence mode="wait" initial={false}>
                            {hasItems ? (
                                <motion.div
                                    key="has-items"
                                    initial={shouldReduce ? false : { opacity: 0, scale: 0.88 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={shouldReduce ? undefined : { opacity: 0, scale: 0.88 }}
                                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                                    className="flex min-h-14 min-w-0 items-center gap-2 rounded-full border-[3px] border-black bg-white px-3 py-2 shadow-[3px_3px_0_#1a1a1a] sm:px-4"
                                    aria-live="polite"
                                >
                                    <span className="count-badge flex items-center gap-1.5 bg-[var(--crayon-blue)]">
                                        <ShoppingCart className="h-3.5 w-3.5" />
                                        <span className="tabular-nums">{totalItems}개</span>
                                    </span>
                                    <motion.span
                                        animate={pricePop && !shouldReduce ? { scale: [1, 1.15, 1] } : {}}
                                        transition={{ duration: 0.35 }}
                                        className="truncate text-base font-black text-[#1a1a1a] tabular-nums sm:text-lg"
                                    >
                                        {totalLabel}
                                    </motion.span>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key={`empty-${currentStep}`}
                                    initial={shouldReduce ? false : { opacity: 0, y: 4 }}
                                    animate={shouldReduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
                                    exit={shouldReduce ? undefined : { opacity: 0, y: -4 }}
                                    transition={{ type: "spring", stiffness: 350, damping: 24 }}
                                    className="max-w-[220px] rounded-full border-[3px] border-black bg-white px-3 py-2 text-center text-base font-black leading-tight text-[#1a1a1a] shadow-[3px_3px_0_#1a1a1a] sm:max-w-none"
                                >
                                    {emptyMessages[currentStep as 1 | 2 | 3]}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex-shrink-0">
                        <motion.button
                            type={isLastStep ? "submit" : "button"}
                            onClick={isLastStep ? undefined : onNext}
                            disabled={disableNext || isSubmitting}
                            whileHover={shouldReduce ? undefined : { scale: 1.03 }}
                            whileTap={shouldReduce ? undefined : { scale: 0.97 }}
                            animate={
                                hasItems && !shouldReduce
                                    ? {
                                        y: [0, -2, 0],
                                    }
                                    : {}
                            }
                            transition={{ repeat: hasItems && !shouldReduce ? Infinity : 0, duration: 2.2 }}
                            className="crayon-btn crayon-btn-pink min-h-14 px-4 text-sm disabled:pointer-events-none sm:px-5 sm:text-base"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    생성 중
                                </>
                            ) : isLastStep ? (
                                <>견적서 받기 ✨</>
                            ) : (
                                <>
                                    다음
                                    <ChevronRight className="h-4 w-4" />
                                </>
                            )}
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </LazyMotion>
    );
}
