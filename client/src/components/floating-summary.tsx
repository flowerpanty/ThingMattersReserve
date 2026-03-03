import { Button } from "@/components/ui/button";
import { ShoppingCart, ChevronRight, ChevronLeft } from "lucide-react";

interface FloatingSummaryProps {
    totalItems: number;
    totalPrice: number;
    currentStep: number;
    onNext: () => void;
    onPrev: () => void;
    isSubmitting?: boolean;
}

export function FloatingSummary({
    totalItems,
    totalPrice,
    currentStep,
    onNext,
    onPrev,
    isSubmitting,
}: FloatingSummaryProps) {
    const formatPrice = (price: number) =>
        (price || 0).toLocaleString("ko-KR") + "원";

    // Step 3에서는 "견적서 받기" 버튼으로 변경
    const isLastStep = currentStep === 3;
    const isFirstStep = currentStep === 1;

    return (
        <div className="floating-summary-bar">
            <div className="max-w-4xl mx-auto px-4 flex items-center justify-between gap-3">
                {/* Left: Back button */}
                <div className="flex-shrink-0">
                    {!isFirstStep && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onPrev}
                            className="text-white/80 hover:text-white hover:bg-white/10 gap-1"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            이전
                        </Button>
                    )}
                </div>

                {/* Center: Summary info */}
                <div className="flex items-center gap-3 flex-1 justify-center">
                    {totalItems > 0 && (
                        <>
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4 text-white/70" />
                                <span className="text-white/90 text-sm font-medium">
                                    {totalItems}개 선택
                                </span>
                            </div>
                            <div className="w-px h-4 bg-white/30" />
                            <span className="text-white font-bold text-base">
                                {formatPrice(totalPrice)}
                            </span>
                        </>
                    )}
                </div>

                {/* Right: Next/Submit button */}
                <div className="flex-shrink-0">
                    {isLastStep ? (
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-white text-primary hover:bg-white/90 font-bold px-5 py-2 rounded-full shadow-lg gap-1"
                        >
                            {isSubmitting ? "생성 중..." : "📄 견적서 받기"}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            onClick={onNext}
                            className="bg-white text-primary hover:bg-white/90 font-bold px-5 py-2 rounded-full shadow-lg gap-1"
                        >
                            다음
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
