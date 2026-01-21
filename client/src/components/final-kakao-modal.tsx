import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FinalKakaoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FinalKakaoModal({ isOpen, onClose }: FinalKakaoModalProps) {
  const goToKakao = () => {
    console.log('🚀 최종 수정된 카카오 링크 이동!');
    window.open('https://pf.kakao.com/_QdCaK', '_blank');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-primary">
            🎉 견적서 전송 완료!
          </DialogTitle>
          <DialogDescription className="text-center mt-4">
            견적서가 이메일로 전송되었습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4 mt-4">
          <p className="text-red-700 font-bold text-center text-lg leading-relaxed">
            ⚠️ 아직 주문이 완료되지 않았습니다!
          </p>
          <p className="text-red-600 font-semibold text-center mt-2 text-base">
            카카오톡 채널로 상담을 해야<br />주문이 진행됩니다
          </p>
        </div>

        <div className="flex flex-col gap-3 mt-6">
          <button
            onClick={goToKakao}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-4 px-4 rounded-lg flex items-center justify-center gap-2 text-lg"
            data-testid="button-final-kakao"
          >
            🔥 카카오톡 상담하고 주문하기
          </button>

          <Button
            onClick={onClose}
            variant="outline"
            className="w-full py-3 px-4 rounded-lg"
          >
            나중에 하기
          </Button>
        </div>

        <div className="text-center mt-4">
          <p className="text-xs text-muted-foreground">
            📧 견적서를 이메일에서 확인하신 후<br />
            💬 카카오톡으로 상담 받으시면 주문이 완료됩니다.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}