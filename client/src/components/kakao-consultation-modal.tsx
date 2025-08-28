import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface KakaoConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KakaoConsultationModal({ isOpen, onClose }: KakaoConsultationModalProps) {
  const handleKakaoClick = () => {
    const FINAL_LINK = 'https://pf.kakao.com/_QdCaK';
    console.log('🔥 FINAL: 최종 카카오톡 링크 클릭:', FINAL_LINK);
    
    // 여러 방법으로 시도
    try {
      // 방법 1: window.open
      const newWindow = window.open(FINAL_LINK, '_blank');
      if (!newWindow) {
        // 방법 2: location.href
        window.location.href = FINAL_LINK;
      }
    } catch (error) {
      console.error('링크 이동 실패:', error);
      // 방법 3: 강제 이동
      document.location = FINAL_LINK;
    }
    
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
            견적서가 이메일로 전송되었습니다.<br />
            추가 문의사항이 있으시면 카카오톡으로 상담받으세요!
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-6">
          <div 
            onClick={handleKakaoClick}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
            data-testid="div-final-kakao-button"
          >
            <MessageCircle className="w-5 h-5" />
            🔥 최종 카카오톡 상담
          </div>
          
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full py-3 px-4 rounded-lg"
            data-testid="button-close-modal"
          >
            나중에 하기
          </Button>
        </div>
        
        <div className="text-center mt-4">
          <p className="text-xs text-muted-foreground">
            📧 견적서를 이메일에서 확인해보세요!<br />
            💬 빠른 상담을 원하시면 카카오톡을 이용해주세요.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}