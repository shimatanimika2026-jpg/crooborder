import type { OperationsDashboardStats } from "@/types/database";

export const demoOperationsDashboardStats: OperationsDashboardStats = {
  production: {
    active_plans: 6,
    pending_approval: 2,
    on_time_rate: 86,
    output_count: 128,
    completion_rate: 82,
    this_week_plans: 9,
  },
  incoming: {
    total_asn: 12,
    pending_receiving: 3,
    pending_inspection: 4,
    pending_special_approval: 1,
    iqc_pass_rate: 91,
    hold_materials: 50,
    available_materials: 280,
  },
  assembly: {
    pending_assembly: 5,
    in_assembly: 8,
    in_aging: 4,
    pending_test: 3,
    pending_qa: 2,
    pending_shipment: 6,
    aging_exception: 1,
    pass_rate: 94,
  },
  exception: {
    open_exceptions: 5,
    high_critical_exceptions: 2,
    overdue_exceptions: 1,
    resolve_rate: 78,
  },
  logistics: {
    in_transit: 8,
    in_transit_orders: 8,
    exception_orders: 1,
    timeout_orders: 2,
    on_time_rate: 88,
  },
  inventory: {
    available: 280,
    reserved: 10,
    consumed: 10,
    blocked: 50,
  },
};
