import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarDays, Package, TrendingUp, RefreshCw, ShoppingCart,
  Search, Truck, Store, Bell,
  CreditCard, Banknote, ArrowRight, Clock, CheckCircle2,
  ChefHat, BarChart3, Filter, ChevronDown, ChevronUp, LogOut, Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Link } from 'wouter';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { PushNotificationToggle } from '@/components/push-notification-toggle';
import { AdminAuth } from '@/components/admin-auth';
import { OrderDetailModal } from '@/components/order-detail-modal';
import { CalendarView } from '@/components/calendar-view';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { InstallPrompt } from '@/components/install-prompt';
import { Skeleton } from '@/components/ui/skeleton';

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
  orderStatus?: string;
  paymentConfirmed?: number;
  paymentMethod?: string | null;
  pickupTime?: string;
  createdAt: string;
}

interface DashboardStats {
  totalOrders: number;
  todayOrders: number;
  totalRevenue: number;
  unpaidCount: number;
  todayPickups: number;
  inProductionCount: number;
  popularProducts: Array<{ name: string; count: number; }>;
}

type DashboardOrderStatus =
  | 'pending'
  | 'order_confirmed'
  | 'payment_confirmed'
  | 'in_production'
  | 'completed';

type OrderFlowAction =
  | {
    label: string;
    type: 'status';
    nextStatus: DashboardOrderStatus;
    toastTitle?: string;
    toastDescription?: string;
  }
  | {
    label: string;
    type: 'payment';
    confirmed: boolean;
    toastTitle?: string;
    toastDescription?: string;
  };

function getNormalizedOrderStatus(order: Pick<Order, 'orderStatus' | 'paymentConfirmed'>): DashboardOrderStatus {
  const rawStatus = order.orderStatus || 'pending';

  if (order.paymentConfirmed && (rawStatus === 'pending' || rawStatus === 'order_confirmed')) {
    return 'payment_confirmed';
  }

  if (
    rawStatus === 'order_confirmed' ||
    rawStatus === 'payment_confirmed' ||
    rawStatus === 'in_production' ||
    rawStatus === 'completed'
  ) {
    return rawStatus;
  }

  return 'pending';
}

function getOrderFilterStatus(order: Pick<Order, 'orderStatus' | 'paymentConfirmed'>): Exclude<DashboardOrderStatus, 'order_confirmed'> {
  const status = getNormalizedOrderStatus(order);
  return status === 'order_confirmed' ? 'pending' : status;
}

function getPrimaryAction(order: Pick<Order, 'orderStatus' | 'paymentConfirmed'>): OrderFlowAction | null {
  const status = getNormalizedOrderStatus(order);

  switch (status) {
    case 'pending':
      return {
        label: '주문확인',
        type: 'status' as const,
        nextStatus: 'order_confirmed' as DashboardOrderStatus,
        toastTitle: '주문 확인 완료',
      };
    case 'order_confirmed':
      return {
        label: '입금확인',
        type: 'payment' as const,
        confirmed: true,
        toastTitle: '입금 확인 완료',
      };
    case 'payment_confirmed':
      return {
        label: '제작시작',
        type: 'status' as const,
        nextStatus: 'in_production' as DashboardOrderStatus,
        toastTitle: '제작 시작',
      };
    case 'in_production':
      return {
        label: '완료처리',
        type: 'status' as const,
        nextStatus: 'completed' as DashboardOrderStatus,
        toastTitle: '완료 처리됨',
        toastDescription: '완료 탭에서 완료취소로 다시 되돌릴 수 있어요.',
      };
    case 'completed':
      return {
        label: '완료취소',
        type: 'status' as const,
        nextStatus: 'in_production' as DashboardOrderStatus,
        toastTitle: '완료 취소됨',
        toastDescription: '주문이 다시 제작중 상태로 돌아갔어요.',
      };
  }
}

function getPreviousAction(order: Pick<Order, 'orderStatus' | 'paymentConfirmed'>): OrderFlowAction | null {
  const status = getNormalizedOrderStatus(order);

  switch (status) {
    case 'order_confirmed':
      return {
        label: '이전',
        type: 'status' as const,
        nextStatus: 'pending',
        toastTitle: '주문접수로 되돌림',
      };
    case 'payment_confirmed':
      return {
        label: '이전',
        type: 'payment' as const,
        confirmed: false,
        toastTitle: '입금 확인 취소',
      };
    case 'in_production':
      return {
        label: '이전',
        type: 'status' as const,
        nextStatus: 'payment_confirmed',
        toastTitle: '제작 시작 전으로 되돌림',
      };
    default:
      return null;
  }
}

function getProgressControlInfo(order: Pick<Order, 'orderStatus' | 'paymentConfirmed'>) {
  const primaryAction = getPrimaryAction(order);
  const status = getNormalizedOrderStatus(order);

  if (!primaryAction) {
    return {
      label: '완료',
      description: '처리 완료',
      tone: 'border-green-200 bg-green-100 text-green-700',
      disabled: true,
    };
  }

  const toneMap: Record<string, string> = {
    주문확인: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
    입금확인: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
    제작시작: 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100',
    완료처리: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    완료취소: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  };

  const descriptionMap: Record<string, string> = {
    pending: '다음 단계',
    order_confirmed: '입금 체크',
    payment_confirmed: '작업 시작',
    in_production: '완료 처리',
    completed: '제작중 복귀',
  };

  return {
    label: primaryAction.label,
    description: descriptionMap[status] || '다음 단계',
    tone: toneMap[primaryAction.label] || 'border-border bg-background text-foreground hover:bg-accent',
    disabled: false,
  };
}

function getOrderProgressTags(order: Pick<Order, 'orderStatus' | 'paymentConfirmed'>) {
  const status = getNormalizedOrderStatus(order);
  const isOrderConfirmed = status !== 'pending';
  const isPaymentConfirmed =
    status === 'payment_confirmed' ||
    status === 'in_production' ||
    status === 'completed';

  const tags: Array<{ label: string; tone: string }> = [
    {
      label: '주문확인',
      tone: isOrderConfirmed
        ? 'border-slate-200 bg-slate-100 text-slate-700'
        : 'border-amber-200 bg-amber-50 text-amber-700',
    },
    {
      label: '입금확인',
      tone: isPaymentConfirmed
        ? 'border-blue-200 bg-blue-50 text-blue-700'
        : status === 'order_confirmed'
          ? 'border-blue-200 bg-blue-50 text-blue-700'
          : 'border-slate-200 bg-white text-slate-400',
    },
  ];

  if (status === 'payment_confirmed') {
    tags.push({ label: '제작대기', tone: 'border-violet-200 bg-violet-50 text-violet-700' });
  } else if (status === 'in_production') {
    tags.push({ label: '제작중', tone: 'border-violet-200 bg-violet-50 text-violet-700' });
  } else if (status === 'completed') {
    tags.push({ label: '완료', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' });
  }

  return tags;
}

// 결제 방법 선택 컴포넌트
function PaymentMethodSelector({ order, onUpdate }: { order: Order; onUpdate: (method: string | null) => void }) {
  const methods = [
    { key: 'card', icon: <CreditCard className="w-3.5 h-3.5" />, label: '카드', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
    { key: 'cash', icon: <Banknote className="w-3.5 h-3.5" />, label: '현금', color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' },
    { key: 'transfer', icon: <ArrowRight className="w-3.5 h-3.5" />, label: '계좌', color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
  ];

  return (
    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
      {methods.map(m => (
        <button
          key={m.key}
          onClick={() => onUpdate(order.paymentMethod === m.key ? null : m.key)}
          className={`
            flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-all
            ${order.paymentMethod === m.key ? m.color + ' ring-1 ring-offset-1' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'}
          `}
        >
          {m.icon}
          <span className="hidden sm:inline">{m.label}</span>
        </button>
      ))}
    </div>
  );
}

// 오늘의 할 일 요약 카드
function TodaySummaryCards({ stats }: { stats: DashboardStats }) {
  const cards = [
    {
      icon: <Clock className="w-5 h-5" />,
      label: '미확인 입금',
      value: stats.unpaidCount,
      color: stats.unpaidCount > 0 ? 'text-red-600 bg-red-50 border-red-200' : 'text-gray-500 bg-gray-50 border-gray-200',
      pulse: stats.unpaidCount > 0,
    },
    {
      icon: <ChefHat className="w-5 h-5" />,
      label: '제작 중',
      value: stats.inProductionCount,
      color: stats.inProductionCount > 0 ? 'text-purple-600 bg-purple-50 border-purple-200' : 'text-gray-500 bg-gray-50 border-gray-200',
    },
    {
      icon: <Package className="w-5 h-5" />,
      label: '오늘 픽업',
      value: stats.todayPickups,
      color: stats.todayPickups > 0 ? 'text-blue-600 bg-blue-50 border-blue-200' : 'text-gray-500 bg-gray-50 border-gray-200',
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      label: '총 매출',
      value: `${(stats.totalRevenue / 10000).toFixed(0)}만`,
      color: 'text-green-600 bg-green-50 border-green-200',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 md:gap-3">
      {cards.map((card, i) => (
        <div key={i} className={`${card.color} border rounded-xl p-3 text-center transition-all`}>
          <div className="flex justify-center mb-1">{card.icon}</div>
          <div className={`text-lg md:text-2xl font-bold ${card.pulse ? 'animate-pulse' : ''}`}>{card.value}</div>
          <div className="text-xs font-medium opacity-80">{card.label}</div>
        </div>
      ))}
    </div>
  );
}

function TodaySummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-2 md:gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-xl border bg-white p-3">
          <Skeleton className="h-5 w-5 mx-auto mb-2 rounded-full" />
          <Skeleton className="h-7 w-12 mx-auto mb-2" />
          <Skeleton className="h-3 w-16 mx-auto" />
        </div>
      ))}
    </div>
  );
}

function OrdersListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-xl border bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <Skeleton className="h-5 w-5 rounded-md mt-1" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
            <div className="space-y-2 text-right">
              <Skeleton className="h-5 w-20 ml-auto" />
              <Skeleton className="h-3 w-14 ml-auto" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// 주문 상태 필터 탭
function StatusFilterTabs({
  activeFilter,
  onFilterChange,
  counts
}: {
  activeFilter: string;
  onFilterChange: (f: string) => void;
  counts: Record<string, number>;
}) {
  const filters = [
    { key: 'all', label: '전체', emoji: '📋' },
    { key: 'pending', label: '주문확인', emoji: '⏳' },
    { key: 'payment_confirmed', label: '입금완료', emoji: '💰' },
    { key: 'in_production', label: '제작중', emoji: '👩‍🍳' },
    { key: 'completed', label: '완료', emoji: '✅' },
  ];

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      {filters.map(f => (
        <button
          key={f.key}
          onClick={() => onFilterChange(f.key)}
          className={`
            flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border
            ${activeFilter === f.key
              ? 'bg-primary text-primary-foreground border-primary shadow-md'
              : 'bg-background text-muted-foreground border-border hover:bg-accent'
            }
          `}
        >
          <span>{f.emoji}</span>
          <span>{f.label}</span>
          {counts[f.key] > 0 && (
            <span className={`
              inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold
              ${activeFilter === f.key ? 'bg-white/20' : 'bg-muted'}
            `}>
              {counts[f.key]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// 단일 주문 카드 컴포넌트
function OrderCard({
  order,
  isSelectionMode,
  isSelected,
  onToggleSelect,
  onView,
  onAdvanceStatus,
  onUpdatePaymentMethod,
  onDelete,
}: {
  order: Order;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string, checked: boolean) => void;
  onView: (order: Order) => void;
  onAdvanceStatus: (order: Order, overrideAction?: OrderFlowAction | null) => void;
  onUpdatePaymentMethod: (id: string, method: string | null) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const displayStatus = getNormalizedOrderStatus(order);
  const progressControl = getProgressControlInfo(order);
  const previousAction = getPreviousAction(order);
  const progressTags = getOrderProgressTags(order);
  const nonMetaItems = order.orderItems.filter((item) => item.type !== 'meta');
  const itemCount = nonMetaItems.length;
  const timelineDotTone: Record<DashboardOrderStatus, string> = {
    pending: 'bg-amber-400',
    order_confirmed: 'bg-yellow-400',
    payment_confirmed: 'bg-blue-500',
    in_production: 'bg-violet-500',
    completed: 'bg-emerald-500',
  };

  const formatDeliveryDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'M/d', { locale: ko });
    } catch {
      return dateString;
    }
  };

  const formatCreatedAt = (dateString: string) => {
    try {
      return format(new Date(dateString), 'M/d HH:mm', { locale: ko });
    } catch {
      return dateString;
    }
  };

  return (
    <div
      className={`
        overflow-hidden rounded-3xl border border-slate-200 bg-white transition-all duration-200 hover:border-slate-300 hover:shadow-sm
        ${isSelectionMode && isSelected ? 'ring-2 ring-red-200 bg-red-50/20' : ''}
      `}
    >
      {/* 메인 행 */}
      <div
        className="flex gap-3 p-4 sm:gap-4 sm:p-5 cursor-pointer hover:bg-slate-50/70"
        onClick={() => {
          if (isSelectionMode) {
            onToggleSelect(order.id, !isSelected);
            return;
          }

          onView(order);
        }}
      >
        <div className="hidden sm:flex w-5 shrink-0 flex-col items-center pt-1">
          <div className={`h-2.5 w-2.5 rounded-full ${timelineDotTone[displayStatus]}`} />
          <div className="mt-2 w-px flex-1 bg-slate-200" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                  {order.customerName}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 shadow-none">
                  {order.deliveryMethod === 'quick' ? (
                    <>
                      <Truck className="mr-1 h-3 w-3" />
                      퀵배송
                    </>
                  ) : (
                    <>
                      <Store className="mr-1 h-3 w-3" />
                      픽업
                    </>
                  )}
                </Badge>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {progressTags.map((tag) => (
                  <Badge
                    key={tag.label}
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold shadow-none ${tag.tone}`}
                  >
                    {tag.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 items-start gap-2">
              <div className="text-right">
                <div className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                  {order.totalPrice.toLocaleString()}원
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{itemCount}개 품목</div>

                {!isSelectionMode ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <div className="mt-2 flex items-center justify-end gap-1.5">
                      {previousAction && (
                        <button
                          type="button"
                          onClick={() => onAdvanceStatus(order, previousAction)}
                          className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                        >
                          {previousAction.label}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onAdvanceStatus(order)}
                        disabled={progressControl.disabled}
                        aria-label={`${order.customerName} ${progressControl.label}`}
                        title={progressControl.description}
                        className={`
                          inline-flex h-9 items-center justify-center rounded-full border px-3 text-xs font-semibold transition-all
                          ${progressControl.tone}
                          ${progressControl.disabled ? 'cursor-default opacity-80' : ''}
                        `}
                      >
                        {progressControl.label}
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    onClick={(e) => e.stopPropagation()}
                    className={`
                      mt-2 inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors
                      ${isSelected ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-600'}
                    `}
                    title="삭제할 주문 선택"
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => onToggleSelect(order.id, checked === true)}
                      aria-label={`${order.customerName} 주문 삭제 선택`}
                    />
                    삭제 선택
                  </label>
                )}
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDeliveryDate(order.deliveryDate)}
            </span>
            {order.pickupTime && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {order.pickupTime}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Package className="h-3.5 w-3.5" />
              {itemCount}개 품목
            </span>
          </div>
        </div>
      </div>

      {/* 확장 영역 */}
      {expanded && (
        <div className="space-y-3 border-t bg-slate-50/70 px-4 pb-4" onClick={(e) => e.stopPropagation()}>
          <div className="pt-3 text-[11px] text-muted-foreground">
            주문 접수 {formatCreatedAt(order.createdAt)}
          </div>
          {/* 주문 항목 */}
          <div className="flex flex-wrap gap-1">
            {order.orderItems.filter(i => i.type !== 'meta').map((item, idx) => (
              <Badge key={idx} variant="secondary" className="rounded-full border border-slate-200 bg-white text-xs text-slate-700 shadow-none">
                {item.name} ×{item.quantity}
              </Badge>
            ))}
          </div>

          {/* 결제 방법 */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">결제 방법</span>
            <PaymentMethodSelector order={order} onUpdate={(m) => onUpdatePaymentMethod(order.id, m)} />
          </div>

          {/* 빠른 액션 */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (window.confirm('삭제된 주문 데이터는 복구할 수 없습니다.\\n정말 삭제하시겠습니까?')) {
                  onDelete(order.id);
                }
              }}
              className="h-11 rounded-xl text-sm text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              삭제
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const authStatus = localStorage.getItem('admin_authenticated');
      return authStatus === 'true';
    } catch {
      return false;
    }
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const authStatus = localStorage.getItem('admin_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuthenticate = () => setIsAuthenticated(true);

  const handleLogout = () => {
    localStorage.removeItem('admin_authenticated');
    setIsAuthenticated(false);
    window.location.reload();
  };

  // 주문 상태 업데이트
  const updateOrderStatus = async (
    orderId: string,
    status: string,
    options?: { title?: string; description?: string }
  ) => {
    // Optimistic
    queryClient.setQueryData(['/api/orders'], (old: Order[] | undefined) =>
      (old || []).map(o => o.id === orderId ? { ...o, orderStatus: status } : o)
    );
    try {
      await apiRequest('PATCH', `/api/orders/${orderId}/status`, { status });
      await queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      const labels: Record<string, string> = {
        'order_confirmed': '주문확인',
        'payment_confirmed': '입금확인',
        'in_production': '제작시작',
        'completed': '완료'
      };
      toast({
        title: options?.title || `✅ ${labels[status] || status} 처리 완료`,
        description: options?.description,
      });
    } catch {
      await queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: '상태 업데이트 실패', variant: 'destructive' });
    }
  };

  // 입금 확인 토글 (Optimistic)
  const togglePaymentConfirmed = async (orderId: string, confirmed: boolean) => {
    queryClient.setQueryData(['/api/orders'], (old: Order[] | undefined) =>
      (old || []).map(o => o.id === orderId
        ? {
          ...o,
          paymentConfirmed: confirmed ? 1 : 0,
          orderStatus: confirmed
            ? (o.orderStatus === 'in_production' || o.orderStatus === 'completed' ? o.orderStatus : 'payment_confirmed')
            : (o.orderStatus === 'payment_confirmed' ? 'order_confirmed' : o.orderStatus)
        }
        : o
      )
    );
    try {
      await apiRequest('PATCH', `/api/orders/${orderId}/payment`, { confirmed });
      await queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: confirmed ? '💰 입금 확인 완료' : '입금 확인 취소' });
    } catch {
      await queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: '입금 상태 업데이트 실패', variant: 'destructive' });
    }
  };

  const executeOrderFlowAction = async (order: Order, action: OrderFlowAction | null) => {
    if (!action) {
      return;
    }

    if (action.type === 'payment') {
      await togglePaymentConfirmed(order.id, action.confirmed);
      return;
    }

    await updateOrderStatus(order.id, action.nextStatus, {
      title: action.toastTitle,
      description: action.toastDescription,
    });
  };

  const advanceOrderStatus = async (order: Order, overrideAction?: OrderFlowAction | null) => {
    await executeOrderFlowAction(order, overrideAction ?? getPrimaryAction(order));
  };

  // 결제 방법 업데이트
  const updatePaymentMethod = async (orderId: string, method: string | null) => {
    queryClient.setQueryData(['/api/orders'], (old: Order[] | undefined) =>
      (old || []).map(o => o.id === orderId ? { ...o, paymentMethod: method } : o)
    );
    try {
      await apiRequest('PATCH', `/api/orders/${orderId}/payment-method`, { method });
      await queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      const labels: Record<string, string> = { card: '💳 카드', cash: '💵 현금', transfer: '🏦 계좌이체' };
      toast({ title: method ? `${labels[method]} 설정 완료` : '결제 방법 해제' });
    } catch {
      await queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: '결제 방법 업데이트 실패', variant: 'destructive' });
    }
  };

  // 주문 삭제
  const handleDeleteOrder = async (orderId: string) => {
    try {
      await apiRequest('DELETE', `/api/orders/${orderId}`);
      setSelectedOrderIds((prev) => prev.filter((id) => id !== orderId));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
        setIsModalOpen(false);
      }
      toast({ title: '주문이 삭제되었습니다.' });
      await queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    } catch {
      toast({ title: '주문 삭제 실패', variant: 'destructive' });
    }
  };

  if (!isAuthenticated) {
    return <AdminAuth onAuthenticated={handleAuthenticate} />;
  }

  // 주문 목록 조회
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders');
      if (!response.ok) throw new Error('Failed to fetch orders');
      return await response.json() as Order[];
    },
    refetchInterval: 30000,
    retry: 3,
  });

  // 필터링
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 검색 필터
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!order.customerName.toLowerCase().includes(q) &&
          !order.customerContact.toLowerCase().includes(q) &&
          !order.id.toLowerCase().includes(q)) return false;
      }

      const effectiveStatus = getOrderFilterStatus(order);

      // 상태 필터
      if (statusFilter === 'all') {
        if (effectiveStatus === 'completed') return false;
      } else if (effectiveStatus !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [orders, searchQuery, statusFilter]);

  const filteredOrderIds = useMemo(() => filteredOrders.map((order) => order.id), [filteredOrders]);

  useEffect(() => {
    const visibleIds = new Set(filteredOrderIds);
    setSelectedOrderIds((prev) => {
      const next = prev.filter((id) => visibleIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [filteredOrderIds]);

  const selectedCount = selectedOrderIds.length;
  const allFilteredSelected = filteredOrderIds.length > 0 && selectedCount === filteredOrderIds.length;

  const toggleOrderSelection = useCallback((orderId: string, checked: boolean) => {
    setSelectedOrderIds((prev) => {
      if (checked) {
        return prev.includes(orderId) ? prev : [...prev, orderId];
      }
      return prev.filter((id) => id !== orderId);
    });
  }, []);

  const toggleSelectAllFiltered = useCallback((checked: boolean) => {
    setSelectedOrderIds(checked ? filteredOrderIds : []);
  }, [filteredOrderIds]);

  const clearSelectedOrders = useCallback(() => {
    setSelectedOrderIds([]);
  }, []);

  const updateSelectionMode = useCallback((next: boolean) => {
    setIsSelectionMode(next);
    if (!next) {
      setSelectedOrderIds([]);
    }
  }, []);

  const handleBulkDeleteOrders = useCallback(async () => {
    if (selectedOrderIds.length === 0) {
      toast({
        title: '삭제할 주문을 먼저 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const confirmed = window.confirm(
      `선택한 ${selectedOrderIds.length}건 주문을 삭제하시겠습니까?\n삭제된 주문 데이터는 복구할 수 없습니다.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await apiRequest('POST', '/api/orders/bulk-delete', {
        ids: selectedOrderIds,
      });
      const result = await response.json();
      const deletedIds = Array.isArray(result.deletedIds) ? result.deletedIds as string[] : [];

      if (selectedOrder && deletedIds.includes(selectedOrder.id)) {
        setSelectedOrder(null);
        setIsModalOpen(false);
      }

      updateSelectionMode(false);
      toast({ title: `${result.deletedCount || deletedIds.length || selectedOrderIds.length}건 주문이 삭제되었습니다.` });
      await queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    } catch {
      toast({ title: '주문 일괄 삭제 실패', variant: 'destructive' });
    }
  }, [queryClient, selectedOrder, selectedOrderIds, toast, updateSelectionMode]);

  // 상태별 카운트
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0, pending: 0, payment_confirmed: 0, in_production: 0, completed: 0 };
    orders.forEach(o => {
      const status = getOrderFilterStatus(o);
      counts[status] = (counts[status] || 0) + 1;
      if (status !== 'completed') {
        counts.all += 1;
      }
    });
    return counts;
  }, [orders]);

  // 통계
  const today = new Date().toISOString().split('T')[0];
  const stats: DashboardStats = useMemo(() => ({
    totalOrders: orders.length,
    todayOrders: orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString()).length,
    totalRevenue: orders.reduce((sum, o) => sum + o.totalPrice, 0),
    unpaidCount: orders.filter(o => !o.paymentConfirmed && o.orderStatus !== 'completed').length,
    todayPickups: orders.filter(o => o.deliveryDate === today).length,
    inProductionCount: orders.filter(o => o.orderStatus === 'in_production').length,
    popularProducts: (() => {
      const counts: Record<string, number> = {};
      orders.forEach(o => o.orderItems.forEach(i => {
        if (i.type !== 'meta') counts[i.name] = (counts[i.name] || 0) + i.quantity;
      }));
      return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, count]) => ({ name, count }));
    })(),
  }), [orders, today]);

  const formatCurrency = (amount: number) => `${amount.toLocaleString('ko-KR')}원`;
  const hasActiveOrderFilters = Boolean(searchQuery) || statusFilter !== 'all';
  const hasOnlyCompletedOrders = !hasActiveOrderFilters && statusCounts.all === 0 && statusCounts.completed > 0;
  const headerOrderSummary = statusFilter === 'all'
    ? `${filteredOrders.length}건 진행 주문`
    : `${filteredOrders.length}건 표시`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* PWA 설치 프롬프트 */}
      <InstallPrompt />

      <div className="mx-auto max-w-4xl p-3 md:p-6 space-y-4 pb-20">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
              🍪 주문 관리
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {headerOrderSummary} • {format(new Date(), 'M월 d일 EEEE', { locale: ko })}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="w-9 h-9" aria-label="알림 설정 열기" title="알림 설정">
                  <Bell className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <PushNotificationToggle />
              </DialogContent>
            </Dialog>
            <Link href="/">
              <Button variant="ghost" size="icon" className="w-9 h-9" aria-label="주문 폼으로 이동" title="주문 폼 열기">
                <ShoppingCart className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/orders'] })}
              variant="ghost"
              size="icon"
              className="w-9 h-9"
              aria-label="주문 목록 새로고침"
              title="새로고침"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-red-500 hover:text-red-700 hover:bg-red-50"
              title="로그아웃"
              aria-label="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 오늘의 요약 */}
        {ordersLoading ? <TodaySummaryCardsSkeleton /> : <TodaySummaryCards stats={stats} />}

        {/* 메인 탭 */}
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-11 rounded-xl">
            <TabsTrigger value="orders" className="text-xs md:text-sm font-semibold rounded-lg">📦 주문</TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs md:text-sm font-semibold rounded-lg">📅 캘린더</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs md:text-sm font-semibold rounded-lg">📊 분석</TabsTrigger>
          </TabsList>

          {/* ===== 주문 목록 탭 ===== */}
          <TabsContent value="orders" className="space-y-3 mt-3">
            {/* 검색 + 필터 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="이름, 이메일 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl border-muted"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <StatusFilterTabs
                  activeFilter={statusFilter}
                  onFilterChange={setStatusFilter}
                  counts={statusCounts}
                />
              </div>

              {!ordersLoading && filteredOrders.length > 0 && (
                <div className="flex justify-end sm:justify-start shrink-0">
                  {isSelectionMode ? (
                    <div className="flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-red-200 bg-red-50/80 px-3 py-2 shadow-sm">
                      <div className="flex items-center gap-2 rounded-full border bg-background px-3 py-2">
                        <Checkbox
                          checked={allFilteredSelected}
                          onCheckedChange={(checked) => toggleSelectAllFiltered(checked === true)}
                          aria-label="현재 목록 전체 선택"
                        />
                        <Label className="text-xs font-medium">전체 선택</Label>
                      </div>
                      <span className="text-xs font-semibold text-red-700">
                        {selectedCount > 0 ? `${selectedCount}건 선택` : '삭제할 주문 선택'}
                      </span>
                      {selectedCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearSelectedOrders} className="h-9 text-xs">
                          선택 해제
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => updateSelectionMode(false)} className="h-9 text-xs">
                        종료
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDeleteOrders}
                        disabled={selectedCount === 0}
                        className="h-9 text-xs font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        삭제
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateSelectionMode(true)}
                      className="h-10 rounded-full px-4 text-sm font-semibold"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      선택 모드
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* 주문 리스트 */}
            {ordersLoading ? (
              <OrdersListSkeleton />
            ) : filteredOrders.length === 0 ? (
              <Card className="border-dashed border-muted-foreground/20 shadow-sm">
                <CardContent className="py-12 text-center">
                  <div className="text-4xl mb-3">
                    {hasOnlyCompletedOrders ? '✅' : hasActiveOrderFilters ? '🔎' : '📭'}
                  </div>
                  <h3 className="text-base font-semibold mb-2">
                    {hasOnlyCompletedOrders
                      ? '진행 중인 주문이 없습니다'
                      : hasActiveOrderFilters
                        ? '조건에 맞는 주문이 없습니다'
                        : '아직 주문이 없습니다'}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    {hasOnlyCompletedOrders
                      ? '완료된 주문은 완료 탭에서 확인할 수 있어요. 전체 탭에는 진행 중인 주문만 보여드리고 있습니다.'
                      : hasActiveOrderFilters
                        ? '검색어나 상태 필터를 초기화하면 다른 주문을 바로 확인할 수 있어요.'
                        : '첫 주문이 들어오면 이 화면에서 입금 확인과 제작 진행을 바로 관리할 수 있어요.'}
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {hasOnlyCompletedOrders ? (
                      <Button
                        variant="outline"
                        onClick={() => setStatusFilter('completed')}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        완료 주문 보기
                      </Button>
                    ) : hasActiveOrderFilters ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('all');
                        }}
                      >
                        <Filter className="w-4 h-4 mr-2" />
                        필터 초기화
                      </Button>
                    ) : (
                      <Link href="/">
                        <Button variant="outline">
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          주문 폼 열기
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/orders'] })}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      새로고침
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedOrderIds.includes(order.id)}
                    onToggleSelect={toggleOrderSelection}
                    onView={(o) => { setSelectedOrder(o); setIsModalOpen(true); }}
                    onAdvanceStatus={advanceOrderStatus}
                    onUpdatePaymentMethod={updatePaymentMethod}
                    onDelete={handleDeleteOrder}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ===== 캘린더 탭 ===== */}
          <TabsContent value="calendar" className="mt-3">
            <Card>
              <CardContent className="p-3 md:p-6">
                <CalendarView
                  orders={orders}
                  onOrderClick={(o) => { setSelectedOrder(o); setIsModalOpen(true); }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== 분석 탭 ===== */}
          <TabsContent value="analytics" className="space-y-4 mt-3">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* 인기 제품 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">🏆 인기 제품</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.popularProducts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">분석할 데이터가 없습니다.</div>
                  ) : (
                    <div className="h-48 md:h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.popularProducts}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} interval={0} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(value) => [`${value}개`, '주문량']} />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 일별 추이 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">📈 최근 7일</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const last7Days = [];
                    for (let i = 6; i >= 0; i--) {
                      const date = new Date();
                      date.setDate(date.getDate() - i);
                      const dateStr = date.toDateString();
                      const dayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === dateStr);
                      last7Days.push({
                        date: format(date, 'M/d'),
                        orders: dayOrders.length,
                        revenue: dayOrders.reduce((sum, o) => sum + o.totalPrice, 0)
                      });
                    }
                    return (
                      <div className="h-48 md:h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={last7Days}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(value, name) => {
                              if (name === 'orders') return [`${value}건`, '주문 수'];
                              return [formatCurrency(Number(value)), '매출'];
                            }} />
                            <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* 제품별 매출 + 요약 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">🥧 제품별 매출</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const productRevenue: Record<string, number> = {};
                    orders.forEach(o => o.orderItems.forEach(i => {
                      if (i.type !== 'meta') productRevenue[i.name] = (productRevenue[i.name] || 0) + (i.price * i.quantity);
                    }));
                    const pieData = Object.entries(productRevenue).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, v]) => ({ name, value: v }));
                    const colors = ['#6366f1', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6'];
                    return pieData.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">매출 데이터 없음</div>
                    ) : (
                      <div className="h-48 md:h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" outerRadius={65} fill="#8884d8" dataKey="value"
                              label={({ name, percent }) => `${name.length > 5 ? name.substring(0, 5) + '..' : name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {pieData.map((_, i) => (<Cell key={i} fill={colors[i % colors.length]} />))}
                            </Pie>
                            <Tooltip formatter={(v) => [formatCurrency(Number(v)), '매출']} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">📊 요약 통계</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { l: '총 주문', v: `${stats.totalOrders}건`, c: '' },
                    { l: '오늘 주문', v: `${stats.todayOrders}건`, c: 'text-blue-600' },
                    { l: '평균 금액', v: orders.length > 0 ? formatCurrency(Math.round(stats.totalRevenue / orders.length)) : '0원', c: '' },
                    { l: '총 매출', v: formatCurrency(stats.totalRevenue), c: 'text-green-600 font-bold' },
                    { l: '미입금 건', v: `${stats.unpaidCount}건`, c: stats.unpaidCount > 0 ? 'text-red-600 font-bold' : '' },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-2.5 bg-muted/30 rounded-lg">
                      <span className="text-sm">{item.l}</span>
                      <span className={`font-semibold text-sm ${item.c}`}>{item.v}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* 주문 상세 모달 */}
        <OrderDetailModal
          order={selectedOrder}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onDelete={handleDeleteOrder}
        />
      </div>
    </div>
  );
}
