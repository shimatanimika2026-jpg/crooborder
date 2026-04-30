import { demoOperationsDashboardStats } from '@/data/demo/operations-dashboard';
import { runtimeMode, supabase } from '@/db/supabase';
import type { OperationsDashboardStats } from '@/types/database';

const emptyOperationsDashboardStats: OperationsDashboardStats = {
  production: {
    active_plans: 0,
    pending_approval: 0,
    on_time_rate: 0,
    output_count: 0,
    completion_rate: 0,
    this_week_plans: 0,
  },
  incoming: {
    pending_receiving: 0,
    pending_inspection: 0,
    pending_special_approval: 0,
    iqc_pass_rate: 0,
    total_asn: 0,
    hold_materials: 0,
    available_materials: 0,
  },
  assembly: {
    pending_assembly: 0,
    pending_test: 0,
    pending_qa: 0,
    pending_shipment: 0,
    aging_exception: 0,
    pass_rate: 0,
    in_assembly: 0,
    in_aging: 0,
  },
  exception: {
    high_critical_exceptions: 0,
    overdue_exceptions: 0,
    open_exceptions: 0,
    resolve_rate: 0,
  },
  logistics: {
    exception_orders: 0,
    timeout_orders: 0,
    in_transit: 0,
    in_transit_orders: 0,
    on_time_rate: 0,
  },
  inventory: {
    available: 0,
    reserved: 0,
    consumed: 0,
    blocked: 0,
  },
};

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
    console.error('Fetch operations dashboard stats failed:', error);
    return emptyOperationsDashboardStats;
  }

  return data ?? emptyOperationsDashboardStats;
}
