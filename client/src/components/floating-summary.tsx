import { Button } from "@/components/ui/button";
import { ChevronRight, Loader2 } from "lucide-react";

interface FloatingSummaryProps {
    totalItems: number;
    totalPrice: number;
    currentStep: number;
    onNext: () => void;
    onPrev: () => void;
    isSubmitting?: boolean;
    disableNext?: boolean;
}

export function FloatingSummary({
    totalItems,
    totalPrice,
    currentStep,
    onNext,
    onPrev,
    isSubmitting,
    disableNext,
}: FloatingSummaryProps) {
    const formatPrice = (price: number) =>
        (price || 0).toLocaleString("ko-KR") + "원";

    const isLastStep = currentStep === 3;
    const isFirstStep = currentStep === 1;
    const emptyStateMessage = currentStep === 1
        ? "✏️ 이름이랑 날짜 먼저 알려주세요~"
        : currentStep === 2
            ? "🍪 쿠키를 골라보세요! 달콤한 거 있어요"
            : "🎀 주문 내역 확인해보세요";
    const progressPercent = currentStep === 1 ? 33 : currentStep === 2 ? 66 : 100;
    const hasItems = totalItems > 0;
    const ctaLabel = isLastStep ? "✨ 견적서 받기" : "다음";

    return (
        <div className="floating-summary-bar">
            <div className="absolute left-0 right-0 top-0 h-[3px] overflow-hidden bg-[#fff0f4] dark:bg-white/10" aria-hidden="true">
                <div
                    className="floating-bar-progress"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            <div className="max-w-4xl mx-auto px-4 flex items-center justify-between gap-3">
                {/* Left: Back button */}
                <div className={isFirstStep ? "w-2 flex-shrink-0" : "min-w-[74px] flex-shrink-0"}>
                    {!isFirstStep && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onPrev}
                            className="rounded-full px-3 text-[#9a5f69] hover:text-[#7f3f55] hover:bg-white/55 active:scale-95 dark:text-[#ffd6df] dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            ← 뒤로
                        </Button>
                    )}
                </div>

                {/* Center: Summary info */}
                <div className="flex min-w-0 flex-1 items-center justify-center">
                    {hasItems ? (
                        <div
                            key={`${totalItems}-${totalPrice}`}
                            className="floating-price-display flex min-w-0 items-center gap-2 rounded-full px-3 py-2 sm:px-4"
                            aria-live="polite"
                        >
                            <div className="flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-[#9a5f69] shadow-sm dark:bg-white/10 dark:text-[#ffd6df]">
                                <span aria-hidden="true">🛒</span>
                                <span>{totalItems}개</span>
                            </div>
                            <span className="truncate text-base font-black text-[#8a3b46] sm:text-lg dark:text-[#ffd1dc]">
                                {formatPrice(totalPrice)}
                            </span>
                        </div>
                    ) : (
                        <div className="floating-empty-nudge max-w-[210px] rounded-full px-3 py-2 text-center text-xs font-bold leading-tight text-[#9a5f69] shadow-sm sm:max-w-none sm:text-sm dark:text-[#ffd6df]">
                            <span className="block">{emptyStateMessage}</span>
                        </div>
                    )}
                </div>

                {/* Right: Next/Submit button */}
                <div className="flex-shrink-0">
                    {isLastStep ? (
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className={`floating-cta-btn ${hasItems ? "floating-cta-btn-active" : ""} gap-1 px-4 py-2.5 text-sm font-black sm:px-5 sm:text-base`}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    생성 중
                                </>
                            ) : (
                                ctaLabel
                            )}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            onClick={onNext}
                            disabled={disableNext || isSubmitting}
                            className={`floating-cta-btn ${hasItems ? "floating-cta-btn-active" : ""} gap-1 px-4 py-2.5 text-sm font-black sm:px-5 sm:text-base`}
                        >
                            {ctaLabel}
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
