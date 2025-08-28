import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, Loader2 } from "lucide-react";

interface OrderActionsProps {
  isSubmitting: boolean;
}

export function OrderActions({ isSubmitting }: OrderActionsProps) {
  return (
    <div className="mt-8 p-6 bg-card/30 rounded-lg border">
      <p className="text-center text-sm text-muted-foreground mb-4">
        견적서 확인 후 카카오톡으로 최종 상담을 진행해주세요
      </p>
      
      <div className="flex flex-col gap-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-colors"
          data-testid="button-generate-quote"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              견적서 생성 중...
            </>
          ) : (
            <>
              📄 견적서 받기
            </>
          )}
        </Button>
        
        <a
          href="https://pf.kakao.com/_QdCaK/98027924"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full py-4 px-6 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold rounded-lg transition-colors"
          data-testid="button-kakao-consultation"
        >
          💬 카카오톡 상담하기
        </a>
        
        <a
          href="https://nothingmatters.kr"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 w-full py-4 px-6 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold rounded-lg transition-colors"
          data-testid="button-home"
        >
          🏠 nothingmatters
        </a>
      </div>
    </div>
  );
}
