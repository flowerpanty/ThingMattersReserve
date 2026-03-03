import { Card, CardContent } from "@/components/ui/card";
import React from 'react';
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DeliveryMethodProps {
  deliveryMethod: string;
  deliveryAddress: string;
  pickupTime?: string;
  onUpdate: (field: string, value: string) => void;
}

export function DeliveryMethod({ deliveryMethod, deliveryAddress, pickupTime, onUpdate }: DeliveryMethodProps) {
  const timeOptions = [
    "10:00~11:00",
    "11:00~12:00",
    "12:00~13:00",
    "13:00~14:00",
    "14:00~15:00",
    "15:00~16:00",
    "16:00~17:00",
  ];

  return (
    <Card className="card-shadow">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
          🚗 수령 방법
        </h2>

        <RadioGroup
          value={deliveryMethod}
          onValueChange={(value) => onUpdate('deliveryMethod', value)}
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

        {/* 픽업/배송 시간 선택 */}
        <div className="mt-6 p-4 bg-accent/20 rounded-lg">
          <Label className="text-sm font-medium mb-2 block">
            {deliveryMethod === 'pickup' ? '픽업 시간 선택 *' : '퀵 배송 희망 시간 *'}
          </Label>
          <Select
            value={pickupTime}
            onValueChange={(value) => onUpdate('pickupTime', value)}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="시간을 선택해주세요" />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            * 매장 운영 시간: 10:00 ~ 17:00
          </p>
        </div>

        {/* 퀵배송 선택 시 주소 입력 칸 */}
        {deliveryMethod === 'quick' && (
          <div className="mt-4 p-4 bg-accent/20 rounded-lg">
            <Label htmlFor="delivery-address" className="text-sm font-medium mb-2 block">
              배송 받을 주소 *
            </Label>
            <Input
              id="delivery-address"
              placeholder="배송받을 주소를 입력해주세요"
              value={deliveryAddress}
              onChange={(e) => onUpdate('deliveryAddress', e.target.value)}
              data-testid="input-delivery-address"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-2">
              정확한 주소를 입력해주시면 배송비 산정에 도움이 됩니다.
            </p>
          </div>
        )}

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            💡 퀵 배송의 경우 별도 배송비가 발생할 수 있습니다. 정확한 배송비는 견적서에서 확인해주세요.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}