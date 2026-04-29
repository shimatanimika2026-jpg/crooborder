/**
 * 运营看板服务
 * 提供全局运营数据统计查询功能
 */

import { demoOperationsDashboardStats } from '@/data/demo/operations-dashboard';
import { runtimeMode, supabase } from '@/db/supabase';
import type { OperationsDashboardStats } from '@/types/database';

/**
 * 获取运营看板统计数据
 */
export async function getOperationsDashboardStats(
  tenantId: string,
  startDate?: string,
  endDate?: string
): Promise<OperationsDashboardStats> {
  if (runtimeMode === 'demo') {
    return demoOperationsDashboardStats;
  }

  const { data, error } = await supabase.rpc('get_operations_dashboard_stats', {
    p_tenant_id: tenantId,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
  });

  if (error) {
    console.error('获取运营看板统计数据失败:', error);
    throw new Error(`获取运营看板统计数据失败: ${error.message}`);
  }

  return data;
}
