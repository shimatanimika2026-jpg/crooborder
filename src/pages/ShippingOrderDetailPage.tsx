import { AlertTriangle, ArrowLeft, Clock, MapPin, Package, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { createLogisticsExceptionEvent, getLogisticsEvents, getLogisticsTracking, updateLogisticsStatus } from '@/services/logisticsService';
import { confirmShipment, getShippingOrderDetail } from '@/services/shippingService';
import type { ShippingOrder, LogisticsTracking, LogisticsEvent } from '@/types/database';
import { getErrorMessage } from '@/lib/error-utils';

export default function ShippingOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<ShippingOrder | null>(null);
  const [tracking, setTracking] = useState<LogisticsTracking | null>(null);
  const [events, setEvents] = useState<LogisticsEvent[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  
  // 对话框状态
  const [confirmShipDialogOpen, setConfirmShipDialogOpen] = useState(false);
  const [updateStatusDialogOpen, setUpdateStatusDialogOpen] = useState(false);
  const [exceptionDialogOpen, setExceptionDialogOpen] = useState(false);
  
  // 表单状态
  const [trackingNumber, setTrackingNumber] = useState('');
  const [actualShipDate, setActualShipDate] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [exceptionType, setExceptionType] = useState('delay');
  const [exceptionDescription, setExceptionDescription] = useState('');
  const [exceptionLocation, setExceptionLocation] = useState('');

  useEffect(() => {
    if (id) {
      loadOrderDetail();
    }
  }, [id]);

  const loadOrderDetail = async () => {
    if (!id) return;
    
    try {
      const orderData = await getShippingOrderDetail(parseInt(id), 'JP');
      if (!orderData) {
        toast.error('订单不存在');
        navigate('/shipping-orders');
        return;
      }
      
      setOrder(orderData);
      
      // 加载物流轨迹
      if (orderData.status !== 'pending' && orderData.status !== 'preparing') {
        const trackingData = await getLogisticsTracking(parseInt(id), 'JP');
        setTracking(trackingData);
        
        // 加载物流事件
        const eventsData = await getLogisticsEvents(parseInt(id), 'JP');
        setEvents(eventsData);
      }
    } catch (error) {
      console.error(t('common.error'), error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmShip = async () => {
    if (!profile || !order) return;
    
    if (!trackingNumber || !actualShipDate) {
      toast.error('请填写物流单号和发货日期');
      return;
    }
    
    setActionLoading(true);
    try {
      await confirmShipment(order.id, trackingNumber, actualShipDate, 'JP', profile.id);
      toast.success(t('common.success'));
      setConfirmShipDialogOpen(false);
      loadOrderDetail();
    } catch (error: unknown) {
      console.error(t('common.error'), error);
      toast.error(getErrorMessage(error, '确认发货失败'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!tracking) return;
    
    if (!newStatus || !location || !description) {
      toast.error('请填写所有必填字段');
      return;
    }
    
    setActionLoading(true);
    try {
      await updateLogisticsStatus(tracking.id, newStatus, location, description, 'JP');
      toast.success(t('common.success'));
      setUpdateStatusDialogOpen(false);
      loadOrderDetail();
    } catch (error: unknown) {
      console.error(t('common.error'), error);
      toast.error(getErrorMessage(error, '更新物流状态失败'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateException = async () => {
    if (!profile || !tracking) return;
    
    if (!exceptionDescription || !exceptionLocation) {
      toast.error(t('logistics.errorExceptionRequired'));
      return;
    }
    
    setActionLoading(true);
    try {
      await createLogisticsExceptionEvent(
        tracking.id,
        exceptionType,
        exceptionDescription,
        exceptionLocation,
        'JP',
        profile.id
      );
      toast.success(t('logistics.successExceptionRecorded'));
      setExceptionDialogOpen(false);
      loadOrderDetail();
    } catch (error: unknown) {
      console.error(t('common.error'), error);
      toast.error(getErrorMessage(error, t('logistics.errorRecordException')));
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labelKeys: Record<string, string> = {
      pending: 'shipping.statusPending',
      preparing: 'shipping.statusPreparing',
      shipped: 'shipping.statusShipped',
      in_transit: 'shipping.statusInTransit',
      customs_clearance: 'shipping.statusCustomsClearance',
      delivering: 'shipping.statusDelivering',
      delivered: 'shipping.statusDelivered',
      exception: 'shipping.statusException',
      cancelled: 'shipping.statusCancelled',
      picked_up: 'logistics.statusPickedUp',
      departed: 'logistics.statusDeparted',
      arrived_port: 'logistics.statusArrivedPort',
      customs_cleared: 'logistics.statusCustomsCleared',
      out_for_delivery: 'logistics.statusOutForDelivery',
    };
    return t(labelKeys[status] || 'common.unknown');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'preparing':
        return 'secondary';
      case 'shipped':
      case 'in_transit':
      case 'customs_clearance':
      case 'delivering':
        return 'default';
      case 'delivered':
        return 'outline';
      case 'exception':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      normal_update: '正常更新',
      delay: '延迟',
      damage: '货物破损',
      customs_issue: '清关问题',
      address_error: '地址错误',
      lost: '货物丢失',
      returned: '退回',
      other: '其他',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-48 bg-muted" />
        <Skeleton className="h-96 w-full bg-muted" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p className="text-muted-foreground">订单不存在</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/shipping-orders')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-normal">{order.order_code}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              发货订单详情
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {order.status === 'pending' && (
            <Button onClick={() => setConfirmShipDialogOpen(true)}>
              <Truck className="mr-2 h-4 w-4" />
              确认发货
            </Button>
          )}
          {tracking && order.status !== 'delivered' && order.status !== 'cancelled' && (
            <>
              <Button variant="outline" onClick={() => setUpdateStatusDialogOpen(true)}>
                <MapPin className="mr-2 h-4 w-4" />
                {t('logistics.updateStatus')}
              </Button>
              <Button variant="outline" onClick={() => setExceptionDialogOpen(true)}>
                <AlertTriangle className="mr-2 h-4 w-4" />
                {t('logistics.recordException')}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-normal">订单信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">订单编号</p>
                  <p className="font-medium">{order.order_code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">订单状态</p>
                  <Badge variant={getStatusColor(order.status)}>
                    {getStatusLabel(order.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">承运商</p>
                  <p className="font-medium">{order.carrier || '未指定'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">物流单号</p>
                  <p className="font-medium">{order.tracking_number || '未生成'}</p>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-medium mb-4">发货人信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">姓名</p>
                    <p>{order.shipper_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">联系电话</p>
                    <p>{order.shipper_contact || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">地址</p>
                    <p>{order.shipper_address || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-medium mb-4">收货人信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">姓名</p>
                    <p>{order.consignee_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">联系电话</p>
                    <p>{order.consignee_contact}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">地址</p>
                    <p>{order.consignee_address}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-normal">时间信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">创建时间</p>
                <p className="text-sm">
                  {new Date(order.created_at).toLocaleString('zh-CN')}
                </p>
              </div>
              {order.actual_ship_date && (
                <div>
                  <p className="text-sm text-muted-foreground">实际发货时间</p>
                  <p className="text-sm">
                    {new Date(order.actual_ship_date).toLocaleString('zh-CN')}
                  </p>
                </div>
              )}
              {order.actual_delivery_date && (
                <div>
                  <p className="text-sm text-muted-foreground">实际送达时间</p>
                  <p className="text-sm">
                    {new Date(order.actual_delivery_date).toLocaleString('zh-CN')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {tracking && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-normal">物流轨迹</CardTitle>
            <CardDescription>
              当前状态：{getStatusLabel(tracking.current_status ?? '')} | 最后更新：{new Date(tracking.last_update_time ?? tracking.last_updated_at).toLocaleString('zh-CN')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>暂无物流事件</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                  {events.map((event, index) => (
                    <div key={event.id} className="relative flex gap-4 pb-6">
                      <div className="relative z-10 flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                          event.event_type === 'normal_update' ? 'bg-background border-primary' : 'bg-destructive border-destructive'
                        }`}>
                          {event.event_type === 'normal_update' ? (
                            <MapPin className="h-4 w-4 text-primary" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-destructive-foreground" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{event.description}</span>
                          {event.event_type !== 'normal_update' && (
                            <Badge variant="destructive" className="text-xs">
                              {getEventTypeLabel(event.event_type)}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {event.location && <span>{event.location} · </span>}
                          <span>{new Date(event.event_time).toLocaleString('zh-CN')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 确认发货对话框 */}
      <Dialog open={confirmShipDialogOpen} onOpenChange={setConfirmShipDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认发货</DialogTitle>
            <DialogDescription>
              请填写物流单号和实际发货时间
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>物流单号 *</Label>
              <Input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="输入物流单号"
              />
            </div>
            <div>
              <Label>实际发货时间 *</Label>
              <Input
                type="datetime-local"
                value={actualShipDate}
                onChange={(e) => setActualShipDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmShipDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleConfirmShip} disabled={actionLoading}>
              确认发货
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 更新物流状态对话框 */}
      <Dialog open={updateStatusDialogOpen} onOpenChange={setUpdateStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>更新物流状态</DialogTitle>
            <DialogDescription>
              记录物流节点信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>新状态 *</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder={t('logistics.selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="picked_up">{t('logistics.statusPickedUp')}</SelectItem>
                  <SelectItem value="departed">{t('logistics.statusDeparted')}</SelectItem>
                  <SelectItem value="in_transit">{t('shipping.statusInTransit')}</SelectItem>
                  <SelectItem value="arrived_port">{t('logistics.statusArrivedPort')}</SelectItem>
                  <SelectItem value="customs_clearance">{t('shipping.statusCustomsClearance')}</SelectItem>
                  <SelectItem value="customs_cleared">{t('logistics.statusCustomsCleared')}</SelectItem>
                  <SelectItem value="out_for_delivery">{t('logistics.statusOutForDelivery')}</SelectItem>
                  <SelectItem value="delivered">{t('shipping.statusDelivered')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('logistics.currentLocation')} *</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="如：上海浦东机场"
              />
            </div>
            <div>
              <Label>描述 *</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="描述物流节点信息..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateStatusDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateStatus} disabled={actionLoading}>
              更新状态
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 记录异常对话框 */}
      <Dialog open={exceptionDialogOpen} onOpenChange={setExceptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('logistics.recordExceptionTitle')}</DialogTitle>
            <DialogDescription>
              {t('logistics.recordExceptionDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('logistics.exceptionType')} *</Label>
              <Select value={exceptionType} onValueChange={setExceptionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delay">{t('logistics.exceptionDelay')}</SelectItem>
                  <SelectItem value="damage">{t('logistics.exceptionDamage')}</SelectItem>
                  <SelectItem value="customs_issue">{t('logistics.exceptionCustomsIssue')}</SelectItem>
                  <SelectItem value="address_error">{t('logistics.exceptionAddressError')}</SelectItem>
                  <SelectItem value="lost">{t('logistics.exceptionLost')}</SelectItem>
                  <SelectItem value="returned">{t('logistics.exceptionReturned')}</SelectItem>
                  <SelectItem value="other">{t('logistics.exceptionOther')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('logistics.exceptionLocation')} *</Label>
              <Input
                value={exceptionLocation}
                onChange={(e) => setExceptionLocation(e.target.value)}
                placeholder={t('logistics.exceptionLocationPlaceholder')}
              />
            </div>
            <div>
              <Label>{t('logistics.exceptionDescription')} *</Label>
              <Textarea
                value={exceptionDescription}
                onChange={(e) => setExceptionDescription(e.target.value)}
                placeholder={t('logistics.exceptionDescriptionPlaceholder')}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExceptionDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateException} disabled={actionLoading}>
              {t('logistics.recordException')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
