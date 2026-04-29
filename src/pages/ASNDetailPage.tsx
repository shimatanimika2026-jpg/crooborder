import { ArrowLeft, ExternalLink, FileText, MapPin, Package, Truck, CheckCircle, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/db/supabase';
import { getLogisticsEvents, getLogisticsTracking } from '@/services/logisticsService';
import { 
  canCreateReceivingFromASN, 
  hasExistingReceiving, 
  getASNStatusLabel,
  getASNStatusChangeMessage,
  getCreateReceivingBlockReason
} from '@/lib/asn-rules';
import { formatDate } from '@/lib/date-format';
import type { ASNShipment, ASNShipmentItem, ShippingOrder, LogisticsTracking, LogisticsEvent } from '@/types/database';

export default function ASNDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [shipment, setShipment] = useState<ASNShipment | null>(null);
  const [items, setItems] = useState<ASNShipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [shippingOrder, setShippingOrder] = useState<ShippingOrder | null>(null);
  const [logisticsTracking, setLogisticsTracking] = useState<LogisticsTracking | null>(null);
  const [logisticsEvents, setLogisticsEvents] = useState<LogisticsEvent[]>([]);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      fetchShipmentDetail();
      fetchShippingOrder();
    }
  }, [id]);

  const fetchShipmentDetail = async () => {
    try {
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('asn_shipments')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (shipmentError) throw shipmentError;
      setShipment(shipmentData);

      const { data: itemsData, error: itemsError } = await supabase
        .from('asn_shipment_items')
        .select('*')
        .eq('shipment_id', id)
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

  const fetchShippingOrder = async () => {
    try {
      // 查询关联的发货订单
      const { data: orderData, error: orderError } = await supabase
        .from('shipping_orders')
        .select('*')
        .eq('asn_shipment_id', id)
        .eq('tenant_id', 'JP')
        .maybeSingle();

      if (orderError) throw orderError;
      
      if (orderData) {
        setShippingOrder(orderData);
        
        // 如果有物流轨迹，加载物流信息
        if (orderData.status !== 'pending' && orderData.status !== 'preparing') {
          const trackingData = await getLogisticsTracking(orderData.id, 'JP');
          setLogisticsTracking(trackingData);
          
          const eventsData = await getLogisticsEvents(orderData.id, 'JP');
          setLogisticsEvents(eventsData);
        }
      }
    } catch (error) {
      console.error(t('common.error'), error);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setTargetStatus(newStatus);
    setShowStatusDialog(true);
  };

  const confirmStatusChange = async () => {
    if (!shipment || !targetStatus) return;
    
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('asn_shipments')
        .update({ 
          status: targetStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', shipment.id);

      if (error) throw error;

      toast.success(t('asn.successUpdateStatus'));
      setShipment({ ...shipment, status: targetStatus as ASNShipment['status'] });
      setShowStatusDialog(false);
      
      await fetchShipmentDetail();
    } catch (error) {
      console.error(t('common.error'), error);
      toast.error(t('asn.errorUpdateStatus'));
    } finally {
      setUpdating(false);
    }
  };

  const getStatusActionButton = () => {
    if (!shipment) return null;

    switch (shipment.status) {
      case 'draft':
        return (
          <Button onClick={() => handleStatusChange('in_transit')} variant="default">
            <Send className="mr-2 h-4 w-4" />
            {t('asnRules.confirmShipment')}
          </Button>
        );
      case 'in_transit':
        return (
          <Button onClick={() => handleStatusChange('arrived')} variant="default">
            <CheckCircle className="mr-2 h-4 w-4" />
            {t('asnRules.confirmArrival')}
          </Button>
        );
      case 'arrived':
        return (
          <Button 
            onClick={async () => {
              const hasExisting = await hasExistingReceiving(supabase, shipment.id);
              
              // 使用统一规则检查
              const blockReason = getCreateReceivingBlockReason({
                status: shipment.status,
                itemCount: items.length,
                hasExistingReceiving: hasExisting,
              }, t);
              
              if (blockReason) {
                toast.error(blockReason);
                return;
              }
              
              navigate(`/receiving/create?shipment_id=${shipment.id}`);
            }} 
            variant="default"
          >
            <Package className="mr-2 h-4 w-4" />
            {t('asnRules.createReceiving')}
          </Button>
        );
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    return getASNStatusChangeMessage(targetStatus, t);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, 'secondary' | 'default' | 'destructive'> = {
      draft: 'secondary',
      shipped: 'default',
      in_transit: 'default',
      arrived: 'default',
      received: 'default',
      cancelled: 'destructive',
    };
    const variant = statusMap[status] || 'secondary';
    const label = getASNStatusLabel(status, t);
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('asnRules.shipmentNotFound')}</p>
          <Button onClick={() => navigate('/asn')} className="mt-4">
            {t('common.back')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/asn')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{t('asn.detail')}</h1>
          <p className="text-muted-foreground mt-1">{shipment.shipment_no}</p>
        </div>
        {getStatusBadge(shipment.status)}
        {getStatusActionButton()}
      </div>

      {/* 状态确认对话框 */}
      <AlertDialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('asnRules.confirmStatusChange')}</AlertDialogTitle>
            <AlertDialogDescription>
              {getStatusMessage()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange} disabled={updating}>
              {updating ? t('asnRules.updating') : t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">发货单号</span>
                <p className="font-medium">{shipment.shipment_no}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">状态</span>
                <div className="mt-1">{getStatusBadge(shipment.status)}</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">发货工厂</span>
                <p className="font-medium">{shipment.factory_id}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">目的工厂</span>
                <p className="font-medium">{shipment.destination_factory_id}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">{t('asn.shipmentDate')}</span>
                <p className="font-medium">
                  {formatDate(shipment.shipment_date, i18n.language)}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">{t('asn.etaDate')}</span>
                <p className="font-medium">
                  {shipment.eta_date ? formatDate(shipment.eta_date, i18n.language) : '-'}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">{t('asn.carrier')}</span>
                <p className="font-medium">{shipment.carrier || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">物流单号</span>
                <p className="font-medium">{shipment.tracking_no || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">总箱数</span>
                <p className="font-medium">{shipment.total_boxes} 箱</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">总托数</span>
                <p className="font-medium">{shipment.total_pallets} 托</p>
              </div>
            </div>
            {shipment.remarks && (
              <div>
                <span className="text-sm text-muted-foreground">备注</span>
                <p className="font-medium mt-1">{shipment.remarks}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              发货明细
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">暂无发货明细</p>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{item.part_name}</p>
                        <p className="text-sm text-muted-foreground">{item.part_no}</p>
                      </div>
                      <Badge variant="outline">
                        {item.shipped_qty} {item.unit}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {item.batch_no && (
                        <div>
                          <span className="text-muted-foreground">批次号:</span>
                          <span className="ml-1 font-medium">{item.batch_no}</span>
                        </div>
                      )}
                      {item.box_no && (
                        <div>
                          <span className="text-muted-foreground">箱号:</span>
                          <span className="ml-1 font-medium">{item.box_no}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 物流信息区域 */}
      {shippingOrder && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  物流配送信息
                </CardTitle>
                <CardDescription className="mt-1">
                  关联的物流发货订单及运输轨迹
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/shipping-orders/${shippingOrder.id}`)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                查看物流详情
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 发货订单基本信息 */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">物流订单号</p>
                <p className="font-medium">{shippingOrder.order_code}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">承运商</p>
                <p className="font-medium">{shippingOrder.carrier || '未指定'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">物流单号</p>
                <p className="font-medium">{shippingOrder.tracking_number || '未生成'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">订单状态</p>
                <Badge variant={
                  shippingOrder.status === 'delivered' ? 'outline' :
                  shippingOrder.status === 'exception' ? 'destructive' : 'default'
                }>
                  {shippingOrder.status === 'pending' && t('shipping.statusPending')}
                  {shippingOrder.status === 'preparing' && t('shipping.statusPreparing')}
                  {shippingOrder.status === 'shipped' && t('shipping.statusShipped')}
                  {shippingOrder.status === 'in_transit' && t('shipping.statusInTransit')}
                  {shippingOrder.status === 'customs_clearance' && t('shipping.statusCustomsClearance')}
                  {shippingOrder.status === 'delivering' && t('shipping.statusDelivering')}
                  {shippingOrder.status === 'delivered' && t('shipping.statusDelivered')}
                  {shippingOrder.status === 'exception' && t('shipping.statusException')}
                </Badge>
              </div>
            </div>

            {/* 物流轨迹时间轴 */}
            {logisticsEvents.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-sm font-medium mb-4">物流轨迹</h3>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                  {logisticsEvents.map((event, index) => (
                    <div key={event.id} className="relative flex gap-4 pb-6">
                      <div className="relative z-10 flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                          event.event_type === 'normal_update' ? 'bg-background border-primary' : 'bg-destructive border-destructive'
                        }`}>
                          <MapPin className={`h-4 w-4 ${
                            event.event_type === 'normal_update' ? 'text-primary' : 'text-destructive-foreground'
                          }`} />
                        </div>
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{event.description}</span>
                          {event.event_type !== 'normal_update' && (
                            <Badge variant="destructive" className="text-xs">
                              {t('logistics.exception')}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {event.location && <span>{event.location} · </span>}
                          <span>{new Date(event.event_time).toLocaleString(i18n.language)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 无物流轨迹提示 */}
            {logisticsEvents.length === 0 && shippingOrder.status === 'pending' && (
              <div className="text-center py-8 text-muted-foreground">
                <Truck className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">{t('logistics.waitingForShipment')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
