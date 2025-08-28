import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { orderDataSchema, type OrderData } from '@shared/schema';

const initialFormData: OrderData = {
  customerName: '',
  customerContact: '',
  deliveryDate: '',
  deliveryMethod: 'pickup',
  regularCookies: {},
  packaging: undefined,
  brownieCookieSets: [],
  twoPackSets: [],
  singleWithDrinkSets: [],
  fortuneCookie: 0,
  airplaneSandwich: 0,
};

const initialPricing = {
  regularCookies: 0,
  twoPackSet: 0,
  singleWithDrink: 0,
  packaging: 0,
  brownie: 0,
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

  const updateFormData = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate form data
      const validatedData = orderDataSchema.parse(formData);
      
      // Check if at least one product is selected
      const hasProducts = 
        Object.values(validatedData.regularCookies).some(qty => qty > 0) ||
        validatedData.brownieCookie.quantity > 0 ||
        validatedData.twoPackSets.length > 0 ||
        validatedData.singleWithDrinkSets.length > 0 ||
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
