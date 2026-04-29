-- 修复协同视图和高层看板的数据口径问题
-- 问题1：协同视图RPC函数查询的都是JP租户，应该改成CN或跨租户
-- 问题2：确保"中方生产完成率"使用真实中国口径

-- 1. 修复中国区生产汇总RPC - 应该查询CN租户数据
CREATE OR REPLACE FUNCTION get_cn_production_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'active_plans', (
      -- 中国区活跃计划（查询CN租户）
      SELECT COUNT(*) 
      FROM production_plans 
      WHERE plan_status = 'active' 
        AND (tenant_id = 'CN' OR tenant_id IS NULL)
    ),
    'completion_rate', (
      -- 中国区完成率（查询CN租户）
      SELECT COALESCE(
        ROUND(
          (COUNT(*) FILTER (WHERE plan_status IN ('closed', 'completed'))::NUMERIC / NULLIF(COUNT(*), 0)) * 100
        , 0)
      , 0)
      FROM production_plans 
      WHERE (tenant_id = 'CN' OR tenant_id IS NULL)
    ),
    'pending_materials', (
      -- 中国区待处理物料（查询CN租户）
      SELECT COUNT(*) 
      FROM iqc_inspections 
      WHERE result = 'HOLD' 
        AND (tenant_id = 'CN' OR tenant_id IS NULL)
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 2. 修复日本区组装汇总RPC - 应该查询JP租户数据（这个是对的）
CREATE OR REPLACE FUNCTION get_jp_assembly_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'in_progress', (
      SELECT COUNT(*) 
      FROM finished_unit_traceability 
      WHERE current_stage = 'assembly' 
        AND (tenant_id = 'JP' OR tenant_id IS NULL)
    ),
    'aging_units', (
      SELECT COUNT(*) 
      FROM aging_tests 
      WHERE test_status = 'in_progress' 
        AND (tenant_id = 'JP' OR tenant_id IS NULL)
    ),
    'pending_test', (
      SELECT COUNT(*) 
      FROM finished_unit_traceability 
      WHERE current_stage = 'aging_test' 
        AND (tenant_id = 'JP' OR tenant_id IS NULL)
    ),
    'pending_qa', (
      SELECT COUNT(*) 
      FROM finished_unit_traceability 
      WHERE current_stage = 'final_test' 
        AND (tenant_id = 'JP' OR tenant_id IS NULL)
    ),
    'pending_shipment', (
      SELECT COUNT(*) 
      FROM finished_unit_traceability 
      WHERE current_stage = 'qa_release' 
        AND (tenant_id = 'JP' OR tenant_id IS NULL)
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 3. 修复物流汇总RPC - 应该跨租户汇总
CREATE OR REPLACE FUNCTION get_logistics_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'in_transit', (
      -- 跨租户汇总在途物流
      SELECT COUNT(*) 
      FROM asn_shipments 
      WHERE shipment_status = 'in_transit'
    ),
    'pending_receiving', (
      -- 跨租户汇总待收货
      SELECT COUNT(*) 
      FROM receiving_records 
      WHERE receiving_status = 'pending'
    ),
    'pending_inspection', (
      -- 跨租户汇总待检验
      SELECT COUNT(*) 
      FROM iqc_inspections 
      WHERE result IS NULL
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 4. 确保高层看板的"中方生产完成率"使用正确口径
-- 已在 00203_executive_dashboard_summary_rpc.sql 中正确实现
-- 使用 iqc_inspections 表查询 CN 租户数据

-- 添加注释
COMMENT ON FUNCTION get_cn_production_summary() IS '中国区生产汇总 - 查询CN租户数据';
COMMENT ON FUNCTION get_jp_assembly_summary() IS '日本区组装汇总 - 查询JP租户数据';
COMMENT ON FUNCTION get_logistics_summary() IS '物流汇总 - 跨租户汇总';
