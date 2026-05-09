import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4">
      <Card className="crayon-card w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-black bg-[var(--crayon-orange)] shadow-[3px_3px_0_#1a1a1a]">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-black text-[#1a1a1a]">페이지를 찾을 수 없어요</h1>
          </div>

          <p className="mt-4 text-base font-bold text-gray-600">
            주소를 다시 확인하거나 주문 페이지로 돌아가 주세요.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
