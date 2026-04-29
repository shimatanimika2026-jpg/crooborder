import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isDemoMode } from '@/db/supabase';
import { demoCollaborationStats } from '@/data/demo/collaboration';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  AlertTriangle, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { canViewSensitiveCollaborationData } from '@/lib/auth/permissions';

interface CollaborationStats {
  // 中国区生产状态
  cn_production: {
    active_plans: number;
    completion_rate: number;
    pending_materials: number;
  };
  // 日本区组装状态
  jp_assembly: {
    in_progress: number;
    aging_units: number;
    pending_test: number;
    pending_qa: number;
    pending_shipment: number;
  };
  // 跨区域异常
  cross_region_exceptions: {
    open_count: number;
    high_critical_count: number;
    overdue_count: number;
  };
  // 物流状态
  logistics: {
    in_transit: number;
    pending_receiving: number;
    pending_inspection: number;
  };
}

export default function ChinaCollaborationViewPage() {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CollaborationStats | null>(null);
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  useEffect(() => {
    fetchCollaborationStats();
  }, []);

  const fetchCollaborationStats = async () => {
    try {
      setLoading(true);

      // Demo/测试模式：使用模拟数据
      if (isDemoMode || !supabase) {
        setStats(demoCollaborationStats);
        setLoading(false);
        return;
      }

      // 真实模式：从 Supabase 获取数据
      // 获取中国区生产状态（汇总数据，不暴露敏感明细）
      const { data: cnProduction, error: cnError } = await supabase
        .rpc('get_cn_production_summary');

      if (cnError) throw cnError;

      // 获取日本区组装状态（汇总数据）
      const { data: jpAssembly, error: jpError } = await supabase
        .rpc('get_jp_assembly_summary');

      if (jpError) throw jpError;

      // 获取跨区域异常（只显示汇总，不暴露敏感明细）
      const { data: exceptions, error: exError } = await supabase
        .from('operation_exceptions')
        .select('id, severity, current_status, created_at')
        .in('current_status', ['open', 'investigating']);

      if (exError) throw exError;

      // 获取物流状态（汇总数据）
      const { data: logistics, error: logError } = await supabase
        .rpc('get_logistics_summary');

      if (logError) throw logError;

      // 组装统计数据
      const collaborationStats: CollaborationStats = {
        cn_production: cnProduction || { active_plans: 0, completion_rate: 0, pending_materials: 0 },
        jp_assembly: jpAssembly || { in_progress: 0, aging_units: 0, pending_test: 0, pending_qa: 0, pending_shipment: 0 },
        cross_region_exceptions: {
          open_count: exceptions?.length || 0,
          high_critical_count: exceptions?.filter((e) => e.severity === 'high' || e.severity === 'critical').length || 0,
          overdue_count: exceptions?.filter((e) => {
            const createdAt = new Date(e.created_at);
            const now = new Date();
            const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
            return diffDays > 7;
          }).length || 0,
        },
        logistics: logistics || { in_transit: 0, pending_receiving: 0, pending_inspection: 0 },
      };

      setStats(collaborationStats);
    } catch (error) {
      console.error('获取协同视图数据失败:', error);
      toast.error(t('common.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const toggleSensitiveData = () => {
    if (!showSensitiveData) {
      // 显示敏感数据前需要权限检查
      if (!canViewSensitiveCollaborationData(profile)) {
        toast.error(t('collaboration.noPermissionToViewSensitiveData'));
        return;
      }
      toast.info(t('collaboration.loadingSensitiveData'));
    }
    setShowSensitiveData(!showSensitiveData);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('collaboration.title')}
          description={t('collaboration.description')}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('collaboration.title')}
        description={t('collaboration.descriptionWithDesensitization')}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSensitiveData}
          >
            {showSensitiveData ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                {t('collaboration.hideSensitiveData')}
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                {t('collaboration.showSensitiveData')}
              </>
            )}
          </Button>
        }
      />

      {/* 中国区生产状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('collaboration.cnProductionStatus')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title={t('collaboration.activePlans')}
              value={stats?.cn_production.active_plans || 0}
              icon={TrendingUp}
              trend="up"
            />
            <StatCard
              title={t('collaboration.completionRate')}
              value={`${stats?.cn_production.completion_rate || 0}%`}
              icon={CheckCircle}
            />
            <StatCard
              title={t('collaboration.pendingMaterials')}
              value={stats?.cn_production.pending_materials || 0}
              icon={Package}
            />
          </div>
        </CardContent>
      </Card>

      {/* 日本区组装状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {t('collaboration.jpAssemblyStatus')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <StatCard
              title={t('collaboration.inProgress')}
              value={stats?.jp_assembly.in_progress || 0}
              icon={Clock}
            />
            <StatCard
              title={t('collaboration.aging')}
              value={stats?.jp_assembly.aging_units || 0}
              icon={Clock}
            />
            <StatCard
              title={t('collaboration.pendingTest')}
              value={stats?.jp_assembly.pending_test || 0}
              icon={CheckCircle}
            />
            <StatCard
              title={t('collaboration.pendingQA')}
              value={stats?.jp_assembly.pending_qa || 0}
              icon={CheckCircle}
            />
            <StatCard
              title={t('collaboration.pendingShipment')}
              value={stats?.jp_assembly.pending_shipment || 0}
              icon={Truck}
            />
          </div>
        </CardContent>
      </Card>

      {/* 跨区域异常 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {t('collaboration.crossRegionExceptions')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title={t('collaboration.openExceptions')}
              value={stats?.cross_region_exceptions.open_count || 0}
              icon={AlertTriangle}
            />
            <StatCard
              title={t('collaboration.highCriticalExceptions')}
              value={stats?.cross_region_exceptions.high_critical_count || 0}
              icon={AlertTriangle}
            />
            <StatCard
              title={t('collaboration.overdueExceptions')}
              value={stats?.cross_region_exceptions.overdue_count || 0}
              icon={Clock}
            />
          </div>
        </CardContent>
      </Card>

      {/* 物流状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {t('collaboration.logisticsStatus')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title={t('collaboration.inTransit')}
              value={stats?.logistics.in_transit || 0}
              icon={Truck}
            />
            <StatCard
              title={t('collaboration.pendingReceiving')}
              value={stats?.logistics.pending_receiving || 0}
              icon={Package}
            />
            <StatCard
              title={t('collaboration.pendingInspection')}
              value={stats?.logistics.pending_inspection || 0}
              icon={CheckCircle}
            />
          </div>
        </CardContent>
      </Card>

      {/* 敏感数据区域（需要权限才能查看） */}
      {showSensitiveData && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t('collaboration.sensitiveDataArea')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <p className="text-sm text-muted-foreground">
                  {t('collaboration.sensitiveDataDescription')}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('collaboration.currentUser')}: {user?.email}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('collaboration.permissionLevel')}: {t('collaboration.collaborationViewRestricted')}
                </p>
              </div>
              <Badge variant="destructive">
                {t('collaboration.sensitiveDataDesensitized')}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
