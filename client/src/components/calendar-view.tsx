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

    // 날짜 클릭 핸들러
    const handleDateClick = (date: Date) => {
        const dateKey = formatDate(date);
        setSelectedDate(dateKey);
    };

    // 선택된 날짜의 주문들
    const selectedOrders = selectedDate ? (ordersByDate[selectedDate] || []) : [];

    return (
        <div className="space-y-4">
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
            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, index) => {
                    const dateKey = formatDate(date);
                    const dayOrders = ordersByDate[dateKey] || [];
                    const isCurrentMonthDay = isCurrentMonth(date);
                    const isTodayDay = isToday(date);
                    const isSelected = selectedDate === dateKey;

                    return (
                        <button
                            key={index}
                            onClick={() => handleDateClick(date)}
                            className={`
                                relative aspect-square p-1 md:p-2 rounded-lg border transition-all
                                ${!isCurrentMonthDay ? 'opacity-30 bg-muted/20' : 'hover:bg-accent'}
                                ${isTodayDay ? 'bg-primary text-primary-foreground font-bold' : ''}
                                ${isSelected ? 'ring-2 ring-primary bg-primary/10' : ''}
                            `}
                        >
                            <div className="text-xs md:text-sm">
                                {date.getDate()}
                            </div>
                            {/* 주문이 있으면 점으로 표시 */}
                            {dayOrders.length > 0 && (
                                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                                    {Array.from({ length: Math.min(dayOrders.length, 4) }).map((_, i) => (
                                        <div key={i} className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${isTodayDay ? 'bg-primary-foreground' : 'bg-primary'}`} />
                                    ))}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* 선택된 날짜의 주문 목록 */}
            {selectedDate && (
                <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4">
                        {format(new Date(selectedDate), 'M월 d일 (EEEE)', { locale: ko })}
                    </h3>

                    {selectedOrders.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            이 날짜에 예정된 배송이 없습니다.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {selectedOrders.map((order) => (
                                <Card
                                    key={order.id}
                                    className="cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => onOrderClick(order)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h4 className="font-semibold text-base">
                                                        {order.customerName}
                                                    </h4>
                                                    {order.paymentConfirmed === 1 && (
                                                        <Badge variant="default" className="text-xs">
                                                            입금확인
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-sm text-muted-foreground space-y-1">
                                                    <div>
                                                        {order.orderItems.map((item: any, idx: number) => (
                                                            <span key={idx}>
                                                                {item.productName} {item.quantity}개
                                                                {idx < order.orderItems.length - 1 && ', '}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-xs">
                                                            {order.deliveryMethod === 'delivery' ? '배송' : '픽업'}
                                                        </Badge>
                                                        <span className="font-medium text-primary">
                                                            {order.totalPrice.toLocaleString()}원
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
