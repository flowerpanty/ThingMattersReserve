import React from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

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

interface QuoteImageTemplateProps {
    order: Order;
}

export const QuoteImageTemplate = React.forwardRef<HTMLDivElement, QuoteImageTemplateProps>(
    ({ order }, ref) => {
        const formatCurrency = (amount: number) => {
            return `${amount.toLocaleString('ko-KR')}원`;
        };

        const formatDateTime = (dateString: string) => {
            try {
                return format(new Date(dateString), 'yyyy년 MM월 dd일', { locale: ko });
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

            const details = [];

            // 2구 패키지 옵션
            if (item.options.selectedCookies) {
                details.push(`쿠키: ${item.options.selectedCookies.join(', ')}`);
            }
            if (item.options.packaging) {
                details.push(`포장: ${item.options.packaging}`);
            }

            // 1구 + 음료 옵션
            if (item.options.selectedCookie) {
                details.push(`쿠키: ${item.options.selectedCookie}`);
            }
            if (item.options.selectedDrink) {
                details.push(`음료: ${item.options.selectedDrink}`);
            }

            // 브라우니 쿠키 옵션
            if (item.options.shape) {
                const shapeName = {
                    'bear': '곰돌이',
                    'rabbit': '토끼',
                    'tiger': '호랑이',
                    'birthdayBear': '생일곰'
                }[item.options.shape] || item.options.shape;
                details.push(`모양: ${shapeName}`);
            }
            if (item.options.customSticker) {
                details.push('커스텀 스티커');
            }
            if (item.options.heartMessage) {
                details.push(`하트메시지: ${item.options.heartMessage}`);
            }
            if (item.options.customTopper) {
                details.push('커스텀 토퍼');
            }

            // 스콘 옵션
            if (item.options.flavor) {
                details.push(`맛: ${item.options.flavor === 'chocolate' ? '초콜릿' : '고메버터'}`);
            }
            if (item.options.strawberryJam) {
                details.push('딸기잼 추가');
            }

            return details.length > 0 ? details.join(' | ') : null;
        };

        return (
            <div ref={ref} style={{
                width: '100%',
                backgroundColor: '#ffffff',
                padding: '32px',
                boxSizing: 'border-box',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                color: '#1a1a1a'
            }}>
                {/* 헤더 */}
                <div style={{ marginBottom: '32px', borderBottom: '3px solid #f59e0b', paddingBottom: '24px' }}>
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        color: '#f59e0b',
                        margin: '0 0 8px 0'
                    }}>
                        낫띵메터스
                    </h1>
                    <h2 style={{
                        fontSize: '24px',
                        fontWeight: '600',
                        color: '#374151',
                        margin: 0
                    }}>
                        주문 견적서
                    </h2>
                </div>

                {/* 고객 정보 */}
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        marginBottom: '12px',
                        color: '#111827',
                        margin: '0 0 12px 0'
                    }}>
                        고객 정보
                    </h3>
                    <div style={{
                        backgroundColor: '#f9fafb',
                        padding: '16px',
                        borderRadius: '8px',
                        fontSize: '14px'
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                                <tr>
                                    <td style={{ padding: '6px 0', verticalAlign: 'top', width: '90px' }}>
                                        <strong>고객명:</strong>
                                    </td>
                                    <td style={{ padding: '6px 0', verticalAlign: 'top' }}>
                                        {order.customerName}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '6px 0', verticalAlign: 'top', width: '90px' }}>
                                        <strong>연락처:</strong>
                                    </td>
                                    <td style={{ padding: '6px 0', verticalAlign: 'top', wordBreak: 'break-all' }}>
                                        {order.customerContact}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '6px 0', verticalAlign: 'top', width: '90px' }}>
                                        <strong>주문번호:</strong>
                                    </td>
                                    <td style={{ padding: '6px 0', verticalAlign: 'top', wordBreak: 'break-all' }}>
                                        {order.id.slice(0, 12)}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '6px 0', verticalAlign: 'top', width: '90px' }}>
                                        <strong>주문일:</strong>
                                    </td>
                                    <td style={{ padding: '6px 0', verticalAlign: 'top' }}>
                                        {formatDateTime(order.createdAt)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 배송 정보 */}
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        marginBottom: '12px',
                        color: '#111827',
                        margin: '0 0 12px 0'
                    }}>
                        배송/픽업 정보
                    </h3>
                    <div style={{
                        backgroundColor: '#f9fafb',
                        padding: '16px',
                        borderRadius: '8px',
                        fontSize: '14px'
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                                <tr>
                                    <td style={{ padding: '6px 0', verticalAlign: 'top', width: '70px' }}>
                                        <strong>방법:</strong>
                                    </td>
                                    <td style={{ padding: '6px 0', verticalAlign: 'top' }}>
                                        {getDeliveryMethodText(order.deliveryMethod)}
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '6px 0', verticalAlign: 'top', width: '70px' }}>
                                        <strong>날짜:</strong>
                                    </td>
                                    <td style={{ padding: '6px 0', verticalAlign: 'top' }}>
                                        {order.deliveryDate}
                                    </td>
                                </tr>
                                {order.pickupTime && (
                                    <tr>
                                        <td style={{ padding: '6px 0', verticalAlign: 'top', width: '70px' }}>
                                            <strong>시간:</strong>
                                        </td>
                                        <td style={{ padding: '6px 0', verticalAlign: 'top' }}>
                                            {order.pickupTime}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 주문 항목 */}
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        marginBottom: '12px',
                        color: '#111827'
                    }}>
                        주문 항목
                    </h3>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '14px'
                    }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #d1d5db' }}>
                                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', width: '40%' }}>품목</th>
                                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', width: '15%' }}>수량</th>
                                <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', width: '20%' }}>단가</th>
                                <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', width: '25%' }}>금액</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.orderItems.map((item, index) => {
                                const optionText = renderOptionDetails(item);
                                return (
                                    <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '12px 8px', verticalAlign: 'top', width: '40%' }}>
                                            <div style={{ fontWeight: '500', marginBottom: '4px' }}>{item.name}</div>
                                            {optionText && (
                                                <div style={{
                                                    fontSize: '12px',
                                                    color: '#6b7280',
                                                    marginTop: '4px',
                                                    wordBreak: 'break-word',
                                                    whiteSpace: 'normal'
                                                }}>
                                                    {optionText}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px 8px', textAlign: 'center', verticalAlign: 'top', width: '15%' }}>{item.quantity}개</td>
                                        <td style={{ padding: '12px 8px', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap', width: '20%' }}>{formatCurrency(item.price)}</td>
                                        <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '500', verticalAlign: 'top', whiteSpace: 'nowrap', width: '25%' }}>
                                            {formatCurrency(item.price * item.quantity)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* 총액 */}
                <div style={{
                    backgroundColor: '#fef3c7',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '32px'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span style={{ fontSize: '20px', fontWeight: '600' }}>총 결제 금액</span>
                        <span style={{
                            fontSize: '28px',
                            fontWeight: 'bold',
                            color: '#f59e0b'
                        }}>
                            {formatCurrency(order.totalPrice)}
                        </span>
                    </div>
                </div>

                {/* 푸터 */}
                <div style={{
                    borderTop: '2px solid #e5e7eb',
                    paddingTop: '20px',
                    fontSize: '12px',
                    color: '#6b7280',
                    textAlign: 'center'
                }}>
                    <div style={{ marginBottom: '8px' }}>
                        문의사항이 있으시면 언제든 연락 주세요.
                    </div>
                    <div style={{ fontWeight: '500' }}>
                        낫띵메터스 | @flowerpanty
                    </div>
                </div>
            </div>
        );
    }
);

QuoteImageTemplate.displayName = 'QuoteImageTemplate';
