import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4">
      <Card className="cute-card w-full max-w-md border-rose-100">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
              <AlertCircle className="h-6 w-6 text-rose-500" />
            </div>
            <h1 className="text-2xl font-black text-[#7b3f3f]">페이지를 찾을 수 없어요</h1>
          </div>

          <p className="mt-4 text-sm font-medium text-muted-foreground">
            주소를 다시 확인하거나 주문 페이지로 돌아가 주세요.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
