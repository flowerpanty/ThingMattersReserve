import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { orderDataSchema, type OrderData } from '@shared/schema';

const initialFormData: OrderData = {
  customerName: '',
  customerContact: '',
  customerPhone: '',
  deliveryDate: '',
  deliveryMethod: 'pickup',
  pickupTime: '',
  deliveryAddress: '',
  regularCookies: {},
  packaging: undefined,
  brownieCookieSets: [],
  twoPackSets: [],
  singleWithDrinkSets: [],
  sconeSets: [],
  fortuneCookie: 0,
  airplaneSandwich: 0,
};

const initialPricing = {
  regularCookies: 0,
  twoPackSet: 0,
  singleWithDrink: 0,
  packaging: 0,
  brownie: 0,
  scone: 0,
  fortune: 0,
  airplane: 0,
  total: 0,
};

export function useOrderForm() {
  const [formData, setFormData] = useState<OrderData>(initialFormData);
  const [pricing, setPricing] = useState(initialPricing);
  const [showKakaoModal, setShowKakaoModal] = useState(false);
  const { toast } = useToast();

  // Calculate pricing whenever form data changes
  const { mutate: calculatePrice } = useMutation({
    mutationFn: async (data: OrderData) => {
      const response = await apiRequest('POST', '/api/calculate-price', data);
      return response.json();
    },
    onSuccess: (data) => {
      setPricing({
        regularCookies: data.breakdown.regularCookies || 0,
        twoPackSet: data.breakdown.twoPackSet || 0,
        singleWithDrink: data.breakdown.singleWithDrink || 0,
        packaging: data.breakdown.packaging || 0,
        brownie: data.breakdown.brownie || 0,
        scone: data.breakdown.scone || 0,
        fortune: data.breakdown.fortune || 0,
        airplane: data.breakdown.airplane || 0,
        total: data.totalPrice,
      });
    },
    onError: (error) => {
      console.error('Price calculation error:', error);
    },
  });

  // Generate quote mutation
  const { mutate: generateQuote, isPending: isSubmitting } = useMutation({
    mutationFn: async (data: OrderData) => {
      const response = await apiRequest('POST', '/api/generate-quote', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "견적서 전송 완료",
        description: data.message,
      });
      // Show Kakao consultation modal
      setShowKakaoModal(true);
      // Reset form after successful submission
      setFormData(initialFormData);
      setPricing(initialPricing);
    },
    onError: (error: any) => {
      toast({
        title: "오류 발생",
        description: error.message || "견적서 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 초기 데이터 로드
  useEffect(() => {
    const savedData = localStorage.getItem('orderFormData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        // 날짜가 과거인 경우 무시
        const today = new Date().toISOString().split('T')[0];
        if (parsed.deliveryDate && parsed.deliveryDate <= today) {
          // 과거 날짜는 제거
          delete parsed.deliveryDate;
        }
        // 유효한 데이터만 로드
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to load saved form data', e);
      }
    }
  }, []);

  // 폼 데이터 변경 시 저장
  useEffect(() => {
    localStorage.setItem('orderFormData', JSON.stringify(formData));
  }, [formData]);

  const updateFormData = useCallback((field: keyof OrderData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const updateRegularCookie = useCallback((type: string, qty: number) => {
    setFormData(prev => ({
      ...prev,
      regularCookies: {
        ...prev.regularCookies,
        [type]: qty
      }
    }));
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    console.log('폼 제출 시도:', formData);

    try {
      // Validate form data
      const validatedData = orderDataSchema.parse(formData);
      console.log('검증된 데이터:', validatedData);

      // Check if at least one product is selected
      const hasProducts =
        Object.values(validatedData.regularCookies).some(qty => qty > 0) ||
        validatedData.brownieCookieSets.length > 0 ||
        validatedData.twoPackSets.length > 0 ||
        validatedData.singleWithDrinkSets.length > 0 ||
        validatedData.sconeSets.length > 0 ||
        validatedData.fortuneCookie > 0 ||
        validatedData.airplaneSandwich > 0;

      if (!hasProducts) {
        toast({
          title: "제품을 선택해주세요",
          description: "최소 하나 이상의 제품을 선택해야 합니다.",
          variant: "destructive",
        });
        return;
      }

      // Check minimum quantity for 1구+음료 (minimum 12)
      const totalSingleWithDrinkQuantity = validatedData.singleWithDrinkSets.reduce((sum, set) => sum + set.quantity, 0);
      if (totalSingleWithDrinkQuantity > 0 && totalSingleWithDrinkQuantity < 12) {
        toast({
          title: "수량 확인",
          description: "1구+음료는 최소 12개 이상 주문해주세요.",
          variant: "destructive",
        });
        return;
      }

      // Check minimum quantity for 브라우니쿠키 (minimum 12)
      const totalBrownieQuantity = validatedData.brownieCookieSets.reduce((sum, set) => sum + set.quantity, 0);
      if (totalBrownieQuantity > 0 && totalBrownieQuantity < 12) {
        toast({
          title: "수량 확인",
          description: "브라우니쿠키는 최소 12개 이상 주문해주세요.",
          variant: "destructive",
        });
        return;
      }

      // Check minimum quantity for 스콘 (minimum 12)
      const totalSconeQuantity = validatedData.sconeSets.reduce((sum, set) => sum + set.quantity, 0);
      if (totalSconeQuantity > 0 && totalSconeQuantity < 12) {
        toast({
          title: "수량 확인",
          description: "스콘은 최소 12개 이상 주문해주세요.",
          variant: "destructive",
        });
        return;
      }

      // Check if delivery date is not today
      const today = new Date().toISOString().split('T')[0];
      if (validatedData.deliveryDate <= today) {
        toast({
          title: "날짜 확인",
          description: "당일 예약은 불가능합니다. 내일 이후 날짜를 선택해주세요.",
          variant: "destructive",
        });
        return;
      }

      generateQuote(validatedData);
    } catch (error: any) {
      const firstError = error.issues?.[0];
      toast({
        title: "입력 오류",
        description: firstError?.message || "입력 정보를 확인해주세요.",
        variant: "destructive",
      });
    }
  }, [formData, generateQuote, toast]);

  // Calculate price whenever form data changes
  useEffect(() => {
    const timer = setTimeout(() => {
      calculatePrice(formData);
    }, 300); // Debounce for 300ms

    return () => clearTimeout(timer);
  }, [formData, calculatePrice]);

  return {
    formData,
    pricing,
    updateFormData,
    handleSubmit,
    isSubmitting,
    showKakaoModal,
    setShowKakaoModal,
  };
}
