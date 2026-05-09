import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "motion/react";

interface FinalKakaoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FinalKakaoModal({ isOpen, onClose }: FinalKakaoModalProps) {
  const shouldReduce = useReducedMotion();

  const goToKakao = () => {
    window.open('https://pf.kakao.com/_QdCaK', '_blank');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-[28px] border-rose-100 bg-[rgba(255,248,245,0.96)] p-6 shadow-[var(--shadow-card)] backdrop-blur-xl sm:max-w-[425px] dark:border-rose-300/20 dark:bg-[#1e1419]/95">
        <DialogHeader>
          <motion.div
            initial={shouldReduce ? false : { scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 350, damping: 22 }}
            className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-orange-100 text-4xl"
            aria-hidden="true"
          >
            🎉
          </motion.div>
          <DialogTitle className="text-center text-xl font-black text-[#7b3f3f]">
            견적서 전송 완료!
          </DialogTitle>
          <DialogDescription className="mt-3 text-center text-sm font-medium text-muted-foreground">
            입력하신 이메일로 견적서가 도착했어요.
          </DialogDescription>
        </DialogHeader>

        <div
          className="mt-4 rounded-2xl p-4"
          style={{
            background: "linear-gradient(135deg, hsl(45,100%,97%) 0%, hsl(22,100%,96%) 100%)",
            border: "2px solid hsl(45, 80%, 80%)",
          }}
        >
          <p className="text-center font-black text-amber-700">🎀 마지막 한 단계만 남았어요!</p>
          <p className="mt-1 text-center text-sm font-semibold text-amber-600">
            카카오톡으로 상담하시면 바로 주문이 확정돼요
          </p>
        </div>

        <div className="mt-5 rounded-3xl bg-white/70 p-4 text-center dark:bg-white/10">
          <div className="text-5xl" aria-hidden="true">🍪</div>
          <p className="mt-2 text-sm font-bold text-[#7b3f3f] dark:text-rose-100">
            주문 내용 확인 후 제작 가능 일정과 배송비를 빠르게 안내드릴게요.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <motion.button
            onClick={goToKakao}
            whileHover={shouldReduce ? undefined : { scale: 1.03 }}
            whileTap={shouldReduce ? undefined : { scale: 0.97 }}
            animate={
              shouldReduce
                ? undefined
                : {
                  boxShadow: [
                    "0 4px 20px rgba(254,229,0,0.4)",
                    "0 8px 32px rgba(254,229,0,0.65)",
                    "0 4px 20px rgba(254,229,0,0.4)",
                  ],
                }
            }
            transition={{ repeat: shouldReduce ? 0 : Infinity, duration: 2 }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-lg font-black"
            style={{ background: "linear-gradient(135deg, #FEE500, #FFD600)", color: "#3C1E1E" }}
            data-testid="button-final-kakao"
          >
            💬 카카오톡으로 주문 완료하기 →
          </motion.button>

          <Button
            onClick={onClose}
            variant="outline"
            className="w-full rounded-full px-4 py-3 font-bold active:scale-95"
          >
            나중에 하기
          </Button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs font-medium text-muted-foreground">
            📧 견적서를 이메일에서 확인하신 후<br />
            💬 카카오톡으로 상담 받으시면 주문이 완료됩니다.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
