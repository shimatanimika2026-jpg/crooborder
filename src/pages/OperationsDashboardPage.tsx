import {
  AlertTriangle,
  Archive,
  ClipboardList,
  LayoutDashboard,
  Package,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Truck,
  Wrench,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { getOperationsDashboardStats } from '@/services/operationsDashboardService';
import type { OperationsDashboardStats } from '@/types/database';

export default function OperationsDashboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<OperationsDashboardStats | null>(null);
  const [timeRange, setTimeRange] = useState('all');

  useEffect(() => {
    loadDashboardData();
    
    // 设置定时刷新（每5分钟）
    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loading) {
      loadDashboardData();
    }
  }, [timeRange]);

  const loadDashboardData = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    
    try {
      const { startDate, endDate } = getDateRange(timeRange);
      const data = await getOperationsDashboardStats('JP', startDate, endDate);
      setStats(data);
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

  const getHealthColor = (value: number, threshold: { good: number; warning: number }) => {
    if (value >= threshold.good) return 'text-primary';
    if (value >= threshold.warning) return 'text-yellow-600';
    return 'text-destructive';
  };

  const getHealthBg = (value: number, threshold: { good: number; warning: number }) => {
    if (value >= threshold.good) return 'bg-primary/10';
    if (value >= threshold.warning) return 'bg-yellow-600/10';
    return 'bg-destructive/10';
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

  const totalPendingTasks = 
    (stats?.production?.pending_approval || 0) +
    (stats?.incoming?.pending_receiving || 0) +
    (stats?.incoming?.pending_inspection || 0) +
    (stats?.incoming?.pending_special_approval || 0) +
    (stats?.assembly?.pending_assembly || 0) +
    (stats?.assembly?.pending_test || 0) +
    (stats?.assembly?.pending_qa || 0) +
    (stats?.assembly?.pending_shipment || 0);

  const totalCriticalIssues =
    (stats?.exception?.high_critical_exceptions || 0) +
    (stats?.exception?.overdue_exceptions || 0) +
    (stats?.assembly?.aging_exception || 0) +
    (stats?.logistics?.exception_orders || 0) +
    (stats?.logistics?.timeout_orders || 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-normal">运营看板</h1>
          <p className="text-sm text-muted-foreground mt-1">
            全局业务状态实时监控
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 全局概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">今日待处理任务</p>
                <p className="text-4xl font-normal mt-2">{totalPendingTasks}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  涵盖审批、收货、检验、组装、测试等环节
                </p>
              </div>
              <ClipboardList className="h-12 w-12 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className={totalCriticalIssues > 0 ? 'border-destructive' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">关键预警</p>
                <p className={`text-4xl font-normal mt-2 ${totalCriticalIssues > 0 ? 'text-destructive' : ''}`}>
                  {totalCriticalIssues}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  高优先级异常、超期任务、物流异常
                </p>
              </div>
              <AlertTriangle className={`h-12 w-12 ${totalCriticalIssues > 0 ? 'text-destructive' : 'text-muted-foreground opacity-50'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 生产计划看板 + 来料管理看板 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-normal">
              <LayoutDashboard className="h-5 w-5" />
              生产计划看板
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div
                className="p-4 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate('/production-plans?status=active')}
              >
                <p className="text-sm text-muted-foreground">活跃计划</p>
                <p className="text-2xl font-normal mt-1">{stats?.production?.active_plans || 0}</p>
              </div>
              <div
                className="p-4 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate('/production-plans?status=pending_approval')}
              >
                <p className="text-sm text-muted-foreground">待审批</p>
                <p className="text-2xl font-normal mt-1 text-yellow-600">
                  {stats?.production?.pending_approval || 0}
                </p>
              </div>
              <div
                className="p-4 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate('/production-plans')}
              >
                <p className="text-sm text-muted-foreground">本周计划</p>
                <p className="text-2xl font-normal mt-1">{stats?.production?.this_week_plans || 0}</p>
              </div>
              <div className="p-4 border border-border rounded-md">
                <p className="text-sm text-muted-foreground">完成率</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className={`text-2xl font-normal ${getHealthColor(stats?.production?.completion_rate || 0, { good: 80, warning: 50 })}`}>
                    {stats?.production?.completion_rate || 0}%
                  </p>
                  {(stats?.production?.completion_rate || 0) >= 80 ? (
                    <TrendingUp className="h-4 w-4 text-primary" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-normal">
              <Package className="h-5 w-5" />
              来料管理看板
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div
                className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate('/asn')}
              >
                <p className="text-xs text-muted-foreground">ASN 总数</p>
                <p className="text-xl font-normal mt-1">{stats?.incoming?.total_asn || 0}</p>
              </div>
              <div
                className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate('/receiving')}
              >
                <p className="text-xs text-muted-foreground">待收货</p>
                <p className="text-xl font-normal mt-1 text-yellow-600">
                  {stats?.incoming?.pending_receiving || 0}
                </p>
              </div>
              <div
                className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate('/iqc')}
              >
                <p className="text-xs text-muted-foreground">待检</p>
                <p className="text-xl font-normal mt-1 text-yellow-600">
                  {stats?.incoming?.pending_inspection || 0}
                </p>
              </div>
              <div
                className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate('/disposition')}
              >
                <p className="text-xs text-muted-foreground">HOLD</p>
                <p className="text-xl font-normal mt-1 text-destructive">
                  {stats?.incoming?.hold_materials || 0}
                </p>
              </div>
              <div
                className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate('/disposition')}
              >
                <p className="text-xs text-muted-foreground">特采待审</p>
                <p className="text-xl font-normal mt-1 text-yellow-600">
                  {stats?.incoming?.pending_special_approval || 0}
                </p>
              </div>
              <div className="p-3 border border-border rounded-md">
                <p className="text-xs text-muted-foreground">可用物料</p>
                <p className="text-xl font-normal mt-1 text-primary">
                  {stats?.incoming?.available_materials || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 组装与测试看板 + 异常监控看板 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-normal">
              <Wrench className="h-5 w-5" />
              组装与测试看板
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div
                className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate('/production-orders?status=pending')}
              >
                <p className="text-xs text-muted-foreground">待组装</p>
                <p className="text-xl font-normal mt-1">{stats?.assembly?.pending_assembly || 0}</p>
              </div>
              <div
                className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate('/production-orders?status=in_progress')}
              >
                <p className="text-xs text-muted-foreground">组装中</p>
                <p className="text-xl font-normal mt-1">{stats?.assembly?.in_assembly || 0}</p>
              </div>
              <div
                className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate('/aging/tests')}
              >
                <p className="text-xs text-muted-foreground">老化中</p>
                <p className="text-xl font-normal mt-1">{stats?.assembly?.in_aging || 0}</p>
              </div>
              <div
                className="p-3 border border-destructive rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate('/aging/tests?status=failed')}
              >
                <p className="text-xs text-muted-foreground">老化异常</p>
                <p className="text-xl font-normal mt-1 text-destructive">
                  {stats?.assembly?.aging_exception || 0}
                </p>
              </div>
              <div
                className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate('/final-test')}
              >
                <p className="text-xs text-muted-foreground">待测试</p>
                <p className="text-xl font-normal mt-1 text-yellow-600">
                  {stats?.assembly?.pending_test || 0}
                </p>
              </div>
              <div
                className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate('/qa-release')}
              >
                <p className="text-xs text-muted-foreground">待 QA</p>
                <p className="text-xl font-normal mt-1 text-yellow-600">
                  {stats?.assembly?.pending_qa || 0}
                </p>
              </div>
              <div
                className="p-3 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors col-span-3"
                onClick={() => navigate('/shipment')}
              >
                <p className="text-xs text-muted-foreground">待出货</p>
                <p className="text-xl font-normal mt-1">{stats?.assembly?.pending_shipment || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-normal">
              <AlertTriangle className="h-5 w-5" />
              异常监控看板
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div
                className="p-4 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate('/exceptions?status=open')}
              >
                <p className="text-sm text-muted-foreground">开启异常</p>
                <p className="text-3xl font-normal mt-1">{stats?.exception?.open_exceptions || 0}</p>
              </div>
              <div
                className="p-4 border border-destructive rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate('/exceptions?severity=high,critical')}
              >
                <p className="text-sm text-muted-foreground">高优先级异常</p>
                <p className="text-3xl font-normal mt-1 text-destructive">
                  {stats?.exception?.high_critical_exceptions || 0}
                </p>
              </div>
              <div
                className="p-4 border border-destructive rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate('/exceptions?overdue=true')}
              >
                <p className="text-sm text-muted-foreground">超期异常</p>
                <p className="text-3xl font-normal mt-1 text-destructive">
                  {stats?.exception?.overdue_exceptions || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 库存状态看板 + 物流追踪看板 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-normal">
              <Archive className="h-5 w-5" />
              库存状态看板
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div
                className="p-4 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate('/inventory?view=available')}
              >
                <p className="text-sm text-muted-foreground">可用库存</p>
                <p className="text-2xl font-normal mt-1 text-primary">
                  {stats?.inventory?.available || 0}
                </p>
              </div>
              <div
                className="p-4 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate('/inventory?view=reserved')}
              >
                <p className="text-sm text-muted-foreground">已预留</p>
                <p className="text-2xl font-normal mt-1">{stats?.inventory?.reserved || 0}</p>
              </div>
              <div
                className="p-4 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate('/inventory?view=consumed')}
              >
                <p className="text-sm text-muted-foreground">已消耗</p>
                <p className="text-2xl font-normal mt-1">{stats?.inventory?.consumed || 0}</p>
              </div>
              <div
                className="p-4 border border-destructive rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate('/inventory?view=blocked')}
              >
                <p className="text-sm text-muted-foreground">已冻结</p>
                <p className="text-2xl font-normal mt-1 text-destructive">
                  {stats?.inventory?.blocked || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-normal">
              <Truck className="h-5 w-5" />
              物流追踪看板
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div
                className="p-4 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate('/logistics-dashboard')}
              >
                <p className="text-sm text-muted-foreground">在途订单</p>
                <p className="text-3xl font-normal mt-1">{stats?.logistics?.in_transit_orders || 0}</p>
              </div>
              <div
                className="p-4 border border-destructive rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate('/logistics-dashboard')}
              >
                <p className="text-sm text-muted-foreground">异常订单</p>
                <p className="text-3xl font-normal mt-1 text-destructive">
                  {stats?.logistics?.exception_orders || 0}
                </p>
              </div>
              <div
                className="p-4 border border-destructive rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate('/logistics-dashboard')}
              >
                <p className="text-sm text-muted-foreground">超时订单</p>
                <p className="text-3xl font-normal mt-1 text-destructive">
                  {stats?.logistics?.timeout_orders || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
