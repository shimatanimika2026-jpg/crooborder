import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { getDemoInventoryStatus, type DemoInventoryStatus } from '@/data/demo/inventory-assembly';
import { runtimeMode, supabase } from '@/db/supabase';
import type { InventoryStatus } from '@/types/database';

type InventoryRow = InventoryStatus | DemoInventoryStatus;

const getQty = (item: InventoryRow, key: 'available_qty' | 'reserved_qty' | 'consumed_qty' | 'blocked_qty') => {
  if (key in item) return (item as DemoInventoryStatus)[key];
  if (key === 'available_qty') return item.current_quantity;
  return 0;
};

export default function InventoryPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [currentView, setCurrentView] = useState<string>('all');

  useEffect(() => {
    loadInventory();
  }, [profile]);

  useEffect(() => {
    setCurrentView(searchParams.get('view') || 'all');
  }, [searchParams]);

  const loadInventory = async () => {
    setLoading(true);
    try {
      if (runtimeMode === 'demo') {
        setInventory(getDemoInventoryStatus());
        return;
      }

      if (!profile) return;

      const { data, error } = await supabase
        .from('materialized_view_inventory_status')
        .select('*')
        .eq('tenant_id', profile.tenant_id === 'BOTH' ? 'CN' : profile.tenant_id)
        .order('updated_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Load inventory failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatusColor = (status: string) => {
    const colorMap: Record<string, 'default' | 'secondary' | 'destructive'> = {
      normal: 'default',
      low_stock: 'secondary',
      out_of_stock: 'destructive',
    };
    return colorMap[status] || 'default';
  };

  const filteredInventory = inventory.filter((item) => {
    switch (currentView) {
      case 'available':
        return getQty(item, 'available_qty') > 0;
      case 'reserved':
        return getQty(item, 'reserved_qty') > 0;
      case 'consumed':
        return getQty(item, 'consumed_qty') > 0 || item.stock_status === 'out_of_stock';
      case 'blocked':
        return getQty(item, 'blocked_qty') > 0;
      default:
        return true;
    }
  });

  const viewTitle: Record<string, string> = {
    available: 'Available inventory',
    reserved: 'Reserved inventory',
    consumed: 'Consumed inventory',
    blocked: 'Blocked inventory',
    all: t('inventory.subtitle'),
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48 bg-muted" />
        <div className="grid gap-4">
          {[...Array(8)].map((_, index) => (
            <Skeleton key={index} className="h-24 bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-light tracking-tight">{t('nav.inventory')}</h1>
        <p className="text-muted-foreground">{viewTitle[currentView] || viewTitle.all}</p>
      </div>

      <div className="grid gap-4">
        {filteredInventory.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">{t('common.noData')}</p>
            </CardContent>
          </Card>
        ) : (
          filteredInventory.map((item) => (
            <Card key={item.inventory_id} className="hover:shadow-sm transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-normal">{item.material_name}</CardTitle>
                    <CardDescription>
                      {item.material_code} | {t(`inventory.${item.material_type}`)}
                    </CardDescription>
                  </div>
                  <Badge variant={getStockStatusColor(item.stock_status)}>{t(`inventory.${item.stock_status}`)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground">On Hand</p>
                    <p className="font-normal">{item.current_quantity}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Available</p>
                    <p className="font-normal text-primary">{getQty(item, 'available_qty')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Reserved / Consumed</p>
                    <p className="font-normal">
                      {getQty(item, 'reserved_qty')} / {getQty(item, 'consumed_qty')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Blocked</p>
                    <p className="font-normal text-destructive">{getQty(item, 'blocked_qty')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground">{t('inventory.safetyStock')}</p>
                    <p className="font-normal">{item.safety_stock_threshold}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('inventory.warehouseLocation')}</p>
                    <p className="font-normal">{item.warehouse_location}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('common.tenant')}</p>
                    <p className="font-normal">{item.tenant_id}</p>
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
