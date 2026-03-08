import { useState, useCallback } from "react";
import { CustomerInfo } from "@/components/customer-info";
import { DeliveryDate } from "@/components/delivery-date";
import { DeliveryMethod } from "@/components/delivery-method";
import { ProductSelection } from "@/components/product-selection";
import { PriceSummary } from "@/components/price-summary";
import { OrderActions } from "@/components/order-actions";
import { FinalKakaoModal } from "@/components/final-kakao-modal";
import { FloatingSummary } from "@/components/floating-summary";
import { useOrderForm } from "@/hooks/use-order-form";
import { Link } from "wouter";
import { BarChart3, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STEPS = [
  { number: 1, label: "기본 정보", icon: "📋" },
  { number: 2, label: "제품 선택", icon: "🍪" },
  { number: 3, label: "견적 확인", icon: "📄" },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
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
                <div
                  className={`step-circle ${isCompleted
                    ? "step-completed"
                    : isCurrent
                      ? "step-current"
                      : "step-upcoming"
                    }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="text-sm">{step.icon}</span>
                  )}
                </div>
                <span
                  className={`text-xs mt-1.5 font-medium ${isCurrent
                    ? "text-primary"
                    : isCompleted
                      ? "text-green-600"
                      : "text-muted-foreground"
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
  } = useOrderForm();
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();

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

  const goToStep = useCallback(
    (step: number) => {
      // Validate step 1 before moving to step 2
      if (step > 1 && currentStep === 1) {
        if (!formData.customerName.trim()) {
          toast({
            title: "이름을 입력해주세요",
            variant: "destructive",
          });
          return;
        }
        if (!formData.customerContact.trim()) {
          toast({
            title: "이메일을 입력해주세요",
            variant: "destructive",
          });
          return;
        }
        if (!formData.deliveryDate) {
          toast({
            title: "수령 날짜를 선택해주세요",
            variant: "destructive",
          });
          return;
        }
      }

      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [currentStep, formData, toast]
  );

  const handleNext = useCallback(() => {
    if (currentStep < 3) goToStep(currentStep + 1);
  }, [currentStep, goToStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 1) goToStep(currentStep - 1);
  }, [currentStep, goToStep]);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <h1 className="text-2xl futura-bold text-blue-600">
                NOTHINGMATTERS
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                수제 쿠키 주문
              </p>
            </div>
            {localStorage.getItem("admin_authenticated") === "true" && (
              <Link href="/dashboard">
                <div
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
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

      <main className="max-w-4xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6" data-testid="order-form">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="step-content">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-foreground">
                  📋 기본 정보 입력
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  주문자 정보와 수령 일정을 알려주세요
                </p>
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
            </div>
          )}

          {/* Step 2: Product Selection */}
          {currentStep === 2 && (
            <div className="step-content">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-foreground">
                  🍪 제품 선택
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  원하시는 제품을 선택해주세요
                </p>
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
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {currentStep === 3 && (
            <div className="step-content">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-foreground">
                  📄 견적 확인
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  주문 내역을 확인하고 견적서를 받으세요
                </p>
              </div>

              {/* Order Summary Card */}
              <div className="bg-card rounded-xl border border-border p-5 mb-6 card-shadow">
                <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
                  📦 주문 내역
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">주문자</span>
                    <span className="font-medium">{formData.customerName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">이메일</span>
                    <span className="font-medium">
                      {formData.customerContact}
                    </span>
                  </div>
                  {formData.customerPhone && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">핸드폰</span>
                      <span className="font-medium">
                        {formData.customerPhone}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">수령일</span>
                    <span className="font-medium">
                      {formData.deliveryDate
                        ? new Date(
                          formData.deliveryDate + "T00:00:00"
                        ).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          weekday: "short",
                        })
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">수령방법</span>
                    <span className="font-medium">
                      {formData.deliveryMethod === "pickup"
                        ? "매장 픽업"
                        : "퀵 배송"}
                    </span>
                  </div>
                  {formData.pickupTime && (
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">시간</span>
                      <span className="font-medium">{formData.pickupTime}</span>
                    </div>
                  )}
                </div>
              </div>

              <PriceSummary pricing={pricing} />

              <div className="mt-6">
                <OrderActions isSubmitting={isSubmitting} />
              </div>
            </div>
          )}

          {/* Floating Summary Bar */}
          <FloatingSummary
            totalItems={totalItems}
            totalPrice={pricing.total}
            currentStep={currentStep}
            onNext={handleNext}
            onPrev={handlePrev}
            isSubmitting={isSubmitting}
          />
        </form>
      </main>

      {/* Footer - only show on step 3 */}
      {currentStep === 3 && (
        <footer className="bg-card/50 mt-8 py-6 border-t border-border">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="text-lg futura-bold text-primary mb-2">
              nothingmatters
            </div>
            <p className="text-sm text-muted-foreground">
              수제 쿠키로 특별한 순간을 더욱 달콤하게
            </p>
            <div className="mt-2 flex justify-center gap-4 text-xs text-muted-foreground">
              <span>예약 문의: 카카오톡 채널</span>
              <span>최소 1일 전 주문</span>
            </div>
          </div>
        </footer>
      )}

      {/* Kakao Consultation Modal */}
      <FinalKakaoModal
        isOpen={showKakaoModal}
        onClose={() => setShowKakaoModal(false)}
      />
    </div>
  );
}
