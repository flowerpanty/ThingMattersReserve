import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, Loader2 } from "lucide-react";

interface OrderActionsProps {
  isSubmitting: boolean;
}

export function OrderActions({ isSubmitting }: OrderActionsProps) {
  return (
    <div className="space-y-6">
      {/* 견적서 받기 메인 섹션 */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-8 border-2 border-primary/20">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-primary mb-2">📋 견적서 요청</h3>
          <p className="text-sm text-muted-foreground">
            견적서 확인후 카카오톡으로 최종상담 진행
          </p>
        </div>
        
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-8 px-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xl rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
          data-testid="button-generate-quote"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-6 h-6 mr-3 animate-spin" />
              견적서 생성 중...
            </>
          ) : (
            <>
              📄 견적서 받기
            </>
          )}
        </Button>
      </div>
      
      {/* 추가 행동 버튼들 */}
      <div className="bg-card/30 rounded-lg p-6 border">
        <p className="text-center text-sm text-muted-foreground mb-4">
          기타 문의 및 정보
        </p>
        
        <div className="flex flex-col gap-3">
          <a
            href="https://pf.kakao.com/_QdCaK"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-6 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-medium rounded-lg transition-colors"
            data-testid="button-kakao-consultation"
          >
            💬 카카오톡 상담하기
          </a>
          
          <a
            href="https://nothingmatters.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-6 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium rounded-lg transition-colors"
            data-testid="button-home"
          >
            🏠 nothingmatters
          </a>
        </div>
      </div>
    </div>
  );
}