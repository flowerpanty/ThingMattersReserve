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
        
        <div className="max-w-md">
          <Label htmlFor="deliveryDate" className="block text-sm font-medium text-foreground mb-2">
            날짜 선택 *
          </Label>
          <Input
            id="deliveryDate"
            type="date"
            required
            value={deliveryDate}
            min={minDate}
            onChange={(e) => onUpdate(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
            data-testid="input-delivery-date"
          />
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ 당일 예약은 불가능합니다. 최소 1일 전 주문해주세요.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
