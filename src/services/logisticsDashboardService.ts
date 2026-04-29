/**
 * 物流看板服务
 * 提供物流看板统计数据查询功能
 */

import { supabase } from '@/db/supabase';
import type {
  LogisticsDashboardStats,
  CarrierPerformanceStat,
  LogisticsTimeoutOrder,
  LogisticsExceptionOrder,
} from '@/types/database';

/**
 * 获取物流看板统计数据
 */
export async function getLogisticsDashboardStats(
  tenantId: string,
  carrier?: string,
  startDate?: string,
  endDate?: string
): Promise<LogisticsDashboardStats> {
  const { data, error } = await supabase.rpc('get_logistics_dashboard_stats', {
    p_tenant_id: tenantId,
    p_carrier: carrier || null,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
  });

  if (error) {
    console.error('获取物流看板统计数据失败:', error);
    throw new Error(`获取物流看板统计数据失败: ${error.message}`);
  }

  return data;
}

/**
 * 获取承运商绩效统计
 */
export async function getCarrierPerformanceStats(
  tenantId: string,
  startDate?: string,
  endDate?: string
): Promise<CarrierPerformanceStat[]> {
  const { data, error } = await supabase.rpc('get_carrier_performance_stats', {
    p_tenant_id: tenantId,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
  });

  if (error) {
    console.error('获取承运商绩效统计失败:', error);
    throw new Error(`获取承运商绩效统计失败: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
}

/**
 * 获取超时订单列表
 */
export async function getTimeoutOrders(
  tenantId: string,
  carrier?: string,
  limit: number = 10
): Promise<LogisticsTimeoutOrder[]> {
  const { data, error } = await supabase.rpc('get_timeout_orders', {
    p_tenant_id: tenantId,
    p_carrier: carrier || null,
    p_limit: limit,
  });

  if (error) {
    console.error('获取超时订单列表失败:', error);
    throw new Error(`获取超时订单列表失败: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
}

/**
 * 获取异常订单列表
 */
export async function getExceptionOrders(
  tenantId: string,
  carrier?: string,
  limit: number = 10
): Promise<LogisticsExceptionOrder[]> {
  const { data, error } = await supabase.rpc('get_exception_orders', {
    p_tenant_id: tenantId,
    p_carrier: carrier || null,
    p_limit: limit,
  });

  if (error) {
    console.error('获取异常订单列表失败:', error);
    throw new Error(`获取异常订单列表失败: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
}

/**
 * 获取所有承运商列表
 */
export async function getAllCarriers(tenantId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('shipping_orders')
    .select('carrier')
    .eq('tenant_id', tenantId)
    .not('carrier', 'is', null);

  if (error) {
    console.error('获取承运商列表失败:', error);
    throw new Error(`获取承运商列表失败: ${error.message}`);
  }

  const carriers = Array.from(new Set(data?.map((item: { carrier: string }) => item.carrier).filter(Boolean)));
  return carriers as string[];
}
