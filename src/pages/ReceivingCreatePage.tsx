import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, runtimeMode } from '@/db/supabase';
import { 
  canCreateReceivingFromASN, 
  hasExistingReceiving, 
  hasASNItems, 
  getCreateReceivingBlockReason 
} from '@/lib/asn-rules';
import { createReceivingFromASN } from '@/services/receivingService';
import type { ASNShipment, ASNShipmentItem } from '@/types/database';
import { getErrorMessage } from '@/lib/error-utils';

type ReceivingItem = {
  shipment_item_id: number;
  line_no: number;
  part_no: string;
  part_name: string;
  batch_no?: string;
  box_no?: string;
  expected_qty: number;
  received_qty: number;
  unit: string;
  remarks?: string;
};

export default function ReceivingCreatePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const shipmentId = searchParams.get('shipment_id');

  const [loading, setLoading] = useState(false);
  const [shipment, setShipment] = useState<ASNShipment | null>(null);
  const [shipmentItems, setShipmentItems] = useState<ASNShipmentItem[]>([]);
  const [receivingItems, setReceivingItems] = useState<ReceivingItem[]>([]);

  const [formData, setFormData] = useState({
    receiving_no: `RCV-JP-${String(Date.now()).slice(-6)}`,
    received_at: new Date().toISOString().split('T')[0],
    remarks: '',
  });

  useEffect(() => {
    if (shipmentId) {
      fetchShipmentData();
    }
  }, [shipmentId]);

  const fetchShipmentData = async () => {
    try {
      // Demo 模式阻断
      if (runtimeMode === 'demo') {
        toast.info(t('receivingCreate.demoModeNotice'));
        navigate('/receiving');
        return;
      }

      // 1. 检查是否提供了 shipment_id
      if (!shipmentId) {
        toast.error(t('receivingCreate.errorMissingShipmentId'));
        navigate('/receiving');
        return;
      }

      // 2. 查询 ASN 数据
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('asn_shipments')
        .select('*')
        .eq('id', shipmentId)
        .maybeSingle();

      if (shipmentError) throw shipmentError;
      
      if (!shipmentData) {
        toast.error(t('receivingCreate.errorAsnNotFound'));
        navigate('/receiving');
        return;
      }

      // 3. 检查是否已存在有效收货记录
      const hasExisting = await hasExistingReceiving(supabase, shipmentId);
      
      // 4. 查询 ASN 明细数量
      const { data: itemsData, error: itemsError } = await supabase
        .from('asn_shipment_items')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('line_no');

      if (itemsError) throw itemsError;
      const itemCount = itemsData?.length || 0;

      // 5. 使用统一规则校验是否可创建收货
      const blockReason = getCreateReceivingBlockReason({
        status: shipmentData.status,
        itemCount,
        hasExistingReceiving: hasExisting,
      }, t);

      if (blockReason) {
        toast.error(blockReason);
        navigate(`/asn/${shipmentId}`);
        return;
      }

      setShipment(shipmentData);
      setShipmentItems(itemsData || []);

      // 初始化收货明细
      const initialItems: ReceivingItem[] = (itemsData || []).map((item: ASNShipmentItem) => ({
        shipment_item_id: item.id,
        line_no: item.line_no,
        part_no: item.part_no,
        part_name: item.part_name,
        batch_no: item.batch_no,
        box_no: item.box_no,
        expected_qty: item.shipped_qty,
        received_qty: item.shipped_qty,
        unit: item.unit,
        remarks: '',
      }));
      setReceivingItems(initialItems);
    } catch (error) {
      console.error(t('common.error'), error);
      toast.error(t('receivingCreate.errorLoadAsn'));
      navigate('/receiving');
    }
  };

  const updateReceivedQty = (index: number, qty: number) => {
    const newItems = [...receivingItems];
    newItems[index].received_qty = qty;
    setReceivingItems(newItems);
  };

  const updateRemarks = (index: number, remarks: string) => {
    const newItems = [...receivingItems];
    newItems[index].remarks = remarks;
    setReceivingItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 验证必填项
      if (!formData.receiving_no || !formData.received_at) {
        toast.error(t('receivingCreate.errorMissingRequired'));
        setLoading(false);
        return;
      }

      if (!profile?.id) {
        toast.error(t('receivingCreate.errorMissingReceiver'));
        setLoading(false);
        return;
      }

      if (!shipment?.id) {
        toast.error(t('receivingCreate.errorMissingShipmentId'));
        setLoading(false);
        return;
      }

      // 调用服务层创建收货记录
      const result = await createReceivingFromASN(supabase, {
        shipment_id: shipment.id,
        receiving_no: formData.receiving_no,
        receiving_date: formData.received_at,
        receiver_id: profile.id,
        notes: formData.remarks || undefined,
        items: receivingItems.map((item) => ({
          shipment_item_id: item.shipment_item_id,
          received_qty: item.received_qty,
          batch_no: item.batch_no,
          box_no: item.box_no,
          remarks: item.remarks,
        })),
      });

      if (!result.success) {
        // 根据错误类型给出不同提示
        const errorMessages: Record<string, string> = {
          ASN_NOT_FOUND: t('receivingCreate.errorAsnNotFound'),
          ASN_STATUS_INVALID: t('receivingCreate.errorAsnStatusInvalid'),
          ASN_NO_ITEMS: t('asnRules.errorNoItems'),
          RECEIVING_EXISTS: t('asnRules.warningDuplicateReceiving'),
          RPC_ERROR: t('receivingCreate.errorRpcFailed'),
          INTERNAL_ERROR: t('receivingCreate.errorInternalError'),
          UNKNOWN_ERROR: t('receivingCreate.errorUnknown'),
        };

        const errorMsg = errorMessages[result.error || 'UNKNOWN_ERROR'] || result.message || t('receivingCreate.errorCreateFailed');
        toast.error(errorMsg);
        setLoading(false);
        return;
      }

      // 成功
      toast.success(t('receivingCreate.successCreate'));
      
      if (result.has_variance) {
        toast.info(t('receivingCreate.infoVarianceDetected'));
      }

      // 跳转到收货详情页
      navigate(`/receiving/${result.receiving_id}`);
    } catch (error: unknown) {
      console.error(t('receivingCreate.errorCreateFailed'), error);
      toast.error(getErrorMessage(error, t('receivingCreate.errorCreateFailed')));
    } finally {
      setLoading(false);
    }
  };

  if (!shipment) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('receivingCreate.pleaseCreateFromAsn')}</p>
          <Button onClick={() => navigate('/asn')} className="mt-4">
            {t('receivingCreate.backToAsnList')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/asn/${shipment.id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{t('receivingCreate.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('receivingCreate.basedOnAsn')}: {shipment.shipment_no}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('receivingCreate.receivingInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="receiving_no">{t('receivingCreate.receivingNo')} *</Label>
                <Input
                  id="receiving_no"
                  value={formData.receiving_no}
                  onChange={(e) => setFormData({ ...formData, receiving_no: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="received_at">{t('receivingCreate.receivingDate')} *</Label>
                <Input
                  id="received_at"
                  type="date"
                  value={formData.received_at}
                  onChange={(e) => setFormData({ ...formData, received_at: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">{t('receivingCreate.remarks')}</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('receivingCreate.receivingItems')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {receivingItems.map((item, index) => {
              const hasVariance = item.expected_qty !== item.received_qty;
              return (
                <div
                  key={index}
                  className={`border rounded-lg p-4 space-y-3 ${hasVariance ? 'border-destructive' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{item.part_name}</p>
                      <p className="text-sm text-muted-foreground">{item.part_no}</p>
                    </div>
                    {hasVariance && (
                      <span className="text-sm text-destructive font-medium">
                        差异: {item.received_qty - item.expected_qty > 0 ? '+' : ''}
                        {item.received_qty - item.expected_qty}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>预期数量</Label>
                      <Input value={item.expected_qty} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>实收数量 *</Label>
                      <Input
                        type="number"
                        value={item.received_qty}
                        onChange={(e) => updateReceivedQty(index, Number(e.target.value))}
                        min="0"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>批次号</Label>
                      <Input value={item.batch_no || '-'} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>箱号</Label>
                      <Input value={item.box_no || '-'} disabled />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('receivingCreate.itemRemarks')}</Label>
                    <Input
                      value={item.remarks}
                      onChange={(e) => updateRemarks(index, e.target.value)}
                      placeholder={t('receivingCreate.itemRemarksPlaceholder')}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/asn/${shipment.id}`)}
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? t('receivingCreate.creating') : t('receivingCreate.createButton')}
          </Button>
        </div>
      </form>
    </div>
  );
}
