-- UAT Demo数据准备脚本
-- 目标: 确保每个核心页面打开有数据,正常/异常/阻断/特采/放行/关闭都有样例
-- 执行时间: UAT部署前
-- 注意: 本脚本使用固定UUID,仅用于UAT环境

-- 清理旧数据(可选,仅在重新初始化时使用)
-- DELETE FROM shipments WHERE tenant_id = 'JP';
-- DELETE FROM qa_releases WHERE tenant_id = 'JP';
-- DELETE FROM final_tests WHERE tenant_id = 'JP';
-- DELETE FROM aging_tests WHERE tenant_id = 'JP';
-- DELETE FROM assembly_part_material_mapping WHERE tenant_id = 'JP';
-- DELETE FROM finished_unit_traceability WHERE tenant_id = 'JP';
-- DELETE FROM incoming_material_dispositions WHERE tenant_id = 'JP';
-- DELETE FROM iqc_inspections WHERE tenant_id = 'JP';
-- DELETE FROM receiving_record_items WHERE tenant_id = 'JP';
-- DELETE FROM receiving_records WHERE tenant_id = 'JP';
-- DELETE FROM asn_items;
-- DELETE FROM advance_shipping_notices WHERE tenant_id = 'JP';
-- DELETE FROM production_plans WHERE tenant_id = 'JP';
-- DELETE FROM operation_exceptions WHERE tenant_id = 'JP';

-- 1. 生产计划数据
INSERT INTO production_plans (
  plan_code, 
  product_model, 
  planned_quantity, 
  start_date, 
  end_date, 
  status, 
  tenant_id, 
  created_by,
  created_at,
  updated_at
)
VALUES 
  (
    'PLAN-20260417-001', 
    'CR-5000', 
    100, 
    '2026-04-20', 
    '2026-05-20', 
    'active', 
    'JP', 
    '00000000-0000-0000-0000-000000000001',
    NOW(),
    NOW()
  ),
  (
    'PLAN-20260417-002', 
    'CR-8000', 
    50, 
    '2026-05-01', 
    '2026-06-01', 
    'draft', 
    'JP', 
    '00000000-0000-0000-0000-000000000001',
    NOW(),
    NOW()
  );

-- 2. 供应商数据(如果suppliers表存在)
-- INSERT INTO suppliers (supplier_code, supplier_name, contact_person, contact_phone, tenant_id, created_by)
-- VALUES ('SUP-001', '测试供应商', '张三', '13800138000', 'JP', '00000000-0000-0000-0000-000000000001');

-- 3. ASN数据(正常)
INSERT INTO advance_shipping_notices (
  asn_code, 
  supplier_id, 
  expected_arrival_date, 
  status, 
  tenant_id, 
  created_by,
  created_at,
  updated_at
)
VALUES 
  (
    'ASN-20260417-001', 
    1, 
    '2026-04-18', 
    'confirmed', 
    'JP', 
    '00000000-0000-0000-0000-000000000001',
    NOW(),
    NOW()
  );

-- 4. ASN明细
INSERT INTO asn_items (
  asn_id, 
  line_no, 
  part_no, 
  part_name, 
  planned_qty, 
  unit
)
VALUES 
  (1, 1, 'CONTROL_BOX', '控制箱', 10, 'pcs'),
  (1, 2, 'TEACHING_PENDANT', '示教器', 10, 'pcs'),
  (1, 3, 'MAIN_BOARD', '主板', 10, 'pcs');

-- 5. 收货数据(正常+差异)
INSERT INTO receiving_records (
  receiving_no, 
  asn_id, 
  received_date, 
  has_variance, 
  variance_resolved, 
  iqc_required, 
  iqc_completed, 
  status, 
  tenant_id, 
  created_by,
  created_at,
  updated_at
)
VALUES 
  (
    'RCV-20260417-001', 
    1, 
    '2026-04-18', 
    FALSE, 
    TRUE, 
    TRUE, 
    TRUE, 
    'completed', 
    'JP', 
    '00000000-0000-0000-0000-000000000001',
    NOW(),
    NOW()
  ),
  (
    'RCV-20260417-002', 
    1, 
    '2026-04-18', 
    TRUE, 
    FALSE, 
    TRUE, 
    FALSE, 
    'pending', 
    'JP', 
    '00000000-0000-0000-0000-000000000001',
    NOW(),
    NOW()
  );

-- 6. 收货明细
INSERT INTO receiving_record_items (
  receiving_id, 
  line_no, 
  part_no, 
  part_name, 
  batch_no, 
  serial_number, 
  planned_qty, 
  received_qty, 
  variance_qty, 
  unit, 
  tenant_id,
  created_at,
  updated_at
)
VALUES 
  (1, 1, 'CONTROL_BOX', '控制箱', 'BATCH001', 'CB-001', 10, 10, 0, 'pcs', 'JP', NOW(), NOW()),
  (1, 2, 'TEACHING_PENDANT', '示教器', 'BATCH001', 'TP-001', 10, 10, 0, 'pcs', 'JP', NOW(), NOW()),
  (1, 3, 'MAIN_BOARD', '主板', 'BATCH001', 'MB-001', 10, 10, 0, 'pcs', 'JP', NOW(), NOW()),
  (2, 1, 'CONTROL_BOX', '控制箱', 'BATCH002', 'CB-002', 10, 8, -2, 'pcs', 'JP', NOW(), NOW());

-- 7. IQC检验数据(OK+HOLD+NG)
INSERT INTO iqc_inspections (
  receiving_id, 
  receiving_item_id, 
  part_no, 
  batch_no, 
  serial_number, 
  result, 
  inspector_id, 
  inspected_at, 
  tenant_id,
  created_at,
  updated_at
)
VALUES 
  (1, 1, 'CONTROL_BOX', 'BATCH001', 'CB-001', 'OK', '00000000-0000-0000-0000-000000000001', NOW(), 'JP', NOW(), NOW()),
  (1, 2, 'TEACHING_PENDANT', 'BATCH001', 'TP-001', 'HOLD', '00000000-0000-0000-0000-000000000001', NOW(), 'JP', NOW(), NOW()),
  (1, 3, 'MAIN_BOARD', 'BATCH001', 'MB-001', 'NG', '00000000-0000-0000-0000-000000000001', NOW(), 'JP', NOW(), NOW());

-- 8. 特采数据(待审批+通过+拒绝)
INSERT INTO incoming_material_dispositions (
  disposition_code, 
  part_no, 
  batch_no, 
  disposition_type, 
  disposition_status, 
  reason, 
  tenant_id, 
  created_by,
  created_at,
  updated_at
)
VALUES 
  ('DISP-20260417-001', 'TEACHING_PENDANT', 'BATCH001', 'special_acceptance', 'pending', 'HOLD待审批', 'JP', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
  ('DISP-20260417-002', 'MAIN_BOARD', 'BATCH001', 'special_acceptance', 'approved', 'NG特采通过', 'JP', '00000000-0000-0000-0000-000000000001', NOW(), NOW());

-- 9. 组装数据(正常)
INSERT INTO finished_unit_traceability (
  finished_product_sn, 
  product_model, 
  assembly_date, 
  tenant_id, 
  created_by,
  created_at,
  updated_at
)
VALUES 
  ('FU-20260417-001', 'CR-5000', '2026-04-18', 'JP', '00000000-0000-0000-0000-000000000001', NOW(), NOW());

INSERT INTO assembly_part_material_mapping (
  finished_product_sn, 
  part_no, 
  part_sn, 
  receiving_record_item_id, 
  tenant_id,
  created_at,
  updated_at
)
VALUES 
  ('FU-20260417-001', 'CONTROL_BOX', 'CB-001', 1, 'JP', NOW(), NOW()),
  ('FU-20260417-001', 'TEACHING_PENDANT', 'TP-001', 2, 'JP', NOW(), NOW()),
  ('FU-20260417-001', 'MAIN_BOARD', 'MB-001', 3, 'JP', NOW(), NOW());

-- 10. 老化测试数据(passed+failed+interrupted)
INSERT INTO aging_tests (
  finished_product_sn, 
  status, 
  result, 
  start_time, 
  end_time, 
  tenant_id, 
  created_by,
  created_at,
  updated_at
)
VALUES 
  ('FU-20260417-001', 'passed', 'pass', '2026-04-18 10:00:00', '2026-04-19 10:00:00', 'JP', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
  ('FU-20260417-002', 'failed', 'fail', '2026-04-18 11:00:00', '2026-04-18 15:00:00', 'JP', '00000000-0000-0000-0000-000000000001', NOW(), NOW());

-- 11. Final Test数据(pass+fail+blocked)
INSERT INTO final_tests (
  finished_product_sn, 
  test_status, 
  tested_at, 
  tester_id, 
  tenant_id, 
  created_by,
  created_at,
  updated_at
)
VALUES 
  ('FU-20260417-001', 'pass', '2026-04-19 11:00:00', '00000000-0000-0000-0000-000000000002', 'JP', '00000000-0000-0000-0000-000000000002', NOW(), NOW()),
  ('FU-20260417-003', 'fail', '2026-04-19 12:00:00', '00000000-0000-0000-0000-000000000002', 'JP', '00000000-0000-0000-0000-000000000002', NOW(), NOW());

-- 12. QA Release数据(approved+blocked)
INSERT INTO qa_releases (
  finished_product_sn, 
  release_status, 
  released_at, 
  released_by, 
  tenant_id, 
  created_by,
  created_at,
  updated_at
)
VALUES 
  ('FU-20260417-001', 'approved', '2026-04-19 14:00:00', '00000000-0000-0000-0000-000000000003', 'JP', '00000000-0000-0000-0000-000000000003', NOW(), NOW()),
  ('FU-20260417-004', 'blocked', '2026-04-19 15:00:00', '00000000-0000-0000-0000-000000000003', 'JP', '00000000-0000-0000-0000-000000000003', NOW(), NOW());

-- 13. Shipment数据(confirmed+blocked)
INSERT INTO shipments (
  shipment_code, 
  finished_product_sn, 
  shipment_status, 
  shipped_at, 
  shipped_by, 
  tenant_id, 
  created_by,
  created_at,
  updated_at
)
VALUES 
  ('SHIP-20260417-001', 'FU-20260417-001', 'confirmed', '2026-04-19 16:00:00', '00000000-0000-0000-0000-000000000002', 'JP', '00000000-0000-0000-0000-000000000002', NOW(), NOW()),
  ('SHIP-20260417-002', 'FU-20260417-005', 'blocked', '2026-04-19 17:00:00', '00000000-0000-0000-0000-000000000002', 'JP', '00000000-0000-0000-0000-000000000002', NOW(), NOW());

-- 14. 异常数据(open+assigned+in_progress+resolved+closed)
INSERT INTO operation_exceptions (
  exception_code, 
  exception_type, 
  severity, 
  current_status, 
  source_module, 
  related_sn, 
  title, 
  description, 
  reporter_id, 
  reported_at, 
  tenant_id,
  created_at,
  updated_at
)
VALUES 
  ('EXC-20260417-001', 'quality', 'high', 'open', 'iqc', 'TP-001', 'IQC HOLD', 'HOLD待处理', '00000000-0000-0000-0000-000000000001', NOW(), 'JP', NOW(), NOW()),
  ('EXC-20260417-002', 'quality', 'high', 'assigned', 'final_test', 'FU-20260417-003', 'Final Test失败', '测试失败', '00000000-0000-0000-0000-000000000002', NOW(), 'JP', NOW(), NOW()),
  ('EXC-20260417-003', 'quality', 'medium', 'resolved', 'receiving', 'RCV-20260417-002', '收货差异', '差异已解决', '00000000-0000-0000-0000-000000000001', NOW(), 'JP', NOW(), NOW());

-- 完成标记
COMMENT ON TABLE production_plans IS 'UAT Demo数据已插入 - 2026-04-17';

-- 验证数据
SELECT 'production_plans' AS table_name, COUNT(*) AS record_count FROM production_plans WHERE tenant_id = 'JP'
UNION ALL
SELECT 'advance_shipping_notices', COUNT(*) FROM advance_shipping_notices WHERE tenant_id = 'JP'
UNION ALL
SELECT 'receiving_records', COUNT(*) FROM receiving_records WHERE tenant_id = 'JP'
UNION ALL
SELECT 'iqc_inspections', COUNT(*) FROM iqc_inspections WHERE tenant_id = 'JP'
UNION ALL
SELECT 'incoming_material_dispositions', COUNT(*) FROM incoming_material_dispositions WHERE tenant_id = 'JP'
UNION ALL
SELECT 'finished_unit_traceability', COUNT(*) FROM finished_unit_traceability WHERE tenant_id = 'JP'
UNION ALL
SELECT 'aging_tests', COUNT(*) FROM aging_tests WHERE tenant_id = 'JP'
UNION ALL
SELECT 'final_tests', COUNT(*) FROM final_tests WHERE tenant_id = 'JP'
UNION ALL
SELECT 'qa_releases', COUNT(*) FROM qa_releases WHERE tenant_id = 'JP'
UNION ALL
SELECT 'shipments', COUNT(*) FROM shipments WHERE tenant_id = 'JP'
UNION ALL
SELECT 'operation_exceptions', COUNT(*) FROM operation_exceptions WHERE tenant_id = 'JP';
