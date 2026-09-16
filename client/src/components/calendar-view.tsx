import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Order {
    id: string;
    customerName: string;
    customerContact: string;
    deliveryDate: string;
    deliveryMethod?: string;
    pickupTime?: string;
    orderItems: any[];
    totalPrice: number;
    orderStatus?: string;
    paymentConfirmed?: number;
    createdAt: string;
}

interface CalendarViewProps {
    orders: Order[];
    onOrderClick: (order: Order) => void;
}

export function CalendarView({ orders, onOrderClick }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // 현재 월의 첫 날과 마지막 날 계산
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // 달력에 표시할 날짜들 생성
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    // 달력 날짜 배열 생성
    const calendarDays: Date[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
        calendarDays.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    // 날짜별 주문 그룹화
    const ordersByDate: { [key: string]: Order[] } = {};
    orders.forEach(order => {
        const dateKey = order.deliveryDate;
        if (!ordersByDate[dateKey]) {
            ordersByDate[dateKey] = [];
        }
        ordersByDate[dateKey].push(order);
    });

    // 이전 달로 이동
    const goToPreviousMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
        setSelectedDate(null);
    };

    // 다음 달로 이동
    const goToNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
        setSelectedDate(null);
    };

    // 오늘로 이동
    const goToToday = () => {
        setCurrentDate(new Date());
        setSelectedDate(null);
    };

    // 날짜 포맷팅
    const formatDate = (date: Date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const isCurrentMonth = (date: Date) => {
        return date.getMonth() === month;
    };

    const getDaySummary = (dayOrders: Order[]) => {
        return {
            totalCount: dayOrders.length,
            unpaidCount: dayOrders.filter((order) => !order.paymentConfirmed && order.orderStatus !== 'completed').length,
            quickCount: dayOrders.filter((order) => order.deliveryMethod === 'quick').length,
            pickupCount: dayOrders.filter((order) => order.deliveryMethod !== 'quick').length,
        };
    };

    // 날짜 클릭 핸들러
    const handleDateClick = (date: Date) => {
        const dateKey = formatDate(date);
        setSelectedDate(dateKey);
    };

    // 선택된 날짜의 주문들
    const selectedOrders = selectedDate
        ? [...(ordersByDate[selectedDate] || [])].sort((a, b) => (a.pickupTime || '99:99').localeCompare(b.pickupTime || '99:99'))
        : [];

    return (
        <div className="space-y-4 pb-8">
            {/* 캘린더 헤더 */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl md:text-2xl font-bold">
                    {year}년 {month + 1}월
                </h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={goToToday}>
                        오늘
                    </Button>
                    <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={goToNextMonth}>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs md:text-sm font-medium">
                <div className="text-red-500">일</div>
                <div>월</div>
                <div>화</div>
                <div>수</div>
                <div>목</div>
                <div>금</div>
                <div className="text-blue-500">토</div>
            </div>

            {/* 캘린더 그리드 - 날짜만 간단하게 */}
            <div className="grid grid-cols-7 gap-px bg-border border border-border rounded-lg overflow-hidden">
                {calendarDays.map((date, index) => {
                    const dateKey = formatDate(date);
                    const dayOrders = ordersByDate[dateKey] || [];
                    const daySummary = getDaySummary(dayOrders);
                    const isCurrentMonthDay = isCurrentMonth(date);
                    const isTodayDay = isToday(date);
                    const isSelected = selectedDate === dateKey;

                    return (
                        <button
                            key={index}
                            onClick={() => handleDateClick(date)}
                            className={`
                                relative min-h-[60px] md:min-h-[100px] p-1 md:p-2 bg-background transition-all hover:bg-accent/50 text-left flex flex-col items-start justify-between
                                ${!isCurrentMonthDay ? 'text-muted-foreground bg-muted/10' : ''}
                                ${isSelected ? 'ring-2 ring-blue-500 ring-inset z-10 bg-blue-50/60' : ''}
                            `}
                        >
                            <span className={`
                                text-xs md:text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full
                                ${isTodayDay ? 'bg-primary text-primary-foreground' : ''}
                            `}>
                                {date.getDate()}
                            </span>

                            {dayOrders.length > 0 && (
                                <div className="mt-auto flex w-full flex-col gap-1">
                                    <div className="flex items-center gap-1">
                                        <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                            주문 {daySummary.totalCount}
                                        </span>
                                        {daySummary.unpaidCount > 0 && (
                                            <span className="h-2 w-2 rounded-full bg-red-500" aria-label={`미입금 ${daySummary.unpaidCount}건`} />
                                        )}
                                    </div>
                                    <div className="hidden md:flex flex-wrap gap-1">
                                        {daySummary.quickCount > 0 && (
                                            <span className="inline-flex items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
                                                퀵 {daySummary.quickCount}
                                            </span>
                                        )}
                                        {daySummary.pickupCount > 0 && (
                                            <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                                                픽업 {daySummary.pickupCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* 선택된 날짜의 주문 목록 */}
            {selectedDate && (
                <div className="mt-6">
                    <div className="mb-4 flex items-end justify-between gap-3">
                        <h3 className="text-lg font-semibold">{format(new Date(selectedDate), 'M월 d일 EEEE', { locale: ko })}</h3>
                        <span className="text-sm font-semibold text-muted-foreground">{selectedOrders.length}건</span>
                    </div>

                    {selectedOrders.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            이 날짜에 예정된 배송이 없습니다.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {selectedOrders.map((order) => (
                                <button
                                    key={order.id}
                                    type="button"
                                    className="grid w-full grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border bg-white p-3 text-left transition-colors hover:bg-slate-50"
                                    onClick={() => onOrderClick(order)}
                                >
                                    <span className="text-sm font-black text-slate-900">{order.pickupTime || '미정'}</span>
                                    <span className="min-w-0">
                                        <strong className="block truncate text-sm">{order.customerName} · {order.orderItems.find((item) => item.type !== 'meta')?.name || '주문'}</strong>
                                        <small className="mt-1 block text-xs text-slate-500">{order.deliveryMethod === 'quick' ? '퀵배송' : '픽업'} · {order.paymentConfirmed ? '입금완료' : '미입금'}</small>
                                    </span>
                                    <ChevronRight className="h-4 w-4 text-slate-400" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
