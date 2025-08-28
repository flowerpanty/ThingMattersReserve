import { CustomerInfo } from "@/components/customer-info";
import { DeliveryDate } from "@/components/delivery-date";
import { DeliveryMethod } from "@/components/delivery-method";
import { ProductSelection } from "@/components/product-selection";
import { PriceSummary } from "@/components/price-summary";
import { OrderActions } from "@/components/order-actions";
import { FinalKakaoModal } from "@/components/final-kakao-modal";
import { useOrderForm } from "@/hooks/use-order-form";
import { Link } from "wouter";
import { BarChart3 } from "lucide-react";

export default function OrderForm() {
  const { formData, updateFormData, pricing, handleSubmit, isSubmitting, showKakaoModal, setShowKakaoModal } = useOrderForm();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <h1 className="text-3xl futura-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-[#1100ff]">
                NOTHINGMATTERS
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">귀여운 수제 쿠키 예약 주문</p>
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm font-medium">⚠️ 카카오톡 상담 후 확정</p>
              </div>
            </div>
            {/* 관리자만 대시보드 링크 표시 */}
            {sessionStorage.getItem('admin_authenticated') === 'true' && (
              <Link href="/dashboard">
                <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors cursor-pointer" data-testid="link-dashboard">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm font-medium">대시보드</span>
                </div>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <form onSubmit={handleSubmit} className="space-y-8" data-testid="order-form">
          
          <CustomerInfo 
            customerName={formData.customerName}
            customerContact={formData.customerContact}
            onUpdate={(field, value) => updateFormData(field, value)}
          />

          <DeliveryDate 
            deliveryDate={formData.deliveryDate}
            onUpdate={(value) => updateFormData('deliveryDate', value)}
          />

          <DeliveryMethod 
            deliveryMethod={formData.deliveryMethod}
            onUpdate={(value) => updateFormData('deliveryMethod', value)}
          />

          <ProductSelection 
            regularCookies={formData.regularCookies}
            packaging={formData.packaging}
            brownieCookieSets={formData.brownieCookieSets}
            twoPackSets={formData.twoPackSets}
            singleWithDrinkSets={formData.singleWithDrinkSets}
            fortuneCookie={formData.fortuneCookie}
            airplaneSandwich={formData.airplaneSandwich}
            onUpdate={updateFormData}
          />

          <PriceSummary pricing={pricing} />

          <OrderActions isSubmitting={isSubmitting} />
          
        </form>
      </main>

      {/* Footer */}
      <footer className="bg-card/50 mt-16 py-8 border-t border-border">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="text-lg futura-bold text-primary mb-4">nothingmatters</div>
          <p className="text-sm text-muted-foreground">수제 쿠키로 특별한 순간을 더욱 달콤하게</p>
          <div className="mt-2 flex justify-center gap-4 text-xs text-muted-foreground">
            <span>예약 문의: 카카오톡 채널</span>
            <span>최소 1일 전 주문</span>
          </div>
        </div>
      </footer>
      
      {/* Kakao Consultation Modal */}
      <FinalKakaoModal 
        isOpen={showKakaoModal}
        onClose={() => setShowKakaoModal(false)}
      />
      
    </div>
  );
}
