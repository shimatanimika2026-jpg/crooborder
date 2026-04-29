-- 内部完整版本 Demo 数据
-- 用于内部演示、培训、UAT 测试

-- ============================================================
-- 1. 生产计划 Demo 数据（扩充）
-- ============================================================

INSERT INTO production_plans (
  plan_no, plan_name, customer_name, product_model, planned_quantity,
  start_date, end_date, status, priority, tenant_id, created_by
) VALUES
  ('PLAN-2026-001', 'FR5协作机器人Q2生产计划', '日本客户A', 'FR5-6kg', 100, '2026-04-01', '2026-06-30', 'active', 'high', 'CN', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1)),
  ('PLAN-2026-002', 'FR10协作机器人Q2生产计划', '日本客户B', 'FR10-10kg', 50, '2026-05-01', '2026-07-31', 'active', 'medium', 'CN', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1)),
  ('PLAN-2026-003', 'FR3协作机器人Q3生产计划', '日本客户C', 'FR3-3kg', 80, '2026-07-01', '2026-09-30', 'pending_approval', 'medium', 'CN', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1)),
  ('PLAN-2026-004', 'FR5协作机器人Q3生产计划', '日本客户D', 'FR5-6kg', 120, '2026-07-01', '2026-09-30', 'draft', 'low', 'CN', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1)),
  ('PLAN-2026-005', 'FR10协作机器人Q4生产计划', '日本客户E', 'FR10-10kg', 60, '2026-10-01', '2026-12-31', 'draft', 'low', 'CN', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1))
ON CONFLICT (plan_no) DO NOTHING;

-- ============================================================
-- 2. ASN Demo 数据（扩充）
-- ============================================================

INSERT INTO asn_shipments (
  shipment_no, supplier_name, expected_arrival_date, status, total_items, tenant_id, created_by,
  related_shipment_id, related_tracking_no
) VALUES
  ('ASN-2026-04-001', '供应商A', '2026-04-20', 'received', 5, 'CN', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NULL, 'COSCO20260415001'),
  ('ASN-2026-04-002', '供应商B', '2026-04-22', 'in_transit', 3, 'CN', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NULL, 'SF20260418001'),
  ('ASN-2026-04-003', '供应商C', '2026-04-25', 'pending', 4, 'CN', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NULL, 'MAERSK20260420001'),
  ('ASN-2026-04-004', '供应商D', '2026-04-28', 'shipped', 6, 'CN', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NULL, 'COSCO20260422001'),
  ('ASN-2026-04-005', '供应商E', '2026-05-01', 'draft', 2, 'CN', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NULL, NULL)
ON CONFLICT (shipment_no) DO NOTHING;

-- ============================================================
-- 3. 物流订单 Demo 数据（扩充）
-- ============================================================

INSERT INTO shipping_orders (
  shipping_code, order_id, shipping_date, estimated_arrival_date, shipping_method,
  shipping_company, total_packages, status, tenant_id, tracking_no, carrier, origin, destination,
  current_location, current_status, last_update
) VALUES
  ('SHIP-2026-04-001', 1, '2026-04-15', '2026-04-22', 'sea', '中远海运', 10, 'in_transit', 'CN', 'COSCO20260415001', '中远海运', '上海港', '东京港', '东海海域', '运输中', NOW() - INTERVAL '2 days'),
  ('SHIP-2026-04-002', 2, '2026-04-18', '2026-04-20', 'air', '顺丰速运', 5, 'arrived', 'CN', 'SF20260418001', '顺丰速运', '深圳机场', '成田机场', '成田机场', '已到达', NOW() - INTERVAL '1 day'),
  ('SHIP-2026-04-003', 3, '2026-04-20', '2026-04-28', 'sea', '马士基', 15, 'delayed', 'CN', 'MAERSK20260420001', '马士基', '宁波港', '大阪港', '宁波港', '海关检查延误', NOW() - INTERVAL '6 hours'),
  ('SHIP-2026-04-004', 4, '2026-04-22', '2026-04-30', 'sea', '中远海运', 8, 'shipped', 'CN', 'COSCO20260422001', '中远海运', '青岛港', '横滨港', '青岛港', '已装船', NOW() - INTERVAL '3 hours'),
  ('SHIP-2026-04-005', 5, '2026-04-23', '2026-04-25', 'air', 'DHL', 3, 'in_transit', 'CN', 'DHL20260423001', 'DHL', '上海浦东机场', '关西机场', '上海浦东机场', '已起飞', NOW() - INTERVAL '1 hour')
ON CONFLICT (shipping_code) DO NOTHING;

-- ============================================================
-- 4. 物流事件 Demo 数据
-- ============================================================

-- 为每个物流订单创建事件记录
INSERT INTO logistics_events (
  tracking_id, event_type, event_location, event_description, event_time, created_by
)
SELECT 
  lt.id,
  'shipped',
  so.origin,
  '货物已发出',
  so.shipping_date::timestamp,
  (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1)
FROM shipping_orders so
LEFT JOIN logistics_tracking lt ON lt.shipping_id = so.id
WHERE so.shipping_code IN ('SHIP-2026-04-001', 'SHIP-2026-04-002', 'SHIP-2026-04-003', 'SHIP-2026-04-004', 'SHIP-2026-04-005')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. 异常 Demo 数据（扩充）
-- ============================================================

INSERT INTO operation_exceptions (
  exception_code, exception_type, severity, source_module, current_status,
  remarks, tenant_id, reported_by, reported_at
) VALUES
  ('EXC-2026-04-001', 'shortage', 'high', 'receiving', 'open', '收货短少：缺少5个电机', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '5 days'),
  ('EXC-2026-04-002', 'incoming_ng', 'critical', 'iqc', 'in_progress', 'IQC检验不合格：外观划伤', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '4 days'),
  ('EXC-2026-04-003', 'aging_interrupted', 'high', 'aging', 'open', '老化中断：电源故障', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '3 days'),
  ('EXC-2026-04-004', 'logistics_delayed', 'medium', 'logistics', 'open', '物流延误：海关检查', 'CN', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '2 days'),
  ('EXC-2026-04-005', 'final_test_failed', 'high', 'final_test', 'resolved', '最终测试失败：通讯异常', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '1 day'),
  ('EXC-2026-04-006', 'material_damaged', 'critical', 'receiving', 'open', '物料损坏：包装破损', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '6 hours'),
  ('EXC-2026-04-007', 'assembly_blocked', 'high', 'assembly', 'in_progress', '组装阻断：关键件缺失', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '3 hours'),
  ('EXC-2026-04-008', 'qa_blocked', 'medium', 'qa', 'open', 'QA 阻断：文档不齐', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '1 hour')
ON CONFLICT (exception_code) DO NOTHING;

-- ============================================================
-- 6. 组装记录 Demo 数据（扩充）
-- ============================================================

INSERT INTO assembly_complete (
  sn, product_model, status, tenant_id, created_by, created_at
) VALUES
  ('SN-FR5-20260401-001', 'FR5-6kg', 'completed', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '10 days'),
  ('SN-FR5-20260401-002', 'FR5-6kg', 'in_progress', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '5 days'),
  ('SN-FR10-20260402-001', 'FR10-10kg', 'pending', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '3 days'),
  ('SN-FR5-20260403-001', 'FR5-6kg', 'completed', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '8 days'),
  ('SN-FR3-20260404-001', 'FR3-3kg', 'in_progress', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '2 days'),
  ('SN-FR10-20260405-001', 'FR10-10kg', 'pending', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '1 day')
ON CONFLICT (sn) DO NOTHING;

-- ============================================================
-- 7. 老化记录 Demo 数据（扩充）
-- ============================================================

INSERT INTO aging_records (
  sn, start_time, planned_duration_hours, status, tenant_id, created_by, end_time
) VALUES
  ('SN-FR5-20260401-001', NOW() - INTERVAL '10 days', 48, 'completed', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '8 days'),
  ('SN-FR5-20260401-002', NOW() - INTERVAL '5 days', 48, 'aging', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NULL),
  ('SN-FR10-20260402-001', NOW() - INTERVAL '3 days', 48, 'interrupted', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NULL),
  ('SN-FR5-20260403-001', NOW() - INTERVAL '8 days', 48, 'completed', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '6 days'),
  ('SN-FR3-20260404-001', NOW() - INTERVAL '2 days', 48, 'aging', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NULL)
ON CONFLICT (sn) DO NOTHING;

-- ============================================================
-- 8. 最终测试记录 Demo 数据
-- ============================================================

INSERT INTO final_test_management (
  sn, test_result, status, tenant_id, created_by, created_at
) VALUES
  ('SN-FR5-20260401-001', 'pass', 'completed', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '7 days'),
  ('SN-FR5-20260403-001', 'pass', 'completed', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '5 days'),
  ('SN-FR5-20260401-002', NULL, 'pending', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '1 day')
ON CONFLICT (sn) DO NOTHING;

-- ============================================================
-- 9. QA 放行记录 Demo 数据
-- ============================================================

INSERT INTO qa_release_management (
  sn, release_result, status, tenant_id, created_by, created_at
) VALUES
  ('SN-FR5-20260401-001', 'approved', 'completed', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '6 days'),
  ('SN-FR5-20260403-001', 'approved', 'completed', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '4 days'),
  ('SN-FR5-20260401-002', NULL, 'pending', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '12 hours')
ON CONFLICT (sn) DO NOTHING;

-- ============================================================
-- 10. 出货确认记录 Demo 数据
-- ============================================================

INSERT INTO shipment_confirmation (
  sn, shipment_status, status, tenant_id, created_by, created_at
) VALUES
  ('SN-FR5-20260401-001', 'shipped', 'completed', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '5 days'),
  ('SN-FR5-20260403-001', 'shipped', 'completed', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '3 days'),
  ('SN-FR5-20260401-002', NULL, 'pending', 'JP', (SELECT id FROM profiles WHERE username = 'admin' LIMIT 1), NOW() - INTERVAL '6 hours')
ON CONFLICT (sn) DO NOTHING;

COMMENT ON TABLE production_plans IS 'Demo 数据已添加：5 条生产计划';
COMMENT ON TABLE asn_shipments IS 'Demo 数据已添加：5 条 ASN';
COMMENT ON TABLE shipping_orders IS 'Demo 数据已添加：5 条物流订单';
COMMENT ON TABLE operation_exceptions IS 'Demo 数据已添加：8 条异常';
COMMENT ON TABLE assembly_complete IS 'Demo 数据已添加：6 条组装记录';
COMMENT ON TABLE aging_records IS 'Demo 数据已添加：5 条老化记录';
COMMENT ON TABLE final_test_management IS 'Demo 数据已添加：3 条最终测试记录';
COMMENT ON TABLE qa_release_management IS 'Demo 数据已添加：3 条 QA 放行记录';
COMMENT ON TABLE shipment_confirmation IS 'Demo 数据已添加：3 条出货确认记录';
