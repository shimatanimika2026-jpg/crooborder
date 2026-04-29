import { Package, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FilterBar } from '@/components/common/FilterBar';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StandardTable } from '@/components/common/StandardTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  createDemoReceivingFromASN,
  getDemoASNShipments,
  getDemoReceivingRecords,
} from '@/data/demo/inbound';
import { runtimeMode, supabase } from '@/db/supabase';
import {
  batchCheckExistingReceiving,
  batchGetASNItemCounts,
  canCreateReceivingFromASN,
  getASNStatusLabel,
} from '@/lib/asn-rules';
import { designTokens } from '@/styles/design-tokens';
import type { ASNShipment, ReceivingRecord } from '@/types/database';

export default function ReceivingListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [records, setRecords] = useState<ReceivingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAsnDialog, setShowAsnDialog] = useState(false);
  const [availableAsns, setAvailableAsns] = useState<ASNShipment[]>([]);
  const [loadingAsns, setLoadingAsns] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      if (runtimeMode === 'demo') {
        setRecords(getDemoReceivingRecords());
        return;
      }

      const { data, error } = await supabase
        .from('receiving_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error(t('receiving.fetchError'), error);
      toast.error(t('receiving.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableAsns = async () => {
    setLoadingAsns(true);

    if (runtimeMode === 'demo') {
      const existingShipmentIds = new Set(
        getDemoReceivingRecords()
          .map((record) => record.shipment_id ?? record.asn_id)
          .filter(Boolean),
      );
      setAvailableAsns(
        getDemoASNShipments().filter(
          (asn) => asn.status === 'arrived' && !existingShipmentIds.has(asn.id),
        ),
      );
      setLoadingAsns(false);
      return;
    }

    try {
      const { data: asnData, error: asnError } = await supabase
        .from('asn_shipments')
        .select('*')
        .eq('status', 'arrived')
        .order('eta_date', { ascending: true });

      if (asnError) throw asnError;

      if (!asnData || asnData.length === 0) {
        setAvailableAsns([]);
        return;
      }

      const shipmentIds = asnData.map((asn: ASNShipment) => asn.id);
      const existingReceivingMap = await batchCheckExistingReceiving(supabase, shipmentIds);
      const itemCountsMap = await batchGetASNItemCounts(supabase, shipmentIds);

      const filteredAsns = asnData.filter((asn: ASNShipment) => {
        const hasExisting = existingReceivingMap.get(asn.id) || false;
        const itemCount = itemCountsMap.get(asn.id) || 0;

        return canCreateReceivingFromASN({
          status: asn.status,
          itemCount,
          hasExistingReceiving: hasExisting,
        });
      });

      setAvailableAsns(filteredAsns);
    } catch (error) {
      console.error(t('common.error'), error);
      toast.error(t('asnRules.errorLoadAvailableAsns'));
    } finally {
      setLoadingAsns(false);
    }
  };

  const handleShowAsnDialog = () => {
    setShowAsnDialog(true);
    fetchAvailableAsns();
  };

  const handleCreateReceiving = (asnId: number) => {
    if (runtimeMode === 'demo') {
      const record = createDemoReceivingFromASN(asnId);
      if (!record) {
        toast.error(t('asnRules.noAvailableAsns'));
        return;
      }
      setShowAsnDialog(false);
      fetchRecords();
      navigate(`/receiving/${record.id}`);
      return;
    }

    navigate(`/receiving/create?shipment_id=${asnId}`);
    setShowAsnDialog(false);
  };

  const getAsnStatusBadge = (status: string) => {
    const statusMap: Record<string, 'secondary' | 'default' | 'destructive'> = {
      draft: 'secondary',
      shipped: 'default',
      in_transit: 'default',
      arrived: 'default',
      received: 'default',
      cancelled: 'destructive',
    };
    return <Badge variant={statusMap[status] || 'secondary'}>{getASNStatusLabel(status, t)}</Badge>;
  };

  const filteredRecords = records.filter((record) =>
    (record.receiving_code ?? record.receiving_number ?? '')
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  const statusLabels: Record<string, string> = {
    draft: t('asn.statusDraft'),
    completed: t('receiving.statusCompleted'),
    variance_pending: t('receiving.varianceDetected'),
    variance_resolved: t('receiving.varianceResolvedSuccess'),
    cancelled: t('asn.statusCancelled'),
    preparing: t('logistics.preparing'),
    shipped: t('asn.statusShipped'),
    in_transit: t('asn.statusInTransit'),
    customs: t('logistics.customs'),
    arrived: t('asn.statusArrived'),
  };

  const columns = [
    {
      key: 'receiving_code',
      title: t('receiving.receivingNo'),
      width: '180px',
      render: (_value: unknown, record: ReceivingRecord) => record.receiving_code ?? record.receiving_number ?? '-',
    },
    {
      key: 'receiving_date',
      title: t('receiving.receivedDate'),
      width: '150px',
    },
    {
      key: 'status',
      title: t('common.status'),
      width: '140px',
      align: 'center' as const,
      render: (value: unknown) => (
        <StatusBadge status={value as string} label={statusLabels[value as string] || (value as string)} />
      ),
    },
    {
      key: 'has_variance',
      title: t('receiving.hasVariance'),
      width: '100px',
      align: 'center' as const,
      render: (value: unknown, record: ReceivingRecord) => {
        if (!value) return <span className="text-muted-foreground">{t('common.noData')}</span>;
        return record.variance_resolved ? (
          <StatusBadge status="success" label={t('receiving.varianceResolved')} />
        ) : (
          <StatusBadge status="warning" label={t('receiving.varianceDetected')} />
        );
      },
    },
    {
      key: 'iqc_completed',
      title: t('iqc.title'),
      width: '120px',
      align: 'center' as const,
      render: (value: unknown) =>
        value ? (
          <StatusBadge status="success" label={t('iqc.inspectionCompleted')} />
        ) : (
          <StatusBadge status="pending" label={t('iqc.pendingInspection')} />
        ),
    },
  ];

  return (
    <div className={designTokens.spacing.page}>
      <div className={designTokens.spacing.section}>
        <PageHeader
          title={t('receiving.title')}
          description={t('receiving.subtitle')}
          action={
            <Button onClick={handleShowAsnDialog}>
              <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
              {t('asnRules.createReceivingFromAsn')}
            </Button>
          }
        />

        <FilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('receiving.searchPlaceholder')}
          onReset={() => setSearchQuery('')}
        />

        <SectionCard>
          <StandardTable
            columns={columns}
            data={filteredRecords}
            loading={loading}
            emptyText={t('receiving.emptyText')}
            onRowClick={(record) => navigate(`/receiving/${record.id}`)}
          />
        </SectionCard>
      </div>

      <Dialog open={showAsnDialog} onOpenChange={setShowAsnDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('asnRules.selectAsnToReceive')}</DialogTitle>
            <DialogDescription>{t('asnRules.selectAsnDescription')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {loadingAsns ? (
              <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
            ) : availableAsns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('asnRules.noAvailableAsns')}
                <p className="text-sm mt-2">{t('asnRules.noAvailableAsnsHint')}</p>
              </div>
            ) : (
              availableAsns.map((asn) => (
                <button
                  type="button"
                  key={asn.id}
                  className="w-full text-left border rounded-lg p-4 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => handleCreateReceiving(asn.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{asn.shipment_no}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {asn.factory_id} - {asn.destination_factory_id}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">{t('asn.shipmentDate')}:</span>
                          <span className="ml-2">{new Date(asn.shipment_date).toLocaleDateString('zh-CN')}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('asn.etaDate')}:</span>
                          <span className="ml-2">
                            {asn.eta_date ? new Date(asn.eta_date).toLocaleDateString('zh-CN') : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('asnRules.carrier')}:</span>
                          <span className="ml-2">{asn.carrier || '-'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">{getAsnStatusBadge(asn.status)}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
