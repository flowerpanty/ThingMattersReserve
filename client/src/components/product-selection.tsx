import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cookieTypes, drinkTypes } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProductSelectionProps {
  regularCookies: Record<string, number>;
  packaging?: string;
  brownieCookie: {
    quantity: number;
    shape?: string;
    customSticker: boolean;
    heartMessage?: string;
    customTopper: boolean;
  };
  twoPackSets: {
    selectedCookies: string[];
    quantity: number;
  }[];
  singleWithDrinkSets: {
    selectedCookie: string;
    selectedDrink: string;
    quantity: number;
  }[];
  fortuneCookie: number;
  airplaneSandwich: number;
  onUpdate: (field: string, value: any) => void;
}

export function ProductSelection({ 
  regularCookies, 
  packaging, 
  brownieCookie,
  twoPackSets,
  singleWithDrinkSets,
  fortuneCookie, 
  airplaneSandwich, 
  onUpdate 
}: ProductSelectionProps) {
  
  const [openSections, setOpenSections] = useState({
    regular: false,
    twopack: false,
    singledrink: false,
    brownie: false,
    fortune: false,
    airplane: false
  });

  const updateRegularCookie = (type: string, quantity: number) => {
    onUpdate('regularCookies', { ...regularCookies, [type]: Math.max(0, quantity) });
  };

  const updateBrownieCookie = (field: string, value: any) => {
    onUpdate('brownieCookie', { ...brownieCookie, [field]: value });
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

  const toggleCookieInTwoPackSet = (setIndex: number, cookieType: string) => {
    const currentSet = twoPackSets[setIndex];
    const currentCookies = currentSet?.selectedCookies || [];
    let newCookies;
    if (currentCookies.includes(cookieType)) {
      newCookies = currentCookies.filter(c => c !== cookieType);
    } else if (currentCookies.length < 2) {
      newCookies = [...currentCookies, cookieType];
    } else {
      return; // 최대 2개까지만
    }
    updateTwoPackSet(setIndex, 'selectedCookies', newCookies);
  };

  const hasRegularCookies = Object.values(regularCookies).some(qty => qty > 0);
  const regularCookieTotal = Object.values(regularCookies).reduce((sum, qty) => sum + qty, 0);

  return (
    <Card className="card-shadow">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <span className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">3</span>
          제품 선택
        </h2>

        <div className="space-y-4">
          {/* Regular Cookies */}
          <Collapsible 
            open={openSections.regular} 
            onOpenChange={(open) => setOpenSections({...openSections, regular: open})}
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
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
                        <span className="w-8 text-center text-sm font-medium" data-testid={`quantity-${type}`}>
                          {regularCookies[type] || 0}
                        </span>
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

                {/* Packaging Options */}
                {hasRegularCookies && (
                  <div className="bg-accent/20 rounded-lg p-3">
                    <h4 className="font-medium mb-3 text-sm">포장 옵션</h4>
                    <RadioGroup value={packaging} onValueChange={(value) => onUpdate('packaging', value)}>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="flex items-center space-x-2 p-2 bg-card rounded hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value="single_box" id="single_box" data-testid="radio-packaging-single-box" />
                          <Label htmlFor="single_box" className="cursor-pointer text-sm">
                            <div className="font-medium">1구박스</div>
                            <div className="text-xs text-muted-foreground">+500원</div>
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2 p-2 bg-card rounded hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value="plastic_wrap" id="plastic_wrap" data-testid="radio-packaging-plastic-wrap" />
                          <Label htmlFor="plastic_wrap" className="cursor-pointer text-sm">
                            <div className="font-medium">비닐탭포장</div>
                            <div className="text-xs text-muted-foreground">+500원</div>
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2 p-2 bg-card rounded hover:bg-muted/50 transition-colors">
                          <RadioGroupItem value="oil_paper" id="oil_paper" data-testid="radio-packaging-oil-paper" />
                          <Label htmlFor="oil_paper" className="cursor-pointer text-sm">
                            <div className="font-medium">유산지</div>
                            <div className="text-xs text-muted-foreground">무료</div>
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* 2구 패키지 */}
          <Collapsible 
            open={openSections.twopack} 
            onOpenChange={(open) => setOpenSections({...openSections, twopack: open})}
          >
            <div className="border border-border rounded-lg bg-card">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📦</span>
                  <div className="text-left">
                    <div className="font-semibold">2구 패키지</div>
                    <div className="text-sm text-muted-foreground">세트당 9,000원</div>
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
                            <span className="w-8 text-center text-sm font-medium" data-testid={`quantity-twopack-${index}`}>
                              {set.quantity || 1}
                            </span>
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
                        {cookieTypes.map((type) => (
                          <div 
                            key={type} 
                            className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                              set.selectedCookies.includes(type) 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-card hover:bg-muted/50'
                            }`}
                            onClick={() => toggleCookieInTwoPackSet(index, type)}
                            data-testid={`twopack-${index}-cookie-${type}`}
                          >
                            <Checkbox
                              checked={set.selectedCookies.includes(type)}
                              className="pointer-events-none"
                            />
                            <span className="text-xs">{type}</span>
                          </div>
                        ))}
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
            onOpenChange={(open) => setOpenSections({...openSections, singledrink: open})}
          >
            <div className="border border-border rounded-lg bg-card">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🍪☕</span>
                  <div className="text-left">
                    <div className="font-semibold">1구 + 음료</div>
                    <div className="text-sm text-muted-foreground">세트당 8,500원</div>
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
                            <span className="w-8 text-center text-sm font-medium" data-testid={`quantity-single-drink-${index}`}>
                              {set.quantity || 1}
                            </span>
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
            onOpenChange={(open) => setOpenSections({...openSections, brownie: open})}
          >
            <div className="border border-border rounded-lg bg-card">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🧸</span>
                  <div className="text-left">
                    <div className="font-semibold">브라우니쿠키</div>
                    <div className="text-sm text-muted-foreground">개당 7,800원</div>
                  </div>
                  {brownieCookie.quantity > 0 && (
                    <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full ml-2">
                      {brownieCookie.quantity}개
                    </div>
                  )}
                </div>
                {openSections.brownie ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
              
              <CollapsibleContent className="px-4 pb-4">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg mb-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="brownie-cookie"
                      checked={brownieCookie.quantity > 0}
                      onCheckedChange={(checked) => {
                        updateBrownieCookie('quantity', checked ? 1 : 0);
                      }}
                      data-testid="checkbox-brownie-cookie"
                    />
                    <Label htmlFor="brownie-cookie" className="text-sm font-medium">브라우니쿠키</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-7 h-7 rounded-full p-0 text-xs"
                      onClick={() => updateBrownieCookie('quantity', Math.max(0, brownieCookie.quantity - 1))}
                      data-testid="button-decrease-brownie"
                    >
                      -
                    </Button>
                    <span className="w-8 text-center text-sm font-medium" data-testid="quantity-brownie">
                      {brownieCookie.quantity}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-7 h-7 rounded-full p-0 text-xs"
                      onClick={() => updateBrownieCookie('quantity', brownieCookie.quantity + 1)}
                      data-testid="button-increase-brownie"
                    >
                      +
                    </Button>
                  </div>
                </div>
                
                {/* Brownie Cookie Options */}
                {brownieCookie.quantity > 0 && (
                  <div className="space-y-3">
                    {/* Shape Selection */}
                    <div className="bg-accent/20 rounded-lg p-3">
                      <h5 className="font-medium mb-2 text-sm">쿠키 모양</h5>
                      <RadioGroup 
                        value={brownieCookie.shape} 
                        onValueChange={(value) => updateBrownieCookie('shape', value)}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div className="flex items-center space-x-2 p-2 bg-card rounded cursor-pointer hover:bg-accent/30 transition-colors">
                            <RadioGroupItem value="bear" id="bear" data-testid="radio-shape-bear" />
                            <Label htmlFor="bear" className="cursor-pointer text-sm">곰돌이</Label>
                          </div>
                          <div className="flex items-center space-x-2 p-2 bg-card rounded cursor-pointer hover:bg-accent/30 transition-colors">
                            <RadioGroupItem value="rabbit" id="rabbit" data-testid="radio-shape-rabbit" />
                            <Label htmlFor="rabbit" className="cursor-pointer text-sm">토끼</Label>
                          </div>
                          <div className="flex items-center space-x-2 p-2 bg-card rounded cursor-pointer hover:bg-accent/30 transition-colors">
                            <RadioGroupItem value="birthdayBear" id="birthdayBear" data-testid="radio-shape-birthday-bear" />
                            <Label htmlFor="birthdayBear" className="cursor-pointer text-sm">생일곰 (+500원)</Label>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    {/* Custom Options */}
                    <div className="bg-accent/20 rounded-lg p-3">
                      <h5 className="font-medium mb-2 text-sm">커스텀 옵션</h5>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 p-2 bg-card rounded hover:bg-accent/30 transition-colors">
                          <Checkbox
                            id="customSticker"
                            checked={brownieCookie.customSticker}
                            onCheckedChange={(checked) => updateBrownieCookie('customSticker', checked)}
                            data-testid="checkbox-custom-sticker"
                          />
                          <Label htmlFor="customSticker" className="cursor-pointer text-sm">
                            <div className="font-medium">하단 스티커 제작</div>
                            <div className="text-xs text-muted-foreground">+15,000원</div>
                          </Label>
                        </div>
                        
                        <div className="bg-card rounded p-2">
                          <div className="flex items-start gap-2">
                            <Checkbox
                              id="heartMessage"
                              checked={!!brownieCookie.heartMessage}
                              onCheckedChange={(checked) => {
                                updateBrownieCookie('heartMessage', checked ? '' : undefined);
                              }}
                              data-testid="checkbox-heart-message"
                            />
                            <div className="flex-1">
                              <Label htmlFor="heartMessage" className="font-medium mb-1 block cursor-pointer text-sm">
                                하트 안 문구 (+500원)
                              </Label>
                              <Input
                                type="text"
                                placeholder="한글 2자 또는 영문 4자"
                                value={brownieCookie.heartMessage || ''}
                                onChange={(e) => updateBrownieCookie('heartMessage', e.target.value)}
                                className="w-full text-xs h-8"
                                maxLength={4}
                                disabled={!brownieCookie.heartMessage && brownieCookie.heartMessage !== ''}
                                data-testid="input-heart-message"
                              />
                              <div className="text-xs text-muted-foreground mt-1">예: 사랑, LOVE</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2 p-2 bg-card rounded hover:bg-accent/30 transition-colors">
                          <Checkbox
                            id="customTopper"
                            checked={brownieCookie.customTopper}
                            onCheckedChange={(checked) => updateBrownieCookie('customTopper', checked)}
                            data-testid="checkbox-custom-topper"
                          />
                          <Label htmlFor="customTopper" className="cursor-pointer text-sm">
                            <div className="font-medium">토퍼 제작</div>
                            <div className="text-xs text-muted-foreground">문의 필요</div>
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Fortune Cookies */}
          <Collapsible 
            open={openSections.fortune} 
            onOpenChange={(open) => setOpenSections({...openSections, fortune: open})}
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
                    <span className="w-8 text-center text-sm font-medium" data-testid="quantity-fortune">
                      {fortuneCookie}
                    </span>
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
            onOpenChange={(open) => setOpenSections({...openSections, airplane: open})}
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
                    <span className="w-8 text-center text-sm font-medium" data-testid="quantity-airplane">
                      {airplaneSandwich}
                    </span>
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
        </div>
      </CardContent>
    </Card>
  );
}
