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
      <div className="cute-card border-rose-100 bg-gradient-to-r from-rose-50 to-orange-50 p-8">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-xs font-black text-rose-500">
            🎀 마지막 단계
          </div>
          <h3 className="mb-2 text-xl font-black text-[#7b3f3f]">견적서 요청</h3>
          <p className="text-sm font-medium text-muted-foreground">
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
            className="cta-shimmer min-h-[64px] w-full rounded-full px-10 py-5 text-xl font-black text-white shadow-[var(--shadow-btn)] disabled:opacity-60"
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

      <div className="cute-card bg-white/60 p-6">
        <p className="mb-4 text-center text-sm font-black text-[#7b3f3f]">
          기타 문의 및 정보
        </p>

        <div className="flex flex-col gap-3">
          <motion.a
            href="https://pf.kakao.com/_QdCaK"
            target="_blank"
            rel="noopener noreferrer"
            whileTap={shouldReduce ? undefined : { scale: 0.97 }}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-yellow-300 px-6 py-3 font-black text-yellow-950 transition-colors hover:bg-yellow-400"
            data-testid="button-kakao-consultation"
          >
            💬 카카오톡 상담하기
          </motion.a>

          <motion.a
            href="https://nothingmatters.kr"
            target="_blank"
            rel="noopener noreferrer"
            whileTap={shouldReduce ? undefined : { scale: 0.97 }}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-rose-100 bg-white px-6 py-3 font-black text-rose-500 transition-colors hover:bg-rose-50"
            data-testid="button-home"
          >
            🏠 nothingmatters
          </motion.a>
        </div>
      </div>
    </div>
  );
}
