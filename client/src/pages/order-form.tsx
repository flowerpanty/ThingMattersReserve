import { CustomerInfo } from "@/components/customer-info";
import { DeliveryDate } from "@/components/delivery-date";
import { ProductSelection } from "@/components/product-selection";
import { PriceSummary } from "@/components/price-summary";
import { OrderActions } from "@/components/order-actions";
import { useOrderForm } from "@/hooks/use-order-form";

export default function OrderForm() {
  const { formData, updateFormData, pricing, handleSubmit, isSubmitting } = useOrderForm();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl futura-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              nothingmatters
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">귀여운 수제 쿠키 예약 주문</p>
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm font-medium">⚠️ 주문 최종확정은 상담후 가능합니다</p>
            </div>
            
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

          <ProductSelection 
            regularCookies={formData.regularCookies}
            packaging={formData.packaging}
            brownieCookie={formData.brownieCookie}
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
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
            <button
              type="submit"
              form="order-form"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-colors"
              data-testid="button-get-quote-footer"
            >
              📄 견적서 받기
            </button>
            
            <a
              href="http://pf.kakao.com/_QdCaK"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold rounded-lg transition-colors"
              data-testid="button-kakao-consult-footer"
            >
              💬 카카오톡 상담하기
            </a>
            
            <a
              href="https://nothingmatters.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold rounded-lg transition-colors"
              data-testid="button-home-footer"
            >
              🏠 nothingmatters
            </a>
          </div>
          
          <p className="text-sm text-muted-foreground">수제 쿠키로 특별한 순간을 더욱 달콤하게</p>
          <div className="mt-2 flex justify-center gap-4 text-xs text-muted-foreground">
            <span>예약 문의: 카카오톡 채널</span>
            <span>최소 1일 전 주문</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
