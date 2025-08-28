import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface KakaoConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KakaoConsultationModal({ isOpen, onClose }: KakaoConsultationModalProps) {
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
          <a
            href="https://pf.kakao.com/_QdCaK"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 no-underline"
            data-testid="button-kakao-consultation"
            onClick={() => {
              console.log('🎯 A태그 직접 카카오톡 링크: https://pf.kakao.com/_QdCaK');
              onClose();
            }}
          >
            <MessageCircle className="w-5 h-5" />
            카카오톡 상담하기
          </a>
          
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