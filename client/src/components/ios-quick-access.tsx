import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Share, Bookmark, QrCode, Smartphone, Download } from 'lucide-react';

export function IOSQuickAccess() {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  
  // iOS 기기 감지
  const userAgent = navigator.userAgent.toLowerCase();
  const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
  
  // iOS가 아니면 표시하지 않음
  if (!isIOSDevice) {
    return null;
  }

  // 이미 standalone 모드면 표시하지 않음
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isInWebAppiOS = (window.navigator as any).standalone;
  
  if (isStandalone || isInWebAppiOS) {
    return null;
  }

  // QR 코드 생성
  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const currentUrl = window.location.origin;
        // QR 코드 라이브러리 동적 import
        const QRCode = await import('qrcode');
        const qrDataUrl = await QRCode.toDataURL(currentUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeUrl(qrDataUrl);
      } catch (error) {
        console.error('QR 코드 생성 실패:', error);
      }
    };
    
    if (showAlternatives) {
      generateQRCode();
    }
  }, [showAlternatives]);

  return (
    <>
      {/* 기본 빠른 접근 안내 */}
      <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-6 w-6" />
              <div>
                <h3 className="font-medium text-sm">빠른 접근 설정</h3>
                <p className="text-xs opacity-90">낫띵메터스를 더 쉽게 이용하세요</p>
              </div>
            </div>
            <Button
              onClick={() => setShowAlternatives(true)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              data-testid="button-quick-access"
            >
              설정
            </Button>
          </div>
        </div>
      </div>

      {/* 대안 방법들 모달 */}
      {showAlternatives && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  🏠 홈화면 빠른 접근 방법
                </h2>
                <Button
                  onClick={() => setShowAlternatives(false)}
                  variant="ghost"
                  size="sm"
                  data-testid="button-close-alternatives"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* 방법 1: Safari 북마크 */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <Bookmark className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">방법 1: 북마크 추가</h3>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <p>• Safari 하단 공유 버튼 <Share className="inline w-4 h-4" /> 클릭</p>
                    <p>• "북마크 추가" 선택</p>
                    <p>• 이름을 "낫띵메터스"로 설정</p>
                    <p>• 북마크에서 빠르게 접근 가능</p>
                  </div>
                </div>

                {/* 방법 2: 홈화면 추가 (다시 시도) */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                      <Share className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">방법 2: 홈화면 추가 재시도</h3>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <p>• Safari 하단 공유 버튼 <Share className="inline w-4 h-4" /> 클릭</p>
                    <p>• "홈 화면에 추가" 선택</p>
                    <p>• 앱 이름 확인 후 "추가" 클릭</p>
                    <p>• 홈화면에 낫띵메터스 아이콘 생성</p>
                  </div>
                  <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-700 dark:text-yellow-300">
                    💡 팁: 사이트를 30초 이상 이용한 후 다시 시도해보세요
                  </div>
                </div>

                {/* 방법 3: QR 코드 */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                      <QrCode className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">방법 3: QR 코드 저장</h3>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <p>• 아래 QR 코드를 사진으로 저장</p>
                    <p>• 언제든지 카메라로 스캔해서 접속</p>
                    <p>• 친구들과 공유도 가능</p>
                  </div>
                  <div className="mt-3 flex justify-center">
                    {qrCodeUrl ? (
                      <div className="relative">
                        <img 
                          src={qrCodeUrl} 
                          alt="낫띵메터스 QR 코드" 
                          className="w-32 h-32 rounded-lg border-2 border-gray-200 dark:border-gray-600"
                        />
                        <Button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.download = '낫띵메터스-QR코드.png';
                            link.href = qrCodeUrl;
                            link.click();
                          }}
                          size="sm"
                          variant="outline"
                          className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          저장
                        </Button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <QrCode className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Button
                  onClick={() => setShowAlternatives(false)}
                  className="w-full"
                  data-testid="button-got-it"
                >
                  알겠습니다! 시도해보기
                </Button>
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                  문제가 계속되면 Safari를 완전히 종료 후 다시 접속해보세요
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}