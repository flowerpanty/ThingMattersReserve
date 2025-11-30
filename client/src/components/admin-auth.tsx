import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Eye, EyeOff } from 'lucide-react';

interface AdminAuthProps {
  onAuthenticated: () => void;
}

export function AdminAuth({ onAuthenticated }: AdminAuthProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 간단한 관리자 비밀번호 (실제 운영시에는 더 보안이 강화된 방식 사용)
  const ADMIN_PASSWORD = 'nothingmatters2025';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // 비밀번호 확인 시뮬레이션 (0.5초 딜레이)
    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        // 세션 스토리지에 인증 상태 저장
        console.log('Authentication successful, setting sessionStorage...');
        sessionStorage.setItem('admin_authenticated', 'true');
        console.log('SessionStorage set, reloading page...');

        // 캐시 문제 해결을 위해 강제 새로고침
        window.location.reload();
        // onAuthenticated(); // reload가 발생하므로 이 콜백은 실행되지 않을 수 있으나, App.tsx에서 초기 로드시 체크함
      } else {
        setError('잘못된 관리자 비밀번호입니다.');
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">관리자 로그인</CardTitle>
          <p className="text-muted-foreground">대시보드에 접근하려면 관리자 비밀번호를 입력하세요</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="관리자 비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                required
                data-testid="input-admin-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                data-testid="button-toggle-password"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-admin-login"
            >
              {isLoading ? '확인 중...' : '관리자 로그인'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>💡 힌트: 브랜드명 + 연도</p>
              <p>🔒 관리자만 접근 가능합니다</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}