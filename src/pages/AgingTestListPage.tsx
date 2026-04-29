import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { FilterBar } from '@/components/common/FilterBar';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StandardTable } from '@/components/common/StandardTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase, runtimeMode } from '@/db/supabase';
import { getDemoAgingTests } from '@/services/demoMainChainService';
import { designTokens } from '@/styles/design-tokens';
import { useFocusOnLoad } from '@/hooks/useFocusOnLoad';
import type { AgingTestWithModel } from '@/types/database';

export default function AgingTestListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tests, setTests] = useState<AgingTestWithModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    fetchTests();
  }, []);

  // 使用统一聚焦 Hook
  useFocusOnLoad({
    paramName: 'focus',
    data: tests,
    loading,
    idPrefix: 'test-',
    setHighlightedId: setFocusId,
    notFoundMessage: '未找到目标老化测试记录，已显示当前列表',
  });

  const fetchTests = async () => {
    try {
      if (runtimeMode === 'demo') {
        setTests(getDemoAgingTests(statusFilter));
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('aging_tests')
        .select('*')
        .order('created_at', { ascending: false});

      if (error) throw error;
      setTests(data || []);
    } catch (error) {
      console.error(t('agingTest.fetchError'), error);
      toast.error(t('agingTest.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = tests.filter((test) => {
    // 搜索过滤
    const matchesSearch = test.test_code?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 状态过滤
    const matchesStatus = statusFilter === 'all' || test.status === statusFilter;
    
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

  const statusLabels: Record<string, string> = {
    pending: t('agingTest.statusPending'),
    in_progress: t('agingTest.statusRunning'),
    passed: t('agingTest.statusPassed'),
    failed: t('agingTest.statusFailed'),
  };

  const columns = [
    {
      key: 'test_code',
      title: t('agingTest.testCode'),
      width: '180px',
    },
    {
      key: 'start_time',
      title: t('agingTest.startTime'),
      width: '180px',
      render: (value: unknown) => value ? new Date(value as string).toLocaleString() : '-',
    },
    {
      key: 'duration_hours',
      title: t('agingTest.duration'),
      width: '150px',
      align: 'right' as const,
    },
    {
      key: 'status',
      title: t('common.status'),
      width: '120px',
      align: 'center' as const,
      render: (value: unknown) => (
        <StatusBadge status={value as string} label={statusLabels[value as string] || value as string} />
      ),
    },
  ];

  return (
    <div className={designTokens.spacing.page}>
      <div className={designTokens.spacing.section}>
        <PageHeader
          title={t('agingTest.title')}
          description={t('agingTest.subtitle')}
        />

        <FilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('agingTest.searchPlaceholder')}
          onReset={() => setSearchQuery('')}
          filters={
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待开始</SelectItem>
                <SelectItem value="in_progress">进行中</SelectItem>
                <SelectItem value="passed">通过</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        <SectionCard>
          <StandardTable
            columns={columns}
            data={filteredTests}
            loading={loading}
            emptyText={t('agingTest.emptyText')}
            onRowClick={(record) => navigate(`/aging/tests/${record.id}`)}
            rowProps={(record) => ({ id: `test-${record.id}` })}
            rowClassName={(record) => 
              focusId && String(record.id) === focusId 
                ? 'ring-2 ring-primary bg-primary/5' 
                : ''
            }
          />
        </SectionCard>
      </div>
    </div>
  );
}
