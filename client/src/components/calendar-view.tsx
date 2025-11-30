import { useState } from 'react';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

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

    // 현재 월의 첫 날과 마지막 날 계산
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // 달력에 표시할 날짜들 생성 (이전 달 마지막 주 + 현재 달 + 다음 달 첫 주)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // 주의 시작(일요일)부터

    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // 주의 끝(토요일)까지

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
        const dateKey = order.deliveryDate; // "YYYY-MM-DD" 형식
        if (!ordersByDate[dateKey]) {
            ordersByDate[dateKey] = [];
        }
        ordersByDate[dateKey].push(order);
    });

    // 이전 달로 이동
    const goToPreviousMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    // 다음 달로 이동
    const goToNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    // 오늘로 이동
    const goToToday = () => {
        setCurrentDate(new Date());
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

    return (
        <div className="space-y-4">
            {/* 캘린더 헤더 */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
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
            <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium mb-2">
                <div className="text-red-500">일</div>
                <div>월</div>
                <div>화</div>
                <div>수</div>
                <div>목</div>
                <div>금</div>
                <div className="text-blue-500">토</div>
            </div>

            {/* 캘린더 그리드 */}
            <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((date, index) => {
                    const dateKey = formatDate(date);
                    const dayOrders = ordersByDate[dateKey] || [];
                    const isCurrentMonthDay = isCurrentMonth(date);
                    const isTodayDay = isToday(date);

                    return (
                        <Card
                            key={index}
                            className={`p-2 min-h-[100px] ${!isCurrentMonthDay ? 'opacity-40 bg-muted/20' : ''
                                } ${isTodayDay ? 'ring-2 ring-primary' : ''}`}
                        >
                            <div className="text-sm font-semibold mb-1">
                                {date.getDate()}
                            </div>

                            {dayOrders.length > 0 && (
                                <div className="space-y-1">
                                    {dayOrders.slice(0, 2).map((order) => (
                                        <div
                                            key={order.id}
                                            onClick={() => onOrderClick(order)}
                                            className="text-xs p-1 bg-primary/10 rounded cursor-pointer hover:bg-primary/20 transition-colors"
                                        >
                                            <div className="flex items-center gap-1">
                                                <Package className="w-3 h-3" />
                                                <span className="truncate">{order.customerName}</span>
                                            </div>
                                        </div>
                                    ))}

                                    {dayOrders.length > 2 && (
                                        <div className="text-xs text-muted-foreground text-center">
                                            +{dayOrders.length - 2}개 더
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>

            {/* 범례 */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary rounded"></div>
                    <span>오늘</span>
                </div>
                <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <span>배송 예정 주문</span>
                </div>
            </div>
        </div>
    );
}
