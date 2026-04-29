import { AlertTriangle, ArrowLeft, CheckCircle, ClipboardCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getDemoReceivingItems,
  getDemoReceivingRecordById,
} from '@/data/demo/inbound';
import { runtimeMode, supabase } from '@/db/supabase';
import type { ReceivingRecordItem } from '@/types/database';

type ReceivingRecord = {
  id: number;
  receiving_no?: string;
  receiving_code?: string;
  receiving_number?: string;
  shipment_id?: number;
  tenant_id: string;
  factory_id: string;
  receiving_date: string;
  status: string;
  has_variance: boolean;
  variance_resolved: boolean;
  iqc_required: boolean;
  iqc_completed: boolean;
  notes?: string;
};

export default function ReceivingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [record, setRecord] = useState<ReceivingRecord | null>(null);
  const [items, setItems] = useState<ReceivingRecordItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchReceivingDetail();
    }
  }, [id]);

  const fetchReceivingDetail = async () => {
    try {
      if (runtimeMode === 'demo') {
        const numericId = Number(id);
        setRecord(getDemoReceivingRecordById(numericId) as unknown as ReceivingRecord);
        setItems(getDemoReceivingItems(numericId));
        return;
      }

      const { data: recordData, error: recordError } = await supabase
        .from('receiving_records')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (recordError) throw recordError;
      setRecord(recordData);

      const { data: itemsData, error: itemsError } = await supabase
        .from('receiving_record_items')
        .select('*')
        .eq('receiving_id', id)
        .order('line_no');

      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch (error) {
      console.error(t('common.error'), error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIQC = (item: ReceivingRecordItem) => {
    // 跳转到 IQC 页面，带上必要参数
    navigate(`/iqc?receiving_id=${record?.id}&receiving_item_id=${item.id}&focus_id=${item.id}`);
  };

  const getVarianceTypeBadge = (type?: string) => {
    if (!type) return null;
    const typeMap = {
      matched: { labelKey: 'receiving.varianceTypeMatched', variant: 'default' as const, icon: CheckCircle },
      shortage: { labelKey: 'receiving.varianceTypeShortage', variant: 'destructive' as const, icon: AlertTriangle },
      overage: { labelKey: 'receiving.varianceTypeOverage', variant: 'secondary' as const, icon: AlertTriangle },
      wrong_item: { labelKey: 'receiving.varianceTypeWrongItem', variant: 'destructive' as const, icon: AlertTriangle },
      damaged: { labelKey: 'receiving.varianceTypeDamaged', variant: 'destructive' as const, icon: AlertTriangle },
    };
    const config = typeMap[type as keyof typeof typeMap];
    if (!config) return null;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {t(config.labelKey)}
      </Badge>
    );
  };

  const getVarianceTypeLabel = (type?: string) => {
    const typeMap: Record<string, string> = {
      matched: 'receiving.varianceTypeMatched',
      shortage: 'receiving.varianceTypeShortage',
      overage: 'receiving.varianceTypeOverage',
      wrong_item: 'receiving.varianceTypeWrongItem',
      damaged: 'receiving.varianceTypeDamaged',
    };
    return t(typeMap[type || ''] || 'receiving.varianceTypeUnknown');
  };

  const receivingNo = record?.receiving_no ?? record?.receiving_code ?? record?.receiving_number ?? '-';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('receiving.errorNotFound')}</p>
          <Button onClick={() => navigate('/receiving')} className="mt-4">
            {t('common.back')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/receiving')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{t('receiving.detailTitle')}</h1>
            <p className="text-muted-foreground mt-1">{receivingNo}</p>
          </div>
        </div>
        {record.has_variance && !record.variance_resolved && (
          <Button
            variant="outline"
            onClick={() => navigate(`/special-approval/new?source_type=receiving&source_id=${record.id}&source_no=${receivingNo}`)}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            {t('receiving.createSpecialApproval')}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('receiving.receivingInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">{t('receiving.receivingNo')}</span>
              <p className="font-medium">{receivingNo}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">{t('receiving.receivingDate')}</span>
              <p className="font-medium">{new Date(record.receiving_date).toLocaleDateString(i18n.language)}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">{t('receiving.factory')}</span>
              <p className="font-medium">{record.factory_id}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">{t('receiving.status')}</span>
              <p className="font-medium">{record.status}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">{t('receiving.varianceStatus')}</span>
              <p className="font-medium">
                {record.has_variance ? (record.variance_resolved ? t('receiving.varianceResolved') : t('receiving.variancePending')) : t('receiving.varianceNone')}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">{t('receiving.iqcStatus')}</span>
              <p className="font-medium">{record.iqc_completed ? t('receiving.iqcCompleted') : t('receiving.iqcPending')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('receiving.itemsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('receiving.noItems')}</p>
            ) : (
              items.map((item) => {
                const isBlocked = item.blocked_qty > 0;
                const blockageRate = item.received_qty > 0 
                  ? ((item.blocked_qty / item.received_qty) * 100).toFixed(1) 
                  : 0;
                
                return (
                  <div 
                    key={item.id} 
                    className={`border rounded-lg p-4 space-y-3 ${
                      isBlocked ? 'border-destructive bg-destructive/5' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.part_name}</p>
                          {getVarianceTypeBadge(item.variance_type)}
                          {isBlocked && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              库存已阻断
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{item.part_no}</p>
                      </div>
                      <Button size="sm" onClick={() => handleCreateIQC(item)}>
                        <ClipboardCheck className="h-4 w-4 mr-2" />
                        {t('receiving.createIQC')}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('receiving.expectedQty')}:</span>
                        <span className="ml-2 font-medium">{item.expected_qty}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('receiving.receivedQty')}:</span>
                        <span className="ml-2 font-medium">{item.received_qty}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('receiving.varianceQty')}:</span>
                        <span
                          className={`ml-2 font-medium ${item.variance_qty !== 0 ? 'text-destructive' : ''}`}
                        >
                          {item.variance_qty > 0 ? '+' : ''}
                          {item.variance_qty}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('receiving.batchNo')}:</span>
                        <span className="ml-2 font-medium">{item.batch_no || '-'}</span>
                      </div>
                    </div>
                    
                    {/* 库存状态显示 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-2 border-t">
                      <div>
                        <span className="text-muted-foreground">{t('receiving.onHandQty')}:</span>
                        <span className="ml-2 font-medium">{item.on_hand_qty || 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('receiving.availableQty')}:</span>
                        <span className={`ml-2 font-medium ${item.available_qty > 0 ? 'text-green-600' : ''}`}>
                          {item.available_qty || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('receiving.blockedQty')}:</span>
                        <span className={`ml-2 font-medium ${isBlocked ? 'text-destructive' : ''}`}>
                          {item.blocked_qty || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('receiving.consumedQty')}:</span>
                        <span className="ml-2 font-medium">{item.consumed_qty || 0}</span>
                      </div>
                    </div>
                    
                    {/* 阻断警告信息 */}
                    {isBlocked && (
                      <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <div className="text-sm space-y-1">
                          <p className="font-medium text-destructive">
                            {t('receiving.blockageWarning', { rate: blockageRate })}
                          </p>
                          <p className="text-muted-foreground">
                            {item.variance_type && item.variance_type !== 'matched' 
                              ? t('receiving.blockageReasonVariance', { type: getVarianceTypeLabel(item.variance_type) })
                              : t('receiving.blockageReasonIQC')}
                          </p>
                          <p className="text-muted-foreground">
                            {t('receiving.blockageHint')}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {item.remarks && (
                      <p className="text-sm text-muted-foreground">{t('receiving.remarks')}: {item.remarks}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
