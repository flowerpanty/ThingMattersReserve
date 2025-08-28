import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, Loader2 } from "lucide-react";

interface OrderActionsProps {
  isSubmitting: boolean;
}

export function OrderActions({ isSubmitting }: OrderActionsProps) {
  const handleKakaoConsultation = () => {
    // Open KakaoTalk channel for consultation
    window.open('https://pf.kakao.com/_your_channel', '_blank');
  };

  return (
    <div className="space-y-4">
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-4 px-6 btn-primary text-primary-foreground font-semibold rounded-lg card-shadow"
        data-testid="button-generate-quote"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            견적서 생성 중...
          </>
        ) : (
          <>
            <Mail className="w-4 h-4 mr-2" />
            📧 견적서 받기
          </>
        )}
      </Button>
      
      <Button
        type="button"
        onClick={handleKakaoConsultation}
        className="w-full py-4 px-6 kakao-btn text-black font-semibold rounded-lg card-shadow flex items-center justify-center gap-2"
        data-testid="button-kakao-consultation"
      >
        <MessageCircle className="w-4 h-4" />
        💬 카카오톡 상담하기
      </Button>
      
      <p className="text-center text-sm text-muted-foreground">
        견적서 확인 후 카카오톡으로 최종 상담을 진행해주세요
      </p>
    </div>
  );
}
