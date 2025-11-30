import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Package, TrendingUp, Users, RefreshCw, ShoppingCart, MessageCircle, Copy, Check } from 'lucide-react';
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
import { Search, Truck, Store } from 'lucide-react';

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
  pickupTime?: string;
  createdAt: string;
}

interface DashboardStats {
  totalOrders: number;
  todayOrders: number;
  totalRevenue: number;
  popularProducts: Array<{ name: string; count: number; }>;
}

export function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      // 세션 스토리지에서 인증 상태 확인
      const authStatus = sessionStorage.getItem('admin_authenticated');
      console.log('Initial auth status from sessionStorage:', authStatus);
      return authStatus === 'true';
    } catch (error) {
      console.log('SessionStorage access error:', error);
      return false;
    }
  });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [messageType, setMessageType] = useState<'order_confirm' | 'payment_confirm' | 'ready_for_pickup'>('order_confirm');
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 페이지 로드시 인증 상태 확인
  useEffect(() => {
    const authStatus = sessionStorage.getItem('admin_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // 인증 콜백 함수
  const handleAuthenticate = () => {
    setIsAuthenticated(true);
  };

  // 주문 상태 업데이트 함수
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await apiRequest('PATCH', `/api/orders/${orderId}/status`, {
        status
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: '주문 상태가 업데이트되었습니다.' });
    } catch (error) {
      console.error('주문 상태 업데이트 실패:', error);
      toast({ title: '주문 상태 업데이트 실패', variant: 'destructive' });
    }
  };

  // 입금 확인 토글 함수  
  // 입금 확인 토글 함수 (Optimistic Update 적용)
  const togglePaymentConfirmed = async (orderId: string, confirmed: boolean) => {
    // 1. 즉시 UI 업데이트 (Optimistic Update)
    queryClient.setQueryData(['/api/orders'], (oldOrders: Order[] | undefined) => {
      if (!oldOrders) return [];
      return oldOrders.map(order =>
        order.id === orderId
          ? { ...order, paymentConfirmed: confirmed ? 1 : 0, orderStatus: confirmed ? 'payment_confirmed' : 'pending' }
          : order
      );
    });

    try {
      console.log(`입금 확인 요청: ID=${orderId}, Confirmed=${confirmed}`);
      await apiRequest('PATCH', `/api/orders/${orderId}/payment`, { confirmed });

      // 성공 시 확실한 데이터 동기화를 위해 다시 조회
      await queryClient.invalidateQueries({ queryKey: ['/api/orders'] });

      toast({
        title: confirmed ? "입금 확인 완료" : "입금 확인 취소",
        description: confirmed ? "주문 상태가 '결제완료'로 변경되었습니다." : "주문 상태가 '대기중'으로 변경되었습니다.",
      });
    } catch (error) {
      console.error('입금 상태 업데이트 실패:', error);

      // 실패 시 롤백
      await queryClient.invalidateQueries({ queryKey: ['/api/orders'] });

      toast({
        title: '입금 상태 업데이트 실패',
        description: '서버와 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        variant: 'destructive'
      });
    }
  };

  // 주문 삭제
  const handleDeleteOrder = async (orderId: string) => {
    try {
      await apiRequest('DELETE', `/api/orders/${orderId}`);

      toast({ title: '주문이 삭제되었습니다.', variant: 'default' });
      await queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    } catch (error) {
      console.error('주문 삭제 실패:', error);
      toast({ title: '주문 삭제 실패', variant: 'destructive' });
    }
  };

  // 인증되지 않은 경우 로그인 화면 표시
  if (!isAuthenticated) {
    return <AdminAuth onAuthenticated={handleAuthenticate} />;
  }

  // 주문 목록 조회
  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders');
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      console.log('Dashboard orders data:', data); // 디버그용 로그
      return data as Order[];
    },
    refetchInterval: 30000, // 30초마다 자동 새로고침
    retry: 3, // 실패시 3번 재시도
  });

  // 카카오톡 메시지 생성 함수
  const generateKakaoMessage = async (orderId: string, type: 'order_confirm' | 'payment_confirm' | 'ready_for_pickup') => {
    setIsGeneratingMessage(true);
    try {
      const response = await apiRequest('POST', '/api/generate-kakao-message', {
        orderId,
        messageType: type
      });

      const result = await response.json();
      setGeneratedMessage(result.message);
      toast({
        title: "카카오톡 메시지 생성 완료",
        description: `${result.customerName}님을 위한 메시지가 생성되었습니다.`
      });
    } catch (error) {
      console.error('카카오톡 메시지 생성 오류:', error);
      toast({
        title: "메시지 생성 실패",
        description: "카카오톡 메시지 생성 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const copyToClipboard = async (text: string, orderId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(orderId);
      toast({
        title: "복사 완료",
        description: "카카오톡 메시지가 클립보드에 복사되었습니다."
      });
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      toast({
        title: "복사 실패",
        description: "클립보드 복사 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  // 주문 상세 보기
  const handleViewOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  // 주문 검색 필터링
  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.customerName.toLowerCase().includes(query) ||
      order.customerContact.toLowerCase().includes(query) ||
      order.id.toLowerCase().includes(query)
    );
  });

  // 통계 계산 (검색 필터링 결과 기반)
  const stats: DashboardStats = {
    totalOrders: orders.length,
    todayOrders: orders.filter(order =>
      new Date(order.createdAt).toDateString() === new Date().toDateString()
    ).length,
    totalRevenue: orders.reduce((sum, order) => sum + order.totalPrice, 0),
    popularProducts: []
  };

  // 인기 제품 계산
  const productCounts: Record<string, number> = {};
  orders.forEach(order => {
    order.orderItems.forEach(item => {
      productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
    });
  });
  stats.popularProducts = Object.entries(productCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // 선택된 날짜의 주문들
  const dateOrders = orders.filter(order => {
    const orderDate = new Date(order.deliveryDate).toISOString().split('T')[0];
    return orderDate === selectedDate;
  });

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('ko-KR')}원`;
  };

  const formatOrderDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MM/dd HH:mm', { locale: ko });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-background p-3 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
        import {Dialog, DialogContent, DialogTrigger} from "@/components/ui/dialog";
        import {Bell} from 'lucide-react';

        // ... (existing imports)

        // ... (inside Dashboard component return)

        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">주문 현황 대시보드</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">낫띵메터스 예약 주문 시스템</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                  <Bell className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">알림 설정</span>
                  <span className="sm:hidden">알림</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <PushNotificationToggle />
              </DialogContent>
            </Dialog>

            <Link href="/">
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none" data-testid="link-order-form">
                <ShoppingCart className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">주문하기</span>
                <span className="sm:hidden">주문</span>
              </Button>
            </Link>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              data-testid="button-refresh"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">새로고침</span>
              <span className="sm:hidden">새로고침</span>
            </Button>
          </div>
        </div>

        {/* 통계 카드들 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="card-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 주문 수</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="total-orders">
                {stats.totalOrders}
              </div>
              <p className="text-xs text-muted-foreground">전체 누적 주문</p>
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">오늘 주문</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="today-orders">
                {stats.todayOrders}
              </div>
              <p className="text-xs text-muted-foreground">금일 접수된 주문</p>
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 매출</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="total-revenue">
                {formatCurrency(stats.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">누적 주문 금액</p>
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">인기 제품</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="popular-product">
                {stats.popularProducts[0]?.name || '-'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.popularProducts[0] ? `${stats.popularProducts[0].count}개 주문` : '주문 데이터 없음'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 탭 메뉴 */}
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="orders" className="text-xs md:text-sm py-2" data-testid="tab-orders">주문 목록</TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs md:text-sm py-2" data-testid="tab-schedule">배송 일정</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs md:text-sm py-2" data-testid="tab-analytics">분석</TabsTrigger>
          </TabsList>

          {/* 주문 목록 탭 */}
          <TabsContent value="orders" className="space-y-4">
            <Card className="card-shadow">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <CardTitle>최근 주문 목록</CardTitle>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="이름, 연락처 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="search-orders"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="text-center py-8">📦 주문 데이터를 불러오는 중...</div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? (
                      <>
                        🔍 검색 결과가 없습니다.<br />
                        <span className="text-xs">다른 검색어를 입력해보세요.</span>
                      </>
                    ) : (
                      <>
                        📄 아직 주문이 없습니다.<br />
                        <span className="text-xs">새로운 주문이 들어오면 여기에 표시됩니다.</span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredOrders.slice(0, 20).map((order) => (
                      <div
                        key={order.id}
                        onClick={() => handleViewOrderDetail(order)}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-all cursor-pointer hover:shadow-md"
                        data-testid={`order-${order.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{order.customerName}</h3>

                            {/* 배송 방법 아이콘 */}
                            {order.deliveryMethod === 'quick' ? (
                              <Badge className="bg-orange-100 text-orange-800 border-0 flex items-center gap-1">
                                <Truck className="w-3 h-3" />
                                퀵배송
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-800 border-0 flex items-center gap-1">
                                <Store className="w-3 h-3" />
                                픽업
                              </Badge>
                            )}

                            {/* 주문 상태 뱃지 */}
                            <OrderStatusBadge status={
                              (order.paymentConfirmed && order.orderStatus === 'pending')
                                ? 'payment_confirmed'
                                : (order.orderStatus || 'pending')
                            } />

                            {/* 입금 확인 체크박스 */}
                            <div
                              className="flex items-center gap-1 relative z-50"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <Checkbox
                                id={`payment-confirmed-${order.id}`}
                                checked={!!Number(order.paymentConfirmed)}
                                onCheckedChange={(checked) => {
                                  togglePaymentConfirmed(order.id, checked as boolean);
                                }}
                              />
                              <Label
                                htmlFor={`payment-confirmed-${order.id}`}
                                className="text-xs text-muted-foreground cursor-pointer select-none"
                              >
                                입금확인
                              </Label>
                            </div>

                            <Badge variant="outline" className="text-xs">
                              {formatOrderDate(order.createdAt)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            배송일: {order.deliveryDate}
                          </p>
                          <p className="text-sm font-medium text-foreground mt-1">
                            {order.deliveryMethod === 'quick' ? '🚚 퀵 배송' : '🏪 픽업'} 시간: {order.pickupTime || (order as any).pickup_time || '미지정'}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {order.orderItems.slice(0, 3).map((item, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {item.name} {item.quantity}개
                              </Badge>
                            ))}
                            {order.orderItems.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{order.orderItems.length - 3}개 더
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <div className="font-bold text-lg">
                            {formatCurrency(order.totalPrice)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {order.customerContact}
                          </p>
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateKakaoMessage(order.id, 'order_confirm')}
                              disabled={isGeneratingMessage}
                              className="text-xs h-7"
                              data-testid={`kakao-order-confirm-${order.id}`}
                            >
                              <MessageCircle className="h-3 w-3 mr-1" />
                              주문확인
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateKakaoMessage(order.id, 'payment_confirm')}
                              disabled={isGeneratingMessage}
                              className="text-xs h-7"
                              data-testid={`kakao-payment-confirm-${order.id}`}
                            >
                              <MessageCircle className="h-3 w-3 mr-1" />
                              입금확인
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateKakaoMessage(order.id, 'ready_for_pickup')}
                              disabled={isGeneratingMessage}
                              className="text-xs h-7"
                              data-testid={`kakao-ready-pickup-${order.id}`}
                            >
                              <MessageCircle className="h-3 w-3 mr-1" />
                              완성알림
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 카카오톡 메시지 미리보기 */}
            {generatedMessage && (
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>카카오톡 메시지 미리보기</span>
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(generatedMessage, 'preview')}
                      className="h-8"
                      data-testid="copy-message-button"
                    >
                      {copiedMessageId === 'preview' ? (
                        <Check className="h-4 w-4 mr-1" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      {copiedMessageId === 'preview' ? '복사됨' : '복사'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {generatedMessage}
                    </pre>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    💡 위 메시지를 복사해서 카카오톡으로 고객에게 전송하세요.
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 배송 일정 탭 */}
          <TabsContent value="schedule" className="space-y-4">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>배송 일정 캘린더</CardTitle>
              </CardHeader>
              <CardContent>
                <CalendarView
                  orders={orders}
                  onOrderClick={handleViewOrderDetail}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* 분석 탭 */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* 인기 제품 바 차트 */}
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">인기 제품 순위</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.popularProducts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      분석할 데이터가 없습니다.
                    </div>
                  ) : (
                    <div className="h-48 md:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.popularProducts}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 10 }}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            interval={0}
                          />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip
                            formatter={(value) => [`${value}개`, '주문량']}
                            labelStyle={{ color: '#333' }}
                          />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 일별 주문 추이 */}
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">일별 주문 추이 (최근 7일)</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    // 최근 7일 주문 데이터 생성
                    const last7Days = [];
                    for (let i = 6; i >= 0; i--) {
                      const date = new Date();
                      date.setDate(date.getDate() - i);
                      const dateStr = date.toDateString();
                      const dayOrders = orders.filter(order =>
                        new Date(order.createdAt).toDateString() === dateStr
                      );
                      last7Days.push({
                        date: format(date, 'MM/dd'),
                        orders: dayOrders.length,
                        revenue: dayOrders.reduce((sum, order) => sum + order.totalPrice, 0)
                      });
                    }

                    return (
                      <div className="h-48 md:h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={last7Days}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip
                              formatter={(value, name) => {
                                if (name === 'orders') return [`${value}건`, '주문 수'];
                                if (name === 'revenue') return [`${formatCurrency(Number(value))}`, '매출'];
                                return [value, name];
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="orders"
                              stroke="hsl(var(--primary))"
                              strokeWidth={2}
                              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()
                  }
                </CardContent>
              </Card>
            </div>

            {/* 제품별 매출 파이차트와 요약 통계 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">제품별 매출 분포</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    // 제품별 매출 계산
                    const productRevenue: Record<string, number> = {};
                    orders.forEach(order => {
                      order.orderItems.forEach(item => {
                        productRevenue[item.name] = (productRevenue[item.name] || 0) + (item.price * item.quantity);
                      });
                    });

                    const pieData = Object.entries(productRevenue)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([name, revenue]) => ({ name, value: revenue }));

                    const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

                    return pieData.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        매출 데이터가 없습니다.
                      </div>
                    ) : (
                      <div className="h-48 md:h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              outerRadius={60}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => {
                                // 모바일에서는 짧게 표시
                                const shortName = name.length > 6 ? name.substring(0, 6) + '...' : name;
                                return `${shortName} ${(percent * 100).toFixed(0)}%`;
                              }}
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [formatCurrency(Number(value)), '매출']} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()
                  }
                </CardContent>
              </Card>

              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">주문 현황 요약</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm md:text-base">총 주문 건수</span>
                    <span className="font-bold">{stats.totalOrders}건</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm md:text-base">오늘 주문</span>
                    <span className="font-bold text-blue-600">{stats.todayOrders}건</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm md:text-base">평균 주문 금액</span>
                    <span className="font-bold text-xs md:text-base">
                      {orders.length > 0
                        ? formatCurrency(Math.round(stats.totalRevenue / orders.length))
                        : '0원'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm md:text-base">총 매출</span>
                    <span className="font-bold text-green-600 text-xs md:text-base">
                      {formatCurrency(stats.totalRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm md:text-base">이번 주 평균</span>
                    <span className="font-bold text-purple-600">
                      {(() => {
                        const thisWeekOrders = orders.filter(order => {
                          const orderDate = new Date(order.createdAt);
                          const now = new Date();
                          const startOfWeek = new Date(now);
                          startOfWeek.setDate(now.getDate() - now.getDay());
                          return orderDate >= startOfWeek;
                        });
                        return thisWeekOrders.length > 0
                          ? `${Math.round(thisWeekOrders.length / 7)}건/일`
                          : '0건/일';
                      })()
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* 푸시 알림 설정 카드 */}
              <PushNotificationToggle />
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