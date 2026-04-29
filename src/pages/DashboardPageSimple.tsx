import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase, runtimeMode } from '@/db/supabase';
import { Briefcase, Factory, AlertTriangle, Truck } from 'lucide-react';

interface CommissionStats {
  total: number;
  in_production: number;
  exception: number;
  this_week_shipment: number;
}

export default function DashboardPageSimple() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CommissionStats>({
    total: 0,
    in_production: 0,
    exception: 0,
    this_week_shipment: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Demo 模式：使用演示数据
      if (runtimeMode === 'demo') {
        setStats({
          total: 12,
          in_production: 8,
          exception: 2,
          this_week_shipment: 5,
        });
        setLoading(false);
        return;
      }

      // Real 模式：加载真实数据
      // 获取委托总数
      const { count: totalCount } = await supabase
        .from('commissions')
        .select('*', { count: 'exact', head: true });

      // 获取生产中数量
      const { count: inProductionCount } = await supabase
        .from('commissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_production');

      // 获取异常中数量
      const { count: exceptionCount } = await supabase
        .from('commissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'exception');

      // 获取本周待出货数量（状态为in_production且目标交期在本周内）
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const { count: thisWeekShipmentCount } = await supabase
        .from('commissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_production')
        .gte('target_delivery_date', weekStart.toISOString().split('T')[0])
        .lte('target_delivery_date', weekEnd.toISOString().split('T')[0]);

      setStats({
        total: totalCount || 0,
        in_production: inProductionCount || 0,
        exception: exceptionCount || 0,
        this_week_shipment: thisWeekShipmentCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-4 md:p-8 animate-fade-in">
        <div className="mx-auto max-w-7xl space-y-8">
          <Skeleton className="h-16 w-80 rounded-3xl bg-muted" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-3xl bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: t('dashboard.totalCommissions'),
      value: stats.total,
      desc: t('dashboard.totalCommissionsDesc'),
      icon: Briefcase,
      gradient: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-600',
    },
    {
      title: t('dashboard.inProduction'),
      value: stats.in_production,
      desc: t('dashboard.inProductionDesc'),
      icon: Factory,
      gradient: 'from-purple-500 to-purple-600',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      textColor: 'text-purple-600',
    },
    {
      title: t('dashboard.exceptions'),
      value: stats.exception,
      desc: t('dashboard.exceptionsDesc'),
      icon: AlertTriangle,
      gradient: 'from-red-500 to-red-600',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      textColor: 'text-red-600',
    },
    {
      title: t('dashboard.thisWeekShipment'),
      value: stats.this_week_shipment,
      desc: t('dashboard.thisWeekShipmentDesc'),
      icon: Truck,
      gradient: 'from-cyan-500 to-cyan-600',
      iconBg: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
      textColor: 'text-cyan-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-4 md:p-8 animate-fade-in">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header with Gradient Text */}
        <div className="space-y-3 animate-slide-up">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            <span className="gradient-text">{t('dashboard.title')}</span>
          </h1>
          <p className="text-lg text-muted-foreground">{t('dashboard.subtitle')}</p>
        </div>

        {/* Stats Cards with Modern Design */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Card
                key={index}
                className="group relative overflow-hidden border-0 bg-card shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 animate-scale-in rounded-3xl cursor-pointer"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => navigate('/commission')}
              >
                {/* Gradient Background Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className={`${card.iconBg} p-2.5 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className={`text-4xl font-bold ${card.textColor} group-hover:scale-105 transition-transform duration-300`}>
                    {card.value}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {card.desc}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
