import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeliveryDateProps {
  deliveryDate: string;
  onUpdate: (value: string) => void;
}

export function DeliveryDate({ deliveryDate, onUpdate }: DeliveryDateProps) {
  // Calculate tomorrow's date as minimum
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  // Define disabled dates (December 22-27, 2025)
  const disabledDates = [
    '2025-12-22',
    '2025-12-23',
    '2025-12-24',
    '2025-12-25',
    '2025-12-26',
    '2025-12-27'
  ];

  // Check if a date is disabled
  const isDateDisabled = (dateString: string): boolean => {
    return disabledDates.includes(dateString);
  };

  // Handle date change with validation
  const handleDateChange = (value: string) => {
    if (isDateDisabled(value)) {
      alert('선택하신 날짜는 수령이 불가능합니다. 다른 날짜를 선택해주세요.');
      return;
    }
    onUpdate(value);
  };

  return (
    <Card className="card-shadow">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <span className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">2</span>
          수령 희망일
        </h2>

        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            {!deliveryDate ? (
              <Label htmlFor="deliveryDate" className="block text-lg font-semibold text-foreground mb-3">
                📅 수령 날짜 선택
              </Label>
            ) : (
              <Label htmlFor="deliveryDate" className="block text-lg font-semibold text-foreground mb-3">
                📅 선택된 수령일
              </Label>
            )}
            {!deliveryDate && (
              <p className="text-sm text-muted-foreground mb-4">
                언제 받으실 건가요?
              </p>
            )}
          </div>

          <div className="space-y-4">
            <Input
              id="deliveryDate"
              type="date"
              required
              value={deliveryDate}
              min={minDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-4 py-3 text-base rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:border-ring transition-colors date-input"
              data-testid="input-delivery-date"
            />

            {deliveryDate && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 font-medium text-center text-sm">
                  ✅ {new Date(deliveryDate + 'T00:00:00').toLocaleDateString('ko-KR', {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short'
                  })} 선택완료
                </p>
              </div>
            )}

            <div className="space-y-2">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-xs text-center">
                  ⚠️ 최소 1일 전 주문 필요
                </p>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-xs text-center">
                  🚫 12월 22일 ~ 27일은 수령 불가
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
