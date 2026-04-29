-- P4: 创建运营看板统计视图

-- ============================================================
-- 1. 计划看板统计
-- ============================================================

CREATE OR REPLACE VIEW view_dashboard_plan_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'active') AS active_plans,
  COUNT(*) FILTER (WHERE DATE_TRUNC('week', start_date) = DATE_TRUNC('week', CURRENT_DATE)) AS this_week_plans,
  ROUND(AVG(CASE WHEN status = 'completed' THEN 100 ELSE 0 END), 2) AS completion_rate,
  COUNT(*) FILTER (WHERE status = 'pending_approval') AS pending_approval_plans
FROM production_plans;

COMMENT ON VIEW view_dashboard_plan_stats IS 'P4: 计划看板统计';

-- ============================================================
-- 2. 来料看板统计
-- ============================================================

CREATE OR REPLACE VIEW view_dashboard_incoming_stats AS
SELECT
  (SELECT COUNT(*) FROM asn_headers) AS total_asn,
  (SELECT COUNT(*) FROM asn_headers WHERE status = 'pending') AS pending_receiving,
  (SELECT COUNT(*) FROM iqc_inspections WHERE status = 'pending') AS pending_inspection,
  (SELECT COUNT(*) FROM material_disposition WHERE disposition_result = 'hold') AS hold_materials,
  (SELECT COUNT(*) FROM material_disposition WHERE disposition_result = 'special_acceptance' AND approval_status = 'pending') AS pending_special_acceptance,
  (SELECT COUNT(DISTINCT material_id) FROM inventory WHERE available_quantity > 0) AS available_materials;

COMMENT ON VIEW view_dashboard_incoming_stats IS 'P4: 来料看板统计';

-- ============================================================
-- 3. 组装/测试看板统计
-- ============================================================

CREATE OR REPLACE VIEW view_dashboard_assembly_stats AS
SELECT
  (SELECT COUNT(*) FROM assembly_complete WHERE status = 'pending') AS pending_assembly,
  (SELECT COUNT(*) FROM assembly_complete WHERE status = 'in_progress') AS in_progress_assembly,
  (SELECT COUNT(*) FROM aging_records WHERE status = 'aging') AS aging_units,
  (SELECT COUNT(*) FROM aging_records WHERE status IN ('interrupted', 'failed')) AS aging_exceptions,
  (SELECT COUNT(*) FROM final_test_management WHERE status = 'pending') AS pending_test,
  (SELECT COUNT(*) FROM qa_release_management WHERE status = 'pending') AS pending_qa,
  (SELECT COUNT(*) FROM shipment_confirmation WHERE status = 'pending') AS pending_shipment;

COMMENT ON VIEW view_dashboard_assembly_stats IS 'P4: 组装/测试看板统计';

-- ============================================================
-- 4. 异常看板统计
-- ============================================================

CREATE OR REPLACE VIEW view_dashboard_exception_stats AS
SELECT
  COUNT(*) FILTER (WHERE current_status = 'open') AS open_exceptions,
  COUNT(*) FILTER (WHERE severity IN ('high', 'critical')) AS high_critical_exceptions,
  COUNT(*) FILTER (WHERE current_status IN ('open', 'in_progress')) AS pending_exceptions,
  COUNT(*) FILTER (WHERE reported_at < NOW() - INTERVAL '3 days' AND current_status != 'closed') AS overdue_exceptions
FROM operation_exceptions;

COMMENT ON VIEW view_dashboard_exception_stats IS 'P4: 异常看板统计';

-- ============================================================
-- 5. 库存看板统计
-- ============================================================

CREATE OR REPLACE VIEW view_dashboard_inventory_stats AS
SELECT
  SUM(available_quantity) AS total_available,
  SUM(reserved_quantity) AS total_reserved,
  SUM(consumed_quantity) AS total_consumed,
  COUNT(*) FILTER (WHERE available_quantity = 0) AS out_of_stock_count,
  COUNT(*) FILTER (WHERE available_quantity > 0 AND available_quantity < 10) AS low_stock_count
FROM inventory;

COMMENT ON VIEW view_dashboard_inventory_stats IS 'P4: 库存看板统计';

-- ============================================================
-- 6. 创建统一看板查询 RPC
-- ============================================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(
  p_tenant_id VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'plan', (SELECT row_to_json(view_dashboard_plan_stats.*) FROM view_dashboard_plan_stats),
    'incoming', (SELECT row_to_json(view_dashboard_incoming_stats.*) FROM view_dashboard_incoming_stats),
    'assembly', (SELECT row_to_json(view_dashboard_assembly_stats.*) FROM view_dashboard_assembly_stats),
    'exception', (SELECT row_to_json(view_dashboard_exception_stats.*) FROM view_dashboard_exception_stats),
    'inventory', (SELECT row_to_json(view_dashboard_inventory_stats.*) FROM view_dashboard_inventory_stats)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_dashboard_stats IS 'P4: 获取统一看板统计数据';
