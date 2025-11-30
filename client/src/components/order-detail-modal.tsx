import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Mail, Package, MapPin, Clock, DollarSign, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface OrderItem {
    type: string;
    name: string;
    quantity: number;
    price: number;
    options?: any;
}

interface Order {
    id: string;
    customerName: string;
    customerContact: string;
    deliveryDate: string;
    deliveryMethod?: string;
    orderItems: OrderItem[];
    totalPrice: number;
    createdAt: string;
}

interface OrderDetailModalProps {
    order: Order | null;
    isOpen: boolean;
    onClose: () => void;
}

export function OrderDetailModal({ order, isOpen, onClose }: OrderDetailModalProps) {
    if (!order) return null;

    const handleDownloadQuote = async () => {
        try {
            const response = await fetch('/api/generate-quote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: order.id }),
            });

            if (!response.ok) throw new Error('견적서 생성 실패');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `견적서_${order.customerName}_${order.id.slice(0, 8)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('견적서 다운로드 오류:', error);
            alert('견적서 다운로드에 실패했습니다.');
        }
    };

    const formatCurrency = (amount: number) => {
        return `${amount.toLocaleString('ko-KR')}원`;
    };

    const formatDateTime = (dateString: string) => {
        try {
            return format(new Date(dateString), 'yyyy년 MM월 dd일 HH:mm', { locale: ko });
        } catch {
            return dateString;
        }
    };

    const getDeliveryMethodText = (method?: string) => {
        if (!method) return '픽업';
        return method === 'pickup' ? '픽업' : '퀵배송';
    };

    const renderOptionDetails = (item: OrderItem) => {
        if (!item.options || Object.keys(item.options).length === 0) return null;

        return (
            <div className="ml-4 mt-1 text-xs text-muted-foreground space-y-0.5">
                {/* 2구 패키지 옵션 */}
                {item.options.selectedCookies && (
                    <div>📦 선택: {item.options.selectedCookies.join(', ')}</div>
                )}

                {/* 1구 + 음료 옵션 */}
                {item.options.selectedCookie && (
                    <div>🍪 쿠키: {item.options.selectedCookie}</div>
                )}
                {item.options.selectedDrink && (
                    <div>🥤 음료: {item.options.selectedDrink}</div>
                )}

                {/* 브라우니 쿠키 옵션 */}
                {item.options.shape && (
                    <div>
                        🐻 모양: {
                            item.options.shape === 'bear' ? '곰돌이' :
                                item.options.shape === 'rabbit' ? '토끼' :
                                    item.options.shape === 'tiger' ? '호랑이' :
                                        item.options.shape === 'birthdayBear' ? '생일곰 🎂' :
                                            item.options.shape
                        }
                    </div>
                )}
                {item.options.customSticker && (
                    <div>✨ 커스텀 스티커 추가</div>
                )}
                {item.options.heartMessage && (
                    <div>💌 하트메시지: {item.options.heartMessage}</div>
                )}
                {item.options.customTopper && (
                    <div>🎀 커스텀 토퍼 추가</div>
                )}

                {/* 스콘 옵션 */}
                {item.options.flavor && (
                    <div>
                        🧁 맛: {item.options.flavor === 'chocolate' ? '초콜릿' : '고메버터'}
                    </div>
                )}
                {item.options.strawberryJam && (
                    <div>🍓 딸기잼 추가</div>
                )}
            </div>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Package className="w-6 h-6" />
                        주문 상세 정보
                    </DialogTitle>
                    <DialogDescription>
                        주문번호: {order.id.slice(0, 8)}...
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* 고객 정보 */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Mail className="w-5 h-5" />
                            고객 정보
                        </h3>
                        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">고객명</span>
                                <span className="font-medium">{order.customerName}</span>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">연락처</span>
                                <span className="font-medium">{order.customerContact}</span>
                            </div>
                        </div>
                    </div>

                    {/* 배송 정보 */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <MapPin className="w-5 h-5" />
                            배송 정보
                        </h3>
                        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">배송 방법</span>
                                <Badge variant="secondary">{getDeliveryMethodText(order.deliveryMethod)}</Badge>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">배송/픽업 날짜</span>
                                <span className="font-medium">{order.deliveryDate}</span>
                            </div>
                        </div>
                    </div>

                    {/* 주문 항목 */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            주문 항목 ({order.orderItems.length}개)
                        </h3>
                        <div className="space-y-2">
                            {order.orderItems.map((item, index) => (
                                <div key={index} className="bg-muted/30 rounded-lg p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{item.name}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {item.quantity}개
                                                </Badge>
                                            </div>
                                            {renderOptionDetails(item)}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-muted-foreground">
                                                단가: {formatCurrency(item.price)}
                                            </div>
                                            <div className="font-semibold">
                                                {formatCurrency(item.price * item.quantity)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 가격 요약 */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            결제 정보
                        </h3>
                        <div className="bg-primary/5 rounded-lg p-4 space-y-3">
                            {/* 항목별 소계 */}
                            <div className="space-y-2">
                                {order.orderItems.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            {item.name} × {item.quantity}
                                        </span>
                                        <span>{formatCurrency(item.price * item.quantity)}</span>
                                    </div>
                                ))}
                            </div>

                            <Separator />

                            {/* 총 금액 */}
                            <div className="flex items-center justify-between text-lg font-bold">
                                <span>총 결제 금액</span>
                                <span className="text-primary">{formatCurrency(order.totalPrice)}</span>
                            </div>
                        </div>
                    </div>

                    {/* 주문 일시 */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            주문 접수 정보
                        </h3>
                        <div className="bg-muted/30 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">접수 일시</span>
                                <span className="font-medium">{formatDateTime(order.createdAt)}</span>
                            </div>
                        </div>
                    </div>

                    {/* 견적서 다운로드 버튼 */}
                    <div className="pt-4 border-t">
                        <Button
                            onClick={handleDownloadQuote}
                            className="w-full"
                            variant="outline"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            견적서 다운로드 (Excel)
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
