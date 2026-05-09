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
      <DialogContent className="border-[3px] border-black bg-[var(--paper-bg)] p-6 shadow-[6px_6px_0_#1a1a1a] sm:max-w-[425px]">
        <DialogHeader>
          <motion.div
            initial={shouldReduce ? false : { scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 350, damping: 22 }}
            className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-black bg-white text-5xl shadow-[4px_4px_0_#1a1a1a]"
            aria-hidden="true"
          >
            🎉
          </motion.div>
          <DialogTitle className="text-center text-2xl font-black text-[#1a1a1a]">
            견적서 전송 완료!
          </DialogTitle>
          <DialogDescription className="mt-3 text-center text-base font-bold text-gray-700">
            입력하신 이메일로 견적서가 도착했어요.
          </DialogDescription>
        </DialogHeader>

        <div className="crayon-card mt-4" style={{ background: "var(--crayon-yellow)" }}>
          <p className="text-center text-xl font-black text-[#1a1a1a]">🎉 거의 다 됐어요!</p>
          <p className="mt-2 text-center font-bold text-[#1a1a1a]">
            카카오톡으로 상담하면<br />주문이 완료돼요!
          </p>
        </div>

        <div className="mt-5 rounded-3xl border-[3px] border-black bg-white p-4 text-center shadow-[3px_3px_0_#1a1a1a]">
          <div className="text-5xl" aria-hidden="true">🍪</div>
          <p className="mt-2 text-base font-bold text-[#1a1a1a]">
            주문 내용 확인 후 제작 가능 일정과 배송비를 빠르게 안내드릴게요.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <motion.button
            onClick={goToKakao}
            whileHover={shouldReduce ? undefined : { scale: 1.03 }}
            whileTap={shouldReduce ? undefined : { scale: 0.97 }}
            animate={shouldReduce ? undefined : { y: [0, -2, 0] }}
            transition={{ repeat: shouldReduce ? 0 : Infinity, duration: 2 }}
            className="crayon-btn crayon-btn-yellow w-full py-5 text-xl"
            data-testid="button-final-kakao"
          >
            💬 카카오톡으로 주문 완료하기 →
          </motion.button>

          <Button
            onClick={onClose}
            variant="outline"
            className="crayon-btn w-full bg-white px-4 py-3 font-black"
          >
            나중에 하기
          </Button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm font-bold text-gray-600">
            📧 견적서를 이메일에서 확인하신 후<br />
            💬 카카오톡으로 상담 받으시면 주문이 완료됩니다.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
