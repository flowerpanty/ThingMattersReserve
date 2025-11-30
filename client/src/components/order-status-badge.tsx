import { Badge } from "@/components/ui/badge";

interface OrderStatusBadgeProps {
    status: string;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending':
                return { label: '주문확인', variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800' };
            case 'payment_confirmed':
                return { label: '입금확인', variant: 'default' as const, color: 'bg-blue-100 text-blue-800' };
            case 'in_production':
                return { label: '제품제작', variant: 'default' as const, color: 'bg-purple-100 text-purple-800' };
            case 'completed':
                return { label: '완료', variant: 'default' as const, color: 'bg-green-100 text-green-800' };
            default:
                return { label: '알 수 없음', variant: 'outline' as const, color: 'bg-gray-100 text-gray-800' };
        }
    };

    const { label, color } = getStatusInfo(status);

    return (
        <Badge className={`${color} border-0`}>
            {label}
        </Badge>
    );
}
