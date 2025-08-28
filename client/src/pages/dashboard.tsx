import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Package, TrendingUp, Users, RefreshCw, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Link } from 'wouter';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

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
  orderItems: OrderItem[];
  totalPrice: number;
  createdAt: string;
}

interface DashboardStats {
  totalOrders: number;
  todayOrders: number;
  totalRevenue: number;
  popularProducts: Array<{ name: string; count: number; }>;
}

export function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // 주문 목록 조회
  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders');
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      return data as Order[];
    },
    refetchInterval: 30000, // 30초마다 자동 새로고침
  });

  // 통계 계산
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
    .sort(([,a], [,b]) => b - a)
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
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">주문 현황 대시보드</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">낫띵메터스 예약 주문 시스템</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <Link href="/">
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none" data-testid="link-order-form">
                <ShoppingCart className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">주문하기</span>
                <span className="sm:hidden">주문</span>
              </Button>
            </Link>
            <Button 
              onClick={() => refetchOrders()} 
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
                <CardTitle>최근 주문 목록</CardTitle>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="text-center py-8">로딩 중...</div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">주문이 없습니다.</div>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 10).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                        data-testid={`order-${order.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{order.customerName}</h3>
                            <Badge variant="outline">
                              {formatOrderDate(order.createdAt)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            배송일: {order.deliveryDate}
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
                        <div className="text-right">
                          <div className="font-bold text-lg">
                            {formatCurrency(order.totalPrice)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {order.customerContact}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 배송 일정 탭 */}
          <TabsContent value="schedule" className="space-y-4">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  배송 일정
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 border border-border rounded-md text-sm"
                    data-testid="date-picker"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dateOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    선택한 날짜에 예정된 배송이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dateOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg"
                        data-testid={`schedule-order-${order.id}`}
                      >
                        <div>
                          <h3 className="font-semibold">{order.customerName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {order.customerContact}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {order.orderItems.map((item, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {item.name} {item.quantity}개
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">
                            {formatCurrency(order.totalPrice)}
                          </div>
                          <Badge variant="default" className="mt-1">
                            {order.deliveryDate}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                                if (name === 'revenue') return [`${formatCurrency(value)}`, '매출'];
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
                      .sort(([,a], [,b]) => b - a)
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
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}