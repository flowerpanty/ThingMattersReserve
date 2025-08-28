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

  return (
    <Card className="card-shadow">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <span className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">2</span>
          수령 희망일
        </h2>
        
        <div className="max-w-lg">
          <Label htmlFor="deliveryDate" className="block text-lg font-semibold text-foreground mb-4">
            📅 수령하실 날짜를 선택해주세요 *
          </Label>
          
          <div className="relative">
            <Input
              id="deliveryDate"
              type="date"
              required
              value={deliveryDate}
              min={minDate}
              onChange={(e) => onUpdate(e.target.value)}
              className="w-full px-6 py-4 text-lg rounded-lg border-2 border-input bg-background focus:ring-2 focus:ring-ring focus:border-ring transition-colors text-center font-medium"
              data-testid="input-delivery-date"
              style={{ fontSize: '18px' }}
            />
            {!deliveryDate && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground">
                <span className="text-base">날짜를 터치하여 선택하세요</span>
              </div>
            )}
          </div>
          
          {deliveryDate && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium text-center">
                ✅ {new Date(deliveryDate + 'T00:00:00').toLocaleDateString('ko-KR', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long'
                })} 선택됨
              </p>
            </div>
          )}
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm text-center">
              ⚠️ 당일 예약은 불가능합니다. 최소 1일 전 주문해주세요.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
