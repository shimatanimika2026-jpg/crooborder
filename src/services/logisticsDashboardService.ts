import { demoShippingOrders } from '@/data/demo/operations';
import { runtimeMode, supabase } from '@/db/supabase';
import type {
  CarrierPerformanceStat,
  LogisticsDashboardStats,
  LogisticsExceptionOrder,
  LogisticsTimeoutOrder,
} from '@/types/database';

const getDemoOrders = (tenantId: string, carrier?: string) =>
  demoShippingOrders.filter((order) => {
    const matchesTenant = order.tenant_id === tenantId;
    const matchesCarrier = !carrier || order.carrier === carrier;
    return matchesTenant && matchesCarrier;
  });

const emptyLogisticsDashboardStats: LogisticsDashboardStats = {
  total_orders: 0,
  in_transit_count: 0,
  arrived_count: 0,
  exception_count: 0,
  timeout_count: 0,
  avg_transit_days: 0,
  avg_transport_hours: 0,
  avg_customs_hours: 0,
  on_time_rate: 0,
  status_distribution: [],
};

export async function getLogisticsDashboardStats(
  tenantId: string,
  carrier?: string,
  startDate?: string,
  endDate?: string
): Promise<LogisticsDashboardStats> {
  if (runtimeMode === 'demo') {
    const orders = getDemoOrders(tenantId, carrier);
    const statusCounts = orders.reduce<Record<string, number>>((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    return {
      total_orders: orders.length,
      in_transit_count: orders.filter((order) => order.status === 'in_transit').length,
      arrived_count: orders.filter((order) => ['arrived', 'delivered'].includes(order.status)).length,
      exception_count: orders.filter((order) => order.has_exception).length,
      timeout_count: 0,
      avg_transit_days: 4.5,
      avg_transport_hours: 108,
      avg_customs_hours: 12,
      on_time_rate: 100,
      status_distribution: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
    };
  }

  const { data, error } = await supabase.rpc('get_logistics_dashboard_stats', {
    p_tenant_id: tenantId,
    p_carrier: carrier || null,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
  });

  if (error) {
    console.error('Fetch logistics dashboard stats failed:', error);
    return emptyLogisticsDashboardStats;
  }

  return data ?? emptyLogisticsDashboardStats;
}

export async function getCarrierPerformanceStats(
  tenantId: string,
  startDate?: string,
  endDate?: string
): Promise<CarrierPerformanceStat[]> {
  if (runtimeMode === 'demo') {
    const carrierMap = getDemoOrders(tenantId).reduce<Record<string, number>>((acc, order) => {
      const carrierName = order.carrier || order.shipping_company || 'Unknown';
      acc[carrierName] = (acc[carrierName] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(carrierMap).map(([carrierName, total_orders]) => ({
      carrier: carrierName,
      total_orders,
      on_time_rate: 100,
      avg_transit_days: carrierName === 'DHL' ? 3.5 : 5,
      exception_rate: 0,
    }));
  }

  const { data, error } = await supabase.rpc('get_carrier_performance_stats', {
    p_tenant_id: tenantId,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
  });

  if (error) {
    console.error('Fetch carrier performance stats failed:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function getTimeoutOrders(
  tenantId: string,
  carrier?: string,
  limit: number = 10
): Promise<LogisticsTimeoutOrder[]> {
  if (runtimeMode === 'demo') {
    return [];
  }

  const { data, error } = await supabase.rpc('get_timeout_orders', {
    p_tenant_id: tenantId,
    p_carrier: carrier || null,
    p_limit: limit,
  });

  if (error) {
    console.error('Fetch timeout orders failed:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function getExceptionOrders(
  tenantId: string,
  carrier?: string,
  limit: number = 10
): Promise<LogisticsExceptionOrder[]> {
  if (runtimeMode === 'demo') {
    return getDemoOrders(tenantId, carrier)
      .filter((order) => order.has_exception)
      .slice(0, limit)
      .map((order) => ({
        id: order.id,
        shipping_order_id: order.id,
        shipping_code: order.shipping_code,
        order_code: order.order_code,
        carrier: order.carrier || order.shipping_company,
        exception_type: 'other',
        exception_description: order.exception_description || '',
        created_at: order.updated_at,
      }));
  }

  const { data, error } = await supabase.rpc('get_exception_orders', {
    p_tenant_id: tenantId,
    p_carrier: carrier || null,
    p_limit: limit,
  });

  if (error) {
    console.error('Fetch exception orders failed:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
}

export async function getAllCarriers(tenantId: string): Promise<string[]> {
  if (runtimeMode === 'demo') {
    return Array.from(new Set(getDemoOrders(tenantId).map((order) => order.carrier).filter(Boolean))) as string[];
  }

  const { data, error } = await supabase
    .from('shipping_orders')
    .select('carrier')
    .eq('tenant_id', tenantId)
    .not('carrier', 'is', null);

  if (error) {
    console.error('Fetch carriers failed:', error);
    return [];
  }

  const carriers = Array.from(new Set(data?.map((item: { carrier: string }) => item.carrier).filter(Boolean)));
  return carriers as string[];
}
