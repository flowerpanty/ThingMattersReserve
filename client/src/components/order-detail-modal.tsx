import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Mail, Package, MapPin, Clock, DollarSign, Download, Trash2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import React from "react";
import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { QuoteImageTemplate } from './quote-image-template';

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
    pickupTime?: string;
    orderItems: OrderItem[];
    totalPrice: number;
    createdAt: string;
}

interface OrderDetailModalProps {
    order: Order | null;
    isOpen: boolean;
    onClose: () => void;
    onDelete?: (orderId: string) => void;
}

export function OrderDetailModal({ order, isOpen, onClose, onDelete }: OrderDetailModalProps) {
    if (!order) return null;

    const [isDeleting, setIsDeleting] = useState(false);
    const [isDownloadingImage, setIsDownloadingImage] = useState(false);
    const quoteTemplateRef = useRef<HTMLDivElement>(null);

    const handleDelete = async () => {
        if (!order || !onDelete) return;

        setIsDeleting(true);
        try {
            await onDelete(order.id);
            onClose();
        } catch (error) {
            console.error('주문 삭제 오류:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDownloadImage = async () => {
        if (!quoteTemplateRef.current) return;

        setIsDownloadingImage(true);
        try {
            const canvas = await html2canvas(quoteTemplateRef.current, {
                backgroundColor: '#ffffff',
                scale: 2, // 고해상도
                logging: false,
                useCORS: true,
            });

            // Canvas를 Blob으로 변환
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    throw new Error('이미지 생성 실패');
                }

                const fileName = `견적서_${order.customerName}_${order.id.slice(0, 8)}.png`;

                // Web Share API 지원 확인 (모바일 기기)
                if (navigator.share && navigator.canShare) {
                    try {
                        const file = new File([blob], fileName, { type: 'image/png' });

                        // 공유 가능 여부 확인
                        if (navigator.canShare({ files: [file] })) {
                            await navigator.share({
                                files: [file],
                                title: '견적서',
                                text: `${order.customerName} 견적서`
                            });
                            setIsDownloadingImage(false);
                            return;
                        }
                    } catch (shareError) {
                        // 사용자가 공유를 취소하거나 오류 발생 시 다운로드로 폴백
                        console.log('공유 취소 또는 오류:', shareError);
                    }
                }

                // 폴백: 기존 다운로드 방식
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                setIsDownloadingImage(false);
            }, 'image/png');
        } catch (error) {
            console.error('이미지 다운로드 오류:', error);
            alert('이미지 다운로드에 실패했습니다. 오류: ' + (error instanceof Error ? error.message : String(error)));
            setIsDownloadingImage(false);
        }
    };

    const handleDownloadQuote = async () => {
        try {
            // 주문 데이터를 API 형식에 맞게 변환
            const quoteData = {
                customerName: order.customerName,
                customerContact: order.customerContact,
                deliveryDate: order.deliveryDate,
                deliveryMethod: order.deliveryMethod || 'pickup',
                pickupTime: order.pickupTime,
                orderItems: order.orderItems,
            };

            const response = await fetch('/api/generate-quote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quoteData),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('견적서 생성 실패:', errorText);
                throw new Error(`견적서 생성 실패: ${response.status}`);
            }

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
            alert('견적서 다운로드에 실패했습니다. 오류: ' + (error instanceof Error ? error.message : String(error)));
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
                {item.options.packaging && (
                    <div>📦 포장옵션: {item.options.packaging}</div>
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
                            {order.pickupTime && (
                                <>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">시간</span>
                                        <span className="font-medium">{order.pickupTime}</span>
                                    </div>
                                </>
                            )}
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

                    {/* 견적서 다운로드 및 삭제 버튼 */}
                    <div className="pt-4 border-t space-y-2">
                        <Button
                            onClick={handleDownloadImage}
                            className="w-full"
                            variant="default"
                            disabled={isDownloadingImage}
                        >
                            <ImageIcon className="w-4 h-4 mr-2" />
                            {isDownloadingImage ? '이미지 생성 중...' : '견적서 이미지 저장 (PNG)'}
                        </Button>

                        <Button
                            onClick={handleDownloadQuote}
                            className="w-full"
                            variant="outline"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            견적서 다운로드 (Excel)
                        </Button>

                        {onDelete && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        className="w-full"
                                        disabled={isDeleting}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        주문 삭제
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>주문을 삭제하시겠습니까?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            이 작업은 취소할 수 없습니다. 주문이 영구적으로 삭제됩니다.
                                            <br /><br />
                                            고객: <strong>{order.customerName}</strong><br />
                                            주문ID: <strong>{order.id.slice(0, 8)}...</strong>
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>취소</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                            {isDeleting ? '삭제 중...' : '삭제 확인'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>

                    {/* 숨겨진 견적서 템플릿 (이미지 생성용) */}
                    <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                        <QuoteImageTemplate ref={quoteTemplateRef} order={order} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
