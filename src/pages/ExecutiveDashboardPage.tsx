import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isDemoMode } from '@/db/supabase';
import { demoExecutiveStats } from '@/data/demo/dashboard';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  AlertTriangle, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock,
  Target,
  Activity,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface ExecutiveDashboardStats {
  // 计划达成率
  plan_achievement: {
    total_plans: number;
    completed_plans: number;
    achievement_rate: number;
  };
  // 中方生产完成率
  cn_production: {
    total_units: number;
    completed_units: number;
    completion_rate: number;
  };
  // 日方组装/测试/出货完成率
  jp_operations: {
    assembly_rate: number;
    test_rate: number;
    shipment_rate: number;
  };
  // 异常汇总
  exceptions: {
    open_count: number;
    high_critical_count: number;
    overdue_count: number;
  };
  // 物流状态
  logistics: {
    in_transit: number;
    pending_receiving: number;
    pending_inspection: number;
    pending_release: number;
    pending_shipment: number;
  };
  // 关键阻塞点
  blockers: Array<{
    id: string;
    type: string;
    description: string;
    severity: string;
    created_at: string;
  }>;
  // 需要高层拍板事项
  escalations: Array<{
    id: string;
    title: string;
    description: string;
    priority: string;
    created_at: string;
  }>;
}

export default function ExecutiveDashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ExecutiveDashboardStats | null>(null);

  useEffect(() => {
    fetchExecutiveStats();
  }, []);

  const fetchExecutiveStats = async () => {
    try {
      setLoading(true);

      // Demo/测试模式：使用模拟数据
      if (isDemoMode || !supabase) {
        setStats(demoExecutiveStats);
        setLoading(false);
        return;
      }

      // 真实模式：使用统一汇总RPC获取跨租户数据
      const { data: summary, error: summaryError } = await supabase
        .rpc('get_executive_dashboard_summary');

      if (summaryError) throw summaryError;

      // 获取关键阻塞点和升级事项（跨租户）
      const { data: exceptions, error: exError } = await supabase
        .from('operation_exceptions')
        .select('id, severity, current_status, created_at, exception_type, remarks')
        .in('current_status', ['open', 'investigating']);

      if (exError) throw exError;

      // 获取关键阻塞点（高危异常）
      const blockers = exceptions?.filter((e) => e.severity === 'high' || e.severity === 'critical').map((e) => ({
        id: e.id.toString(),
        type: 'exception',
        description: e.remarks || e.exception_type || t('executive.unknownException'),
        severity: e.severity,
        created_at: e.created_at,
      })) || [];

      // 获取需要高层拍板事项（超期异常）
      const escalations = exceptions?.filter((e) => {
        const createdAt = new Date(e.created_at);
        const now = new Date();
        const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays > 7;
      }).map((e) => ({
        id: e.id.toString(),
        title: `${t('executive.overdueException')} #${e.id}`,
        description: e.remarks || e.exception_type || t('executive.unknownException'),
        priority: e.severity,
        created_at: e.created_at,
      })) || [];

      // 组装统计数据
      const executiveStats: ExecutiveDashboardStats = {
        plan_achievement: summary?.plan_achievement || {
          total_plans: 0,
          completed_plans: 0,
          achievement_rate: 0,
        },
        cn_production: summary?.cn_production || {
          total_units: 0,
          completed_units: 0,
          completion_rate: 0,
        },
        jp_operations: summary?.jp_operations || {
          assembly_rate: 0,
          test_rate: 0,
          shipment_rate: 0,
        },
        exceptions: summary?.exceptions || {
          open_count: 0,
          high_critical_count: 0,
          overdue_count: 0,
        },
        logistics: summary?.logistics || {
          in_transit: 0,
          pending_receiving: 0,
          pending_inspection: 0,
          pending_release: 0,
          pending_shipment: 0,
        },
        blockers,
        escalations,
      };

      setStats(executiveStats);
    } catch (error) {
      console.error('获取高层看板数据失败:', error);
      toast.error(t('common.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('executive.title')}
          description={t('executive.description')}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  // 获取当前语言的日期格式
  const dateLocale = i18n.language === 'ja-JP' ? 'ja-JP' : 'zh-CN';

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('executive.title')}
        description={t('executive.descriptionWithDesensitization')}
      />

      {/* 计划达成率 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t('executive.planAchievement')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title={t('executive.totalPlans')}
              value={stats?.plan_achievement.total_plans || 0}
              icon={Target}
              onClick={() => navigate('/production-plans')}
            />
            <StatCard
              title={t('executive.completedPlans')}
              value={stats?.plan_achievement.completed_plans || 0}
              icon={CheckCircle}
              onClick={() => navigate('/production-plans?status=completed')}
            />
            <StatCard
              title={t('executive.achievementRate')}
              value={`${stats?.plan_achievement.achievement_rate || 0}%`}
              icon={TrendingUp}
            />
          </div>
        </CardContent>
      </Card>

      {/* 中方生产完成率 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('executive.cnProductionCompletion')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title={t('executive.totalMaterialBatches')}
              value={stats?.cn_production.total_units || 0}
              icon={Package}
              onClick={() => navigate('/asn')}
            />
            <StatCard
              title={t('executive.completedBatches')}
              value={stats?.cn_production.completed_units || 0}
              icon={CheckCircle}
              onClick={() => navigate('/asn?status=received')}
            />
            <StatCard
              title={t('executive.completionRate')}
              value={`${stats?.cn_production.completion_rate || 0}%`}
              icon={TrendingUp}
            />
          </div>
        </CardContent>
      </Card>

      {/* 日方组装/测试/出货完成率 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('executive.jpOperationsCompletion')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title={t('executive.assemblyRate')}
              value={`${stats?.jp_operations.assembly_rate || 0}%`}
              icon={Package}
              onClick={() => navigate('/assembly/complete')}
            />
            <StatCard
              title={t('executive.testRate')}
              value={`${stats?.jp_operations.test_rate || 0}%`}
              icon={CheckCircle}
              onClick={() => navigate('/aging/tests')}
            />
            <StatCard
              title={t('executive.shipmentRate')}
              value={`${stats?.jp_operations.shipment_rate || 0}%`}
              icon={Truck}
              onClick={() => navigate('/shipment')}
            />
          </div>
        </CardContent>
      </Card>

      {/* 异常汇总 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {t('executive.exceptionsSummary')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title={t('executive.openExceptions')}
              value={stats?.exceptions.open_count || 0}
              icon={AlertTriangle}
              onClick={() => navigate('/exceptions?status=open')}
            />
            <StatCard
              title={t('executive.highCriticalExceptions')}
              value={stats?.exceptions.high_critical_count || 0}
              icon={AlertCircle}
              onClick={() => navigate('/exceptions?severity=high,critical')}
            />
            <StatCard
              title={t('executive.overdueExceptions')}
              value={stats?.exceptions.overdue_count || 0}
              icon={Clock}
              onClick={() => navigate('/exceptions?overdue=true')}
            />
          </div>
        </CardContent>
      </Card>

      {/* 物流状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {t('executive.logisticsStatus')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <StatCard
              title={t('executive.inTransit')}
              value={stats?.logistics.in_transit || 0}
              icon={Truck}
              onClick={() => navigate('/shipping-orders?status=in_transit')}
            />
            <StatCard
              title={t('executive.pendingReceiving')}
              value={stats?.logistics.pending_receiving || 0}
              icon={Package}
              onClick={() => navigate('/asn?status=arrived')}
            />
            <StatCard
              title={t('executive.pendingInspection')}
              value={stats?.logistics.pending_inspection || 0}
              icon={CheckCircle}
              onClick={() => navigate('/iqc')}
            />
            <StatCard
              title={t('executive.pendingRelease')}
              value={stats?.logistics.pending_release || 0}
              icon={CheckCircle}
              onClick={() => navigate('/qa-release')}
            />
            <StatCard
              title={t('executive.pendingShipment')}
              value={stats?.logistics.pending_shipment || 0}
              icon={Truck}
              onClick={() => navigate('/shipment')}
            />
          </div>
        </CardContent>
      </Card>

      {/* 关键阻塞点 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {t('executive.criticalBlockers')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.blockers && stats.blockers.length > 0 ? (
            <div className="space-y-2">
              {stats.blockers.map((blocker) => (
                <div
                  key={blocker.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{blocker.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(blocker.created_at).toLocaleDateString(dateLocale)}
                    </p>
                  </div>
                  <Badge variant="destructive">{blocker.severity}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('executive.noBlockers')}</p>
          )}
        </CardContent>
      </Card>

      {/* 需要高层拍板事项 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-destructive" />
            {t('executive.escalationItems')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.escalations && stats.escalations.length > 0 ? (
            <div className="space-y-2">
              {stats.escalations.map((escalation) => (
                <div
                  key={escalation.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{escalation.title}</p>
                    <p className="text-xs text-muted-foreground">{escalation.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(escalation.created_at).toLocaleDateString(dateLocale)}
                    </p>
                  </div>
                  <Badge variant="destructive">{escalation.priority}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('executive.noEscalations')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
