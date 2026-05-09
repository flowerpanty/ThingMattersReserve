import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Eye, EyeOff } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface AdminAuthProps {
  onAuthenticated: () => void;
}

export function AdminAuth({ onAuthenticated }: AdminAuthProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await apiRequest('POST', '/api/admin/login', { password });
      onAuthenticated();
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : '로그인에 실패했습니다.';
      setError(message.includes('503')
        ? '서버에 ADMIN_PASSWORD 환경변수가 설정되어 있지 않습니다.'
        : '잘못된 관리자 비밀번호입니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="crayon-card w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-black bg-[var(--crayon-yellow)] shadow-[3px_3px_0_#1a1a1a]">
            <Lock className="w-8 h-8 text-[#1a1a1a]" />
          </div>
          <CardTitle className="text-2xl font-black text-[#1a1a1a]">관리자 로그인</CardTitle>
          <p className="font-bold text-gray-600">대시보드에 접근하려면 관리자 비밀번호를 입력하세요</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="관리자 비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="crayon-input h-14 pr-10 font-black"
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
              <div className="rounded-2xl border-[3px] border-black bg-yellow-100 p-3 text-center text-sm font-black text-[#1a1a1a] shadow-[3px_3px_0_#1a1a1a]">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="crayon-btn crayon-btn-blue w-full"
              disabled={isLoading}
              data-testid="button-admin-login"
            >
              {isLoading ? '확인 중...' : '관리자 로그인'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm font-bold text-gray-600">
            서버 관리자 세션으로 보호됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
