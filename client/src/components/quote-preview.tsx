import { Card, CardContent } from "@/components/ui/card";
import { cookieTypes, drinkTypes } from "@shared/schema";

interface QuotePreviewProps {
  formData: any;
  pricing: any;
}

export function QuotePreview({ formData, pricing }: QuotePreviewProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  const getOrderDetails = () => {
    const details = [];

    // 일반 쿠키
    if (pricing.regularCookies > 0) {
      const totalQuantity = Object.values(formData.regularCookies).reduce((sum: number, qty: any) => sum + qty, 0);
      const selectedTypes = Object.entries(formData.regularCookies)
        .filter(([_, qty]) => (qty as number) > 0)
        .map(([type, qty]) => `${type} ${qty}개`)
        .join(', ');

      details.push({
        name: '일반 쿠키',
        quantity: totalQuantity,
        price: pricing.regularCookies,
        details: selectedTypes
      });
    }

    // 2구 패키지
    if (formData.twoPackSets?.length > 0) {
      formData.twoPackSets.forEach((set: any, index: number) => {
        const quantity = set.quantity || 1;
        const selectedCookies = set.selectedCookies?.join(', ') || '';

        details.push({
          name: `2구 패키지`,
          quantity: quantity,
          price: quantity * 10500,
          details: selectedCookies
        });
      });
    }

    // 1구 + 음료
    if (formData.singleWithDrinkSets?.length > 0) {
      formData.singleWithDrinkSets.forEach((set: any, index: number) => {
        const quantity = set.quantity || 1;
        const selectedCookie = set.selectedCookie || '';
        const selectedDrink = set.selectedDrink || '';

        details.push({
          name: `1구 + 음료`,
          quantity: quantity,
          price: quantity * 11000,
          details: `${selectedCookie} + ${selectedDrink}`
        });
      });
    }

    // 브라우니 쿠키
    if (formData.brownieCookieSets?.length > 0) {
      formData.brownieCookieSets.forEach((set: any, index: number) => {
        const quantity = set.quantity || 1;
        let details_text = `브라우니쿠키 ${quantity}개`;
        if (set.shape) {
          const shapeName = {
            'bear': '곰돌이',
            'rabbit': '토끼',
            'tiger': '호랑이',
            'birthdayBear': '생일곰'
          }[set.shape as string] || set.shape;
          details_text += ` (${shapeName})`;
        }
        if (set.customSticker) details_text += ' + 커스텀스티커';
        if (set.heartMessage) details_text += ' + 하트메시지';
        if (set.customTopper) details_text += ' + 커스텀토퍼';

        // 기본 가격 계산: 브라우니쿠키 기본 가격 * 수량
        let totalPrice = set.quantity * 7800;

        // 생일곰 추가 비용 (+500원)
        if (set.shape === 'birthdayBear') {
          totalPrice += set.quantity * 500;
        }

        // 커스텀 옵션 추가 비용
        if (set.customSticker) totalPrice += 15000;
        if (set.heartMessage) totalPrice += 500;

        details.push({
          name: '브라우니쿠키',
          quantity: quantity,
          price: totalPrice,
          details: details_text
        });
      });
    }

    // 행운쿠키
    if (formData.fortuneCookie > 0) {
      details.push({
        name: '행운쿠키',
        quantity: formData.fortuneCookie,
        price: formData.fortuneCookie * 17000,
        details: `${formData.fortuneCookie}박스`
      });
    }

    // 비행기샌드쿠키
    if (formData.airplaneSandwich > 0) {
      details.push({
        name: '비행기샌드쿠키',
        quantity: formData.airplaneSandwich,
        price: formData.airplaneSandwich * 22000,
        details: `${formData.airplaneSandwich}박스`
      });
    }

    return details;
  };

  const orderDetails = getOrderDetails();

  if (orderDetails.length === 0 || pricing.total === 0) {
    return (
      <Card className="card-shadow">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            📋 주문 내역
          </h3>
          <div className="text-center text-muted-foreground py-8">
            제품을 선택하면 견적서 미리보기가 표시됩니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          📋 주문 내역
        </h3>

        <div className="space-y-3 mb-4">
          {orderDetails.map((item, index) => (
            <div key={index} className="flex justify-between items-start p-3 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <div className="font-medium">{item.name}</div>
                {item.details && (
                  <div className="text-sm text-muted-foreground mt-1">{item.details}</div>
                )}
              </div>
              <div className="text-right">
                <div className="font-medium">{formatPrice(item.price)}</div>
                <div className="text-sm text-muted-foreground">수량: {item.quantity}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 고객 정보 */}
        <div className="border-t pt-4 mb-4">
          <h4 className="font-medium mb-2">고객 정보</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>이름: {formData.customerName || '미입력'}</div>
            <div>이메일: {formData.customerContact || '미입력'}</div>
            <div>수령일: {formData.deliveryDate || '미선택'}</div>
            <div>수령방법: {formData.deliveryMethod === 'pickup' ? '매장 픽업' : '퀵 배송'}</div>
          </div>
        </div>

        {/* 총 금액 */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center text-lg font-bold">
            <span>총 합계</span>
            <span className="text-primary">{formatPrice(pricing.total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}