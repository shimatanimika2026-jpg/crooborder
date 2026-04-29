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
import { supabase, runtimeMode } from '@/db/supabase';
import { getDemoASNShipments } from '@/data/demo/inbound';
import { designTokens } from '@/styles/design-tokens';
import type { ASNShipment } from '@/types/database';

export default function ASNListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [shipments, setShipments] = useState<ASNShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchShipments();
  }, []);

  // 监听URL参数变化，同步更新筛选状态
  useEffect(() => {
    const status = searchParams.get('status');
    setStatusFilter(status || 'all');
  }, [searchParams]);

  const fetchShipments = async () => {
    try {
      // Demo 模式：使用演示数据
      if (runtimeMode === 'demo') {
        setShipments(getDemoASNShipments());
        setLoading(false);
        return;
      }

      // Real 模式：加载真实数据
      const { data, error } = await supabase
        .from('asn_shipments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShipments(data || []);
    } catch (error) {
      console.error(t('asn.fetchError'), error);
      toast.error(t('asn.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const filteredShipments = shipments.filter((shipment) => {
    const matchesSearch = shipment.shipment_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.tracking_no?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusLabels: Record<string, string> = {
    draft: t('asn.statusDraft'),
    shipped: t('asn.statusShipped'),
    in_transit: t('asn.statusInTransit'),
    arrived: t('asn.statusArrived'),
    received: t('asn.statusReceived'),
    cancelled: t('asn.statusCancelled'),
  };

  const columns = [
    {
      key: 'shipment_no',
      title: t('asn.shipmentNo'),
      width: '180px',
    },
    {
      key: 'tracking_no',
      title: t('asn.trackingNo'),
      width: '180px',
    },
    {
      key: 'eta_date',
      title: t('asn.etaDate'),
      width: '150px',
    },
    {
      key: 'shipment_date',
      title: t('asn.shipmentDate'),
      width: '150px',
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
          title={t('asn.title')}
          description={t('asn.subtitle')}
          action={
            <Button onClick={() => navigate('/asn/create')}>
              <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
              {t('asn.createAsn')}
            </Button>
          }
        />

        <FilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('asn.searchPlaceholder')}
          onReset={() => setSearchQuery('')}
        />

        <SectionCard>
          <StandardTable
            columns={columns}
            data={filteredShipments}
            loading={loading}
            emptyText={t('asn.emptyText')}
            onRowClick={(record) => navigate(`/asn/${record.id}`)}
          />
        </SectionCard>
      </div>
    </div>
  );
}
