import { Card, CardContent } from "@/components/ui/card";

interface PricingSummary {
  regularCookies: number;
  twoPackSet: number;
  singleWithDrink: number;
  packaging: number;
  brownie: number;
  fortune: number;
  airplane: number;
  total: number;
}

interface PriceSummaryProps {
  pricing: PricingSummary;
}

export function PriceSummary({ pricing }: PriceSummaryProps) {
  const formatPrice = (price: number) => {
    const validPrice = price || 0;
    return validPrice.toLocaleString('ko-KR') + '원';
  };

  return (
    <Card className="card-shadow price-highlight">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <span className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">5</span>
          견적 요약
        </h2>
        
        <div className="space-y-3 mb-6">
          {pricing.regularCookies > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span>일반 쿠키</span>
              <span data-testid="price-regular-cookies">{formatPrice(pricing.regularCookies)}</span>
            </div>
          )}
          {pricing.twoPackSet > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span>2구 패키지</span>
              <span data-testid="price-twopack-set">{formatPrice(pricing.twoPackSet)}</span>
            </div>
          )}
          {pricing.singleWithDrink > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span>1구 + 음료</span>
              <span data-testid="price-single-with-drink">{formatPrice(pricing.singleWithDrink)}</span>
            </div>
          )}
          {pricing.brownie > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span>브라우니쿠키</span>
              <span data-testid="price-brownie">{formatPrice(pricing.brownie)}</span>
            </div>
          )}
          {pricing.fortune > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span>행운쿠키</span>
              <span data-testid="price-fortune">{formatPrice(pricing.fortune)}</span>
            </div>
          )}
          {pricing.airplane > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span>비행기샌드쿠키</span>
              <span data-testid="price-airplane">{formatPrice(pricing.airplane)}</span>
            </div>
          )}
          {pricing.packaging > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span>포장비</span>
              <span data-testid="price-packaging">{formatPrice(pricing.packaging)}</span>
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center text-lg font-bold py-3 border-t-2 border-primary/20 bg-primary/10 rounded-lg px-4">
          <span>총 금액</span>
          <span className="text-primary-foreground" data-testid="price-total">
            {formatPrice(pricing.total)}
          </span>
        </div>
        
        <p className="text-sm text-muted-foreground mt-4 text-center">
          * 최종 금액은 카카오톡 상담 후 확정됩니다
        </p>
      </CardContent>
    </Card>
  );
}
