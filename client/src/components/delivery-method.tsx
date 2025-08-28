import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface DeliveryMethodProps {
  deliveryMethod: string;
  onUpdate: (value: string) => void;
}

export function DeliveryMethod({ deliveryMethod, onUpdate }: DeliveryMethodProps) {
  return (
    <Card className="card-shadow">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <span className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">3</span>
          수령 방법
        </h2>
        
        <RadioGroup 
          value={deliveryMethod} 
          onValueChange={onUpdate}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="flex items-center space-x-2 p-4 bg-card rounded-lg border border-input hover:bg-accent/50 transition-colors cursor-pointer">
            <RadioGroupItem value="pickup" id="pickup" data-testid="radio-pickup" />
            <Label htmlFor="pickup" className="cursor-pointer flex-1">
              <div className="font-medium">매장 픽업</div>
              <div className="text-sm text-muted-foreground mt-1">직접 매장에서 수령</div>
            </Label>
          </div>
          
          <div className="flex items-center space-x-2 p-4 bg-card rounded-lg border border-input hover:bg-accent/50 transition-colors cursor-pointer">
            <RadioGroupItem value="quick" id="quick" data-testid="radio-quick" />
            <Label htmlFor="quick" className="cursor-pointer flex-1">
              <div className="font-medium">퀵 배송</div>
              <div className="text-sm text-muted-foreground mt-1">퀵 서비스로 배송</div>
            </Label>
          </div>
        </RadioGroup>
        
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            💡 퀵 배송의 경우 별도 배송비가 발생할 수 있습니다. 정확한 배송비는 견적서에서 확인해주세요.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}