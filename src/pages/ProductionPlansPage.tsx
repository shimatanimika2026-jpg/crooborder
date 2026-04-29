import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, runtimeMode } from '@/db/supabase';
import { demoPlansData } from '@/data/demo/plans';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterBar } from '@/components/common/FilterBar';
import { SectionCard } from '@/components/common/SectionCard';
import { StandardTable } from '@/components/common/StandardTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { designTokens } from '@/styles/design-tokens';
import type { ProductionPlan } from '@/types/database';

export default function ProductionPlansPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadPlans();
  }, [profile]);

  // 监听URL参数变化，同步更新筛选状态
  useEffect(() => {
    const status = searchParams.get('status');
    setStatusFilter(status || 'all');
  }, [searchParams]);

  const loadPlans = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      // Demo 模式：使用演示数据
      if (runtimeMode === 'demo') {
        setPlans(demoPlansData as unknown as ProductionPlan[]);
        setLoading(false);
        return;
      }

      // Real 模式：加载真实数据
      const { data, error } = await supabase
        .from('production_plans')
        .select('*')
        .eq('tenant_id', profile.tenant_id === 'BOTH' ? 'CN' : profile.tenant_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('加载生产计划失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlans = plans.filter((plan) => {
    // 搜索过滤
    const matchesSearch = plan.plan_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.plan_type?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 状态过滤
    const matchesStatus = statusFilter === 'all' || plan.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // 同步状态筛选到 URL
  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    const nextParams = new URLSearchParams(searchParams);
    if (value === 'all') {
      nextParams.delete('status');
    } else {
      nextParams.set('status', value);
    }
    setSearchParams(nextParams);
  };

  const columns = [
    {
      key: 'plan_code',
      title: t('productionPlan.planCode'),
      width: '180px',
    },
    {
      key: 'plan_type',
      title: t('productionPlan.planType'),
      width: '150px',
      render: (value: unknown) => t(`productionPlan.${value}`),
    },
    {
      key: 'plan_period',
      title: t('productionPlan.planPeriod'),
      render: (_: unknown, record: ProductionPlan) => (
        <div className={designTokens.typography.caption}>
          {record.plan_period_start} ~ {record.plan_period_end}
        </div>
      ),
    },
    {
      key: 'production_quantity',
      title: t('productionPlan.productionQuantity'),
      width: '120px',
      align: 'right' as const,
    },
    {
      key: 'delivery_date',
      title: t('productionPlan.deliveryDate'),
      width: '150px',
    },
    {
      key: 'status',
      title: t('common.status'),
      width: '150px',
      align: 'center' as const,
      render: (value: unknown) => (
        <StatusBadge status={value as string} label={t(`productionPlan.${value}`)} />
      ),
    },
  ];

  return (
    <div className={designTokens.spacing.page}>
      <div className={designTokens.spacing.section}>
        <PageHeader
          title={t('nav.productionPlan')}
          description="管理生产计划和投资意向"
          action={
            <Button onClick={() => navigate('/production-plans/create')}>
              <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
              {t('common.create')}
            </Button>
          }
        />

        <FilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="搜索计划编号或类型..."
          onReset={() => setSearchQuery('')}
          filters={
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="pending_approval">待审批</SelectItem>
                <SelectItem value="approved">已审批</SelectItem>
                <SelectItem value="active">进行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="cancelled">已取消</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        <SectionCard>
          <StandardTable
            columns={columns}
            data={filteredPlans}
            loading={loading}
            emptyText={t('common.noData')}
            onRowClick={(record) => navigate(`/production-plans/${record.id}`)}
          />
        </SectionCard>
      </div>
    </div>
  );
}
