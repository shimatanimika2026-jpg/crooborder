/**
 * Demo 数据 - 仪表盘
 */

export const demoDashboardData = {
  // 整体统计
  summary: {
    total_plans: 25,
    in_production: 8,
    completed_today: 3,
    exception_count: 2,
  },
  
  // 生产计划列表
  plans: [
    {
      id: 1,
      plan_number: 'PLAN-2026-001',
      finished_product_sn: 'FP-2026-001',
      target_quantity: 100,
      completed_quantity: 75,
      status: 'in_production',
      priority: 'high',
      planned_start_date: '2026-04-15',
      planned_end_date: '2026-04-20',
      created_at: '2026-04-15T08:00:00Z',
    },
    {
      id: 2,
      plan_number: 'PLAN-2026-002',
      finished_product_sn: 'FP-2026-002',
      target_quantity: 50,
      completed_quantity: 50,
      status: 'completed',
      priority: 'medium',
      planned_start_date: '2026-04-10',
      planned_end_date: '2026-04-15',
      created_at: '2026-04-10T08:00:00Z',
    },
    {
      id: 3,
      plan_number: 'PLAN-2026-003',
      finished_product_sn: 'FP-2026-003',
      target_quantity: 200,
      completed_quantity: 0,
      status: 'pending',
      priority: 'low',
      planned_start_date: '2026-04-20',
      planned_end_date: '2026-04-30',
      created_at: '2026-04-17T08:00:00Z',
    },
  ],
  
  // 异常统计
  exceptions: [
    {
      id: 1,
      exception_type: 'quality_issue',
      severity: 'high',
      status: 'open',
      source_module: 'final_test',
      description: 'Final Test 发现质量问题',
      created_at: '2026-04-17T10:30:00Z',
    },
    {
      id: 2,
      exception_type: 'material_shortage',
      severity: 'medium',
      status: 'in_progress',
      source_module: 'inbound',
      description: '物料短缺',
      created_at: '2026-04-17T09:15:00Z',
    },
  ],
};

// 高层看板 Demo 数据
export const demoExecutiveStats = {
  plan_achievement: {
    total_plans: 20,
    completed_plans: 17,
    achievement_rate: 85,
  },
  cn_production: {
    total_units: 150,
    completed_units: 128,
    completion_rate: 85.3,
  },
  jp_operations: {
    assembly_rate: 92,
    test_rate: 88,
    shipment_rate: 85,
  },
  exceptions: {
    open_count: 5,
    high_critical_count: 2,
    overdue_count: 1,
  },
  logistics: {
    in_transit: 8,
    pending_receiving: 3,
    pending_inspection: 2,
    pending_release: 1,
    pending_shipment: 4,
  },
  blockers: [
    {
      id: '1',
      type: 'exception',
      description: 'IQC 检验发现严重质量问题',
      severity: 'critical',
      created_at: '2026-04-17T10:30:00Z',
    },
    {
      id: '2',
      type: 'exception',
      description: 'Final Test 失败率超过阈值',
      severity: 'high',
      created_at: '2026-04-17T09:15:00Z',
    },
  ],
  escalations: [
    {
      id: '3',
      title: '超期异常 #3',
      description: '物料短缺问题已超期 10 天',
      priority: 'high',
      created_at: '2026-04-07T08:00:00Z',
    },
  ],
};
