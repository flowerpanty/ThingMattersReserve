import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Share } from 'lucide-react';

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // PWA 설치 가능 여부 체크
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    // 앱 설치 완료 체크
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallButton(false);
      setDeferredPrompt(null);
      console.log('PWA 앱이 설치되었습니다!');
    };

    // iOS 기기인지 확인
    const checkIfIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios|edgios/.test(userAgent);
      
      if (isIOSDevice && isSafari) {
        setIsIOS(true);
        console.log('iOS Safari 감지됨 - PWA 설치 가능');
      }
    };

    // 이미 설치되어 있는지 체크
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        setShowInstallButton(false);
      }
    };

    // 이벤트 리스너 등록
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // 초기 설치 상태 체크
    checkIfInstalled();
    checkIfIOS();
    
    // iOS에서 PWA 설치 조건이 더 까다로우므로 일정 시간 후 버튼 표시
    const timer = setTimeout(() => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      
      if (isIOSDevice) {
        // iOS에서는 항상 설치 안내 표시 (standalone 모드가 아닐 때)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const isInWebAppiOS = (window.navigator as any).standalone;
        
        console.log('iOS PWA 설치 상태 체크:', {
          isIOSDevice,
          isStandalone,
          isInWebAppiOS,
          userAgent: navigator.userAgent
        });
        
        // iOS 기기에서 standalone 모드가 아니면 무조건 설치 버튼 표시
        if (!isStandalone && !isInWebAppiOS) {
          setIsIOS(true);
          setShowInstallButton(true);
          console.log('iOS PWA 설치 버튼 강제 표시됨');
        }
      }
    }, 200); // 더 빠르게 표시
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    
    if (isIOSDevice || isIOS) {
      // iOS에서는 수동 설치 안내 표시
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    try {
      // 설치 프롬프트 표시
      deferredPrompt.prompt();
      
      // 사용자 선택 결과 대기
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('사용자가 앱 설치를 수락했습니다');
      } else {
        console.log('사용자가 앱 설치를 거부했습니다');
      }
      
      // 프롬프트 초기화
      setDeferredPrompt(null);
      setShowInstallButton(false);
    } catch (error) {
      console.error('앱 설치 중 오류 발생:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallButton(false);
  };

  // iOS에서는 항상 설치 안내 표시 (standalone이 아닐 때)
  const userAgent = navigator.userAgent.toLowerCase();
  const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isInWebAppiOS = (window.navigator as any).standalone;
  
  // iOS에서 standalone 모드가 아니면 무조건 버튼 표시
  if (isIOSDevice && !isStandalone && !isInWebAppiOS) {
    // 강제로 iOS 설치 버튼 표시
  } else if (isInstalled || (!showInstallButton && !isIOSDevice)) {
    return null;
  }
  
  // iOS 설치 안내 모달
  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
          <h3 className="text-lg font-bold mb-4 text-center">📱 앱으로 설치하기</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 text-xs font-bold">1</span>
              </div>
              <span>화면 하단의 공유 버튼 <Share className="inline w-4 h-4 mx-1" />를 눌러주세요</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 text-xs font-bold">2</span>
              </div>
              <span>"홈 화면에 추가"를 선택해주세요</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 text-xs font-bold">3</span>
              </div>
              <span>"추가" 버튼을 눌러 완료하세요</span>
            </div>
          </div>
          <Button 
            onClick={() => setShowIOSInstructions(false)}
            className="w-full mt-6"
          >
            확인
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-auto">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
            {isIOS ? <Share className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> : <Download className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {isIOS ? '홈 화면에 추가하기' : '앱으로 설치하기'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isIOS ? 'Safari 공유 버튼을 이용하세요' : '더 빠르고 편리하게 이용하세요'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleInstallClick}
            size="sm"
            className="whitespace-nowrap"
            data-testid="button-install-app"
          >
            {isIOS ? '방법 보기' : '설치'}
          </Button>
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className="p-1"
            data-testid="button-dismiss-install"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}