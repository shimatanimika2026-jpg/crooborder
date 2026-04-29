import { Plus, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, runtimeMode } from '@/db/supabase';
import { confirmShipment, createShipmentConfirmation, getShipments, getOrCreateShipment } from '@/services/shipmentService';
import { checkExistingBlockedException } from '@/services/exceptionService';
import { hasDemoApprovedQARelease } from '@/services/demoMainChainService';
import { useFocusOnLoad } from '@/hooks/useFocusOnLoad';
import type { ShipmentRecord } from '@/types/database';

export default function ShipmentConfirmationPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuth();
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  
  // 创建出货记录对话框状态
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    finished_product_sn: '',
  });
  
  // 确认出货对话框状态
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<ShipmentRecord | null>(null);
  const [confirmForm, setConfirmForm] = useState({
    shipment_status: 'shipped',
    remarks: '',
    block_reason: ''
  });

  useEffect(() => {
    fetchShipments();
  }, [statusFilter]);

  // 同步 URL 参数到状态
  useEffect(() => {
    const urlStatus = searchParams.get('status');
    if (urlStatus && urlStatus !== statusFilter) {
      setStatusFilter(urlStatus);
    }
  }, [searchParams]);

  // 使用统一聚焦 Hook（支持 confirmation_id 和 sn 两种参数）
  useFocusOnLoad({
    paramName: 'confirmation_id',
    data: shipments,
    loading,
    idPrefix: 'shipment-row-',
    setHighlightedId,
    notFoundMessage: t('shipment.notFoundMessage'),
  });

  // 兼容 sn 参数聚焦
  useEffect(() => {
    if (loading || shipments.length === 0) return;

    const sn = searchParams.get('sn');
    if (!sn) return;

    const matchedShipment = shipments.find(shipment => shipment.finished_product_sn === sn);
    if (matchedShipment) {
      setHighlightedId(matchedShipment.id);
      setTimeout(() => {
        const element = document.getElementById(`shipment-row-${matchedShipment.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    } else {
      toast.info(t('common.noMatchingRecord'));
    }
  }, [shipments, searchParams, loading, t]);

  const fetchShipments = async () => {
    try {
      // Demo 模式：使用演示数据
      if (runtimeMode === 'demo') {
        setShipments(await getShipments('JP', statusFilter));
        setLoading(false);
        return;
      }

      // Real 模式：加载真实数据
      const data = await getShipments('JP', statusFilter);
      setShipments(data || []);
    } catch (error) {
      console.error(t('shipment.fetchError'), error);
      toast.error(t('shipment.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShipment = async () => {
    if (creating) return;

    if (!createForm.finished_product_sn.trim()) {
      toast.error(t('shipment.pleaseInputSn'));
      return;
    }

    setCreating(true);
    try {
      // 1. 先获取或创建 shipment 记录
      const shipmentId = await getOrCreateShipment(
        createForm.finished_product_sn,
        'JP',
        profile?.id || ''
      );

      // 2. 创建 shipment confirmation 记录
      const newConfirmationId = await createShipmentConfirmation(
        createForm.finished_product_sn,
        shipmentId,
        'JP',
        profile?.id || ''
      );
      
      toast.success(t('shipment.createSuccess'));
      setCreateDialogOpen(false);
      setCreateForm({ finished_product_sn: '' });
      
      // 重置筛选状态，确保新记录可见
      setStatusFilter('all');
      setSearchQuery('');
      
      // 导航到新创建的记录，带上 status=all 确保可见
      navigate(`/shipment?status=all&confirmation_id=${newConfirmationId}`);
      
      // 刷新列表
      fetchShipments();
    } catch (error: unknown) {
      console.error(t('shipment.createError'), error);
      toast.error(error instanceof Error ? error.message : t('shipment.createError'));
    } finally {
      setCreating(false);
    }
  };

  const handleOpenConfirmDialog = async (shipment: ShipmentRecord) => {
    // 检查是否可以确认出货(检查QA放行是否批准)
    try {
      if (runtimeMode === 'demo') {
        if (!hasDemoApprovedQARelease(shipment.finished_product_sn)) {
          toast.error(t('shipment.qaNotApprovedCannotShip'));
          return;
        }
        setSelectedShipment(shipment);
        setConfirmForm({
          shipment_status: 'shipped',
          remarks: '',
          block_reason: ''
        });
        setConfirmDialogOpen(true);
        return;
      }

      const { data: qaRelease, error: qaError } = await supabase
        .from('qa_releases')
        .select('release_status')
        .eq('finished_product_sn', shipment.finished_product_sn)
        .eq('tenant_id', 'JP')
        .maybeSingle();

      if (qaError) {
        throw new Error(t('shipment.checkQAReleaseFailed'));
      }

      if (!qaRelease || qaRelease.release_status !== 'approved') {
        // 统一去重校验：检查是否已存在该出货记录的未关闭阻断异常
        const existingExceptionId = await checkExistingBlockedException(
          'shipment',
          shipment.id,
          ['shipment_blocked']
        );

        if (existingExceptionId) {
          toast.warning(t('shipment.existingBlockedExceptionPleaseHandle'));
          navigate(`/exceptions?focus=${existingExceptionId}`);
          return;
        }

        // 生成阻断异常
        const { data: exceptionId, error: exceptionError } = await supabase.rpc(
          'create_shipment_blocked_exception',
          {
            p_shipment_id: shipment.id,
            p_finished_product_sn: shipment.finished_product_sn,
            p_block_reason: t('shipment.qaNotApprovedCannotShip'),
            p_tenant_id: 'JP',
            p_user_id: profile?.id || ''
          }
        );

        if (exceptionError) {
          console.error(t('shipment.createError'), exceptionError);
        }

        toast.error(t('shipment.qaNotApprovedCannotShip'));
        return;
      }

      // 检查通过,打开对话框
      setSelectedShipment(shipment);
      setConfirmForm({
        shipment_status: 'confirmed',
        remarks: '',
        block_reason: ''
      });
      setConfirmDialogOpen(true);
    } catch (error: unknown) {
      console.error(t('shipment.checkPreconditionFailed'), error);
      toast.error(error instanceof Error ? error.message : t('shipment.checkPreconditionFailed'));
    }
  };

  const handleConfirmShipment = async () => {
    if (!selectedShipment) return;

    if (!confirmForm.shipment_status) {
      toast.error(t('shipment.pleaseSelectShipmentStatus'));
      return;
    }

    if (confirmForm.shipment_status === 'blocked' && !confirmForm.block_reason.trim()) {
      toast.error(t('shipment.blockReasonRequiredWhenBlocked'));
      return;
    }

    try {
      await confirmShipment(
        selectedShipment.id,
        confirmForm.shipment_status,
        confirmForm.remarks,
        confirmForm.block_reason,
        'JP',
        profile?.id || ''
      );
      toast.success(t('shipment.confirmSuccess'));
      setConfirmDialogOpen(false);
      setSelectedShipment(null);
      fetchShipments();
    } catch (error: unknown) {
      console.error(t('shipment.confirmError'), error);
      toast.error(error instanceof Error ? error.message : t('shipment.confirmError'));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'secondary' | 'outline' | 'destructive' | 'default' }> = {
      pending: { label: t('shipment.statusPending'), variant: 'secondary' },
      shipped: { label: t('shipment.statusShipped'), variant: 'outline' },
      blocked: { label: t('shipment.statusBlocked'), variant: 'destructive' },
    };
    const config = statusMap[status] || { label: status, variant: 'secondary' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

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

  const filteredShipments = shipments.filter(shipment =>
    shipment.finished_product_sn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shipment.shipment_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 获取高亮的出货ID或SN对应的ID
  const highlightedConfirmationId = searchParams.get('confirmation_id');
  const highlightedSn = searchParams.get('sn');
  const highlightedSnShipmentId = highlightedSn 
    ? shipments.find(shipment => shipment.finished_product_sn === highlightedSn)?.id?.toString()
    : null;

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-48 bg-muted" />
        <Skeleton className="h-96 w-full bg-muted" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-normal">{t('shipment.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('shipment.subtitle')}
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('shipment.create')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('shipment.createDialogTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>{t('shipment.finishedProductSn')}</Label>
                <Input
                  value={createForm.finished_product_sn}
                  onChange={(e) => setCreateForm({ ...createForm, finished_product_sn: e.target.value })}
                  placeholder={t('shipment.inputSn')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creating}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleCreateShipment} disabled={creating || !createForm.finished_product_sn.trim()}>
                {creating ? t('common.creating') : t('common.create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-normal">
              <Truck className="h-5 w-5" />
              {t('shipment.shipmentRecordList')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder={t('common.searchSnOrCode')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56"
              />
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={t('common.statusFilterPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="pending">{t('shipment.statusPending')}</SelectItem>
                  <SelectItem value="shipped">{t('shipment.statusShipped')}</SelectItem>
                  <SelectItem value="blocked">{t('shipment.statusBlocked')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredShipments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Truck className="mx-auto h-12 w-12 opacity-50 mb-4" />
              <p>{t('shipment.emptyText')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredShipments.map((shipment) => (
                <div 
                  key={shipment.id} 
                  id={`shipment-row-${shipment.id}`}
                  className={`border border-border rounded-md p-4 cursor-pointer hover:bg-muted/30 transition-colors ${
                    (highlightedConfirmationId && shipment.id.toString() === highlightedConfirmationId) || 
                    (highlightedSnShipmentId && shipment.id.toString() === highlightedSnShipmentId)
                      ? 'bg-primary/10 border-primary'
                      : ''
                  }`}
                  onClick={() => navigate(`/shipment?confirmation_id=${shipment.id}&sn=${shipment.finished_product_sn}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-medium">{shipment.shipment_code}</p>
                        {getStatusBadge(shipment.shipment_status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div>
                          <span>{t('shipment.finishedProductSn')}：</span>
                          <span>{shipment.finished_product_sn}</span>
                        </div>
                        <div>
                          <span>{t('shipment.shippedAt')}：</span>
                          <span>{shipment.shipped_at ? new Date(shipment.shipped_at).toLocaleString(i18n.language) : t('shipment.notShipped')}</span>
                        </div>
                        {shipment.block_reason && (
                          <div className="col-span-2">
                            <span>{t('shipment.blockReason')}：</span>
                            <span className="text-destructive">{shipment.block_reason}</span>
                          </div>
                        )}
                        {shipment.remarks && (
                          <div className="col-span-2">
                            <span>{t('shipment.remarks')}：</span>
                            <span>{shipment.remarks}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      {shipment.shipment_status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleOpenConfirmDialog(shipment)}
                        >
                          {t('shipment.confirm')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 确认出货对话框 */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('shipment.confirmDialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{t('shipment.shipmentCode')}</Label>
              <Input value={selectedShipment?.shipment_code || ''} disabled />
            </div>
            <div>
              <Label>{t('shipment.finishedProductSn')}</Label>
              <Input value={selectedShipment?.finished_product_sn || ''} disabled />
            </div>
            <div>
              <Label>{t('shipment.shipmentStatus')}</Label>
              <Select
                value={confirmForm.shipment_status}
                onValueChange={(value) => setConfirmForm({ ...confirmForm, shipment_status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('shipment.selectShipmentStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shipped">{t('shipment.confirmed')}</SelectItem>
                  <SelectItem value="blocked">{t('shipment.blocked')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {confirmForm.shipment_status === 'blocked' && (
              <div>
                <Label>{t('shipment.blockReason')}</Label>
                <Textarea
                  value={confirmForm.block_reason}
                  onChange={(e) => setConfirmForm({ ...confirmForm, block_reason: e.target.value })}
                  placeholder={t('shipment.blockReasonPlaceholder')}
                  rows={3}
                />
              </div>
            )}
            <div>
              <Label>{t('shipment.remarks')}</Label>
              <Textarea
                value={confirmForm.remarks}
                onChange={(e) => setConfirmForm({ ...confirmForm, remarks: e.target.value })}
                placeholder={t('shipment.remarksPlaceholder')}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleConfirmShipment}>
              {t('common.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
