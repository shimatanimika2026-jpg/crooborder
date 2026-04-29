import { AlertTriangle, Clock, Package, RefreshCw, TrendingUp, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getAllCarriers,
  getCarrierPerformanceStats,
  getExceptionOrders,
  getLogisticsDashboardStats,
  getTimeoutOrders,
} from '@/services/logisticsDashboardService';
import type {
  LogisticsDashboardStats,
  CarrierPerformanceStat,
  LogisticsTimeoutOrder,
  LogisticsExceptionOrder,
  LogisticsStatusDistributionItem,
} from '@/types/database';

export default function LogisticsDashboardPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<LogisticsDashboardStats | null>(null);
  const [carrierPerformance, setCarrierPerformance] = useState<CarrierPerformanceStat[]>([]);
  const [timeoutOrders, setTimeoutOrders] = useState<LogisticsTimeoutOrder[]>([]);
  const [exceptionOrders, setExceptionOrders] = useState<LogisticsExceptionOrder[]>([]);
  const [carriers, setCarriers] = useState<string[]>([]);
  
  // 筛选条件
  const [selectedCarrier, setSelectedCarrier] = useState('all');
  const [timeRange, setTimeRange] = useState('all');

  useEffect(() => {
    loadAllData();
    loadCarriers();
    
    // 设置定时刷新（每5分钟）
    const interval = setInterval(() => {
      loadAllData(true);
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loading) {
      loadAllData();
    }
  }, [selectedCarrier, timeRange]);

  const loadCarriers = async () => {
    try {
      const data = await getAllCarriers('JP');
      setCarriers(data);
    } catch (error) {
      console.error(t('common.error'), error);
    }
  };

  const loadAllData = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    
    try {
      const { startDate, endDate } = getDateRange(timeRange);
      const carrier = selectedCarrier === 'all' ? undefined : selectedCarrier;
      
      // 并行加载所有数据
      const [statsData, performanceData, timeoutData, exceptionData] = await Promise.all([
        getLogisticsDashboardStats('JP', carrier, startDate, endDate),
        getCarrierPerformanceStats('JP', startDate, endDate),
        getTimeoutOrders('JP', carrier, 10),
        getExceptionOrders('JP', carrier, 10),
      ]);
      
      setStats(statsData);
      setCarrierPerformance(performanceData);
      setTimeoutOrders(timeoutData);
      setExceptionOrders(exceptionData);
    } catch (error) {
      console.error(t('common.error'), error);
      if (!silent) {
        toast.error(t('common.error'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getDateRange = (range: string): { startDate?: string; endDate?: string } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (range) {
      case 'today':
        return { startDate: today.toISOString(), endDate: now.toISOString() };
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { startDate: weekAgo.toISOString(), endDate: now.toISOString() };
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return { startDate: monthAgo.toISOString(), endDate: now.toISOString() };
      default:
        return {};
    }
  };

  const getStatusLabel = (status: string) => {
    const labelKeys: Record<string, string> = {
      pending: 'shipping.statusPending',
      preparing: 'shipping.statusPreparing',
      shipped: 'shipping.statusShipped',
      in_transit: 'shipping.statusInTransit',
      customs_clearance: 'shipping.statusCustomsClearance',
      delivering: 'shipping.statusDelivering',
      delivered: 'shipping.statusDelivered',
      exception: 'shipping.statusException',
      cancelled: 'shipping.statusCancelled',
    };
    return t(labelKeys[status] || 'common.unknown');
  };

  const getEventTypeLabel = (type: string) => {
    const labelKeys: Record<string, string> = {
      delay: 'logistics.exceptionDelay',
      damage: 'logistics.exceptionDamage',
      customs_issue: 'logistics.exceptionCustomsIssue',
      address_error: 'logistics.exceptionAddressError',
      lost: 'logistics.exceptionLost',
      returned: 'logistics.exceptionReturned',
      other: 'logistics.exceptionOther',
    };
    return t(labelKeys[type] || 'common.unknown');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-48 bg-muted" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Skeleton className="h-32 bg-muted" />
          <Skeleton className="h-32 bg-muted" />
          <Skeleton className="h-32 bg-muted" />
          <Skeleton className="h-32 bg-muted" />
        </div>
        <Skeleton className="h-96 w-full bg-muted" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-normal">物流看板</h1>
          <p className="text-sm text-muted-foreground mt-1">
            实时监控物流运输状态与关键指标
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedCarrier} onValueChange={setSelectedCarrier}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="承运商" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部承运商</SelectItem>
              {carriers.map(carrier => (
                <SelectItem key={carrier} value={carrier}>
                  {carrier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="时间范围" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部时间</SelectItem>
              <SelectItem value="today">今日</SelectItem>
              <SelectItem value="week">本周</SelectItem>
              <SelectItem value="month">本月</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAllData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 关键指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => navigate('/shipping-orders?status=in_transit')}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              在途订单
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-normal">{stats?.in_transit_count || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('logistics.inTransitOrders')}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => navigate('/shipping-orders?has_exception=true')}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              {t('logistics.exceptionOrders')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-normal text-destructive">
                  {stats?.exception_count || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{t('logistics.exceptionsToProceed')}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              平均运输时长
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-normal">
                  {stats?.avg_transport_hours || 0}
                  <span className="text-lg text-muted-foreground ml-1">小时</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">揽收到签收</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              平均清关时长
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-normal">
                  {stats?.avg_customs_hours || 0}
                  <span className="text-lg text-muted-foreground ml-1">小时</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">清关平均耗时</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 订单状态分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-normal">订单状态分布</CardTitle>
            <CardDescription>各状态订单数量统计</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(stats?.status_distribution?.length ?? 0) > 0 ? (
                stats!.status_distribution.map((item: LogisticsStatusDistributionItem) => {
                  const total = stats!.status_distribution.reduce(
                    (sum: number, i: LogisticsStatusDistributionItem) => sum + i.count,
                    0
                  );
                  const percentage = ((item.count / total) * 100).toFixed(1);
                  
                  return (
                    <div key={item.status} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{getStatusLabel(item.status)}</span>
                        <span className="text-muted-foreground">
                          {item.count} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>{t('common.noData')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 承运商绩效对比 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-normal">{t('logistics.carrierPerformance')}</CardTitle>
            <CardDescription>{t('logistics.onTimeAndExceptionRate')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {carrierPerformance.length > 0 ? (
                carrierPerformance.map((item: CarrierPerformanceStat) => (
                  <div key={item.carrier} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{item.carrier}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">
                          {t('logistics.onTimeRate')}: {item.on_time_rate || 0}%
                        </span>
                        <span className="text-muted-foreground">
                          {t('logistics.exceptionRate')}: {item.exception_rate || 0}%
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${item.on_time_rate || 0}%` }}
                        />
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-destructive"
                          style={{ width: `${item.exception_rate || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>{t('common.noData')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 超时预警列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-normal">超时预警</CardTitle>
            <CardDescription>
              {stats?.timeout_count || 0} 个订单已超过预计送达时间
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {timeoutOrders.length > 0 ? (
                timeoutOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 border border-destructive/30 rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/shipping-orders/${order.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{order.order_code}</span>
                        <Badge variant="destructive" className="text-xs">
                          超时 {order.days_overdue} 天
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.carrier} · {order.consignee_name}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>暂无超时订单</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 异常订单列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-normal">{t('logistics.exceptionOrders')}</CardTitle>
            <CardDescription>
              {stats?.exception_count || 0} {t('logistics.ordersWithException')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {exceptionOrders.length > 0 ? (
                exceptionOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/shipping-orders/${order.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{order.order_code}</span>
                        {order.exception_type && (
                          <Badge variant="destructive" className="text-xs">
                            {getEventTypeLabel(order.exception_type)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {order.exception_description || t('common.noDescription')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {order.carrier} · {new Date(order.created_at ?? '').toLocaleString(i18n.language)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>{t('logistics.noExceptionOrders')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
