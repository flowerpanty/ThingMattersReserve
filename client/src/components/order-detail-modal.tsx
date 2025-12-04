import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Mail, Package, MapPin, Clock, DollarSign, Download, Trash2, Image as ImageIcon, FileSpreadsheet } from "lucide-react";
import { cookiePrices } from "@shared/schema";
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

import axios from 'axios';
import { useToast } from "@/hooks/use-toast";

interface OrderDetailModalProps {
    order: Order | null;
    isOpen: boolean;
    onClose: () => void;
    onDelete?: (orderId: string) => void;
}

export function OrderDetailModal({ order, isOpen, onClose, onDelete }: OrderDetailModalProps) {
    if (!order) return null;

    const [isDeleting, setIsDeleting] = useState(false);
    const quoteTemplateRef = useRef<HTMLDivElement>(null);
    const [isDownloadingImage, setIsDownloadingImage] = useState(false);
    const [isDownloadingQuote, setIsDownloadingQuote] = useState(false);
    const { toast } = useToast();

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
            const originalElement = quoteTemplateRef.current;

            // 1. 요소를 복제 (Deep clone)
            const clonedElement = originalElement.cloneNode(true) as HTMLElement;

            // 2. 복제된 요소 스타일 설정 (화면 밖으로 이동, 전체 너비/높이 확보)
            // 모바일에서도 데스크탑 너비(800px)로 강제 렌더링하여 레이아웃 유지
            Object.assign(clonedElement.style, {
                position: 'fixed',
                left: '-9999px',
                top: '0',
                width: '800px', // 고정 너비로 레이아웃 안정화
                height: 'auto',
                maxHeight: 'none',
                overflow: 'visible',
                zIndex: '-1',
                transform: 'none',
                backgroundColor: '#ffffff' // 배경색 명시
            });

            // 3. DOM에 추가
            document.body.appendChild(clonedElement);

            // 4. 이미지 로딩 등 렌더링 대기 (충분한 시간 확보)
            await new Promise(resolve => setTimeout(resolve, 500));

            // 실제 렌더링된 높이 계산
            const captureHeight = clonedElement.scrollHeight;

            console.log('Capturing cloned element:', { width: 800, height: captureHeight });

            // 5. 캡처 수행
            const canvas = await html2canvas(clonedElement, {
                backgroundColor: '#ffffff',
                scale: 2, // 고해상도
                logging: false,
                useCORS: true,
                allowTaint: true,
                width: 800,
                height: captureHeight,
                windowWidth: 800,
                windowHeight: captureHeight,
                scrollY: 0,
                scrollX: 0,
                x: 0,
                y: 0,
                foreignObjectRendering: false
            });

            // 6. 복제된 요소 제거
            document.body.removeChild(clonedElement);

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

            // 주문 생성 없이 Excel 파일만 다운로드
            const response = await fetch('/api/download-quote-excel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quoteData),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('견적서 생성 실패:', errorText);
                try {
                    // Attempt to download using axios if fetch failed
                    const axiosResponse = await axios.post('/api/download-quote-excel', quoteData, {
                        responseType: 'blob',
                    });

                    const url = window.URL.createObjectURL(new Blob([axiosResponse.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `견적서_${order.customerName}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                } catch (error) {
                    console.error('Excel download failed, falling back to CSV:', error);

                    // Fallback: CSV 생성 및 다운로드
                    const csvContent = [
                        ['견적서'],
                        ['날짜', format(new Date(), 'yyyy-MM-dd')],
                        ['고객명', order.customerName],
                        ['연락처', order.customerContact],
                        [''],
                        ['상품명', '수량', '단가', '금액'],
                        ...order.orderItems.map(item => [
                            item.name,
                            item.quantity,
                            item.price,
                            item.price * item.quantity // Calculate total for item
                        ]),
                        [''],
                        ['총 합계', '', '', order.totalPrice] // Use order.totalPrice
                    ].map(e => e.join(',')).join('\n');

                    // BOM 추가하여 엑셀에서 한글 깨짐 방지
                    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `견적서_${order.customerName}_${format(new Date(), 'yyyyMMdd')}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();

                    toast({
                        title: "Excel 생성 실패로 CSV가 다운로드되었습니다.",
                        description: "서버 연결 문제로 기본 호환 파일로 제공됩니다.",
                        variant: "default",
                    });
                }
            } else {
                // Original successful download logic
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `견적서_${order.customerName}_${order.id.slice(0, 8)}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('견적서 다운로드 오류:', error);
            alert('견적서 다운로드에 실패했습니다. 오류: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsDownloadingQuote(false); // Reset loading state
        }
    };

    const handleCopyToSheet = async () => {
        const orderAny = order as any;
        // 메타 데이터 아이템에서 원본 데이터 추출 (DB 스키마 변경 없는 방식)
        const metaItem = order.orderItems.find((item: any) => item.type === 'meta');
        const orderData = metaItem ? metaItem.options : orderAny.originalOrderData;

        // 가격 상수
        const PRICES = {
            regular: 4500,
            brownie: 7800,
            scone: 5000,
            twoPackSet: 10500,
            singleWithDrink: 11000,
            fortune: 15000,
            airplane: 22000,
            brownieOptions: {
                birthdayBear: 500,
                customSticker: 15000,
                heartMessage: 500,
            },
            sconeOptions: {
                strawberryJam: 500,
            },
            packaging: {
                single_box: 600,
                plastic_wrap: 500,
            }
        };

        const detailedRows: any[] = [];
        let detailOptionText = '';

        if (orderData) {
            // 1. orderData가 있는 경우 (신규 주문) - 완벽한 복원 가능

            // 일반 쿠키
            const regularQty = Object.values(orderData.regularCookies || {}).reduce((sum: number, q: any) => sum + q, 0);
            if (regularQty > 0) {
                detailedRows.push({ name: '일반쿠키', quantity: regularQty, price: PRICES.regular, total: regularQty * PRICES.regular });

                // 포장 옵션 (일반 쿠키 하위로 이동 및 그룹화)
                if (orderData.packaging && (orderData.packaging === 'single_box' || orderData.packaging === 'plastic_wrap')) {
                    const pkgName = orderData.packaging === 'single_box' ? '1구박스' : '비닐탭포장';
                    const pkgPrice = PRICES.packaging[orderData.packaging as keyof typeof PRICES.packaging];
                    // 'ㄴ' 접두어로 하위 항목임을 표시
                    detailedRows.push({ name: `ㄴ ${pkgName}`, quantity: regularQty, price: pkgPrice, total: regularQty * pkgPrice });
                }
            }

            // 2구 패키지
            if (orderData.twoPackSets?.length > 0) {
                const qty = orderData.twoPackSets.reduce((sum: number, set: any) => sum + (set.quantity || 1), 0);
                detailedRows.push({ name: '2구 패키지', quantity: qty, price: PRICES.twoPackSet, total: qty * PRICES.twoPackSet });
            }

            // 1구 + 음료
            if (orderData.singleWithDrinkSets?.length > 0) {
                const qty = orderData.singleWithDrinkSets.reduce((sum: number, set: any) => sum + (set.quantity || 1), 0);
                detailedRows.push({ name: '1구 + 음료', quantity: qty, price: PRICES.singleWithDrink, total: qty * PRICES.singleWithDrink });
            }

            // 스콘
            if (orderData.sconeSets?.length > 0) {
                let sconeQty = 0;
                let jamQty = 0;
                orderData.sconeSets.forEach((set: any) => {
                    const q = set.quantity || 1;
                    sconeQty += q;
                    if (set.strawberryJam) jamQty += q;
                });
                detailedRows.push({ name: '스콘', quantity: sconeQty, price: PRICES.scone, total: sconeQty * PRICES.scone });
                if (jamQty > 0) {
                    detailedRows.push({ name: 'ㄴ 딸기잼 추가', quantity: jamQty, price: PRICES.sconeOptions.strawberryJam, total: jamQty * PRICES.sconeOptions.strawberryJam });
                }
            }

            // 행운쿠키
            if (orderData.fortuneCookie > 0) {
                detailedRows.push({ name: '행운쿠키', quantity: `${orderData.fortuneCookie}박스`, price: PRICES.fortune, total: orderData.fortuneCookie * PRICES.fortune });
            }

            // 비행기샌드쿠키
            if (orderData.airplaneSandwich > 0) {
                detailedRows.push({ name: '비행기샌드쿠키', quantity: `${orderData.airplaneSandwich}박스`, price: PRICES.airplane, total: orderData.airplaneSandwich * PRICES.airplane });
            }

            // 브라우니 쿠키 (옵션별 분해)
            if (orderData.brownieCookieSets?.length > 0) {
                let brownieQty = 0;
                let bearQty = 0;
                let stickerCount = 0;
                let heartQty = 0;
                let topperCount = 0;

                orderData.brownieCookieSets.forEach((set: any) => {
                    const q = set.quantity || 1;
                    brownieQty += q;
                    if (set.shape === 'birthdayBear') bearQty += q;
                    if (set.customSticker) stickerCount += 1; // 세트당 1개
                    if (set.heartMessage) heartQty += q;
                    if (set.customTopper) topperCount += 1;
                });

                detailedRows.push({ name: '브라우니쿠키', quantity: brownieQty, price: PRICES.brownie, total: brownieQty * PRICES.brownie });
                if (topperCount > 0) detailedRows.push({ name: 'ㄴ 커스텀토퍼', quantity: '', price: '', total: '' });
                if (bearQty > 0) detailedRows.push({ name: 'ㄴ 생일곰 추가', quantity: bearQty, price: PRICES.brownieOptions.birthdayBear, total: bearQty * PRICES.brownieOptions.birthdayBear });
                if (stickerCount > 0) detailedRows.push({ name: 'ㄴ 하단 커스텀 스티커', quantity: stickerCount, price: PRICES.brownieOptions.customSticker, total: stickerCount * PRICES.brownieOptions.customSticker });
                if (heartQty > 0) detailedRows.push({ name: 'ㄴ 하트안 문구 추가', quantity: heartQty, price: PRICES.brownieOptions.heartMessage, total: heartQty * PRICES.brownieOptions.heartMessage });
            }

            // 배송비 (총액 차액으로 계산하거나 명시적 추가)
            // 여기서는 계산된 합계와 order.totalPrice의 차이를 배송비로 간주
            const currentTotal = detailedRows.reduce((sum, row) => sum + (typeof row.total === 'number' ? row.total : 0), 0);
            const diff = order.totalPrice - currentTotal;
            if (diff > 0) {
                detailedRows.push({ name: '배송비', quantity: 1, price: diff, total: diff });
            }

            // 상세 텍스트 생성
            const lines = [];

            // 일반쿠키 상세
            const regularList = Object.entries(orderData.regularCookies || {})
                .filter(([_, qty]) => (qty as number) > 0)
                .map(([type, qty]) => `${type} ${qty}개`);
            if (regularList.length > 0) lines.push(`• 일반쿠키: ${regularList.join(', ')}`);

            // 2구 패키지 상세
            orderData.twoPackSets?.forEach((set: any, idx: number) => {
                lines.push(`• 2구 패키지 세트 ${idx + 1} (${set.quantity || 1}개): ${set.selectedCookies.join(', ')}`);
            });

            // 1구 + 음료 상세
            orderData.singleWithDrinkSets?.forEach((set: any, idx: number) => {
                lines.push(`• 1구 + 음료 세트 ${idx + 1} (${set.quantity || 1}개): ${set.selectedCookie}, ${set.selectedDrink}`);
            });

            // 스콘 상세
            orderData.sconeSets?.forEach((set: any, idx: number) => {
                const flavorMap: any = { chocolate: '초코맛', gourmetButter: '고메버터' };
                const opts = [flavorMap[set.flavor] || set.flavor];
                if (set.strawberryJam) opts.push('딸기잼 추가');
                lines.push(`• 스콘 세트 ${idx + 1} (${set.quantity || 1}개): ${opts.join(', ')}`);
            });

            // 브라우니 상세 (간략화 or 세트별)
            // 공간 절약을 위해 브라우니는 옵션이 있는 경우만 표시하거나, 세트별로 표시
            // 사용자의 요청: "2구 패키지 세트 1..." 처럼 상세하게.
            orderData.brownieCookieSets?.forEach((set: any, idx: number) => {
                const opts = [];
                if (set.shape) {
                    const shapeMap: any = { bear: '곰', rabbit: '토끼', birthdayBear: '생일곰', tiger: '호랑이' };
                    opts.push(`${shapeMap[set.shape] || set.shape} 모양`);
                }
                if (set.customSticker) opts.push('커스텀스티커');
                if (set.heartMessage) opts.push(`하트메시지: ${set.heartMessage}`);
                if (set.customTopper) opts.push('커스텀토퍼');
                lines.push(`• 브라우니쿠키 세트 ${idx + 1} (${set.quantity || 1}개)${opts.length ? `: ${opts.join(', ')}` : ''}`);
            });

            // 포장 옵션
            if (orderData.packaging) {
                const pkgMap: any = { single_box: '1구박스 (+600원)', plastic_wrap: '비닐탭포장 (+500원)', oil_paper: '유산지' };
                lines.push(`• 포장 옵션: ${pkgMap[orderData.packaging] || orderData.packaging}`);
            }

            detailOptionText = lines.join('<br>');

        } else {
            // 2. orderData가 없는 경우 (구 주문) - 기존 로직 폴백 + 최대한 추론

            // ... (기존 집계 로직 사용)
            const summary = {
                regular: { count: 0, amount: 0 },
                twoPack: { count: 0, amount: 0 },
                singleDrink: { count: 0, amount: 0 },
                brownie: { count: 0, amount: 0 },
                brownieOptions: {
                    birthdayBear: { count: 0, amount: 0 },
                    customSticker: { count: 0, amount: 0 },
                    heartMessage: { count: 0, amount: 0 },
                    customTopper: { count: 0, amount: 0 }
                },
                scone: { count: 0, amount: 0 },
                sconeOptions: {
                    strawberryJam: { count: 0, amount: 0 }
                },
                fortune: { count: 0, amount: 0 },
                airplane: { count: 0, amount: 0 },
                others: [] as any[]
            };

            order.orderItems.forEach(item => {
                const qty = item.quantity;
                if (item.type === 'regular') {
                    summary.regular.count += qty;
                    summary.regular.amount += qty * PRICES.regular;
                } else if (item.type === 'twopack' || (item.name && item.name.includes('2구 패키지'))) {
                    summary.twoPack.count += qty;
                    summary.twoPack.amount += qty * PRICES.twoPackSet;
                } else if (item.type === 'singledrink' || (item.name && item.name.includes('1구 + 음료'))) {
                    summary.singleDrink.count += qty;
                    summary.singleDrink.amount += qty * PRICES.singleWithDrink;
                } else if (item.type === 'brownie' || (item.name && item.name.includes('브라우니'))) {
                    summary.brownie.count += qty;
                    summary.brownie.amount += qty * PRICES.brownie;
                    if (item.options) {
                        if (item.options.shape === 'birthdayBear') {
                            summary.brownieOptions.birthdayBear.count += qty;
                            summary.brownieOptions.birthdayBear.amount += qty * PRICES.brownieOptions.birthdayBear;
                        }
                        if (item.options.customSticker) {
                            summary.brownieOptions.customSticker.count += 1;
                            summary.brownieOptions.customSticker.amount += PRICES.brownieOptions.customSticker;
                        }
                        if (item.options.heartMessage) {
                            summary.brownieOptions.heartMessage.count += qty;
                            summary.brownieOptions.heartMessage.amount += qty * PRICES.brownieOptions.heartMessage;
                        }
                        if (item.options.customTopper) summary.brownieOptions.customTopper.count += 1;
                    }
                } else if (item.type === 'scone' || (item.name && item.name.includes('스콘'))) {
                    summary.scone.count += qty;
                    summary.scone.amount += qty * PRICES.scone;
                    if (item.options && item.options.strawberryJam) {
                        summary.sconeOptions.strawberryJam.count += qty;
                        summary.sconeOptions.strawberryJam.amount += qty * PRICES.sconeOptions.strawberryJam;
                    }
                } else if (item.type === 'fortune' || (item.name && item.name.includes('행운쿠키'))) {
                    summary.fortune.count += qty;
                    summary.fortune.amount += qty * PRICES.fortune;
                } else if (item.type === 'airplane' || (item.name && item.name.includes('비행기'))) {
                    summary.airplane.count += qty;
                    summary.airplane.amount += qty * PRICES.airplane;
                } else {
                    summary.others.push(item);
                }
            });

            if (summary.regular.count > 0) detailedRows.push({ name: '일반쿠키', quantity: summary.regular.count, price: PRICES.regular, total: summary.regular.amount });
            if (summary.twoPack.count > 0) detailedRows.push({ name: '2구 패키지', quantity: summary.twoPack.count, price: PRICES.twoPackSet, total: summary.twoPack.amount });
            if (summary.singleDrink.count > 0) detailedRows.push({ name: '1구 + 음료', quantity: summary.singleDrink.count, price: PRICES.singleWithDrink, total: summary.singleDrink.amount });

            if (summary.brownie.count > 0) {
                detailedRows.push({ name: '브라우니쿠키', quantity: summary.brownie.count, price: PRICES.brownie, total: summary.brownie.amount });
                if (summary.brownieOptions.customTopper.count > 0) detailedRows.push({ name: 'ㄴ 커스텀토퍼', quantity: '', price: '', total: '' });
                if (summary.brownieOptions.birthdayBear.count > 0) detailedRows.push({ name: 'ㄴ 생일곰 추가', quantity: summary.brownieOptions.birthdayBear.count, price: PRICES.brownieOptions.birthdayBear, total: summary.brownieOptions.birthdayBear.amount });
                if (summary.brownieOptions.customSticker.count > 0) detailedRows.push({ name: 'ㄴ 하단 커스텀 스티커', quantity: summary.brownieOptions.customSticker.count, price: PRICES.brownieOptions.customSticker, total: summary.brownieOptions.customSticker.amount });
                if (summary.brownieOptions.heartMessage.count > 0) detailedRows.push({ name: 'ㄴ 하트안 문구 추가', quantity: summary.brownieOptions.heartMessage.count, price: PRICES.brownieOptions.heartMessage, total: summary.brownieOptions.heartMessage.amount });
            }

            if (summary.scone.count > 0) {
                detailedRows.push({ name: '스콘', quantity: summary.scone.count, price: PRICES.scone, total: summary.scone.amount });
                if (summary.sconeOptions.strawberryJam.count > 0) detailedRows.push({ name: 'ㄴ 딸기잼 추가', quantity: summary.sconeOptions.strawberryJam.count, price: PRICES.sconeOptions.strawberryJam, total: summary.sconeOptions.strawberryJam.amount });
            }

            if (summary.fortune.count > 0) detailedRows.push({ name: '행운쿠키', quantity: summary.fortune.count, price: PRICES.fortune, total: summary.fortune.amount });
            if (summary.airplane.count > 0) detailedRows.push({ name: '비행기샌드쿠키', quantity: summary.airplane.count, price: PRICES.airplane, total: summary.airplane.amount });

            summary.others.forEach(item => {
                detailedRows.push({ name: item.name, quantity: item.quantity, price: item.price, total: item.price * item.quantity });
            });

            // 배송비/포장비 (추론)
            const currentTotal = detailedRows.reduce((sum, row) => sum + (typeof row.total === 'number' ? row.total : 0), 0);
            const diff = order.totalPrice - currentTotal;
            if (diff > 0) {
                detailedRows.push({ name: '배송비 및 포장비', quantity: 1, price: diff, total: diff });
            }

            // 상세 텍스트 (기존 방식)
            detailOptionText = order.orderItems.map(item => {
                let optionsText = '';
                if (item.options) {
                    const parts = [];
                    if (item.options.shape) {
                        const shapeMap: any = { bear: '곰', rabbit: '토끼', birthdayBear: '생일곰', tiger: '호랑이' };
                        parts.push(`${shapeMap[item.options.shape] || item.options.shape} 모양`);
                    }
                    if (item.options.customSticker) parts.push('커스텀스티커');
                    if (item.options.heartMessage) parts.push(`하트메시지: ${item.options.heartMessage}`);
                    if (item.options.strawberryJam) parts.push('딸기잼');
                    if (item.options.selectedCookies) parts.push(`쿠키: ${item.options.selectedCookies.join(', ')}`); // 2구 패키지 등
                    optionsText = parts.join(', ');
                }
                return `• ${item.name} (${item.quantity}개)${optionsText ? `: ${optionsText}` : ''}`;
            }).join('<br>');
        }

        // 1. HTML 콘텐츠 생성 (이메일 견적서 스타일)
        const htmlContent = `
            <table style="border-collapse: collapse; width: 100%; font-family: sans-serif;">
                <!-- 제목 -->
                <tr>
                    <td colspan="4" style="background-color: #4F46E5; color: white; padding: 15px; text-align: center; font-size: 24px; font-weight: bold;">
                        nothingmatters 견적서
                    </td>
                </tr>
                <!-- 고객 정보 -->
                <tr>
                    <td colspan="4" style="border: 1px solid #000; padding: 10px;">
                        고객명: ${order.customerName} | 연락처: ${order.customerContact} ${orderAny.customerPhone ? `| 핸드폰: ${orderAny.customerPhone}` : ''}
                    </td>
                </tr>
                <tr>
                    <td colspan="4" style="border: 1px solid #000; padding: 10px;">
                        수령 방법: ${order.deliveryMethod === 'quick' ? '퀵 배송' : '픽업'} | 수령 희망일: ${order.deliveryDate} ${order.pickupTime ? `| 시간: ${order.pickupTime}` : ''}<br>
                        ${orderAny.deliveryAddress ? `배송 주소: ${orderAny.deliveryAddress} ${orderAny.deliveryDetailAddress || ''}` : ''}
                    </td>
                </tr>
                <!-- 테이블 헤더 -->
                <tr style="background-color: #E5E7EB; font-weight: bold; text-align: center;">
                    <td style="border: 1px solid #000; padding: 10px;">제품명</td>
                    <td style="border: 1px solid #000; padding: 10px;">수량</td>
                    <td style="border: 1px solid #000; padding: 10px;">단가</td>
                    <td style="border: 1px solid #000; padding: 10px;">합계</td>
                </tr>
                <!-- 주문 항목 (상세 분해) -->
                ${detailedRows.map(item => `
                    <tr>
                        <td style="border: 1px solid #000; padding: 10px; ${item.name.startsWith('ㄴ') ? 'padding-left: 20px;' : ''}">${item.name}</td>
                        <td style="border: 1px solid #000; padding: 10px; text-align: center;">${item.quantity}</td>
                        <td style="border: 1px solid #000; padding: 10px; text-align: right;">${typeof item.price === 'number' ? item.price.toLocaleString() + '원' : ''}</td>
                        <td style="border: 1px solid #000; padding: 10px; text-align: right;">${typeof item.total === 'number' ? item.total.toLocaleString() + '원' : ''}</td>
                    </tr>
                `).join('')}
                <!-- 총 합계 -->
                <tr style="background-color: #4F46E5; color: white; font-weight: bold;">
                    <td colspan="3" style="border: 1px solid #000; padding: 15px; text-align: center;">총 합계</td>
                    <td style="border: 1px solid #000; padding: 15px; text-align: right;">${order.totalPrice.toLocaleString()}원</td>
                </tr>
                <!-- 공백 -->
                <tr><td colspan="4" style="height: 20px;"></td></tr>
                <!-- 주문 상세 옵션 -->
                <tr>
                    <td colspan="4" style="border: 1px solid #000; padding: 10px; font-weight: bold; background-color: #f3f4f6;">주문 상세 옵션</td>
                </tr>
                <tr>
                    <td colspan="4" style="border: 1px solid #000; padding: 10px;">
                        ${detailOptionText}
                    </td>
                </tr>
                <!-- 입금 계좌 -->
                <tr>
                    <td colspan="4" style="border: 1px solid #000; padding: 15px; background-color: #FEF3C7; text-align: center; font-weight: bold;">
                        입금 계좌: 83050104204736 국민은행 (낫띵매터스)
                    </td>
                </tr>
                <!-- 문의 -->
                <tr>
                    <td colspan="4" style="padding: 10px; text-align: center;">
                        주문 문의: 카카오톡 @nothingmatters 또는 010-2866-7976
                    </td>
                </tr>
            </table>
        `;

        // 2. 텍스트 콘텐츠 생성 (기존 TSV)
        const headers = ['날짜', '고객명', '연락처', '상품명', '수량', '단가', '금액'];
        const rows = detailedRows.map(item => [
            format(new Date(), 'yyyy-MM-dd'),
            order.customerName,
            order.customerContact,
            item.name,
            item.quantity,
            item.price,
            item.total
        ]);

        const tsvContent = [
            headers.join('\t'),
            ...rows.map(row => row.join('\t')),
            '',
            ['', '', '', '', '', '총 합계', order.totalPrice].join('\t')
        ].join('\n');

        try {
            const blobHtml = new Blob([htmlContent], { type: 'text/html' });
            const blobText = new Blob([tsvContent], { type: 'text/plain' });

            // ClipboardItem 타입 우회
            const ClipboardItem = (window as any).ClipboardItem;
            const data = [new ClipboardItem({
                'text/html': blobHtml,
                'text/plain': blobText,
            })];

            await navigator.clipboard.write(data);

            toast({
                title: "견적서 서식이 복사되었습니다",
                description: "스프레드시트에 붙여넣기(Ctrl+V) 하세요.",
            });
            window.open('https://sheets.new', '_blank');
        } catch (err) {
            console.error('Clipboard write failed:', err);
            // 실패 시 텍스트만 복사 시도
            navigator.clipboard.writeText(tsvContent).then(() => {
                toast({
                    title: "텍스트만 복사되었습니다",
                    description: "서식 복사에 실패하여 데이터만 복사했습니다.",
                });
                window.open('https://sheets.new', '_blank');
            });
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
                            {order.orderItems.filter(item => item.type !== 'meta' && item.type !== 'packaging').map((item, index) => (
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
                                {(() => {
                                    const allItems = [];
                                    const packagingItems = order.orderItems.filter(item => item.type === 'packaging');

                                    order.orderItems.filter(item => item.type !== 'meta' && item.type !== 'packaging').forEach((item, index) => {
                                        const items = [];

                                        // Main item
                                        items.push(
                                            <div key={`${index}-main`} className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">
                                                    {item.name} × {item.quantity}
                                                </span>
                                                <span>{formatCurrency(item.price * item.quantity)}</span>
                                            </div>
                                        );

                                        // Add packaging as sub-items after regular cookies
                                        if (item.type === 'regular' && packagingItems.length > 0) {
                                            packagingItems.forEach((pkgItem, pkgIndex) => {
                                                items.push(
                                                    <div key={`${index}-pkg-${pkgIndex}`} className="flex items-center justify-between text-sm">
                                                        <span className="text-muted-foreground ml-4">
                                                            ㄴ{pkgItem.name} × {pkgItem.quantity}
                                                        </span>
                                                        <span>{formatCurrency(pkgItem.price * pkgItem.quantity)}</span>
                                                    </div>
                                                );
                                            });
                                        }

                                        // Add brownie options as sub-items
                                        if (item.type === 'brownie' && item.options) {
                                            if (item.options.customSticker) {
                                                items.push(
                                                    <div key={`${index}-sticker`} className="flex items-center justify-between text-sm">
                                                        <span className="text-muted-foreground ml-4">
                                                            ㄴ하단 커스텀 스티커 × 1
                                                        </span>
                                                        <span>{formatCurrency(cookiePrices.brownieOptions.customSticker)}</span>
                                                    </div>
                                                );
                                            }
                                            if (item.options.heartMessage) {
                                                const heartMessagePrice = item.quantity * cookiePrices.brownieOptions.heartMessage;
                                                items.push(
                                                    <div key={`${index}-heart`} className="flex items-center justify-between text-sm">
                                                        <span className="text-muted-foreground ml-4">
                                                            ㄴ하트안 문구 추가 × {item.quantity}
                                                        </span>
                                                        <span>{formatCurrency(heartMessagePrice)}</span>
                                                    </div>
                                                );
                                            }
                                            if (item.options.customTopper) {
                                                items.push(
                                                    <div key={`${index}-topper`} className="flex items-center justify-between text-sm">
                                                        <span className="text-muted-foreground ml-4">
                                                            ㄴ커스텀 토퍼
                                                        </span>
                                                        <span></span>
                                                    </div>
                                                );
                                            }
                                        }

                                        allItems.push(...items);
                                    });

                                    return allItems;
                                })()}
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

                        <Button
                            onClick={handleCopyToSheet}
                            className="w-full"
                            variant="outline"
                        >
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            스프레드시트로 복사
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
