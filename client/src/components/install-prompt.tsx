import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';

export function InstallPrompt() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // 이미 설치되었는지 확인
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // iOS 여부 확인
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIOSDevice);

        // 이번 세션에서 이미 닫았는지 확인
        const dismissed = sessionStorage.getItem('pwa_install_dismissed');
        if (dismissed) return;

        // 설치 프롬프트 이벤트 (Android/Desktop Chrome)
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowPrompt(true);
        };
        window.addEventListener('beforeinstallprompt', handler);

        // iOS에서는 3초 후 표시
        if (isIOSDevice) {
            const timer = setTimeout(() => setShowPrompt(true), 3000);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('beforeinstallprompt', handler);
            };
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const result = await deferredPrompt.userChoice;
            if (result.outcome === 'accepted') {
                setShowPrompt(false);
                setIsInstalled(true);
            }
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        sessionStorage.setItem('pwa_install_dismissed', 'true');
    };

    if (isInstalled || !showPrompt) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
            <div className="mx-auto max-w-lg m-3">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-4 shadow-2xl">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            🍪
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm">낫띵메터스 앱 설치</h3>
                            {isIOS ? (
                                <p className="text-xs text-white/80 mt-1">
                                    <Share className="w-3 h-3 inline mr-1" />
                                    하단의 공유 버튼 → "홈 화면에 추가"를 눌러주세요
                                </p>
                            ) : (
                                <p className="text-xs text-white/80 mt-1">
                                    홈 화면에 추가하여 더 빠르게 주문을 관리하세요
                                </p>
                            )}
                        </div>
                        <button onClick={handleDismiss} className="text-white/60 hover:text-white p-1">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    {!isIOS && deferredPrompt && (
                        <button
                            onClick={handleInstall}
                            className="mt-3 w-full bg-white text-indigo-600 font-bold text-sm py-2.5 rounded-xl hover:bg-white/90 transition-all flex items-center justify-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            앱 설치하기
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
