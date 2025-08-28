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
        
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <Label htmlFor="deliveryDate" className="block text-lg font-semibold text-foreground mb-3">
              📅 수령 날짜 선택
            </Label>
            <p className="text-sm text-muted-foreground mb-4">
              언제 받으실 건가요?
            </p>
          </div>
          
          <div className="space-y-4">
            <Input
              id="deliveryDate"
              type="date"
              required
              value={deliveryDate}
              min={minDate}
              onChange={(e) => onUpdate(e.target.value)}
              className="w-full px-4 py-3 text-base rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
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
            
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-xs text-center">
                ⚠️ 최소 1일 전 주문 필요
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
