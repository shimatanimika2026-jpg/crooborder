/**
 * 协同视图 Demo 数据
 * 用于 Demo 模式和测试环境
 */

export const demoCollaborationStats = {
  cn_production: {
    active_plans: 12,
    completion_rate: 85,
    pending_materials: 3,
  },
  jp_assembly: {
    in_progress: 8,
    aging_units: 5,
    pending_test: 3,
    pending_qa: 2,
    pending_shipment: 1,
  },
  cross_region_exceptions: {
    open_count: 4,
    high_critical_count: 1,
    overdue_count: 0,
  },
  logistics: {
    in_transit: 6,
    pending_receiving: 2,
    pending_inspection: 1,
  },
};
