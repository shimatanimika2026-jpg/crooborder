import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import ProductionOrderCreateDialog from '@/components/ProductionOrderCreateDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import type { ProductionOrder } from '@/types/database';

export default function ProductionOrdersPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadOrders();
  }, [profile]);

  // 监听URL参数变化，同步更新筛选状态
  useEffect(() => {
    const status = searchParams.get('status');
    setStatusFilter(status || 'all');
  }, [searchParams]);

  const loadOrders = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('production_orders')
        .select('*')
        .eq('tenant_id', profile.tenant_id === 'BOTH' ? 'CN' : profile.tenant_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('加载生产订单失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, 'default' | 'secondary' | 'destructive'> = {
      pending: 'secondary',
      in_progress: 'default',
      completed: 'default',
      cancelled: 'destructive',
    };
    return colorMap[status] || 'default';
  };

  // 状态筛选
  const filteredOrders = orders.filter((order) => {
    return statusFilter === 'all' || order.status === statusFilter;
  });

  // 同步状态筛选到 URL
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

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48 bg-muted" />
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-light tracking-tight">{t('nav.productionOrder')}</h1>
          <p className="text-muted-foreground">{t('productionOrder.subtitle')}</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('common.create')}
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="选择状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">待开始</SelectItem>
            <SelectItem value="in_progress">进行中</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="cancelled">已取消</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">{t('common.noData')}</p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-sm transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-normal">{order.order_code}</CardTitle>
                    <CardDescription>
                      {order.part_name} ({order.part_code})
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusColor(order.status)}>
                    {t(`productionOrder.${order.status}`)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground">{t('productionOrder.productionQuantity')}</p>
                    <p className="font-normal">{order.production_quantity}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('productionOrder.plannedStartDate')}</p>
                    <p className="font-normal">{order.planned_start_date}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('productionOrder.plannedEndDate')}</p>
                    <p className="font-normal">{order.planned_end_date}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('common.tenant')}</p>
                    <p className="font-normal">{order.tenant_id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <ProductionOrderCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadOrders}
      />
    </div>
  );
}
