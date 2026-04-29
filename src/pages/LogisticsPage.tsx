import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase, runtimeMode } from '@/db/supabase';
import { demoLogisticsWithAsn } from '@/data/demo/operations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Eye, Search, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface LogisticsWithASN {
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

export default function LogisticsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [logistics, setLogistics] = useState<LogisticsWithASN[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadLogistics();
  }, []);

  const loadLogistics = async () => {
    setLoading(true);
    try {
      if (runtimeMode === 'demo') {
        setLogistics(demoLogisticsWithAsn);
        return;
      }

      const { data, error } = await supabase
        .from('view_logistics_with_asn')
        .select('*')
        .order('last_update', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogistics(data || []);
    } catch (error) {
      console.error('加载物流信息失败:', error);
      toast.error('加载物流信息失败');
    } finally {
      setLoading(false);
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

  const filteredLogistics = logistics.filter((item) => {
    const matchSearch = 
      item.shipment_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tracking_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.asn_no?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = filterStatus === 'all' || item.status === filterStatus;
    
    return matchSearch && matchStatus;
  });

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
          <h1 className="text-2xl font-normal">物流管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            中国发货 → 在途 → 日本到货全流程跟踪
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            总计: {logistics.length}
          </Badge>
          <Badge variant="destructive">
            延误: {logistics.filter(l => l.status === 'delayed').length}
          </Badge>
        </div>
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
                  placeholder="搜索物流单号、跟踪号、ASN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
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
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredLogistics.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">暂无物流数据</p>
            </CardContent>
          </Card>
        ) : (
          filteredLogistics.map((item) => (
            <Card key={item.shipment_id} className="hover:shadow-sm transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-normal flex items-center gap-2">
                      {item.shipment_no}
                      {(item.status === 'delayed' || item.status === 'customs_hold') && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                    </CardTitle>
                    <CardDescription>
                      {item.carrier || item.logistics_company || '承运商未知'} | {item.tracking_no || item.tracking_number || '无跟踪号'}
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusColor(item.status)}>
                    {getStatusLabel(item.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground">起运地</p>
                      <p className="font-normal">{item.origin || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">目的地</p>
                      <p className="font-normal">{item.destination || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">当前位置</p>
                      <p className="font-normal">{item.current_location || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">预计到达</p>
                      <p className="font-normal">{item.estimated_arrival_date || '-'}</p>
                    </div>
                  </div>

                  {/* ASN 关联信息 */}
                  {item.asn_id && (
                    <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">关联 ASN</p>
                        <p className="text-sm font-normal">{item.asn_no}</p>
                      </div>
                      {item.asn_status && (
                        <Badge variant="outline">{item.asn_status}</Badge>
                      )}
                      {item.receiving_id && (
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">收货单号</p>
                          <p className="text-sm font-normal">{item.receiving_code}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                      最后更新: {new Date(item.last_update).toLocaleString('zh-CN')}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/logistics/${item.shipment_id}`)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      查看详情
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
