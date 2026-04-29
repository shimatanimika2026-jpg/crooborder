import { AlertCircle, CheckCircle, ClipboardCheck, Search, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, runtimeMode } from '@/db/supabase';
import {
  addDemoIQCInspection,
  getDemoIQCInspections,
  getDemoReceivingItemById,
} from '@/data/demo/inbound';
import { submitIQCInspection, validateIQCInspection } from '@/services/iqcService';
import type { IQCInspection, ReceivingRecordItem } from '@/types/database';
import { useFocusOnLoad } from '@/hooks/useFocusOnLoad';
import { getErrorMessage } from '@/lib/error-utils';

export default function IQCInspectionPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [inspections, setInspections] = useState<IQCInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receivingItem, setReceivingItem] = useState<ReceivingRecordItem | null>(null);
  const [iqcForm, setIqcForm] = useState({
    inspection_type: 'sampling' as 'sampling' | 'full' | 'skip',
    sample_size: 2,
    inspected_qty: 0,
    result: 'OK' as 'OK' | 'HOLD' | 'NG',
    defect_code: '',
    defect_description: '',
    remarks: '',
  });

  useEffect(() => {
    fetchInspections();
    
    const receivingId = searchParams.get('receiving_id');
    const receivingItemId = searchParams.get('receiving_item_id');
    
    if (receivingId && receivingItemId) {
      loadReceivingItemForInspection(Number(receivingId), Number(receivingItemId));
    }
  }, []);

  // 使用统一聚焦 Hook
  useFocusOnLoad({
    paramName: 'focus_id',
    data: inspections,
    loading,
    idPrefix: 'inspection-',
    setHighlightedId,
    notFoundMessage: t('iqc.notFoundMessage'),
  });

  const fetchInspections = async () => {
    try {
      if (runtimeMode === 'demo') {
        setInspections(getDemoIQCInspections());
        return;
      }

      const { data, error } = await supabase
        .from('iqc_inspections')
        .select(`
          *,
          receiving_records!inner(
            id,
            receiving_no,
            status
          ),
          receiving_record_items!inner(
            id,
            part_no,
            part_name
          )
        `)
        .order('created_at', { ascending: false});

      if (error) throw error;
      setInspections(data || []);
    } catch (error) {
      console.error(t('iqc.fetchError'), error);
      toast.error(t('iqc.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const loadReceivingItemForInspection = async (receivingId: number, receivingItemId: number) => {
    try {
      if (runtimeMode === 'demo') {
        const item = getDemoReceivingItemById(receivingId, receivingItemId);
        if (!item) {
          toast.error(t('iqc.errorReceivingItemNotFound'));
          return;
        }
        setReceivingItem(item);
        setIqcForm((current) => ({
          ...current,
          inspected_qty: item.received_qty,
        }));
        setShowSubmitDialog(true);
        return;
      }

      const validation = await validateIQCInspection(supabase, receivingId, receivingItemId);

      if (!validation.canInspect) {
        toast.error(t(validation.blockReason || 'iqc.errorValidation'));
        return;
      }

      setReceivingItem(validation.receivingItem ?? null);
      setIqcForm({
        ...iqcForm,
        inspected_qty: validation.receivingItem?.received_qty ?? 0,
      });
      setShowSubmitDialog(true);
    } catch (error) {
      console.error(t('iqc.errorLoadReceivingItem'), error);
      toast.error(t('iqc.errorLoadReceivingItem'));
    }
  };
  const handleSubmitIQC = async () => {
    if (!receivingItem) return;

    const receivingId = searchParams.get('receiving_id');
    if (!receivingId) return;

    setSubmitting(true);

    try {
      if (runtimeMode === 'demo') {
        const inspection = addDemoIQCInspection(Number(receivingId), receivingItem, {
          inspection_type: iqcForm.inspection_type,
          sample_size: iqcForm.sample_size,
          inspected_qty: iqcForm.inspected_qty,
          result: iqcForm.result,
          defect_code: iqcForm.defect_code || undefined,
          defect_description: iqcForm.defect_description || undefined,
          remarks: iqcForm.remarks || undefined,
        });
        toast.success(t('iqc.successSubmit'));
        setShowSubmitDialog(false);
        setInspections(getDemoIQCInspections());
        navigate(`/iqc?focus_id=${inspection.id}`);
        return;
      }

      if (!profile?.id) return;

      const result = await submitIQCInspection(supabase, {
        receiving_id: Number(receivingId),
        receiving_item_id: receivingItem.id,
        inspection_type: iqcForm.inspection_type,
        sample_size: iqcForm.sample_size,
        inspected_qty: iqcForm.inspected_qty,
        result: iqcForm.result,
        defect_code: iqcForm.defect_code || undefined,
        defect_description: iqcForm.defect_description || undefined,
        remarks: iqcForm.remarks || undefined,
        inspector_id: profile.id,
      });

      if (!result.success) {
        const errorMessages: Record<string, string> = {
          RECEIVING_NOT_FOUND: t('iqc.errorReceivingNotFound'),
          RECEIVING_CANCELLED: t('iqc.errorReceivingCancelled'),
          RECEIVING_ITEM_NOT_FOUND: t('iqc.errorReceivingItemNotFound'),
          IQC_EXISTS: t('iqc.errorIqcExists'),
          RPC_ERROR: t('iqc.errorRpcFailed'),
          INTERNAL_ERROR: t('iqc.errorInternalError'),
          UNKNOWN_ERROR: t('iqc.errorUnknown'),
        };

        const errorMsg = errorMessages[result.error || 'UNKNOWN_ERROR'] || result.message || t('iqc.errorSubmitFailed');
        toast.error(errorMsg);
        return;
      }

      // 成功
      if (result.result === 'NG') {
        toast.success(t('iqc.successSubmitWithNg'));
      } else if (result.result === 'HOLD') {
        toast.success(t('iqc.successSubmitWithHold'));
      } else {
        toast.success(t('iqc.successSubmit'));
      }

      if (result.all_items_inspected) {
        toast.info(t('iqc.infoAllItemsInspected'));
      }

      // 关闭对话框，刷新列表
      setShowSubmitDialog(false);
      fetchInspections();

      if (result.inspection_id) {
        navigate(`/iqc?focus_id=${result.inspection_id}`);
      }
    } catch (error: unknown) {
      console.error(t('iqc.errorSubmitFailed'), error);
      toast.error(getErrorMessage(error, t('iqc.errorSubmitFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const getResultBadge = (result: string) => {
    const resultMap = {
      OK: { label: 'OK', variant: 'default' as const, icon: CheckCircle },
      HOLD: { label: 'HOLD', variant: 'secondary' as const, icon: AlertCircle },
      NG: { label: 'NG', variant: 'destructive' as const, icon: XCircle },
    };
    const config = resultMap[result as keyof typeof resultMap] || {
      label: result,
      variant: 'secondary' as const,
      icon: AlertCircle,
    };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getInspectionTypeBadge = (type: string) => {
    const typeMap = {
      sampling: t('iqc.sampling'),
      full: t('iqc.full'),
      skip: t('iqc.skip'),
    };
    return <Badge variant="outline">{typeMap[type as keyof typeof typeMap] || type}</Badge>;
  };

  const filteredInspections = inspections.filter(
    (i) => {
      // 如果有高亮 ID，优先显示该记录
      if (highlightedId && i.id === highlightedId) {
        return true;
      }
      // 如果没有高亮 ID，按搜索条件过滤
      if (!highlightedId) {
        return (
          i.inspection_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.part_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.part_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      return (
        i.inspection_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.part_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.part_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('iqc.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('iqc.subtitle')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索检验单号、零件号或零件名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredInspections.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardCheck className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>{t('iqc.emptyText')}</p>
              </div>
            ) : (
              filteredInspections.map((inspection) => (
                <Card 
                  key={inspection.id} 
                  id={`inspection-${inspection.id}`}
                  className={`hover:bg-accent/50 transition-colors ${
                    highlightedId === inspection.id ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold">{inspection.inspection_no}</h3>
                          {getResultBadge(inspection.result)}
                          {getInspectionTypeBadge(inspection.inspection_type)}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">零件号:</span>
                            <p className="font-medium">{inspection.part_no}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">零件名称:</span>
                            <p className="font-medium">{inspection.part_name}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">批次号:</span>
                            <p className="font-medium">{inspection.batch_no || '-'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">检验日期:</span>
                            <p className="font-medium">
                              {new Date(inspection.inspected_at).toLocaleDateString('zh-CN')}
                            </p>
                          </div>
                        </div>
                        {inspection.defect_description && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">{t('iqc.defectDescription')}:</span>
                            <p className="font-medium text-destructive mt-1">{inspection.defect_description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* IQC 提交对话框 */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('iqc.submitInspection')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {receivingItem && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-medium">{receivingItem.part_name}</p>
                <p className="text-sm text-muted-foreground">{receivingItem.part_no}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('iqc.inspectionType')}</Label>
                <Select
                  value={iqcForm.inspection_type}
                  onValueChange={(value: 'sampling' | 'full' | 'skip') =>
                    setIqcForm({ ...iqcForm, inspection_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sampling">{t('iqc.sampling')}</SelectItem>
                    <SelectItem value="full">{t('iqc.full')}</SelectItem>
                    <SelectItem value="skip">{t('iqc.skip')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('iqc.sampleSize')}</Label>
                <Input
                  type="number"
                  value={iqcForm.sample_size}
                  onChange={(e) => setIqcForm({ ...iqcForm, sample_size: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('iqc.inspectedQty')}</Label>
                <Input
                  type="number"
                  value={iqcForm.inspected_qty}
                  onChange={(e) => setIqcForm({ ...iqcForm, inspected_qty: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('iqc.result')}</Label>
                <Select
                  value={iqcForm.result}
                  onValueChange={(value: 'OK' | 'HOLD' | 'NG') => setIqcForm({ ...iqcForm, result: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OK">OK</SelectItem>
                    <SelectItem value="HOLD">HOLD</SelectItem>
                    <SelectItem value="NG">NG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(iqcForm.result === 'HOLD' || iqcForm.result === 'NG') && (
              <>
                <div className="space-y-2">
                  <Label>{t('iqc.defectCode')}</Label>
                  <Input
                    value={iqcForm.defect_code}
                    onChange={(e) => setIqcForm({ ...iqcForm, defect_code: e.target.value })}
                    placeholder={t('iqc.defectCodePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('iqc.defectDescription')}</Label>
                  <Textarea
                    value={iqcForm.defect_description}
                    onChange={(e) => setIqcForm({ ...iqcForm, defect_description: e.target.value })}
                    rows={3}
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>{t('iqc.remarks')}</Label>
              <Textarea
                value={iqcForm.remarks}
                onChange={(e) => setIqcForm({ ...iqcForm, remarks: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => setShowSubmitDialog(false)} disabled={submitting}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSubmitIQC} disabled={submitting}>
                {submitting ? t('iqc.submitting') : t('iqc.submitButton')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
