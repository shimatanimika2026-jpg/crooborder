import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Package,
  MapPin,
  Clock,
  AlertTriangle,
  RefreshCw,
  Truck,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

interface LogisticsDetail {
  shipment_id: number;
  shipment_no: string;
  tracking_no: string | null;
  carrier: string | null;
  origin: string | null;
  destination: string | null;
  shipping_date: string;
  estimated_arrival_date: string;
  actual_arrival_date: string | null;
  status: string;
  current_location: string | null;
  current_status: string | null;
  last_update: string;
  tenant_id: string;
  tracking_number: string | null;
  logistics_company: string | null;
  asn_id: number | null;
  asn_no: string | null;
  asn_status: string | null;
  receiving_id: number | null;
  receiving_code: string | null;
  receiving_status: string | null;
}

interface LogisticsEvent {
  id: number;
  event_time: string;
  event_location: string | null;
  event_description: string;
  event_type: string;
}

export default function LogisticsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<LogisticsDetail | null>(null);
  const [events, setEvents] = useState<LogisticsEvent[]>([]);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [exceptionDialogOpen, setExceptionDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // 表单状态
  const [newStatus, setNewStatus] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [exceptionType, setExceptionType] = useState('');
  const [exceptionDescription, setExceptionDescription] = useState('');

  useEffect(() => {
    if (id) {
      loadLogisticsDetail();
    }
  }, [id]);

  const loadLogisticsDetail = async () => {
    if (!id) return;

    setLoading(true);
    try {
      // 加载物流详情
      const { data: detailData, error: detailError } = await supabase
        .from('view_logistics_with_asn')
        .select('*')
        .eq('shipment_id', id)
        .maybeSingle();

      if (detailError) throw detailError;
      if (!detailData) {
        toast.error('物流订单不存在');
        navigate('/logistics');
        return;
      }
      setDetail(detailData);

      // 加载物流事件
      const { data: trackingData } = await supabase
        .from('logistics_tracking')
        .select('id')
        .eq('shipping_id', id)
        .maybeSingle();

      if (trackingData) {
        const { data: eventsData, error: eventsError } = await supabase
          .from('logistics_events')
          .select('*')
          .eq('tracking_id', trackingData.id)
          .order('event_time', { ascending: false });

        if (eventsError) throw eventsError;
        setEvents(eventsData || []);
      }
    } catch (error) {
      console.error('加载物流详情失败:', error);
      toast.error('加载物流详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!detail || !newStatus) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('update_logistics_status', {
        p_shipment_no: detail.shipment_no,
        p_new_status: newStatus,
        p_current_location: newLocation || null,
        p_event_description: eventDescription || null,
        p_updated_by: profile?.id,
      });

      if (error) throw error;

      toast.success('物流状态更新成功');
      setUpdateDialogOpen(false);
      setNewStatus('');
      setNewLocation('');
      setEventDescription('');
      loadLogisticsDetail();
    } catch (error) {
      console.error('更新物流状态失败:', error);
      toast.error('更新物流状态失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportException = async () => {
    if (!detail || !exceptionType) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('create_logistics_exception', {
        p_exception_type: exceptionType,
        p_shipment_no: detail.shipment_no,
        p_tracking_no: detail.tracking_no || detail.tracking_number,
        p_description: exceptionDescription || null,
        p_severity: exceptionType === 'logistics_missing' ? 'critical' : 'high',
        p_tenant_id: detail.tenant_id,
      });

      if (error) throw error;

      toast.success('物流异常已上报');
      setExceptionDialogOpen(false);
      setExceptionType('');
      setExceptionDescription('');
    } catch (error) {
      console.error('上报物流异常失败:', error);
      toast.error('上报物流异常失败');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delayed':
      case 'customs_hold':
        return 'destructive';
      case 'in_transit':
        return 'secondary';
      case 'arrived':
      case 'received':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      created: '已创建',
      preparing: '准备中',
      shipped: '已发货',
      in_transit: '在途',
      delayed: '延误',
      customs_hold: '海关扣留',
      arrived: '已到达',
      partially_received: '部分收货',
      received: '已收货',
      cancelled: '已取消',
    };
    return labels[status] || status;
  };

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      shipped: '已发货',
      pickup: '已取件',
      in_transit: '运输中',
      customs_clearance: '清关中',
      customs_hold: '海关扣留',
      delay: '延误',
      delayed: '延误',
      arrived: '已到达',
      delivered: '已交付',
      exception: '异常',
      damaged: '货损',
      missing: '丢失',
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

  if (!detail) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">物流订单不存在</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/logistics')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-normal">{detail.shipment_no}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {detail.carrier || detail.logistics_company || '承运商未知'} | {detail.tracking_no || detail.tracking_number || '无跟踪号'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusColor(detail.status)}>
            {getStatusLabel(detail.status)}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => setUpdateDialogOpen(true)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            更新状态
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExceptionDialogOpen(true)}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            上报异常
          </Button>
        </div>
      </div>

      {/* 物流信息卡片 */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-normal flex items-center gap-2">
              <Package className="h-5 w-5" />
              物流信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">物流单号</p>
                <p className="font-normal">{detail.shipment_no}</p>
              </div>
              <div>
                <p className="text-muted-foreground">跟踪号</p>
                <p className="font-normal">{detail.tracking_no || detail.tracking_number || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">承运商</p>
                <p className="font-normal">{detail.carrier || detail.logistics_company || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">发货日期</p>
                <p className="font-normal">{detail.shipping_date}</p>
              </div>
              <div>
                <p className="text-muted-foreground">预计到达</p>
                <p className="font-normal">{detail.estimated_arrival_date}</p>
              </div>
              <div>
                <p className="text-muted-foreground">实际到达</p>
                <p className="font-normal">{detail.actual_arrival_date || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-normal flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              位置信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">起运地</p>
                <p className="font-normal">{detail.origin || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">目的地</p>
                <p className="font-normal">{detail.destination || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">当前位置</p>
                <p className="font-normal">{detail.current_location || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">当前状态</p>
                <p className="font-normal">{detail.current_status || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ASN 关联信息 */}
      {detail.asn_id && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-normal flex items-center gap-2">
              <FileText className="h-5 w-5" />
              关联 ASN
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">ASN 编号</p>
                <p className="font-normal">{detail.asn_no}</p>
              </div>
              <div>
                <p className="text-muted-foreground">ASN 状态</p>
                <Badge variant="outline">{detail.asn_status}</Badge>
              </div>
              {detail.receiving_id && (
                <>
                  <div>
                    <p className="text-muted-foreground">收货单号</p>
                    <p className="font-normal">{detail.receiving_code}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">收货状态</p>
                    <Badge variant="outline">{detail.receiving_status}</Badge>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 物流事件时间线 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-normal flex items-center gap-2">
            <Clock className="h-5 w-5" />
            物流事件
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">暂无物流事件</p>
          ) : (
            <div className="space-y-4">
              {events.map((event, index) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full ${index === 0 ? 'bg-primary' : 'bg-muted'}`} />
                    {index < events.length - 1 && (
                      <div className="w-px h-full bg-border mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline">{getEventTypeLabel(event.event_type)}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.event_time).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <p className="text-sm">{event.event_description}</p>
                    {event.event_location && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <MapPin className="inline h-3 w-3 mr-1" />
                        {event.event_location}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 更新状态对话框 */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>更新物流状态</DialogTitle>
            <DialogDescription>更新物流订单的当前状态和位置信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>新状态</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preparing">准备中</SelectItem>
                  <SelectItem value="shipped">已发货</SelectItem>
                  <SelectItem value="in_transit">在途</SelectItem>
                  <SelectItem value="delayed">延误</SelectItem>
                  <SelectItem value="customs_hold">海关扣留</SelectItem>
                  <SelectItem value="arrived">已到达</SelectItem>
                  <SelectItem value="received">已收货</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>当前位置（可选）</Label>
              <Input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="例如：上海浦东国际机场"
              />
            </div>
            <div className="space-y-2">
              <Label>事件描述（可选）</Label>
              <Textarea
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="例如：货物已通过海关检查"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateStatus} disabled={!newStatus || actionLoading}>
              {actionLoading ? '更新中...' : '确认更新'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 上报异常对话框 */}
      <Dialog open={exceptionDialogOpen} onOpenChange={setExceptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>上报物流异常</DialogTitle>
            <DialogDescription>记录物流过程中的异常情况</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>异常类型</Label>
              <Select value={exceptionType} onValueChange={setExceptionType}>
                <SelectTrigger>
                  <SelectValue placeholder="选择异常类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="logistics_delayed">物流延误</SelectItem>
                  <SelectItem value="logistics_damaged">货物损坏</SelectItem>
                  <SelectItem value="logistics_missing">货物丢失</SelectItem>
                  <SelectItem value="logistics_customs_issue">海关问题</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>异常描述</Label>
              <Textarea
                value={exceptionDescription}
                onChange={(e) => setExceptionDescription(e.target.value)}
                placeholder="请详细描述异常情况..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExceptionDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleReportException} disabled={!exceptionType || actionLoading}>
              {actionLoading ? '上报中...' : '确认上报'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
