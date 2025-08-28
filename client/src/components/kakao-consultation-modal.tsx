import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface KakaoConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KakaoConsultationModal({ isOpen, onClose }: KakaoConsultationModalProps) {
  const handleKakaoTalk = () => {
    // 카카오톡 상담 링크로 이동
    const correctKakaoLink = 'https://pf.kakao.com/_QdCaK/98027924';
    console.log('🔗 올바른 카카오톡 링크로 이동:', correctKakaoLink);
    
    // 새 창에서 올바른 링크 열기
    const newWindow = window.open(correctKakaoLink, '_blank', 'noopener,noreferrer');
    if (newWindow) {
      newWindow.focus();
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
          <Button
            onClick={handleKakaoTalk}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2"
            data-testid="button-kakao-consultation"
          >
            <MessageCircle className="w-5 h-5" />
            카카오톡 상담하기
          </Button>
          
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