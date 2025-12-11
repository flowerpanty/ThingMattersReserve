import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState, useCallback } from "react";
import { cookieTypes, drinkTypes } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProductSelectionProps {
  regularCookies: Record<string, number>;
  packaging?: string;
  brownieCookieSets: {
    quantity: number;
    shape?: string;
    customSticker: boolean;
    heartMessage?: string;
    customTopper: boolean;
  }[];
  twoPackSets: {
    selectedCookies: string[];
    quantity: number;
  }[];
  singleWithDrinkSets: {
    selectedCookie: string;
    selectedDrink: string;
    quantity: number;
  }[];
  sconeSets: {
    flavor: string;
    quantity: number;
    strawberryJam: boolean;
  }[];
  fortuneCookie: number;
  airplaneSandwich: number;
  onUpdate: (field: string, value: any) => void;
}

export function ProductSelection({
  regularCookies,
  packaging,
  brownieCookieSets,
  twoPackSets,
  singleWithDrinkSets,
  sconeSets,
  fortuneCookie,
  airplaneSandwich,
  onUpdate
}: ProductSelectionProps) {

  const [openSections, setOpenSections] = useState({
    regular: false,
    twopack: false,
    singledrink: false,
    brownie: false,
    scone: false,
    fortune: false,
    airplane: false
  });

  const updateRegularCookie = (type: string, quantity: number) => {
    onUpdate('regularCookies', { ...regularCookies, [type]: Math.max(0, quantity) });
  };

  // 브라우니쿠키 세트 관리
  const addBrownieCookieSet = () => {
    onUpdate('brownieCookieSets', [...(brownieCookieSets || []), {
      quantity: 1,
      shape: 'bear',
      customSticker: false,
      heartMessage: undefined,
      customTopper: false
    }]);
  };

  const removeBrownieCookieSet = (index: number) => {
    const newSets = (brownieCookieSets || []).filter((_, i) => i !== index);
    onUpdate('brownieCookieSets', newSets);
  };

  const updateBrownieCookieSet = (index: number, field: string, value: any) => {
    const newSets = [...(brownieCookieSets || [])];
    newSets[index] = { ...newSets[index], [field]: value };
    onUpdate('brownieCookieSets', newSets);
  };

  // 2구패키지 세트 관리
  const addTwoPackSet = () => {
    onUpdate('twoPackSets', [...twoPackSets, { selectedCookies: [], quantity: 1 }]);
  };

  const removeTwoPackSet = (index: number) => {
    const newSets = twoPackSets.filter((_, i) => i !== index);
    onUpdate('twoPackSets', newSets);
  };

  const updateTwoPackSet = (index: number, field: 'selectedCookies' | 'quantity', value: string[] | number) => {
    const newSets = [...twoPackSets];
    newSets[index] = { ...newSets[index], [field]: value };
    onUpdate('twoPackSets', newSets);
  };

  // 1구+음료 세트 관리
  const addSingleWithDrinkSet = () => {
    onUpdate('singleWithDrinkSets', [...singleWithDrinkSets, { selectedCookie: '', selectedDrink: '', quantity: 1 }]);
  };

  const removeSingleWithDrinkSet = (index: number) => {
    const newSets = singleWithDrinkSets.filter((_, i) => i !== index);
    onUpdate('singleWithDrinkSets', newSets);
  };

  const updateSingleWithDrinkSet = (index: number, field: 'selectedCookie' | 'selectedDrink' | 'quantity', value: string | number) => {
    const newSets = [...singleWithDrinkSets];
    newSets[index] = { ...newSets[index], [field]: value };
    onUpdate('singleWithDrinkSets', newSets);
  };

  // 스콘 세트 관리
  const addSconeSet = () => {
    onUpdate('sconeSets', [...(sconeSets || []), { flavor: 'chocolate', quantity: 1, strawberryJam: false }]);
  };

  const removeSconeSet = (index: number) => {
    const newSets = (sconeSets || []).filter((_, i) => i !== index);
    onUpdate('sconeSets', newSets);
  };

  const updateSconeSet = (index: number, field: string, value: any) => {
    const newSets = [...(sconeSets || [])];
    newSets[index] = { ...newSets[index], [field]: value };
    onUpdate('sconeSets', newSets);
  };

  const toggleCookieInTwoPackSet = (setIndex: number, cookieType: string) => {
    const currentSet = twoPackSets[setIndex];
    const currentCookies = currentSet?.selectedCookies || [];

    let newCookies;
    if (currentCookies.includes(cookieType)) {
      // 이미 선택된 쿠키면 제거
      newCookies = currentCookies.filter(c => c !== cookieType);
    } else if (currentCookies.length < 2) {
      // 2개 미만이면 추가
      newCookies = [...currentCookies, cookieType];
    } else {
      // 2개 이상이면 추가하지 않음
      return;
    }

    const newSets = [...twoPackSets];
    newSets[setIndex] = { ...newSets[setIndex], selectedCookies: newCookies };
    onUpdate('twoPackSets', newSets);
  };

  const hasRegularCookies = Object.values(regularCookies).some(qty => qty > 0);
  const regularCookieTotal = Object.values(regularCookies).reduce((sum, qty) => sum + qty, 0);

  return (
    <Card className="card-shadow">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <span className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">4</span>
          제품 선택
        </h2>

        <div className="space-y-4">
          {/* Regular Cookies */}
          <Collapsible
            open={openSections.regular}
            onOpenChange={(open) => setOpenSections(prev => ({ ...prev, regular: open }))}
          >
            <div className="border border-border rounded-lg bg-card">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🍪</span>
                  <div className="text-left">
                    <div className="font-semibold">일반 쿠키</div>
                    <div className="text-sm text-muted-foreground">개당 4,500원</div>
                  </div>
                  {regularCookieTotal > 0 && (
                    <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full ml-2">
                      {regularCookieTotal}개
                    </div>
                  )}
                </div>
                {openSections.regular ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>

              <CollapsibleContent className="px-4 pb-4">
                {/* Step 1: 포장 방법 선택 (먼저 선택해야 함) */}
                <div className="bg-accent/20 rounded-lg p-4 mb-4">
                  <h4 className="font-medium mb-3 text-sm text-center">🎁 포장 방법을 먼저 선택해주세요</h4>
                  <RadioGroup value={packaging} onValueChange={(value) => onUpdate('packaging', value)}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex items-center space-x-2 p-3 bg-card rounded-lg border border-input hover:bg-muted/50 transition-colors cursor-pointer">
                        <RadioGroupItem value="single_box" id="single_box" data-testid="radio-packaging-single-box" />
                        <Label htmlFor="single_box" className="cursor-pointer text-sm flex-1">
                          <div className="font-medium">1구박스</div>
                          <div className="text-xs text-muted-foreground">각 쿠키마다 +600원</div>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2 p-3 bg-card rounded-lg border border-input hover:bg-muted/50 transition-colors cursor-pointer">
                        <RadioGroupItem value="plastic_wrap" id="plastic_wrap" data-testid="radio-packaging-plastic-wrap" />
                        <Label htmlFor="plastic_wrap" className="cursor-pointer text-sm flex-1">
                          <div className="font-medium">비닐탭포장</div>
                          <div className="text-xs text-muted-foreground">각 쿠키마다 +500원</div>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2 p-3 bg-card rounded-lg border border-input hover:bg-muted/50 transition-colors cursor-pointer">
                        <RadioGroupItem value="oil_paper" id="oil_paper" data-testid="radio-packaging-oil-paper" />
                        <Label htmlFor="oil_paper" className="cursor-pointer text-sm flex-1">
                          <div className="font-medium">유산지</div>
                          <div className="text-xs text-muted-foreground">무료</div>
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                  {!packaging && (
                    <p className="text-xs text-amber-600 mt-2 text-center font-medium">
                      ⚠️ 포장방법을 선택해야 쿠키를 고를 수 있습니다
                    </p>
                  )}
                </div>

                {/* Step 2: 쿠키 선택 (포장방법 선택 후에만 활성화) */}
                {packaging ? (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-center text-green-600">✓ 포장방법 선택완료! 이제 쿠키를 골라주세요</h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {cookieTypes.map((type) => (
                        <div key={type} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`cookie-${type}`}
                              checked={(regularCookies[type] || 0) > 0}
                              onCheckedChange={(checked) => {
                                updateRegularCookie(type, checked ? 1 : 0);
                              }}
                              data-testid={`checkbox-cookie-${type}`}
                            />
                            <Label htmlFor={`cookie-${type}`} className="text-sm font-medium">{type}</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-7 h-7 rounded-full p-0 text-xs"
                              onClick={() => updateRegularCookie(type, (regularCookies[type] || 0) - 1)}
                              data-testid={`button-decrease-${type}`}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              min={0}
                              value={regularCookies[type] || 0}
                              onChange={(e) => updateRegularCookie(type, Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-16 h-7 text-center text-sm"
                              data-testid={`input-quantity-${type}`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-7 h-7 rounded-full p-0 text-xs"
                              onClick={() => updateRegularCookie(type, (regularCookies[type] || 0) + 1)}
                              data-testid={`button-increase-${type}`}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">👆 먼저 위에서 포장방법을 선택해주세요</p>
                  </div>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* 2구 패키지 */}
          <Collapsible
            open={openSections.twopack}
            onOpenChange={(open) => setOpenSections(prev => ({ ...prev, twopack: open }))}
          >
            <div className="border border-border rounded-lg bg-card">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📦</span>
                  <div className="text-left">
                    <div className="font-semibold">2구 패키지</div>
                    <div className="text-sm text-muted-foreground">세트당 10,500원</div>
                  </div>
                  {twoPackSets.length > 0 && (
                    <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full ml-2">
                      {twoPackSets.length}세트
                    </div>
                  )}
                </div>
                {openSections.twopack ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>

              <CollapsibleContent className="px-4 pb-4">
                <div className="space-y-4">
                  {twoPackSets.map((set, index) => (
                    <div key={index} className="bg-accent/20 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-sm">세트 {index + 1} - 쿠키 2개 선택</h4>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-7 h-7 rounded-full p-0 text-xs"
                              onClick={() => updateTwoPackSet(index, 'quantity', Math.max(1, (set.quantity || 1) - 1))}
                              data-testid={`button-decrease-twopack-${index}`}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              min={1}
                              value={set.quantity || 1}
                              onChange={(e) => updateTwoPackSet(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-16 h-7 text-center text-sm"
                              data-testid={`input-quantity-twopack-${index}`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-7 h-7 rounded-full p-0 text-xs"
                              onClick={() => updateTwoPackSet(index, 'quantity', (set.quantity || 1) + 1)}
                              data-testid={`button-increase-twopack-${index}`}
                            >
                              +
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeTwoPackSet(index)}
                            data-testid={`button-remove-twopack-${index}`}
                          >
                            삭제
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mb-2">
                        {cookieTypes.map((type) => {
                          const isSelected = set.selectedCookies.includes(type);
                          return (
                            <div
                              key={type}
                              className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${isSelected
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-card hover:bg-muted/50'
                                }`}
                              onClick={() => toggleCookieInTwoPackSet(index, type)}
                              data-testid={`twopack-${index}-cookie-${type}`}
                            >
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isSelected
                                ? 'bg-white border-white'
                                : 'border-muted-foreground'
                                }`}>
                                {isSelected && (
                                  <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-xs">{type}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>선택됨: {set.selectedCookies.length}/2개</span>
                        {set.selectedCookies.length > 0 && (
                          <span className="text-primary font-medium">
                            {set.selectedCookies.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addTwoPackSet}
                    className="w-full"
                    data-testid="button-add-twopack-set"
                  >
                    + 2구 패키지 세트 추가
                  </Button>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* 1구 + 음료 */}
          <Collapsible
            open={openSections.singledrink}
            onOpenChange={(open) => setOpenSections(prev => ({ ...prev, singledrink: open }))}
          >
            <div className="border border-border rounded-lg bg-card">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🍪☕</span>
                  <div className="text-left">
                    <div className="font-semibold">1구+음료 (최소수량 12개)</div>
                    <div className="text-sm text-muted-foreground">세트당 11,000원</div>
                  </div>
                  {singleWithDrinkSets.length > 0 && (
                    <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full ml-2">
                      {singleWithDrinkSets.length}세트
                    </div>
                  )}
                </div>
                {openSections.singledrink ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>

              <CollapsibleContent className="px-4 pb-4">
                <div className="space-y-4">
                  {singleWithDrinkSets.map((set, index) => (
                    <div key={index} className="bg-accent/20 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-sm">세트 {index + 1} - 쿠키 + 음료</h4>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-7 h-7 rounded-full p-0 text-xs"
                              onClick={() => updateSingleWithDrinkSet(index, 'quantity', Math.max(1, (set.quantity || 1) - 1))}
                              data-testid={`button-decrease-single-drink-${index}`}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              min={1}
                              value={set.quantity || 1}
                              onChange={(e) => updateSingleWithDrinkSet(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-16 h-7 text-center text-sm"
                              data-testid={`input-quantity-single-drink-${index}`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-7 h-7 rounded-full p-0 text-xs"
                              onClick={() => updateSingleWithDrinkSet(index, 'quantity', (set.quantity || 1) + 1)}
                              data-testid={`button-increase-single-drink-${index}`}
                            >
                              +
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeSingleWithDrinkSet(index)}
                            data-testid={`button-remove-single-drink-${index}`}
                          >
                            삭제
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium mb-2 text-sm">쿠키 선택</h4>
                          <Select
                            value={set.selectedCookie}
                            onValueChange={(value) => updateSingleWithDrinkSet(index, 'selectedCookie', value)}
                          >
                            <SelectTrigger data-testid={`select-cookie-${index}`}>
                              <SelectValue placeholder="쿠키를 선택하세요" />
                            </SelectTrigger>
                            <SelectContent>
                              {cookieTypes.map((type) => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2 text-sm">음료 선택</h4>
                          <Select
                            value={set.selectedDrink}
                            onValueChange={(value) => updateSingleWithDrinkSet(index, 'selectedDrink', value)}
                          >
                            <SelectTrigger data-testid={`select-drink-${index}`}>
                              <SelectValue placeholder="음료를 선택하세요" />
                            </SelectTrigger>
                            <SelectContent>
                              {drinkTypes.map((type) => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {(set.selectedCookie || set.selectedDrink) && (
                          <div className="text-xs text-primary font-medium">
                            선택됨: {set.selectedCookie || '미선택'} + {set.selectedDrink || '미선택'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addSingleWithDrinkSet}
                    className="w-full"
                    data-testid="button-add-single-drink-set"
                  >
                    + 1구 + 음료 세트 추가
                  </Button>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Brownie Cookies */}
          <Collapsible
            open={openSections.brownie}
            onOpenChange={(open) => setOpenSections(prev => ({ ...prev, brownie: open }))}
          >
            <div className="border border-border rounded-lg bg-card">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🧸</span>
                  <div className="text-left">
                    <div className="font-semibold">브라우니쿠키(최소수량12개)</div>
                    <div className="text-sm text-muted-foreground">개당 7,800원</div>
                  </div>
                  {brownieCookieSets && brownieCookieSets.length > 0 && (
                    <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full ml-2">
                      {brownieCookieSets.reduce((sum, set) => sum + set.quantity, 0)}개
                    </div>
                  )}
                </div>
                {openSections.brownie ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>

              <CollapsibleContent className="px-4 pb-4">
                <div className="space-y-3">
                  {brownieCookieSets && brownieCookieSets.map((set, index) => (
                    <div key={index} className="border border-muted rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-sm">브라우니 세트 {index + 1}</h5>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-7 h-7 rounded-full p-0 text-xs"
                            onClick={() => updateBrownieCookieSet(index, 'quantity', Math.max(1, set.quantity - 1))}
                            data-testid={`button-decrease-brownie-${index}`}
                          >
                            -
                          </Button>
                          <Input
                            type="number"
                            min={1}
                            value={set.quantity}
                            onChange={(e) => updateBrownieCookieSet(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 h-7 text-center text-sm"
                            data-testid={`input-quantity-brownie-${index}`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-7 h-7 rounded-full p-0 text-xs"
                            onClick={() => updateBrownieCookieSet(index, 'quantity', set.quantity + 1)}
                            data-testid={`button-increase-brownie-${index}`}
                          >
                            +
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeBrownieCookieSet(index)}
                            data-testid={`button-remove-brownie-${index}`}
                          >
                            삭제
                          </Button>
                        </div>
                      </div>

                      {/* Shape Selection */}
                      <div className="bg-accent/20 rounded-lg p-3 mb-3">
                        <h6 className="font-medium mb-2 text-xs">쿠키 모양</h6>
                        <RadioGroup
                          value={set.shape}
                          onValueChange={(value) => updateBrownieCookieSet(index, 'shape', value)}
                        >
                          <div className="grid grid-cols-2 gap-2">
                            <Label
                              htmlFor={`bear-${index}`}
                              className="flex items-center space-x-2 p-2 bg-card rounded cursor-pointer hover:bg-accent/30 transition-colors relative z-10"
                            >
                              <RadioGroupItem value="bear" id={`bear-${index}`} data-testid={`radio-shape-bear-${index}`} />
                              <span className="cursor-pointer text-xs">곰돌이</span>
                            </Label>
                            <Label
                              htmlFor={`rabbit-${index}`}
                              className="flex items-center space-x-2 p-2 bg-card rounded cursor-pointer hover:bg-accent/30 transition-colors relative z-10"
                            >
                              <RadioGroupItem value="rabbit" id={`rabbit-${index}`} data-testid={`radio-shape-rabbit-${index}`} />
                              <span className="cursor-pointer text-xs">토끼</span>
                            </Label>
                            <Label
                              htmlFor={`birthdayBear-${index}`}
                              className="flex items-center space-x-2 p-2 bg-card rounded cursor-pointer hover:bg-accent/30 transition-colors relative z-10"
                            >
                              <RadioGroupItem value="birthdayBear" id={`birthdayBear-${index}`} data-testid={`radio-shape-birthday-bear-${index}`} />
                              <span className="cursor-pointer text-xs">생일곰 (+500원)</span>
                            </Label>
                            <Label
                              htmlFor={`tiger-${index}`}
                              className="flex items-center space-x-2 p-2 bg-card rounded cursor-pointer hover:bg-accent/30 transition-colors relative z-10"
                            >
                              <RadioGroupItem value="tiger" id={`tiger-${index}`} data-testid={`radio-shape-tiger-${index}`} />
                              <span className="cursor-pointer text-xs">호랑이</span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* Custom Options */}
                      <div className="bg-accent/20 rounded-lg p-3">
                        <h6 className="font-medium mb-2 text-xs">커스텀 옵션</h6>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2 p-2 bg-card rounded hover:bg-accent/30 transition-colors">
                            <Checkbox
                              id={`customSticker-${index}`}
                              checked={set.customSticker}
                              onCheckedChange={(checked) => updateBrownieCookieSet(index, 'customSticker', checked)}
                              data-testid={`checkbox-custom-sticker-${index}`}
                            />
                            <Label htmlFor={`customSticker-${index}`} className="cursor-pointer text-xs">
                              <div className="font-medium">하단 스티커 제작</div>
                              <div className="text-xs text-muted-foreground">+15,000원</div>
                            </Label>
                          </div>

                          <div className="bg-card rounded p-2">
                            <div className="flex items-start gap-2">
                              <Checkbox
                                id={`heartMessage-${index}`}
                                checked={!!set.heartMessage}
                                onCheckedChange={(checked) => {
                                  updateBrownieCookieSet(index, 'heartMessage', checked ? '' : undefined);
                                }}
                                data-testid={`checkbox-heart-message-${index}`}
                              />
                              <div className="flex-1">
                                <Label htmlFor={`heartMessage-${index}`} className="font-medium mb-1 block cursor-pointer text-xs">
                                  하트 안 문구 (+500원)
                                </Label>
                                <Input
                                  type="text"
                                  placeholder="한글 2자 또는 영문 4자"
                                  value={set.heartMessage || ''}
                                  onChange={(e) => updateBrownieCookieSet(index, 'heartMessage', e.target.value)}
                                  className="w-full text-xs h-7"
                                  maxLength={4}
                                  disabled={!set.heartMessage && set.heartMessage !== ''}
                                  data-testid={`input-heart-message-${index}`}
                                />
                                <div className="text-xs text-muted-foreground mt-1">예: 사랑, LOVE</div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-start gap-2 p-2 bg-card rounded hover:bg-accent/30 transition-colors">
                            <Checkbox
                              id={`customTopper-${index}`}
                              checked={set.customTopper}
                              onCheckedChange={(checked) => updateBrownieCookieSet(index, 'customTopper', checked)}
                              data-testid={`checkbox-custom-topper-${index}`}
                            />
                            <Label htmlFor={`customTopper-${index}`} className="cursor-pointer text-xs">
                              <div className="font-medium">토퍼 제작</div>
                              <div className="text-xs text-muted-foreground">문의 필요</div>
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addBrownieCookieSet}
                    className="w-full"
                    data-testid="button-add-brownie-set"
                  >
                    + 브라우니쿠키 세트 추가
                  </Button>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Fortune Cookies */}
          <Collapsible
            open={openSections.fortune}
            onOpenChange={(open) => setOpenSections(prev => ({ ...prev, fortune: open }))}
          >
            <div className="border border-border rounded-lg bg-card">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥠</span>
                  <div className="text-left">
                    <div className="font-semibold">행운쿠키</div>
                    <div className="text-sm text-muted-foreground">박스당 17,000원</div>
                  </div>
                  {fortuneCookie > 0 && (
                    <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full ml-2">
                      {fortuneCookie}박스
                    </div>
                  )}
                </div>
                {openSections.fortune ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>

              <CollapsibleContent className="px-4 pb-4">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="fortune-cookie"
                      checked={fortuneCookie > 0}
                      onCheckedChange={(checked) => {
                        onUpdate('fortuneCookie', checked ? 1 : 0);
                      }}
                      data-testid="checkbox-fortune-cookie"
                    />
                    <Label htmlFor="fortune-cookie" className="text-sm font-medium">행운쿠키 (박스)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-7 h-7 rounded-full p-0 text-xs"
                      onClick={() => onUpdate('fortuneCookie', Math.max(0, fortuneCookie - 1))}
                      data-testid="button-decrease-fortune"
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      min={0}
                      value={fortuneCookie}
                      onChange={(e) => onUpdate('fortuneCookie', Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-16 h-7 text-center text-sm"
                      data-testid="input-quantity-fortune"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-7 h-7 rounded-full p-0 text-xs"
                      onClick={() => onUpdate('fortuneCookie', fortuneCookie + 1)}
                      data-testid="button-increase-fortune"
                    >
                      +
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Airplane Sandwich Cookies */}
          <Collapsible
            open={openSections.airplane}
            onOpenChange={(open) => setOpenSections(prev => ({ ...prev, airplane: open }))}
          >
            <div className="border border-border rounded-lg bg-card">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✈️</span>
                  <div className="text-left">
                    <div className="font-semibold">비행기샌드쿠키</div>
                    <div className="text-sm text-muted-foreground">박스당 22,000원</div>
                  </div>
                  {airplaneSandwich > 0 && (
                    <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full ml-2">
                      {airplaneSandwich}박스
                    </div>
                  )}
                </div>
                {openSections.airplane ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>

              <CollapsibleContent className="px-4 pb-4">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="airplane-sandwich"
                      checked={airplaneSandwich > 0}
                      onCheckedChange={(checked) => {
                        onUpdate('airplaneSandwich', checked ? 1 : 0);
                      }}
                      data-testid="checkbox-airplane-sandwich"
                    />
                    <Label htmlFor="airplane-sandwich" className="text-sm font-medium">비행기샌드쿠키 (박스)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-7 h-7 rounded-full p-0 text-xs"
                      onClick={() => onUpdate('airplaneSandwich', Math.max(0, airplaneSandwich - 1))}
                      data-testid="button-decrease-airplane"
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      min={0}
                      value={airplaneSandwich}
                      onChange={(e) => onUpdate('airplaneSandwich', Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-16 h-7 text-center text-sm"
                      data-testid="input-quantity-airplane"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-7 h-7 rounded-full p-0 text-xs"
                      onClick={() => onUpdate('airplaneSandwich', airplaneSandwich + 1)}
                      data-testid="button-increase-airplane"
                    >
                      +
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Scones */}
          <Collapsible
            open={openSections.scone}
            onOpenChange={(open) => setOpenSections(prev => ({ ...prev, scone: open }))}
          >
            <div className="border border-border rounded-lg bg-card">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥐</span>
                  <div className="text-left">
                    <div className="font-semibold">스콘 (최소수량 12개)</div>
                    <div className="text-sm text-muted-foreground">개당 5,000원 (딸기잼 +500원)</div>
                  </div>
                  {sconeSets && sconeSets.length > 0 && (
                    <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full ml-2">
                      {sconeSets.reduce((sum, set) => sum + set.quantity, 0)}개
                    </div>
                  )}
                </div>
                {openSections.scone ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>

              <CollapsibleContent className="px-4 pb-4">
                <div className="space-y-3">
                  {sconeSets && sconeSets.map((set, index) => (
                    <div key={index} className="p-3 bg-muted/30 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">스콘 세트 {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSconeSet(index)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-remove-scone-${index}`}
                        >
                          삭제
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">맛 선택</Label>
                        <RadioGroup
                          value={set.flavor}
                          onValueChange={(value) => updateSconeSet(index, 'flavor', value)}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="chocolate" id={`scone-chocolate-${index}`} data-testid={`radio-scone-chocolate-${index}`} />
                            <Label htmlFor={`scone-chocolate-${index}`} className="text-sm">초코맛</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="gourmetButter" id={`scone-butter-${index}`} data-testid={`radio-scone-butter-${index}`} />
                            <Label htmlFor={`scone-butter-${index}`} className="text-sm">고메버터맛</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label className="text-sm">수량</Label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-7 h-7 rounded-full p-0 text-xs"
                            onClick={() => updateSconeSet(index, 'quantity', Math.max(1, set.quantity - 1))}
                            data-testid={`button-decrease-scone-${index}`}
                          >
                            -
                          </Button>
                          <Input
                            type="number"
                            min={1}
                            value={set.quantity}
                            onChange={(e) => updateSconeSet(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 h-7 text-center text-sm"
                            data-testid={`input-quantity-scone-${index}`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-7 h-7 rounded-full p-0 text-xs"
                            onClick={() => updateSconeSet(index, 'quantity', set.quantity + 1)}
                            data-testid={`button-increase-scone-${index}`}
                          >
                            +
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`scone-jam-${index}`}
                          checked={set.strawberryJam}
                          onCheckedChange={(checked) => updateSconeSet(index, 'strawberryJam', checked)}
                          data-testid={`checkbox-scone-jam-${index}`}
                        />
                        <Label htmlFor={`scone-jam-${index}`} className="text-sm">딸기잼 추가 (+500원/개)</Label>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addSconeSet}
                    className="w-full"
                    data-testid="button-add-scone-set"
                  >
                    + 스콘 세트 추가
                  </Button>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
}
