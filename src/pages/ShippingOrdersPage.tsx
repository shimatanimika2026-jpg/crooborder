import { Package, Plus, Search, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { createShippingOrder, getShippingOrders } from '@/services/shippingService';
import { formatDate } from '@/lib/date-format';
import type { ShippingOrder, ShippingOrderItem } from '@/types/database';
import { getErrorMessage } from '@/lib/error-utils';

export default function ShippingOrdersPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<ShippingOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<ShippingOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterException, setFilterException] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // 表单状态
  const [shipperName, setShipperName] = useState('');
  const [shipperContact, setShipperContact] = useState('');
  const [shipperAddress, setShipperAddress] = useState('');
  const [consigneeName, setConsigneeName] = useState('');
  const [consigneeContact, setConsigneeContact] = useState('');
  const [consigneeAddress, setConsigneeAddress] = useState('');
  const [carrier, setCarrier] = useState('');
  const [estimatedShipDate, setEstimatedShipDate] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  // 监听URL参数变化，同步更新筛选状态
  useEffect(() => {
    const status = searchParams.get('status');
    const hasException = searchParams.get('has_exception');
    setFilterStatus(status || 'all');
    setFilterException(hasException === 'true');
  }, [searchParams]);

  useEffect(() => {
    applyFilters();
  }, [orders, searchTerm, filterStatus, filterException]);

  const loadOrders = async () => {
    try {
      const data = await getShippingOrders('JP', filterStatus);
      setOrders(data);
    } catch (error) {
      console.error(t('common.error'), error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.order_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.consignee_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(order => order.status === filterStatus);
    }

    if (filterException) {
      filtered = filtered.filter(order => order.has_exception === true);
    }

    setFilteredOrders(filtered);
  };

  const handleStatusChange = (value: string) => {
    setFilterStatus(value);
    const nextParams = new URLSearchParams(searchParams);
    if (value === 'all') {
      nextParams.delete('status');
    } else {
      nextParams.set('status', value);
    }
    setSearchParams(nextParams);
  };

  const handleCreateOrder = async () => {
    if (actionLoading) return;
    if (!profile) return;
    
    if (!shipperName || !consigneeName || !consigneeContact || !consigneeAddress || !carrier) {
      toast.error('请填写必填字段');
      return;
    }
    
    setActionLoading(true);
    try {
      const newOrderId = await createShippingOrder(
        null,
        shipperName,
        shipperContact,
        shipperAddress,
        consigneeName,
        consigneeContact,
        consigneeAddress,
        carrier,
        estimatedShipDate,
        [] as import('@/types/database').ShippingOrderItem[],
        'JP',
        profile.id
      );
      
      toast.success(t('common.success'));
      setCreateDialogOpen(false);
      resetForm();
      
      // 导航到新创建的订单详情页
      navigate(`/shipping-orders/${newOrderId}`);
      
      // 刷新列表（用于返回列表时显示最新数据）
      loadOrders();
    } catch (error: unknown) {
      console.error(t('common.error'), error);
      toast.error(getErrorMessage(error, '创建发货订单失败'));
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setShipperName('');
    setShipperContact('');
    setShipperAddress('');
    setConsigneeName('');
    setConsigneeContact('');
    setConsigneeAddress('');
    setCarrier('');
    setEstimatedShipDate('');
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
    };
    return t(labelKeys[status] || 'common.unknown');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'preparing': return 'secondary';
      case 'shipped': return 'default';
      case 'in_transit': return 'default';
      case 'customs_clearance': return 'default';
      case 'delivering': return 'default';
      case 'delivered': return 'outline';
      case 'exception': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'secondary';
    }
  };

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
          <h1 className="text-2xl font-normal">发货订单管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理中国到日本的发货订单
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          创建发货订单
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-normal">筛选条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索订单编号、物流单号、收货人..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder={t('shipping.orderStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('shipping.allStatus')}</SelectItem>
                <SelectItem value="pending">{t('shipping.statusPending')}</SelectItem>
                <SelectItem value="preparing">{t('shipping.statusPreparing')}</SelectItem>
                <SelectItem value="shipped">{t('shipping.statusShipped')}</SelectItem>
                <SelectItem value="in_transit">{t('shipping.statusInTransit')}</SelectItem>
                <SelectItem value="customs_clearance">{t('shipping.statusCustomsClearance')}</SelectItem>
                <SelectItem value="delivering">{t('shipping.statusDelivering')}</SelectItem>
                <SelectItem value="delivered">{t('shipping.statusDelivered')}</SelectItem>
                <SelectItem value="exception">{t('shipping.statusException')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-normal">订单列表</CardTitle>
          <CardDescription>
            共 {filteredOrders.length} 条订单
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>暂无发货订单</p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border border-border rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => navigate(`/shipping-orders/${order.id}`)}
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{order.order_code}</span>
                      <Badge variant={getStatusColor(order.status)}>
                        {getStatusLabel(order.status)}
                      </Badge>
                      {order.tracking_number && (
                        <span className="text-sm text-muted-foreground">
                          物流单号: {order.tracking_number}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{t('shipping.consignee')}: {order.consignee_name}</span>
                      <span>{t('shipping.carrier')}: {order.carrier || t('shipping.carrierNotSpecified')}</span>
                      {order.actual_ship_date && (
                        <span>
                          {t('shipping.actualShipDate')}: {formatDate(order.actual_ship_date, i18n.language)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 创建发货订单对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>创建发货订单</DialogTitle>
            <DialogDescription>
              填写发货和收货信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">发货人信息</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>发货人姓名 *</Label>
                  <Input
                    value={shipperName}
                    onChange={(e) => setShipperName(e.target.value)}
                    placeholder="输入发货人姓名"
                  />
                </div>
                <div>
                  <Label>联系电话</Label>
                  <Input
                    value={shipperContact}
                    onChange={(e) => setShipperContact(e.target.value)}
                    placeholder="输入联系电话"
                  />
                </div>
              </div>
              <div>
                <Label>发货地址</Label>
                <Textarea
                  value={shipperAddress}
                  onChange={(e) => setShipperAddress(e.target.value)}
                  placeholder="输入发货地址"
                  rows={2}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">收货人信息</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>收货人姓名 *</Label>
                  <Input
                    value={consigneeName}
                    onChange={(e) => setConsigneeName(e.target.value)}
                    placeholder="输入收货人姓名"
                  />
                </div>
                <div>
                  <Label>联系电话 *</Label>
                  <Input
                    value={consigneeContact}
                    onChange={(e) => setConsigneeContact(e.target.value)}
                    placeholder="输入联系电话"
                  />
                </div>
              </div>
              <div>
                <Label>收货地址 *</Label>
                <Textarea
                  value={consigneeAddress}
                  onChange={(e) => setConsigneeAddress(e.target.value)}
                  placeholder="输入日本收货地址"
                  rows={2}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">物流信息</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>承运商 *</Label>
                  <Input
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder="如：顺丰、DHL"
                  />
                </div>
                <div>
                  <Label>预计发货日期</Label>
                  <Input
                    type="date"
                    value={estimatedShipDate}
                    onChange={(e) => setEstimatedShipDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={actionLoading}>
              取消
            </Button>
            <Button onClick={handleCreateOrder} disabled={actionLoading || !shipperName || !consigneeName || !consigneeContact || !consigneeAddress || !carrier}>
              {actionLoading ? '创建中...' : '创建订单'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
