-- 创建中国区生产汇总RPC函数
CREATE OR REPLACE FUNCTION get_cn_production_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'active_plans', (SELECT COUNT(*) FROM production_plans WHERE plan_status = 'active' AND tenant_id = 'JP'),
    'completion_rate', (
      SELECT COALESCE(
        ROUND(
          (COUNT(*) FILTER (WHERE plan_status IN ('closed', 'completed'))::NUMERIC / NULLIF(COUNT(*), 0)) * 100
        , 0)
      , 0)
      FROM production_plans WHERE tenant_id = 'JP'
    ),
    'pending_materials', (SELECT COUNT(*) FROM iqc_inspections WHERE result = 'HOLD' AND tenant_id = 'JP')
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 创建日本区组装汇总RPC函数
CREATE OR REPLACE FUNCTION get_jp_assembly_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'in_progress', (SELECT COUNT(*) FROM finished_unit_traceability WHERE current_stage = 'assembly' AND tenant_id = 'JP'),
    'aging_units', (SELECT COUNT(*) FROM aging_tests WHERE test_status = 'in_progress' AND tenant_id = 'JP'),
    'pending_test', (SELECT COUNT(*) FROM finished_unit_traceability WHERE current_stage = 'aging_test' AND tenant_id = 'JP'),
    'pending_qa', (SELECT COUNT(*) FROM finished_unit_traceability WHERE current_stage = 'final_test' AND tenant_id = 'JP'),
    'pending_shipment', (SELECT COUNT(*) FROM finished_unit_traceability WHERE current_stage = 'qa_release' AND tenant_id = 'JP')
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 创建物流汇总RPC函数
CREATE OR REPLACE FUNCTION get_logistics_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'in_transit', (SELECT COUNT(*) FROM asn_shipments WHERE shipment_status = 'in_transit' AND tenant_id = 'JP'),
    'pending_receiving', (SELECT COUNT(*) FROM receiving_records WHERE receiving_status = 'pending' AND tenant_id = 'JP'),
    'pending_inspection', (SELECT COUNT(*) FROM iqc_inspections WHERE result IS NULL AND tenant_id = 'JP')
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 授权给authenticated用户
GRANT EXECUTE ON FUNCTION get_cn_production_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_jp_assembly_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_logistics_summary() TO authenticated;