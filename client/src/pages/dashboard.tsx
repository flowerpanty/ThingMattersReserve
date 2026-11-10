import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarDays, Package, TrendingUp, RefreshCw, ShoppingCart,
  Search, Bell,
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
import { isPricingPendingOrder } from '@shared/schema';
import {
  formatReceiptDateHeading, formatReceiptTime, getReceiptDateKey, groupReceiptOrders,
  getDashboardItemLines, getDashboardStatusCounts,
  getNormalizedOrderStatus, selectDashboardOrders, type DashboardOrderStatus,
} from '@/lib/dashboard-orders';

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

const KOREA_TIME_ZONE = 'Asia/Seoul';
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const koreanDateKeyFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: KOREA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const koreanHeaderDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: KOREA_TIME_ZONE,
  month: 'long',
  day: 'numeric',
  weekday: 'long',
});

const koreanTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: KOREA_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function getKoreanDateKey(value: Date | string | number = new Date()) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const parts = koreanDateKeyFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return year && month && day ? `${year}-${month}-${day}` : '';
}

function getKoreanDateKeyWithOffset(baseDate: Date, offsetDays: number) {
  return getKoreanDateKey(baseDate.getTime() + offsetDays * DAY_IN_MS);
}

function formatKoreanDateKeyShort(dateKey: string) {
  const [, month, day] = dateKey.split('-');
  return month && day ? `${Number(month)}/${Number(day)}` : dateKey;
}

function formatKoreanHeaderDate(date: Date) {
  return koreanHeaderDateFormatter.format(date);
}

function getLandingSourceInfo(order: Pick<Order, 'orderItems'>) {
  const meta = order.orderItems.find((item) => item.type === 'meta')?.options || {};
  const source = meta.landingSource || meta.source;
  const labels: Record<string, { label: string; tone: string }> = {
    brookie: { label: '브루키', tone: 'border-orange-200 bg-orange-50 text-orange-700' },
    christmasBrookie: { label: '크리스마스 브루키', tone: 'border-red-200 bg-red-50 text-red-700' },
    cookie7: { label: '수제꾸덕쿠키', tone: 'border-blue-200 bg-blue-50 text-blue-700' },
    lucky: { label: '행운쿠키', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    anniversary: { label: '축하쿠키', tone: 'border-rose-200 bg-rose-50 text-rose-700' },
    cookieFlight: { label: '쿠키플라이트', tone: 'border-sky-200 bg-sky-50 text-sky-700' },
    airplaneButter: { label: '비행기버터쿠키', tone: 'border-amber-200 bg-amber-50 text-amber-800' },
    cookieCrew: { label: '쿠키크루', tone: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700' },
    terminalCookie: { label: '터미널쿠키', tone: 'border-violet-200 bg-violet-50 text-violet-700' },
  };

  return labels[source as string] || null;
}

function getKoreanTimeMinutes(value: Date = new Date()) {
  const parts = koreanTimeFormatter.formatToParts(value);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);

  return Number.isFinite(hour) && Number.isFinite(minute)
    ? hour * 60 + minute
    : 0;
}

function getPickupTimeBounds(value?: string) {
  const times = (value?.match(/\d{1,2}:\d{2}/g) || []).map((time) => {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  });

  if (!times.length) {
    return { start: Number.MAX_SAFE_INTEGER, end: Number.MAX_SAFE_INTEGER };
  }

  return { start: times[0], end: times[times.length - 1] };
}

function getOrderItemSummary(order: Pick<Order, 'orderItems'>) {
  const items = order.orderItems.filter((item) => item.type !== 'meta');
  if (!items.length) return '주문 품목 없음';
  const first = `${items[0].name} ×${items[0].quantity}`;
  return items.length > 1 ? `${first} 외 ${items.length - 1}개` : first;
}

function getDateUrgency(order: Pick<Order, 'deliveryDate' | 'pickupTime' | 'orderStatus' | 'paymentConfirmed'>, todayKey: string) {
  const delivery = new Date(`${order.deliveryDate}T00:00:00+09:00`).getTime();
  const today = new Date(`${todayKey}T00:00:00+09:00`).getTime();
  const diff = Number.isFinite(delivery) && Number.isFinite(today) ? Math.round((delivery - today) / DAY_IN_MS) : 99;
  const completed = getNormalizedOrderStatus(order) === 'completed';
  const timePassed = diff === 0
    && order.pickupTime
    && getPickupTimeBounds(order.pickupTime).end < getKoreanTimeMinutes()
    && !completed;
  const label = timePassed ? '시간 지남' : diff < 0 ? '지난 일정' : diff === 0 ? '오늘' : diff === 1 ? '내일' : `D-${diff}`;
  const tone = completed
    ? 'border-slate-200 bg-slate-50 text-slate-500'
    : timePassed || diff < 0 ? 'border-red-200 bg-red-50 text-red-700'
      : diff === 0 ? 'border-rose-200 bg-rose-50 text-rose-700'
        : diff === 1 ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-slate-200 bg-slate-50 text-slate-600';
  return { label, tone, diff };
}

function sortOperationalOrders(list: Order[]) {
  return [...list].sort((a, b) => {
    const dateCompare = (a.deliveryDate || '9999-12-31').localeCompare(b.deliveryDate || '9999-12-31');
    if (dateCompare) return dateCompare;
    const timeCompare = getPickupTimeBounds(a.pickupTime).start - getPickupTimeBounds(b.pickupTime).start;
    if (timeCompare) return timeCompare;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

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
        toastDescription: '완료 상태로 변경됐어요. 완료취소로 다시 되돌릴 수 있어요.',
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

function getOrderStatusMessage(order: Pick<Order, 'orderStatus' | 'paymentConfirmed'>) {
  const status = getNormalizedOrderStatus(order);

  switch (status) {
    case 'pending':
      return { text: '주문 확인 필요', tone: 'border-amber-200 bg-amber-50 text-amber-700' };
    case 'order_confirmed':
      return { text: '입금 확인 필요', tone: 'border-blue-200 bg-blue-50 text-blue-700' };
    case 'payment_confirmed':
      return { text: '제작 대기', tone: 'border-violet-200 bg-violet-50 text-violet-700' };
    case 'in_production':
      return { text: '제작 중', tone: 'border-violet-200 bg-violet-50 text-violet-700' };
    case 'completed':
      return { text: '완료', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
  }
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
          type="button"
          onClick={() => onUpdate(order.paymentMethod === m.key ? null : m.key)}
          title={`결제 방법: ${m.label}`}
          aria-label={`${order.customerName} 결제 방법 ${m.label}`}
          className={`
            flex min-h-11 min-w-11 items-center gap-1 px-3 py-2 rounded-md text-xs font-medium border transition-all
            ${order.paymentMethod === m.key ? m.color + ' ring-1 ring-offset-1' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'}
          `}
        >
          {m.icon}
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  );
}

function TodayOperationsBoard({
  stats,
  nextOrder,
  todayRevenue,
  onToday,
  onUnpaid,
  onProduction,
  onOpenNext,
}: {
  stats: DashboardStats;
  nextOrder: Order | null;
  todayRevenue: number;
  onToday: () => void;
  onUnpaid: () => void;
  onProduction: () => void;
  onOpenNext: (order: Order) => void;
}) {
  const source = nextOrder ? getLandingSourceInfo(nextOrder) : null;
  const cards = [
    { label: '입금 확인 필요', value: stats.unpaidCount, onClick: onUnpaid, tone: stats.unpaidCount ? 'text-rose-700' : 'text-slate-700' },
    { label: '제작 중', value: stats.inProductionCount, onClick: onProduction, tone: 'text-violet-700' },
    { label: '오늘 수령 예정금액', value: `${todayRevenue.toLocaleString()}원`, tone: 'text-emerald-700' },
  ];

  return (
    <section aria-labelledby="today-board-title" className="grid gap-2 md:grid-cols-[1.2fr_1.8fr] md:gap-3">
      <div className="overflow-hidden rounded-2xl border border-blue-200 bg-blue-50/70">
        <button type="button" onClick={onToday} className="block w-full p-4 text-left transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p id="today-board-title" className="text-sm font-semibold text-blue-700">오늘 수령</p>
            <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{stats.todayPickups}건</p>
          </div>
          <CalendarDays className="h-7 w-7 text-blue-600" />
        </div>
        </button>
        <div className="mx-4 mb-4 rounded-xl border border-blue-100 bg-white/80 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-500">다음 수령/배송</p>
              {nextOrder ? (
                <>
                  <p className="mt-1 truncate text-base font-bold text-slate-900">{nextOrder.pickupTime || '시간 미지정'} · {nextOrder.customerName}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-600">{source?.label || getOrderItemSummary(nextOrder)} · {getOrderItemSummary(nextOrder)}</p>
                </>
              ) : <p className="mt-1 text-sm font-semibold text-slate-600">오늘 남은 수령 일정 없음</p>}
            </div>
            {nextOrder && (
              <button
                type="button"
                onClick={() => onOpenNext(nextOrder)}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                상세 보기 →
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="grid min-w-0 grid-cols-3 gap-2">
        {cards.map((card) => (
          <button key={card.label} type="button" onClick={card.onClick} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:bg-slate-50 disabled:cursor-default" disabled={!card.onClick}>
            <p className={`font-black tracking-tight [overflow-wrap:anywhere] ${typeof card.value === 'number' ? 'text-lg md:text-xl' : 'text-sm sm:text-base md:text-xl'} ${card.tone}`}>{typeof card.value === 'number' ? `${card.value}건` : card.value}</p>
            <p className="mt-1 text-[10px] font-semibold text-slate-500 md:text-xs">{card.label}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function TodaySummaryCardsSkeleton() {
  return (
    <div className="grid gap-2 md:grid-cols-[1.2fr_1.8fr] md:gap-3">
      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-14" />
          </div>
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
        <div className="mt-4 rounded-xl border border-blue-100 bg-white/70 p-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-5 w-36" />
          <Skeleton className="mt-2 h-3 w-44" />
        </div>
      </div>
      <div className="grid min-w-0 grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-xl border bg-white p-3">
            <Skeleton className="h-6 w-14" />
            <Skeleton className="mt-2 h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdersListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-2xl border bg-white p-3.5 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-32 rounded-full" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="mt-3 h-4 w-44" />
          <Skeleton className="mt-2 h-6 w-24 rounded-full" />
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-11 w-16 rounded-xl" />
            <Skeleton className="h-11 flex-1 rounded-xl" />
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
    { key: 'all', label: '전체' },
    { key: 'active', label: '진행중' },
    { key: 'pending', label: '주문확인' },
    { key: 'payment_confirmed', label: '입금완료' },
    { key: 'in_production', label: '제작중' },
    { key: 'completed', label: '완료' },
  ];

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
      {filters.map(f => (
        <button
          key={f.key}
          onClick={() => onFilterChange(f.key)}
          aria-pressed={activeFilter === f.key}
          className={`
            flex min-h-11 items-center justify-center gap-1 px-2 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border
            ${activeFilter === f.key
              ? 'bg-primary text-primary-foreground border-primary shadow-md'
              : 'bg-background text-muted-foreground border-border hover:bg-accent'
            }
          `}
        >
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

const ORDER_GRID = 'lg:grid-cols-[60px_minmax(110px,1fr)_minmax(170px,1.6fr)_132px_100px_158px]';

// Both layouts expose the full saved item list; only management controls collapse.
function OrderRow({
  order, isSelectionMode, isSelected, onToggleSelect, onView, onAdvanceStatus,
  onUpdatePaymentMethod, onDelete, todayKey,
}: {
  order: Order;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string, checked: boolean) => void;
  onView: (order: Order) => void;
  onAdvanceStatus: (order: Order, overrideAction?: OrderFlowAction | null) => Promise<void>;
  onUpdatePaymentMethod: (id: string, method: string | null) => void;
  onDelete: (id: string) => void;
  todayKey: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const progressControl = getProgressControlInfo(order);
  const previousAction = getPreviousAction(order);
  const statusMessage = getOrderStatusMessage(order);
  const landingSource = getLandingSourceInfo(order);
  const urgency = getDateUrgency(order, todayKey);
  const itemLines = getDashboardItemLines(order);
  const completed = getNormalizedOrderStatus(order) === 'completed';
  const managementId = `order-management-${order.id}`;
  const activate = () => isSelectionMode ? onToggleSelect(order.id, !isSelected) : onView(order);
  const advance = async (action?: OrderFlowAction | null) => {
    if (isChanging) return;
    setIsChanging(true);
    try { await onAdvanceStatus(order, action); } finally { setIsChanging(false); }
  };
  const receiptDateKey = getReceiptDateKey(order);
  const receiptLabel = receiptDateKey ? `${formatReceiptDateHeading(receiptDateKey)} ${formatReceiptTime(order)}` : '접수일 미확인';

  return (
    <article data-order-id={order.id} className={`min-w-0 border-b border-slate-200 last:border-b-0 ${isSelected && isSelectionMode ? 'bg-red-50 ring-2 ring-inset ring-red-200' : 'bg-white'}`}>
      <div onClick={activate} className={`grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 p-3.5 lg:grid ${ORDER_GRID} lg:items-start lg:gap-3 lg:p-4 cursor-pointer hover:bg-slate-50/70`}>
        <div className="col-span-2 flex items-center gap-2 text-xs text-slate-500 lg:col-span-1 lg:block lg:pt-1">
          <span className="lg:hidden">접수</span>
          <span className="font-semibold tabular-nums text-slate-700">{formatReceiptTime(order)}</span>
        </div>
        <div className="col-start-1 row-start-2 min-w-0 lg:col-auto lg:row-auto">
          <button type="button" onClick={(event) => { event.stopPropagation(); activate(); }} aria-label={`${order.customerName} 주문 ${isSelectionMode ? '선택' : '상세 보기'}`} className="min-h-11 max-w-full text-left text-base font-bold leading-snug text-slate-950 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 [overflow-wrap:anywhere]">
            {order.customerName}<span className="ml-1 text-xs font-normal text-slate-400" aria-hidden="true">↗</span>
          </button>
          <p className="text-xs leading-relaxed text-slate-500 [overflow-wrap:anywhere]">{order.customerContact || '연락처 미확인'}</p>
          {landingSource && <Badge className={`mt-1.5 max-w-full whitespace-normal rounded-md border px-1.5 py-0.5 text-[10px] font-semibold shadow-none ${landingSource.tone}`}>{landingSource.label}</Badge>}
        </div>
        <div className="col-span-2 row-start-4 min-w-0 border-t border-slate-100 pt-2 lg:col-span-1 lg:row-auto lg:border-0 lg:pt-0">
          <span className="sr-only">상품 및 수량</span>
          {itemLines.length ? <ul className="space-y-1" aria-label={`${order.customerName} 전체 주문 품목`}>
            {itemLines.map((line, index) => <li key={index} className={`flex min-w-0 items-start justify-between gap-2 text-sm leading-relaxed ${line.kind === 'product' ? 'font-medium text-slate-800' : 'text-xs text-slate-500'}`}>
              <span className="min-w-0 [overflow-wrap:anywhere]">{line.prefix && <span className="mr-1 font-normal">{line.prefix} ·</span>}{line.name}</span>
              <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums">{line.kind === 'fee' ? line.amount : line.quantity}</span>
            </li>)}
          </ul> : <p className="text-sm text-slate-500">주문 품목 없음</p>}
        </div>
        <div className="col-span-2 row-start-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-slate-50 px-2.5 py-2 lg:col-span-1 lg:row-auto lg:block lg:rounded-none lg:bg-transparent lg:p-0">
          <span className="text-xs text-slate-500 lg:block">수령</span>
          <span className="text-sm font-bold tabular-nums text-slate-800 lg:mt-1 lg:block">{order.deliveryDate || '날짜 미정'}</span>
          <span className="text-sm font-semibold text-slate-700 lg:mt-0.5 lg:block">{order.pickupTime || '시간 미정'}</span>
          <span className={`text-xs font-medium lg:mt-1 lg:block ${order.deliveryMethod === 'quick' ? 'text-orange-700' : 'text-slate-500'}`}>{order.deliveryMethod === 'quick' ? '퀵배송' : '매장픽업'}</span>
          {!completed && urgency.diff <= 1 && <Badge className={`rounded-md border px-1.5 py-0 text-[10px] shadow-none lg:mt-1 ${urgency.tone}`}>{urgency.label}</Badge>}
        </div>
        <div className="col-start-2 row-start-2 min-w-0 max-w-[140px] text-right lg:col-auto lg:row-auto lg:max-w-none lg:pt-1">
          <p className="text-base font-bold tabular-nums text-slate-950 [overflow-wrap:anywhere]">{isPricingPendingOrder(order) ? '가격 상담 필요' : `${order.totalPrice.toLocaleString('ko-KR')}원`}</p>
          {order.paymentMethod && <p className="mt-1 text-xs text-slate-500">{{ card: '카드', cash: '현금', transfer: '계좌이체' }[order.paymentMethod] || order.paymentMethod}</p>}
        </div>
        <div className="col-span-2 row-start-5 min-w-0 lg:col-span-1 lg:row-auto" onClick={event => event.stopPropagation()}>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className={`rounded-md border px-1.5 py-0.5 text-[11px] font-semibold shadow-none ${order.paymentConfirmed ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>{order.paymentConfirmed ? '입금완료' : '미입금'}</Badge>
            <Badge className={`rounded-md border px-1.5 py-0.5 text-[11px] font-semibold shadow-none ${statusMessage.tone}`}>{statusMessage.text}</Badge>
          </div>
          {isSelectionMode ? <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-semibold">
            <Checkbox checked={isSelected} onCheckedChange={checked => onToggleSelect(order.id, checked === true)} aria-label={`${order.customerName} 주문 삭제 선택`} />삭제 선택
          </label> : <div className="mt-2 flex gap-1.5">
            <button type="button" onClick={() => advance()} disabled={isChanging || progressControl.disabled} aria-label={`${order.customerName} ${progressControl.label}`} title={progressControl.description} className={`min-h-11 min-w-0 flex-1 rounded-lg border px-2 py-2 text-xs font-semibold disabled:opacity-50 ${progressControl.tone}`}>{isChanging ? '처리 중…' : progressControl.label}</button>
            <button type="button" onClick={() => setExpanded(!expanded)} aria-controls={managementId} aria-expanded={expanded} aria-label={`${order.customerName} 주문 관리 ${expanded ? '접기' : '펼치기'}`} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>}
        </div>
      </div>
      {expanded && !isSelectionMode && <div id={managementId} className="flex flex-wrap items-center gap-3 border-t border-slate-200 bg-slate-50 p-3.5" onClick={event => event.stopPropagation()}>
        <p className="w-full text-xs text-slate-500">접수 · {receiptLabel}</p>
        <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-slate-600">결제 방법</span><PaymentMethodSelector order={order} onUpdate={method => onUpdatePaymentMethod(order.id, method)} /></div>
        {previousAction && <Button type="button" variant="outline" disabled={isChanging} onClick={() => advance(previousAction)} className="min-h-11 text-xs">이전 단계로</Button>}
        <Button type="button" variant="outline" onClick={() => onView(order)} className="min-h-11 text-xs">상세 보기</Button>
        <Button type="button" variant="outline" onClick={() => { if (window.confirm('삭제된 주문 데이터는 복구할 수 없습니다.\n정말 삭제하시겠습니까?')) onDelete(order.id); }} className="min-h-11 border-red-200 text-xs text-red-600"><Trash2 className="mr-1 h-4 w-4" />삭제</Button>
      </div>}
    </article>
  );
}

export function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [receiptDateFilter, setReceiptDateFilter] = useState('');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'7d' | '30d' | 'month' | 'all'>('7d');
  const [activeDashboardTab, setActiveDashboardTab] = useState('orders');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [now, setNow] = useState(() => new Date());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;

    fetch('/api/admin/me', { credentials: 'include' })
      .then((response) => response.ok ? response.json() : { authenticated: false })
      .then((data) => {
        if (isMounted) {
          setIsAuthenticated(data.authenticated === true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsAuthenticated(false);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const handleAuthenticate = () => setIsAuthenticated(true);

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/admin/logout');
    } catch {
      // 세션이 이미 만료된 경우에도 화면에서는 로그아웃 상태로 전환한다.
    } finally {
      setIsAuthenticated(false);
      queryClient.clear();
    }
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

  // 주문 목록 조회
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch orders');
      return await response.json() as Order[];
    },
    refetchInterval: 30000,
    retry: 3,
    enabled: isAuthenticated,
  });

  const today = getKoreanDateKey(now);
  const tomorrow = getKoreanDateKeyWithOffset(now, 1);
  const weekEnd = getKoreanDateKeyWithOffset(now, 6 - new Date(`${today}T12:00:00+09:00`).getUTCDay());

  const filteredOrders = useMemo(() => selectDashboardOrders(orders, {
    search: searchQuery, status: statusFilter, product: productFilter,
    receiptDate: receiptDateFilter, delivery: dateFilter, today, tomorrow, weekEnd,
  }, order => getLandingSourceInfo(order)?.label || ''),
  [orders, searchQuery, statusFilter, productFilter, receiptDateFilter, dateFilter, today, tomorrow, weekEnd]);
  const groupedOrders = useMemo(() => groupReceiptOrders(filteredOrders), [filteredOrders]);

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

  const statusCounts = useMemo(() => getDashboardStatusCounts(orders), [orders]);

  // 통계: 날짜 집계는 매장 운영 기준인 한국시간 자정에 맞춘다.
  const todayLabel = formatKoreanHeaderDate(now);
  const stats: DashboardStats = useMemo(() => ({
    totalOrders: orders.length,
    todayOrders: orders.filter(o => getKoreanDateKey(o.createdAt) === today).length,
    totalRevenue: orders.reduce((sum, o) => sum + o.totalPrice, 0),
    unpaidCount: orders.filter(o => !o.paymentConfirmed && o.orderStatus !== 'completed').length,
    todayPickups: orders.filter(o => o.deliveryDate === today && getNormalizedOrderStatus(o) !== 'completed').length,
    inProductionCount: orders.filter(o => o.orderStatus === 'in_production').length,
    popularProducts: (() => {
      const counts: Record<string, number> = {};
      orders.forEach(o => o.orderItems.forEach(i => {
        if (i.type !== 'meta') counts[i.name] = (counts[i.name] || 0) + i.quantity;
      }));
      return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, count]) => ({ name, count }));
    })(),
  }), [orders, today]);

  const todayOrders = useMemo(() => sortOperationalOrders(
    orders.filter((order) => order.deliveryDate === today && getNormalizedOrderStatus(order) !== 'completed')
  ), [orders, today]);
  const currentMinutes = getKoreanTimeMinutes(now);
  const nextTodayOrder = todayOrders.find((order) => getPickupTimeBounds(order.pickupTime).start >= currentMinutes)
    || todayOrders.find((order) => !order.pickupTime)
    || null;
  const todayRevenue = orders.filter((order) => order.deliveryDate === today).reduce((sum, order) => sum + order.totalPrice, 0);

  const analyticsOrders = useMemo(() => {
    if (analyticsPeriod === 'all') return orders;
    const currentMonth = today.slice(0, 7);
    const days = analyticsPeriod === '7d' ? 7 : 30;
    const earliest = getKoreanDateKeyWithOffset(now, -(days - 1));
    return orders.filter((order) => {
      const created = getKoreanDateKey(order.createdAt);
      return analyticsPeriod === 'month' ? created.startsWith(currentMonth) : created >= earliest && created <= today;
    });
  }, [analyticsPeriod, now, orders, today]);

  const analyticsStats = useMemo(() => {
    const revenue = analyticsOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    const counts: Record<string, number> = {};
    analyticsOrders.forEach((order) => order.orderItems.forEach((item) => {
      if (item.type !== 'meta') counts[item.name] = (counts[item.name] || 0) + item.quantity;
    }));
    return {
      orders: analyticsOrders.length,
      revenue,
      average: analyticsOrders.length ? Math.round(revenue / analyticsOrders.length) : 0,
      popularProducts: Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, count]) => ({ name, count })),
    };
  }, [analyticsOrders]);

  const analyticsTrendData = useMemo(() => {
    if (analyticsPeriod === '7d' || analyticsPeriod === '30d') {
      const days = analyticsPeriod === '7d' ? 7 : 30;
      return Array.from({ length: days }, (_, index) => {
        const dateKey = getKoreanDateKeyWithOffset(now, index - days + 1);
        const dayOrders = analyticsOrders.filter((order) => getKoreanDateKey(order.createdAt) === dateKey);
        return { date: formatKoreanDateKeyShort(dateKey), orders: dayOrders.length, revenue: dayOrders.reduce((sum, order) => sum + order.totalPrice, 0) };
      });
    }
    const grouped = new Map<string, Order[]>();
    analyticsOrders.forEach((order) => {
      const key = getKoreanDateKey(order.createdAt);
      grouped.set(key, [...(grouped.get(key) || []), order]);
    });
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([dateKey, dayOrders]) => ({
      date: formatKoreanDateKeyShort(dateKey),
      orders: dayOrders.length,
      revenue: dayOrders.reduce((sum, order) => sum + order.totalPrice, 0),
    }));
  }, [analyticsOrders, analyticsPeriod, now]);

  const formatCurrency = (amount: number) => `${amount.toLocaleString('ko-KR')}원`;
  const hasActiveOrderFilters = Boolean(searchQuery) || statusFilter !== 'all' || productFilter !== 'all' || dateFilter !== 'all' || Boolean(receiptDateFilter);
  const activeFilterCount = Number(Boolean(searchQuery)) + Number(statusFilter !== 'all') + Number(productFilter !== 'all') + Number(dateFilter !== 'all') + Number(Boolean(receiptDateFilter));
  const analyticsXAxisInterval = analyticsPeriod === '7d'
    ? 0
    : Math.max(0, Math.ceil(analyticsTrendData.length / 6) - 1);
  const resetOrderFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setProductFilter('all');
    setDateFilter('all');
    setReceiptDateFilter('');
  };
  const headerOrderSummary = `${filteredOrders.length}건 표시 · 접수일 최신순`;

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <Skeleton className="mx-auto mb-4 h-16 w-16 rounded-full" />
            <Skeleton className="mx-auto mb-3 h-6 w-40" />
            <Skeleton className="mx-auto h-4 w-56" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminAuth onAuthenticated={handleAuthenticate} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* PWA 설치 프롬프트 */}
      <InstallPrompt />

      <div className={`mx-auto p-3 md:p-6 space-y-4 pb-20 ${activeDashboardTab === 'orders' ? 'max-w-7xl' : 'max-w-4xl'}`}>
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
              주문 관리
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {todayLabel} · 전체 {statusCounts.all}건 · 진행 {statusCounts.active}건 <span className="hidden sm:inline">· 한국시간</span>
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
        {ordersLoading ? <TodaySummaryCardsSkeleton /> : (
          <TodayOperationsBoard
            stats={stats}
            nextOrder={nextTodayOrder}
            todayRevenue={todayRevenue}
            onToday={() => { resetOrderFilters(); setActiveDashboardTab('orders'); setStatusFilter('active'); setDateFilter('today'); }}
            onUnpaid={() => { resetOrderFilters(); setActiveDashboardTab('orders'); setStatusFilter('pending'); }}
            onProduction={() => { resetOrderFilters(); setActiveDashboardTab('orders'); setStatusFilter('in_production'); }}
            onOpenNext={(order) => { setSelectedOrder(order); setIsModalOpen(true); }}
          />
        )}

        {/* 메인 탭 */}
        <Tabs value={activeDashboardTab} onValueChange={setActiveDashboardTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-11 rounded-xl">
            <TabsTrigger value="orders" className="text-xs md:text-sm font-semibold rounded-lg">📦 주문</TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs md:text-sm font-semibold rounded-lg">📅 캘린더</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs md:text-sm font-semibold rounded-lg">📊 분석</TabsTrigger>
          </TabsList>

          {/* ===== 주문 목록 탭 ===== */}
          <TabsContent value="orders" className="space-y-3 mt-3">
            <div className="sticky top-0 z-30 -mx-3 space-y-2 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="이름, 연락처, 주문번호 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 rounded-xl border-muted text-base"
                />
              </div>

              <StatusFilterTabs
                activeFilter={statusFilter}
                onFilterChange={setStatusFilter}
                counts={statusCounts}
              />

              <div className="grid grid-cols-2 items-end gap-2 lg:grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_minmax(240px,1fr)]">
                <select value={productFilter} onChange={(event) => setProductFilter(event.target.value)} aria-label="상품 필터" className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold">
                  <option value="all">전체 상품</option>
                  <option value="brookie">브루키</option>
                  <option value="cookie7">꾸덕쿠키</option>
                  <option value="lucky">럭키</option>
                  <option value="anniversary">축하쿠키</option>
                  <option value="cookieFlight">쿠키플라이트</option>
                  <option value="airplaneButter">비행기버터쿠키</option>
                  <option value="cookieCrew">쿠키크루</option>
                  <option value="terminalCookie">터미널쿠키</option>
                  <option value="christmasBrookie">크리스마스 브루키</option>
                </select>
                <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="수령일 필터" className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold">
                  <option value="all">수령일 전체</option>
                  <option value="today">오늘 수령</option>
                  <option value="tomorrow">내일 수령</option>
                  <option value="week">이번주 수령</option>
                </select>
                <div className="col-span-2 flex min-w-0 items-center gap-2 lg:col-span-1">
                  <Label htmlFor="receipt-date-filter" className="shrink-0 text-xs font-semibold text-slate-600">접수일</Label>
                  <Input id="receipt-date-filter" type="date" value={receiptDateFilter} onChange={event => setReceiptDateFilter(event.target.value)} className="h-11 min-w-0 flex-1 rounded-xl text-base" />
                  {receiptDateFilter && <button type="button" aria-label="접수일 필터 해제" onClick={() => setReceiptDateFilter('')} className="min-h-11 min-w-11 rounded-lg border bg-white text-sm">해제</button>}
                </div>
              </div>

              {hasActiveOrderFilters && (
                <div className="flex items-center justify-between gap-3 px-1 text-xs" aria-live="polite">
                  <span className="font-semibold text-slate-600">필터 {activeFilterCount}개 적용 중</span>
                  <button
                    type="button"
                    onClick={resetOrderFilters}
                    className="min-h-8 rounded-lg px-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  >
                    초기화 ×
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500">{headerOrderSummary}</p>
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
                  <div className="text-4xl mb-3">{hasActiveOrderFilters ? '🔎' : '📭'}</div>
                  <h3 className="text-base font-semibold mb-2">{hasActiveOrderFilters ? '조건에 맞는 주문이 없습니다' : '아직 주문이 없습니다'}</h3>
                  <p className="mx-auto max-w-sm text-sm text-muted-foreground">{hasActiveOrderFilters ? '접수일·수령일과 다른 필터를 확인하거나 초기화해 주세요.' : '주문이 들어오면 접수일별로 모아 보여드립니다.'}</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {hasActiveOrderFilters ? <Button variant="outline" onClick={resetOrderFilters}><Filter className="mr-2 h-4 w-4" />필터 초기화</Button> : <Link href="/"><Button variant="outline"><ShoppingCart className="mr-2 h-4 w-4" />주문 폼 열기</Button></Link>}
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
              <div className="space-y-5" aria-label="접수일별 주문 목록">
                {groupedOrders.map(group => (
                  <section key={group.dateKey || 'unknown'} data-receipt-date={group.dateKey || 'unknown'} aria-labelledby={`receipt-heading-${group.dateKey || 'unknown'}`} className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 px-1">
                      <h2 id={`receipt-heading-${group.dateKey || 'unknown'}`} className="text-base font-bold text-slate-900">{formatReceiptDateHeading(group.dateKey)}</h2>
                      <span className="text-sm font-semibold text-slate-500">접수 {group.orders.length}건</span>
                    </div>
                    <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <div className={`hidden gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-500 lg:grid ${ORDER_GRID}`} aria-hidden="true">
                        {['접수시간', '고객·연락처', '상품·수량', '수령일·방법', '금액', '입금·진행'].map(label => <span key={label}>{label}</span>)}
                      </div>
                      {group.orders.map(order => <OrderRow key={order.id} order={order} isSelectionMode={isSelectionMode} isSelected={selectedOrderIds.includes(order.id)} onToggleSelect={toggleOrderSelection}
                        onView={order => { setSelectedOrder(order); setIsModalOpen(true); }} onAdvanceStatus={advanceOrderStatus} onUpdatePaymentMethod={updatePaymentMethod} onDelete={handleDeleteOrder} todayKey={today} />)}
                    </div>
                  </section>
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid flex-1 grid-cols-3 gap-2">
                <div className="rounded-xl border bg-white p-3"><p className="text-lg font-black">{analyticsStats.orders}건</p><p className="text-[10px] text-slate-500">주문</p></div>
                <div className="rounded-xl border bg-white p-3"><p className="text-sm font-black sm:text-lg">{formatCurrency(analyticsStats.revenue)}</p><p className="text-[10px] text-slate-500">매출</p></div>
                <div className="rounded-xl border bg-white p-3"><p className="text-sm font-black sm:text-lg">{formatCurrency(analyticsStats.average)}</p><p className="text-[10px] text-slate-500">평균 주문금액</p></div>
              </div>
              <div className="flex rounded-xl border bg-white p-1" aria-label="분석 기간">
                {([['7d', '7일'], ['30d', '30일'], ['month', '이번 달'], ['all', '전체']] as const).map(([key, label]) => (
                  <button key={key} type="button" aria-pressed={analyticsPeriod === key} onClick={() => setAnalyticsPeriod(key)} className={`rounded-lg px-2.5 py-2 text-xs font-semibold ${analyticsPeriod === key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* 인기 제품 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">🏆 인기 제품</CardTitle>
                </CardHeader>
                <CardContent>
                  {analyticsStats.popularProducts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">분석할 데이터가 없습니다.</div>
                  ) : (
                    <div className="h-48 md:h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsStats.popularProducts}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} interval={0} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(value) => [`${value}개`, '주문량']} />
                          <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 일별 추이 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">주문 추이 · {analyticsPeriod === '30d' ? '30일' : analyticsPeriod === 'month' ? '이번 달' : analyticsPeriod === 'all' ? '전체 기간' : '7일'}</CardTitle>
                </CardHeader>
                <CardContent>
                  {analyticsTrendData.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">분석할 데이터가 없습니다.</div>
                  ) : (
                      <div className="h-48 md:h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analyticsTrendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={analyticsXAxisInterval} minTickGap={18} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(value, name) => {
                              if (name === 'orders') return [`${value}건`, '주문 수'];
                              return [formatCurrency(Number(value)), '매출'];
                            }} />
                            <Line type="monotone" dataKey="orders" stroke="var(--primary)" strokeWidth={2.5} dot={{ fill: 'var(--primary)', strokeWidth: 2, r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                  )}
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
                    analyticsOrders.forEach(o => o.orderItems.forEach(i => {
                      if (i.type !== 'meta') productRevenue[i.name] = (productRevenue[i.name] || 0) + (i.price * i.quantity);
                    }));
                    const pieData = Object.entries(productRevenue).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, v]) => ({ name, value: v }));
                    const colors = ['#6366f1', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6'];
                    return pieData.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">매출 데이터 없음</div>
                    ) : (
                      <div>
                        <div className="h-44 md:h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" outerRadius={65} fill="#8884d8" dataKey="value">
                              {pieData.map((_, i) => (<Cell key={i} fill={colors[i % colors.length]} />))}
                            </Pie>
                            <Tooltip formatter={(v) => [formatCurrency(Number(v)), '매출']} />
                          </PieChart>
                        </ResponsiveContainer>
                        </div>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {pieData.map((item, index) => (
                            <div key={item.name} className="flex items-center justify-between gap-2 text-xs">
                              <span className="flex min-w-0 items-center gap-2"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[index % colors.length] }} /><span className="truncate">{item.name}</span></span>
                              <strong>{formatCurrency(item.value)}</strong>
                            </div>
                          ))}
                        </div>
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
                    { l: '주문', v: `${analyticsStats.orders}건`, c: '' },
                    { l: '평균 금액', v: formatCurrency(analyticsStats.average), c: '' },
                    { l: '매출', v: formatCurrency(analyticsStats.revenue), c: 'text-green-600 font-bold' },
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
          onOrderUpdated={(updatedOrder) => {
            setSelectedOrder(current => current?.id === updatedOrder.id ? updatedOrder : current);
            queryClient.setQueryData(['/api/orders'], (current: Order[] | undefined) =>
              current?.map(order => order.id === updatedOrder.id ? updatedOrder : order)
            );
          }}
        />
      </div>
    </div>
  );
}
