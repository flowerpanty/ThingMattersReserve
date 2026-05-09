import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

interface OrderActionsProps {
  isSubmitting: boolean;
}

export function OrderActions({ isSubmitting }: OrderActionsProps) {
  const shouldReduce = useReducedMotion();

  return (
    <div className="space-y-6">
      <div className="crayon-card" style={{ background: "hsl(195, 80%, 92%)" }}>
        <div className="mb-6 text-center">
          <div className="section-badge">🎀 마지막 단계</div>
          <h3 className="mb-2 text-2xl font-black text-[#1a1a1a]">견적서 요청</h3>
          <p className="text-base font-bold text-gray-700">
            버튼을 누르면 견적서가 생성되고, 이후 카카오톡으로 최종 상담을 이어갑니다.
          </p>
        </div>

        <motion.div
          whileHover={shouldReduce ? undefined : { scale: 1.02 }}
          whileTap={shouldReduce ? undefined : { scale: 0.97 }}
          transition={{ type: "spring", stiffness: 350, damping: 24 }}
        >
          <Button
            type="submit"
            disabled={isSubmitting}
            className="crayon-btn crayon-btn-pink w-full px-10 py-5 text-xl disabled:opacity-60"
            data-testid="button-generate-quote"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                견적서 생성 중...
              </>
            ) : (
              <>✨ 견적서 받기</>
            )}
          </Button>
        </motion.div>
      </div>

      <div className="crayon-card bg-white">
        <p className="mb-4 text-center text-base font-black text-[#1a1a1a]">
          기타 문의 및 정보
        </p>

        <div className="flex flex-col gap-3">
          <motion.a
            href="https://pf.kakao.com/_QdCaK"
            target="_blank"
            rel="noopener noreferrer"
            whileTap={shouldReduce ? undefined : { scale: 0.97 }}
            className="crayon-btn crayon-btn-yellow w-full"
            data-testid="button-kakao-consultation"
          >
            💬 카카오톡 상담하기
          </motion.a>

          <motion.a
            href="https://nothingmatters.kr"
            target="_blank"
            rel="noopener noreferrer"
            whileTap={shouldReduce ? undefined : { scale: 0.97 }}
            className="crayon-btn w-full bg-white text-[#1a1a1a]"
            data-testid="button-home"
          >
            🏠 nothingmatters
          </motion.a>
        </div>
      </div>
    </div>
  );
}
