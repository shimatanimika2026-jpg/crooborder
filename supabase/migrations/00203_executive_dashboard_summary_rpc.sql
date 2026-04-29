-- 创建高层看板统一汇总RPC
-- 用于跨租户汇总关键业务指标，不暴露敏感明细

-- 1. 创建高层看板汇总函数
CREATE OR REPLACE FUNCTION get_executive_dashboard_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  plan_stats jsonb;
  cn_production_stats jsonb;
  jp_operations_stats jsonb;
  exception_stats jsonb;
  logistics_stats jsonb;
BEGIN
  -- 计划达成率（跨租户汇总）
  SELECT jsonb_build_object(
    'total_plans', COUNT(*),
    'completed_plans', COUNT(*) FILTER (WHERE plan_status IN ('closed', 'completed')),
    'achievement_rate', CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE plan_status IN ('closed', 'completed'))::numeric / COUNT(*)::numeric) * 100)
      ELSE 0
    END
  ) INTO plan_stats
  FROM production_plans;

  -- 中方生产完成率（基于中国租户的实际生产数据）
  -- 注意：这里应该查询中国租户（CN）的数据，而不是JP
  SELECT jsonb_build_object(
    'total_units', COUNT(*),
    'completed_units', COUNT(*) FILTER (WHERE result = 'OK'),
    'completion_rate', CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE result = 'OK')::numeric / COUNT(*)::numeric) * 100)
      ELSE 0
    END
  ) INTO cn_production_stats
  FROM iqc_inspections
  WHERE tenant_id = 'CN' OR tenant_id IS NULL; -- 中国侧数据

  -- 日方组装/测试/出货完成率（跨租户汇总）
  SELECT jsonb_build_object(
    'assembly_rate', CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE current_stage != 'pending')::numeric / COUNT(*)::numeric) * 100)
      ELSE 0
    END,
    'test_rate', CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE current_stage IN ('qa_release', 'shipment', 'completed'))::numeric / COUNT(*)::numeric) * 100)
      ELSE 0
    END,
    'shipment_rate', CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE current_stage IN ('shipment', 'completed'))::numeric / COUNT(*)::numeric) * 100)
      ELSE 0
    END
  ) INTO jp_operations_stats
  FROM finished_unit_traceability;

  -- 异常汇总（跨租户）
  SELECT jsonb_build_object(
    'open_count', COUNT(*),
    'high_critical_count', COUNT(*) FILTER (WHERE severity IN ('high', 'critical')),
    'overdue_count', COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '7 days')
  ) INTO exception_stats
  FROM operation_exceptions
  WHERE current_status IN ('open', 'investigating');

  -- 物流状态（跨租户汇总）
  SELECT jsonb_build_object(
    'in_transit', (SELECT COUNT(*) FROM asn_shipments WHERE shipment_status = 'in_transit'),
    'pending_receiving', (SELECT COUNT(*) FROM receiving_records WHERE receiving_status = 'pending'),
    'pending_inspection', (SELECT COUNT(*) FROM iqc_inspections WHERE result IS NULL),
    'pending_release', (SELECT COUNT(*) FROM qa_releases WHERE release_status = 'pending'),
    'pending_shipment', (SELECT COUNT(*) FROM shipments WHERE shipment_status = 'pending')
  ) INTO logistics_stats;

  -- 组装最终结果
  result := jsonb_build_object(
    'plan_achievement', plan_stats,
    'cn_production', cn_production_stats,
    'jp_operations', jp_operations_stats,
    'exceptions', exception_stats,
    'logistics', logistics_stats,
    'generated_at', NOW()
  );

  RETURN result;
END;
$$;

-- 授权给已认证用户
GRANT EXECUTE ON FUNCTION get_executive_dashboard_summary() TO authenticated;

-- 添加注释
COMMENT ON FUNCTION get_executive_dashboard_summary() IS '高层看板统一汇总RPC - 跨租户汇总关键业务指标，不暴露敏感明细';
