import { Badge } from "@/components/ui/badge";

interface OrderStatusBadgeProps {
    status: string;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending':
                return { label: '주문접수', variant: 'secondary' as const, color: 'border-amber-200 bg-amber-50 text-amber-700' };
            case 'order_confirmed':
                return { label: '주문확인', variant: 'secondary' as const, color: 'border-yellow-200 bg-yellow-50 text-yellow-700' };
            case 'payment_confirmed':
                return { label: '입금확인', variant: 'default' as const, color: 'border-blue-200 bg-blue-50 text-blue-700' };
            case 'in_production':
                return { label: '제작중', variant: 'default' as const, color: 'border-violet-200 bg-violet-50 text-violet-700' };
            case 'completed':
                return { label: '완료', variant: 'default' as const, color: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
            default:
                return { label: '알 수 없음', variant: 'outline' as const, color: 'border-slate-200 bg-slate-50 text-slate-600' };
        }
    };

    const { label, color } = getStatusInfo(status);

    return (
        <Badge className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold shadow-none ${color}`}>
            {label}
        </Badge>
    );
}
