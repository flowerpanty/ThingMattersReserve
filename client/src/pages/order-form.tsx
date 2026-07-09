import { useEffect, useState, useCallback } from "react";
import { CustomerInfo } from "@/components/customer-info";
import { DeliveryDate } from "@/components/delivery-date";
import { DeliveryMethod } from "@/components/delivery-method";
import { ProductSelection } from "@/components/product-selection";
import { OrderActions } from "@/components/order-actions";
import { FinalKakaoModal } from "@/components/final-kakao-modal";
import { FloatingSummary } from "@/components/floating-summary";
import { QuotePreview } from "@/components/quote-preview";
import { useOrderForm } from "@/hooks/use-order-form";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { BarChart3, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { minimumOrderQuantities } from "@shared/schema";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const STEPS = [
  { number: 1, label: "제품 선택", icon: "🍪" },
  { number: 2, label: "기본 정보", icon: "📋" },
  { number: 3, label: "견적 확인", icon: "📄" },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  const shouldReduce = useReducedMotion();

  return (
    <div className="step-indicator-container">
      <div className="flex items-center justify-between w-full max-w-md mx-auto">
        {STEPS.map((step, index) => {
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          const isLast = index === STEPS.length - 1;

          return (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <motion.div
                  className={`step-circle ${isCompleted
                    ? "step-completed"
                    : isCurrent
                      ? "step-current"
                      : "step-upcoming"
                    }`}
                  animate={shouldReduce ? undefined : { scale: isCurrent ? 1.12 : 1 }}
                  transition={{ type: "spring", stiffness: 350, damping: 24 }}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="text-sm">{step.icon}</span>
                  )}
                </motion.div>
                <span
                  className={`text-xs mt-1.5 font-black ${isCurrent
                    ? "text-[#1a1a1a]"
                    : isCompleted
                      ? "text-green-700"
                      : "text-gray-500"
                    }`}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`step-line ${isCompleted ? "step-line-completed" : ""
                    }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OrderForm() {
  const {
    formData,
    updateFormData,
    pricing,
    handleSubmit,
    isSubmitting,
    showKakaoModal,
    setShowKakaoModal,
    resetForm,
  } = useOrderForm();
  const [currentStep, setCurrentStep] = useState(1);
  const [isAdminSession, setIsAdminSession] = useState(false);
  const { toast } = useToast();
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    let isMounted = true;

    fetch('/api/admin/me', { credentials: 'include' })
      .then((response) => response.ok ? response.json() : { authenticated: false })
      .then((data) => {
        if (isMounted) {
          setIsAdminSession(data.authenticated === true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsAdminSession(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Calculate total items for floating summary
  const totalItems = (() => {
    let count = 0;
    count += Object.values(formData.regularCookies).reduce(
      (sum, qty) => sum + qty,
      0
    );
    count += (formData.brownieCookieSets || []).reduce(
      (sum, set) => sum + set.quantity,
      0
    );
    count += (formData.twoPackSets || []).reduce(
      (sum, set) => sum + (set.quantity || 1),
      0
    );
    count += (formData.singleWithDrinkSets || []).reduce(
      (sum, set) => sum + (set.quantity || 1),
      0
    );
    count += (formData.sconeSets || []).reduce(
      (sum, set) => sum + set.quantity,
      0
    );
    count += formData.fortuneCookie || 0;
    count += formData.airplaneSandwich || 0;
    return count;
  })();

  const minimumQuantityIssue = (() => {
    const singleWithDrinkQty = (formData.singleWithDrinkSets || []).reduce(
      (sum, set) => sum + (set.quantity || 0),
      0
    );
    if (singleWithDrinkQty > 0 && singleWithDrinkQty < minimumOrderQuantities.singleWithDrink) {
      return `1구+음료는 최소 ${minimumOrderQuantities.singleWithDrink}개 이상 주문해주세요.`;
    }

    const brownieQty = (formData.brownieCookieSets || []).reduce(
      (sum, set) => sum + (set.quantity || 0),
      0
    );
    if (brownieQty > 0 && brownieQty < minimumOrderQuantities.brownie) {
      return `브라우니쿠키는 최소 ${minimumOrderQuantities.brownie}개 이상 주문해주세요.`;
    }

    const sconeQty = (formData.sconeSets || []).reduce(
      (sum, set) => sum + (set.quantity || 0),
      0
    );
    if (sconeQty > 0 && sconeQty < minimumOrderQuantities.scone) {
      return `스콘은 최소 ${minimumOrderQuantities.scone}개 이상 주문해주세요.`;
    }

    return "";
  })();

  const validateProductSelection = useCallback(() => {
    if (totalItems === 0) {
      toast({
        title: "제품을 1개 이상 선택해주세요",
        description: "견적을 만들려면 최소 한 가지 이상 선택이 필요합니다.",
        variant: "destructive",
      });
      return false;
    }

    if (minimumQuantityIssue) {
      toast({
        title: "최소 수량을 확인해주세요",
        description: minimumQuantityIssue,
        variant: "destructive",
      });
      return false;
    }

    return true;
  }, [minimumQuantityIssue, toast, totalItems]);

  const validateCustomerInfo = useCallback(() => {
    if (!formData.customerName.trim()) {
      toast({
        title: "이름을 입력해주세요",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.customerContact.trim()) {
      toast({
        title: "이메일을 입력해주세요",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.deliveryDate) {
      toast({
        title: "수령 날짜를 선택해주세요",
        variant: "destructive",
      });
      return false;
    }

    return true;
  }, [formData.customerContact, formData.customerName, formData.deliveryDate, toast]);

  const goToStep = useCallback(
    (step: number) => {
      const isMovingForward = step > currentStep;

      if (isMovingForward && currentStep === 1 && !validateProductSelection()) {
        return;
      }

      if (isMovingForward && currentStep === 2 && !validateCustomerInfo()) {
        return;
      }

      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [currentStep, validateCustomerInfo, validateProductSelection]
  );

  const handleNext = useCallback(() => {
    if (currentStep < 3) goToStep(currentStep + 1);
  }, [currentStep, goToStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 1) goToStep(currentStep - 1);
  }, [currentStep, goToStep]);

  const handleCloseKakaoModal = useCallback(() => {
    setShowKakaoModal(false);
    resetForm();
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [resetForm, setShowKakaoModal]);

  return (
    <div className="crayon-texture min-h-screen pb-24">
      <svg className="pointer-events-none absolute h-0 w-0" aria-hidden="true" focusable="false">
        <filter id="crayon-wobble">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="8" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.25" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#eadfce] bg-white/95 shadow-[0_8px_28px_rgba(76,51,24,0.08)] backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black tracking-normal text-[#1a1a1a] sm:text-2xl" style={{ fontFamily: "var(--font-crayon)" }}>
                🍪 낫띵매터스
              </h1>
              <p className="text-xs font-bold text-gray-600 sm:text-sm">
                수제 쿠키 주문
              </p>
            </div>
            {isAdminSession && (
              <Link href="/dashboard">
                <div
                  className="crayon-btn crayon-btn-blue min-h-14 cursor-pointer px-4 text-sm"
                  data-testid="link-dashboard"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm font-medium">대시보드</span>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} />
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6" data-testid="order-form">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={currentStep}
              className="step-content"
              initial={shouldReduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduce ? undefined : { opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 340, damping: 24 }}
            >
              {currentStep === 1 && (
                <>
                  <motion.div
                    initial={shouldReduce ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 24 }}
                    className="speech-bubble mb-4"
                  >
                    👇 원하는 쿠키를 골라 담아주세요 🍪
                  </motion.div>

                  <div className="mb-3">
                    <div className="section-badge">🍪 쿠키 고르기</div>
                  </div>

                  <ProductSelection
                    regularCookies={formData.regularCookies}
                    packaging={formData.packaging}
                    brownieCookieSets={formData.brownieCookieSets}
                    twoPackSets={formData.twoPackSets}
                    singleWithDrinkSets={formData.singleWithDrinkSets}
                    sconeSets={formData.sconeSets}
                    fortuneCookie={formData.fortuneCookie}
                    airplaneSandwich={formData.airplaneSandwich}
                    onUpdate={updateFormData}
                  />
                </>
              )}

              {currentStep === 2 && (
                <>
                  <motion.div
                    initial={shouldReduce ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 24 }}
                    className="crayon-card mb-6 text-center"
                    style={{ background: "hsl(195, 80%, 92%)" }}
                  >
                    <div className="text-4xl mb-2">🖍️</div>
                    <h2 className="font-black text-xl text-[#1a1a1a]">거의 다 왔어요!</h2>
                    <p className="text-base font-bold text-gray-700 mt-1">이름과 수령 일정만 알려주시면 견적서가 완성돼요</p>
                    <div className="flex flex-wrap justify-center gap-3 mt-3 text-sm font-black text-gray-700">
                      <span>✅ 3단계만에 완료</span>
                      <span>📧 이메일로 견적서 발송</span>
                    </div>
                  </motion.div>

                  <div className="mb-6">
                    <div className="section-badge">📝 정보 입력</div>
                  </div>

                  <div className="space-y-6">
                    <CustomerInfo
                      customerName={formData.customerName}
                      customerContact={formData.customerContact}
                      customerPhone={formData.customerPhone}
                      onUpdate={(field, value) => updateFormData(field, value)}
                    />

                    <DeliveryDate
                      deliveryDate={formData.deliveryDate}
                      onUpdate={(value) => updateFormData("deliveryDate", value)}
                    />

                    <DeliveryMethod
                      deliveryMethod={formData.deliveryMethod}
                      deliveryAddress={formData.deliveryAddress || ""}
                      pickupTime={formData.pickupTime}
                      onUpdate={(field, value) => updateFormData(field, value)}
                    />
                  </div>
                </>
              )}

              {currentStep === 3 && (
                <>
                  <div className="mb-6">
                    <div className="section-badge">✅ 최종 확인</div>
                  </div>

                  <div className="crayon-card mb-6">
                    <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-black text-xl flex items-center gap-2 text-[#1a1a1a]">
                          ✏️ 빠른 수정
                        </h3>
                        <p className="text-base font-bold text-gray-600 mt-1">
                          틀린 내용이 있으면 바로 원하는 단계로 돌아가 수정할 수 있어요.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => goToStep(1)} className="crayon-btn crayon-btn-blue min-h-14 px-4 text-sm">
                          제품 수정
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => goToStep(2)} className="crayon-btn crayon-btn-green min-h-14 px-4 text-sm">
                          기본 정보 수정
                        </Button>
                      </div>
                    </div>
                  </div>

                  <QuotePreview formData={formData} pricing={pricing} />

                  <div className="mt-6">
                    <OrderActions isSubmitting={isSubmitting} />
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Floating Summary Bar */}
          <FloatingSummary
            totalItems={totalItems}
            totalPrice={pricing.total}
            currentStep={currentStep}
            onNext={handleNext}
            onPrev={handlePrev}
            isSubmitting={isSubmitting}
            disableNext={currentStep === 1 && totalItems === 0}
          />
        </form>
      </main>

      {/* Footer - only show on step 3 */}
      {currentStep === 3 && (
        <footer className="mt-8 border-t-[3px] border-black bg-white/70 py-6">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="text-lg font-black text-[#1a1a1a] mb-2">
              nothingmatters
            </div>
            <p className="text-sm font-bold text-gray-700">
              수제 쿠키로 특별한 순간을 더욱 달콤하게
            </p>
            <div className="mt-2 flex justify-center gap-4 text-xs font-bold text-gray-600">
              <span>예약 문의: 카카오톡 채널</span>
              <span>최소 1일 전 주문</span>
            </div>
          </div>
        </footer>
      )}

      {/* Kakao Consultation Modal */}
      <FinalKakaoModal
        isOpen={showKakaoModal}
        onClose={handleCloseKakaoModal}
      />
    </div>
  );
}
