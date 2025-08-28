import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CustomerInfoProps {
  customerName: string;
  customerContact: string;
  onUpdate: (field: string, value: string) => void;
}

export function CustomerInfo({ customerName, customerContact, onUpdate }: CustomerInfoProps) {
  return (
    <Card className="card-shadow">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <span className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">1</span>
          고객 정보
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="customerName" className="block text-sm font-medium text-foreground mb-2">
              이름 *
            </Label>
            <Input
              id="customerName"
              type="text"
              required
              value={customerName}
              onChange={(e) => onUpdate('customerName', e.target.value)}
              placeholder="주문자 성함을 입력해주세요"
              className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
              data-testid="input-customer-name"
            />
          </div>
          
          <div>
            <Label htmlFor="customerContact" className="block text-sm font-medium text-foreground mb-2">
              이메일 주소 *
            </Label>
            <Input
              id="customerContact"
              type="email"
              required
              value={customerContact}
              onChange={(e) => onUpdate('customerContact', e.target.value)}
              placeholder="example@email.com"
              className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
              data-testid="input-customer-contact"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
