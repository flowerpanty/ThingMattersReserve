import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarDays, Package, TrendingUp, RefreshCw, ShoppingCart,
  MessageCircle, Copy, Check, Search, Truck, Store, Bell,
  CreditCard, Banknote, ArrowRight, Clock, CheckCircle2,
  ChefHat, BarChart3, Filter, ChevronDown, ChevronUp, LogOut
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
import { OrderStatusBadge } from '@/components/order-status-badge';
import { CalendarView } from '@/components/calendar-view';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { InstallPrompt } from '@/components/install-prompt';

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
  onView,
  onTogglePayment,
  onUpdatePaymentMethod,
  onUpdateStatus,
  onGenerateMessage,
  isGeneratingMessage,
}: {
  order: Order;
  onView: (order: Order) => void;
  onTogglePayment: (id: string, confirmed: boolean) => void;
  onUpdatePaymentMethod: (id: string, method: string | null) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onGenerateMessage: (id: string, type: string) => void;
  isGeneratingMessage: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusFlow = ['pending', 'payment_confirmed', 'in_production', 'completed'];
  const currentIdx = statusFlow.indexOf(order.orderStatus || 'pending');
  const nextStatus = currentIdx < statusFlow.length - 1 ? statusFlow[currentIdx + 1] : null;

  const nextStatusLabel: Record<string, string> = {
    'payment_confirmed': '입금확인',
    'in_production': '제작시작',
    'completed': '완료처리',
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'M/d HH:mm', { locale: ko });
    } catch {
      return dateString;
    }
  };

  return (
    <div
      className={`
        border rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg
        ${order.paymentConfirmed ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-orange-400'}
      `}
    >
      {/* 메인 행 */}
      <div
        className="flex items-center gap-3 p-3 md:p-4 cursor-pointer hover:bg-accent/30"
        onClick={() => onView(order)}
      >
        {/* 입금확인 체크 */}
        <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
          <Checkbox
            checked={!!Number(order.paymentConfirmed)}
            onCheckedChange={(checked) => onTogglePayment(order.id, checked as boolean)}
            className="w-5 h-5"
          />
        </div>

        {/* 주문 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-base">{order.customerName}</span>
            {order.deliveryMethod === 'quick' ? (
              <Badge className="bg-orange-100 text-orange-700 border-0 text-[10px] px-1.5 py-0">
                <Truck className="w-3 h-3 mr-0.5" />퀵
              </Badge>
            ) : (
              <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px] px-1.5 py-0">
                <Store className="w-3 h-3 mr-0.5" />픽업
              </Badge>
            )}
            <OrderStatusBadge status={
              (order.paymentConfirmed && order.orderStatus === 'pending')
                ? 'payment_confirmed'
                : (order.orderStatus || 'pending')
            } />
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>📅 {order.deliveryDate}</span>
            {order.pickupTime && <span>⏰ {order.pickupTime}</span>}
            <span>• {formatDate(order.createdAt)}</span>
          </div>
        </div>

        {/* 금액 + 확장 */}
        <div className="text-right flex-shrink-0 flex items-center gap-2">
          <div>
            <div className="font-bold text-base">{order.totalPrice.toLocaleString()}원</div>
            <div className="text-[10px] text-muted-foreground">{order.orderItems.filter(i => i.type !== 'meta').length}개 품목</div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="p-1 hover:bg-accent rounded"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 확장 영역 */}
      {expanded && (
        <div className="px-3 md:px-4 pb-3 space-y-3 border-t bg-muted/20" onClick={(e) => e.stopPropagation()}>
          {/* 주문 항목 */}
          <div className="flex flex-wrap gap-1 pt-2">
            {order.orderItems.filter(i => i.type !== 'meta').map((item, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
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
            {nextStatus && (
              <Button
                size="sm"
                onClick={() => onUpdateStatus(order.id, nextStatus)}
                className="flex-1 h-9 text-xs font-semibold"
              >
                <ArrowRight className="w-3.5 h-3.5 mr-1" />
                {nextStatusLabel[nextStatus]}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onGenerateMessage(order.id, 'order_confirm')}
              disabled={isGeneratingMessage}
              className="h-9 text-xs"
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1" />
              카톡
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
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
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
  const updateOrderStatus = async (orderId: string, status: string) => {
    // Optimistic
    queryClient.setQueryData(['/api/orders'], (old: Order[] | undefined) =>
      (old || []).map(o => o.id === orderId ? { ...o, orderStatus: status } : o)
    );
    try {
      await apiRequest('PATCH', `/api/orders/${orderId}/status`, { status });
      await queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      const labels: Record<string, string> = {
        'payment_confirmed': '입금확인', 'in_production': '제작시작', 'completed': '완료처리'
      };
      toast({ title: `✅ ${labels[status] || status} 처리 완료` });
    } catch {
      await queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: '상태 업데이트 실패', variant: 'destructive' });
    }
  };

  // 입금 확인 토글 (Optimistic)
  const togglePaymentConfirmed = async (orderId: string, confirmed: boolean) => {
    queryClient.setQueryData(['/api/orders'], (old: Order[] | undefined) =>
      (old || []).map(o => o.id === orderId
        ? { ...o, paymentConfirmed: confirmed ? 1 : 0, orderStatus: confirmed ? 'payment_confirmed' : 'pending' }
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

  // 카카오톡 메시지 생성
  const generateKakaoMessage = async (orderId: string, type: string) => {
    setIsGeneratingMessage(true);
    try {
      const response = await apiRequest('POST', '/api/generate-kakao-message', { orderId, messageType: type });
      const result = await response.json();
      setGeneratedMessage(result.message);
      toast({ title: '카카오톡 메시지 생성 완료' });
    } catch {
      toast({ title: '메시지 생성 실패', variant: 'destructive' });
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId('preview');
      toast({ title: '📋 복사 완료' });
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      toast({ title: '복사 실패', variant: 'destructive' });
    }
  };

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
      // 상태 필터
      if (statusFilter !== 'all') {
        const effectiveStatus = (order.paymentConfirmed && order.orderStatus === 'pending')
          ? 'payment_confirmed' : (order.orderStatus || 'pending');
        if (effectiveStatus !== statusFilter) return false;
      }
      return true;
    });
  }, [orders, searchQuery, statusFilter]);

  // 상태별 카운트
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length, pending: 0, payment_confirmed: 0, in_production: 0, completed: 0 };
    orders.forEach(o => {
      const status = (o.paymentConfirmed && o.orderStatus === 'pending') ? 'payment_confirmed' : (o.orderStatus || 'pending');
      counts[status] = (counts[status] || 0) + 1;
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
              {orders.length}건 주문 • {format(new Date(), 'M월 d일 EEEE', { locale: ko })}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="w-9 h-9">
                  <Bell className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <PushNotificationToggle />
              </DialogContent>
            </Dialog>
            <Link href="/">
              <Button variant="ghost" size="icon" className="w-9 h-9">
                <ShoppingCart className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/orders'] })}
              variant="ghost"
              size="icon"
              className="w-9 h-9"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-red-500 hover:text-red-700 hover:bg-red-50"
              title="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 오늘의 요약 */}
        <TodaySummaryCards stats={stats} />

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

            <StatusFilterTabs
              activeFilter={statusFilter}
              onFilterChange={setStatusFilter}
              counts={statusCounts}
            />

            {/* 주문 리스트 */}
            {ordersLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                주문 불러오는 중...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery || statusFilter !== 'all' ? (
                  <>🔍 조건에 맞는 주문이 없습니다.</>
                ) : (
                  <>📄 아직 주문이 없습니다.</>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onView={(o) => { setSelectedOrder(o); setIsModalOpen(true); }}
                    onTogglePayment={togglePaymentConfirmed}
                    onUpdatePaymentMethod={updatePaymentMethod}
                    onUpdateStatus={updateOrderStatus}
                    onGenerateMessage={generateKakaoMessage}
                    isGeneratingMessage={isGeneratingMessage}
                  />
                ))}
              </div>
            )}

            {/* 카카오톡 메시지 미리보기 */}
            {generatedMessage && (
              <Card className="border-2 border-yellow-200 bg-yellow-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span>💬 카카오톡 메시지</span>
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(generatedMessage)} className="h-7 text-xs">
                      {copiedMessageId === 'preview' ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      {copiedMessageId === 'preview' ? '복사됨' : '복사'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-xs bg-white/80 p-3 rounded-lg">{generatedMessage}</pre>
                </CardContent>
              </Card>
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