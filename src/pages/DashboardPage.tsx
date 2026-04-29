import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, runtimeMode } from '@/db/supabase';
import { demoDashboardData } from '@/data/demo/dashboard';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Package, Truck, FileText, Inbox, ClipboardCheck, ArrowRight, TrendingUp, CheckSquare, AlertTriangle, Archive } from 'lucide-react';
import { designTokens } from '@/styles/design-tokens';
import type {
  ProductionPlanOverview,
  QualityQualificationRate,
  InventoryStatus,
  LogisticsInTransit,
} from '@/types/database';

interface DashboardStats {
  plan: {
    active_plans: number;
    this_week_plans: number;
    completion_rate: number;
    pending_approval_plans: number;
  };
  incoming: {
    total_asn: number;
    pending_receiving: number;
    pending_inspection: number;
    hold_materials: number;
    pending_special_acceptance: number;
    available_materials: number;
  };
  assembly: {
    pending_assembly: number;
    in_progress_assembly: number;
    aging_units: number;
    aging_exceptions: number;
    pending_test: number;
    pending_qa: number;
    pending_shipment: number;
  };
  exception: {
    open_exceptions: number;
    high_critical_exceptions: number;
    pending_exceptions: number;
    overdue_exceptions: number;
  };
  inventory: {
    total_available: number;
    total_reserved: number;
    total_consumed: number;
    out_of_stock_count: number;
    low_stock_count: number;
  };
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [stats, setStats] = useState({
    productionPlans: [] as ProductionPlanOverview[],
    qualityRates: [] as QualityQualificationRate[],
    inventoryAlerts: [] as InventoryStatus[],
    logisticsInTransit: [] as LogisticsInTransit[],
  });

  // 快速入口配置
  const quickLinks = [
    {
      title: '生产计划',
      description: '管理生产需求和投资意向',
      icon: ClipboardList,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      path: '/production-plans',
    },
    {
      title: '生产订单',
      description: '管理生产订单和执行进度',
      icon: Package,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      path: '/production-orders',
    },
    {
      title: '物流管理',
      description: '跟踪物流状态和配送信息',
      icon: Truck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      path: '/logistics',
    },
    {
      title: 'ASN发货单',
      description: '管理发货通知和物料信息',
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      path: '/asn',
    },
    {
      title: '收货管理',
      description: '处理收货记录和入库流程',
      icon: Inbox,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      path: '/receiving',
    },
    {
      title: 'IQC检验',
      description: '进行来料质量检验和判定',
      icon: ClipboardCheck,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      path: '/iqc',
    },
  ];

  useEffect(() => {
    loadDashboardData();
  }, [profile]);

  const loadDashboardData = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      // Demo 模式：使用演示数据
      if (runtimeMode === 'demo') {
        setDashboardStats({
          plan: {
            active_plans: 8,
            this_week_plans: 3,
            completion_rate: 75,
            pending_approval_plans: 2,
          },
          incoming: {
            total_asn: 15,
            pending_receiving: 3,
            pending_inspection: 2,
            hold_materials: 1,
            pending_special_acceptance: 0,
            available_materials: 120,
          },
          assembly: {
            pending_assembly: 5,
            in_progress_assembly: 8,
            aging_units: 12,
            aging_exceptions: 1,
            pending_test: 6,
            pending_qa: 4,
            pending_shipment: 2,
          },
          exception: {
            open_exceptions: 4,
            high_critical_exceptions: 2,
            pending_exceptions: 1,
            overdue_exceptions: 0,
          },
          inventory: {
            total_available: 1500,
            total_reserved: 300,
            total_consumed: 800,
            out_of_stock_count: 2,
            low_stock_count: 5,
          },
        });
        
        setStats({
          productionPlans: demoDashboardData.plans as unknown as ProductionPlanOverview[],
          qualityRates: [],
          inventoryAlerts: [],
          logisticsInTransit: [],
        });
        
        setLoading(false);
        return;
      }

      // Real 模式：加载真实数据
      // 加载运营看板统计数据
      const { data: statsData, error: statsError } = await supabase.rpc('get_dashboard_stats');
      
      if (statsError) {
        console.error('加载看板统计失败:', statsError);
      } else if (statsData) {
        setDashboardStats(statsData);
      }

      // 加载生产计划概览
      const { data: plans } = await supabase
        .from('view_production_plan_overview')
        .select('*')
        .limit(5);

      // 加载质量合格率
      const { data: quality } = await supabase
        .from('view_quality_qualification_rate')
        .select('*')
        .eq('tenant_id', profile.tenant_id === 'BOTH' ? 'CN' : profile.tenant_id)
        .limit(5);

      // 加载库存预警
      const { data: inventory } = await supabase
        .from('materialized_view_inventory_status')
        .select('*')
        .eq('tenant_id', profile.tenant_id === 'BOTH' ? 'CN' : profile.tenant_id)
        .in('stock_status', ['low_stock', 'out_of_stock'])
        .limit(10);

      // 加载在途物流
      const { data: logistics } = await supabase
        .from('view_logistics_in_transit')
        .select('*')
        .limit(10);

      setStats({
        productionPlans: plans || [],
        qualityRates: quality || [],
        inventoryAlerts: inventory || [],
        logisticsInTransit: logistics || [],
      });
    } catch (error) {
      console.error('加载仪表盘数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'out_of_stock':
        return 'destructive';
      case 'low_stock':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getDeliveryStatusColor = (status: string) => {
    return status === 'delayed' ? 'destructive' : 'default';
  };

  if (loading) {
    return (
      <div className={designTokens.spacing.page}>
        <div className={designTokens.spacing.section}>
          <Skeleton className="h-10 w-64 bg-muted" />
          <Skeleton className="h-5 w-96 bg-muted" />
        </div>
        <div className={`${designTokens.layout.grid4} ${designTokens.spacing.cardGap}`}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={designTokens.spacing.page}>
      <div className={designTokens.spacing.section}>
        {/* 页面标题 */}
        <PageHeader
          title={`欢迎回来，${profile?.full_name || profile?.username}`}
          description="組立業務Web管理システム"
        />

        {/* 合作方Logo */}
        <div className="flex items-center justify-center gap-8 py-6 border-y border-border">
          <img 
            src="/logo-light.svg" 
            alt="協作ロボット Logo" 
            className="h-12 object-contain dark:hidden"
          />
          <img 
            src="/logo-dark.svg" 
            alt="協作ロボット Logo" 
            className="h-12 object-contain hidden dark:block"
          />
        </div>

        {/* 运营看板统计 */}
        {dashboardStats && (
          <div className="space-y-6 mt-8">
            {/* 计划看板 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-normal flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  计划看板
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal">{dashboardStats.plan.active_plans}</p>
                    <p className="text-sm text-muted-foreground mt-1">当前 Active 计划</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal">{dashboardStats.plan.this_week_plans}</p>
                    <p className="text-sm text-muted-foreground mt-1">本周计划数量</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal">{dashboardStats.plan.completion_rate}%</p>
                    <p className="text-sm text-muted-foreground mt-1">完成率</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal">{dashboardStats.plan.pending_approval_plans}</p>
                    <p className="text-sm text-muted-foreground mt-1">待审批计划</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 来料看板 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-normal flex items-center gap-2">
                  <Inbox className="h-5 w-5" />
                  来料看板
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal">{dashboardStats.incoming.total_asn}</p>
                    <p className="text-sm text-muted-foreground mt-1">ASN 数量</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal">{dashboardStats.incoming.pending_receiving}</p>
                    <p className="text-sm text-muted-foreground mt-1">待收货</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal">{dashboardStats.incoming.pending_inspection}</p>
                    <p className="text-sm text-muted-foreground mt-1">待检</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal text-destructive">{dashboardStats.incoming.hold_materials}</p>
                    <p className="text-sm text-muted-foreground mt-1">HOLD</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal">{dashboardStats.incoming.pending_special_acceptance}</p>
                    <p className="text-sm text-muted-foreground mt-1">特采待审批</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal text-primary">{dashboardStats.incoming.available_materials}</p>
                    <p className="text-sm text-muted-foreground mt-1">可上线物料</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 组装/测试看板 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-normal flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  组装/测试看板
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal">{dashboardStats.assembly.pending_assembly}</p>
                    <p className="text-sm text-muted-foreground mt-1">待组装</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal">{dashboardStats.assembly.in_progress_assembly}</p>
                    <p className="text-sm text-muted-foreground mt-1">组装中</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal">{dashboardStats.assembly.aging_units}</p>
                    <p className="text-sm text-muted-foreground mt-1">老化中</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal text-destructive">{dashboardStats.assembly.aging_exceptions}</p>
                    <p className="text-sm text-muted-foreground mt-1">老化异常</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal">{dashboardStats.assembly.pending_test}</p>
                    <p className="text-sm text-muted-foreground mt-1">待测试</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal">{dashboardStats.assembly.pending_qa}</p>
                    <p className="text-sm text-muted-foreground mt-1">待 QA</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal">{dashboardStats.assembly.pending_shipment}</p>
                    <p className="text-sm text-muted-foreground mt-1">待出货</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 异常看板 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-normal flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  异常看板
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal">{dashboardStats.exception.open_exceptions}</p>
                    <p className="text-sm text-muted-foreground mt-1">Open 异常数</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal text-destructive">{dashboardStats.exception.high_critical_exceptions}</p>
                    <p className="text-sm text-muted-foreground mt-1">High/Critical 异常</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal">{dashboardStats.exception.pending_exceptions}</p>
                    <p className="text-sm text-muted-foreground mt-1">待处理异常</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal text-destructive">{dashboardStats.exception.overdue_exceptions}</p>
                    <p className="text-sm text-muted-foreground mt-1">超期异常</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 库存看板 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-normal flex items-center gap-2">
                  <Archive className="h-5 w-5" />
                  库存看板
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal">{dashboardStats.inventory.total_available}</p>
                    <p className="text-sm text-muted-foreground mt-1">可用库存</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal">{dashboardStats.inventory.total_reserved}</p>
                    <p className="text-sm text-muted-foreground mt-1">已预占</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal">{dashboardStats.inventory.total_consumed}</p>
                    <p className="text-sm text-muted-foreground mt-1">已消耗</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal text-destructive">{dashboardStats.inventory.out_of_stock_count}</p>
                    <p className="text-sm text-muted-foreground mt-1">缺货</p>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-normal text-secondary">{dashboardStats.inventory.low_stock_count}</p>
                    <p className="text-sm text-muted-foreground mt-1">低库存</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* KPI 统计卡片 */}
        <div className={`${designTokens.layout.grid4} ${designTokens.spacing.cardGap} mt-8`}>
          <StatCard
            title="生产计划完成率"
            value={
              stats.productionPlans.length > 0
                ? `${Math.round(stats.productionPlans[0].completion_rate)}%`
                : '0%'
            }
            description="计划完成率"
            icon={ClipboardList}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-50"
            trend={<TrendingUp className="h-4 w-4 text-green-600" />}
          />
          <StatCard
            title="质量合格率"
            value={
              stats.qualityRates.length > 0
                ? `${Math.round(stats.qualityRates[0].avg_qualification_rate)}%`
                : '0%'
            }
            description="质量合格率"
            icon={CheckSquare}
            iconColor="text-green-600"
            iconBgColor="bg-green-50"
          />
          <StatCard
            title="库存预警"
            value={stats.inventoryAlerts.length}
            description="需要关注的库存"
            icon={Package}
            iconColor="text-orange-600"
            iconBgColor="bg-orange-50"
          />
          <StatCard
            title="在途物流"
            value={stats.logisticsInTransit.length}
            description="正在运输中"
            icon={Truck}
            iconColor="text-purple-600"
            iconBgColor="bg-purple-50"
          />
        </div>

        {/* 快速入口 */}
        <SectionCard title="快速入口">
          <div className={`${designTokens.layout.grid3} ${designTokens.spacing.cardGap}`}>
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border hover:border-primary hover:bg-accent/50 transition-all text-left"
                >
                  <div className={`${link.bgColor} p-3 rounded-lg shrink-0`}>
                    <Icon className={`h-5 w-5 ${link.color}`} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`${designTokens.typography.body} font-medium mb-1`}>{link.title}</h3>
                    <p className={designTokens.typography.caption}>{link.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" strokeWidth={2} />
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* 详细信息 */}
        <div className={`${designTokens.layout.grid2} ${designTokens.spacing.cardGap}`}>
          <SectionCard title="库存状态" description="库存预警信息">
            <div className={designTokens.spacing.form}>
              {stats.inventoryAlerts.length === 0 ? (
                <p className={designTokens.typography.caption}>暂无数据</p>
              ) : (
                stats.inventoryAlerts.map((item) => (
                  <div key={item.inventory_id} className="flex items-center justify-between py-2">
                    <div className="space-y-1">
                      <p className={`${designTokens.typography.body} font-medium`}>{item.material_name}</p>
                      <p className={designTokens.typography.caption}>{item.material_code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={designTokens.typography.caption}>{item.current_quantity}</span>
                      <StatusBadge status={item.stock_status} label={t(`inventory.${item.stock_status}`)} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title="物流状态" description="在途物流信息">
            <div className={designTokens.spacing.form}>
              {stats.logisticsInTransit.length === 0 ? (
                <p className={designTokens.typography.caption}>暂无数据</p>
              ) : (
                stats.logisticsInTransit.map((item) => (
                  <div key={item.shipping_id} className="flex items-center justify-between py-2">
                    <div className="space-y-1">
                      <p className={`${designTokens.typography.body} font-medium`}>{item.shipping_code}</p>
                      <p className={designTokens.typography.caption}>
                        {item.current_location || t('logistics.in_transit')}
                      </p>
                    </div>
                    <StatusBadge status={item.delivery_status} label={t(`logistics.${item.delivery_status}`)} />
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
