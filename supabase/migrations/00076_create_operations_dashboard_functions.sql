-- 获取运营看板统计数据
CREATE OR REPLACE FUNCTION get_operations_dashboard_stats(
  p_tenant_id TEXT,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_production_stats JSON;
  v_incoming_stats JSON;
  v_assembly_stats JSON;
  v_exception_stats JSON;
  v_inventory_stats JSON;
  v_logistics_stats JSON;
BEGIN
  -- 生产计划看板
  SELECT json_build_object(
    'active_plans', COUNT(*) FILTER (WHERE status = 'active'),
    'pending_approval', COUNT(*) FILTER (WHERE status = 'pending_approval'),
    'this_week_plans', COUNT(*) FILTER (
      WHERE created_at >= date_trunc('week', NOW())
      AND created_at < date_trunc('week', NOW()) + INTERVAL '1 week'
    ),
    'completion_rate', ROUND(
      COALESCE(
        COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / 
        NULLIF(COUNT(*), 0) * 100,
        0
      ),
      1
    )
  ) INTO v_production_stats
  FROM production_plans
  WHERE tenant_id = p_tenant_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
  
  -- 来料管理看板
  SELECT json_build_object(
    'total_asn', (SELECT COUNT(*) FROM asn_shipments WHERE tenant_id = 'CN'),
    'pending_receiving', (SELECT COUNT(*) FROM asn_shipments WHERE tenant_id = 'CN' AND status IN ('draft', 'in_transit')),
    'pending_inspection', (SELECT COUNT(*) FROM receiving_records WHERE tenant_id = p_tenant_id AND iqc_required = true AND iqc_completed = false),
    'hold_materials', (SELECT COUNT(*) FROM material_disposition WHERE tenant_id = p_tenant_id AND disposition_type = 'HOLD' AND status = 'pending'),
    'pending_special_approval', (SELECT COUNT(*) FROM material_disposition WHERE tenant_id = p_tenant_id AND disposition_type = 'special_approval' AND status = 'pending'),
    'available_materials', (
      SELECT COUNT(DISTINCT part_no)
      FROM inventory_transactions
      WHERE tenant_id = p_tenant_id
        AND transaction_type = 'available'
        AND quantity > 0
    )
  ) INTO v_incoming_stats;
  
  -- 组装与测试看板
  SELECT json_build_object(
    'pending_assembly', (SELECT COUNT(*) FROM production_orders WHERE tenant_id = p_tenant_id AND status = 'pending'),
    'in_assembly', (SELECT COUNT(*) FROM production_orders WHERE tenant_id = p_tenant_id AND status = 'in_progress'),
    'in_aging', (SELECT COUNT(*) FROM aging_test_records WHERE tenant_id = p_tenant_id AND status = 'testing'),
    'aging_exception', (SELECT COUNT(*) FROM aging_test_records WHERE tenant_id = p_tenant_id AND status = 'failed'),
    'pending_test', (SELECT COUNT(*) FROM final_test_records WHERE tenant_id = p_tenant_id AND status = 'pending'),
    'pending_qa', (SELECT COUNT(*) FROM qa_release_records WHERE tenant_id = p_tenant_id AND status = 'pending'),
    'pending_shipment', (SELECT COUNT(*) FROM shipment_confirmations WHERE tenant_id = p_tenant_id AND status = 'pending')
  ) INTO v_assembly_stats;
  
  -- 异常监控看板
  SELECT json_build_object(
    'open_exceptions', COUNT(*) FILTER (WHERE current_status = 'open'),
    'high_critical_exceptions', COUNT(*) FILTER (WHERE current_status = 'open' AND severity IN ('high', 'critical')),
    'overdue_exceptions', COUNT(*) FILTER (
      WHERE current_status = 'open' 
      AND expected_resolution_date IS NOT NULL 
      AND expected_resolution_date < NOW()
    )
  ) INTO v_exception_stats
  FROM operation_exceptions
  WHERE tenant_id = p_tenant_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
  
  -- 库存状态看板
  WITH inventory_summary AS (
    SELECT 
      SUM(quantity) FILTER (WHERE transaction_type = 'available') as available,
      SUM(quantity) FILTER (WHERE transaction_type = 'reserved') as reserved,
      SUM(quantity) FILTER (WHERE transaction_type = 'consumed') as consumed,
      SUM(quantity) FILTER (WHERE transaction_type = 'blocked') as blocked
    FROM inventory_transactions
    WHERE tenant_id = p_tenant_id
      AND (p_start_date IS NULL OR transaction_date >= p_start_date)
      AND (p_end_date IS NULL OR transaction_date <= p_end_date)
  )
  SELECT json_build_object(
    'available', COALESCE(available, 0),
    'reserved', COALESCE(reserved, 0),
    'consumed', COALESCE(consumed, 0),
    'blocked', COALESCE(blocked, 0),
    'critical_parts_warning', 0
  ) INTO v_inventory_stats
  FROM inventory_summary;
  
  -- 物流追踪看板
  SELECT json_build_object(
    'in_transit_orders', COUNT(*) FILTER (WHERE status IN ('shipped', 'in_transit', 'customs_clearance', 'delivering')),
    'exception_orders', COUNT(*) FILTER (WHERE status = 'exception'),
    'timeout_orders', COUNT(*) FILTER (
      WHERE status NOT IN ('delivered', 'cancelled', 'exception')
      AND estimated_delivery_date IS NOT NULL
      AND estimated_delivery_date < CURRENT_DATE
    )
  ) INTO v_logistics_stats
  FROM shipping_orders
  WHERE tenant_id = p_tenant_id
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
  
  -- 构建结果
  v_result := json_build_object(
    'production', v_production_stats,
    'incoming', v_incoming_stats,
    'assembly', v_assembly_stats,
    'exception', v_exception_stats,
    'inventory', v_inventory_stats,
    'logistics', v_logistics_stats
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;