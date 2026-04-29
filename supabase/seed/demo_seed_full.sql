-- ============================================================
-- 全系统 Demo 数据包
-- 中国协作机器人日本委托组装业务 Web 管理系统
-- ============================================================
-- 版本：v1.0
-- 日期：2026-04-17
-- 说明：覆盖所有核心模块的完整演示数据
-- 用途：演示、测试、UAT
-- ============================================================

-- ============================================================
-- 清理现有 Demo 数据（可选，谨慎使用）
-- ============================================================
-- DELETE FROM material_consumption_records WHERE consumption_code LIKE 'DEMO-%';
-- DELETE FROM material_reservations WHERE reservation_code LIKE 'DEMO-%';
-- DELETE FROM shipments WHERE shipment_no LIKE 'SHP-DEMO-%';
-- DELETE FROM qa_releases WHERE release_no LIKE 'QA-DEMO-%';
-- DELETE FROM final_tests WHERE test_no LIKE 'FT-DEMO-%';
-- DELETE FROM aging_test_logs WHERE test_id IN (SELECT id FROM aging_tests WHERE test_no LIKE 'AGING-DEMO-%');
-- DELETE FROM aging_tests WHERE test_no LIKE 'AGING-DEMO-%';
-- DELETE FROM finished_unit_traceability WHERE finished_product_sn LIKE 'FR%-DEMO-%';
-- DELETE FROM assembly_part_material_mapping WHERE robot_sn LIKE 'FR%-DEMO-%';
-- DELETE FROM incoming_material_dispositions WHERE disposition_no LIKE 'DISP-DEMO-%';
-- DELETE FROM quality_exceptions WHERE exception_no LIKE 'EXC-DEMO-%';
-- DELETE FROM iqc_inspections WHERE inspection_no LIKE 'IQC-DEMO-%';
-- DELETE FROM receiving_record_items WHERE receiving_record_id IN (SELECT id FROM receiving_records WHERE receiving_no LIKE 'RCV-DEMO-%');
-- DELETE FROM receiving_records WHERE receiving_no LIKE 'RCV-DEMO-%';
-- DELETE FROM asn_shipment_items WHERE asn_id IN (SELECT id FROM asn_shipments WHERE asn_no LIKE 'ASN-DEMO-%');
-- DELETE FROM asn_shipments WHERE asn_no LIKE 'ASN-DEMO-%';
-- DELETE FROM cn_quality_inspection_records WHERE production_order_id IN (SELECT id FROM production_orders WHERE order_no LIKE 'PO-DEMO-%');
-- DELETE FROM production_orders WHERE order_no LIKE 'PO-DEMO-%';
-- DELETE FROM production_plan_versions WHERE plan_id IN (SELECT id FROM production_plans WHERE plan_no LIKE 'PLAN-DEMO-%');
-- DELETE FROM production_plans WHERE plan_no LIKE 'PLAN-DEMO-%';

-- ============================================================
-- 1. 基础数据：产品型号
-- ============================================================
-- 产品型号已在系统初始化时创建，这里不再重复插入

-- ============================================================
-- 2. 计划模块：生产计划
-- ============================================================

-- 2.1 生产计划（各种状态）
INSERT INTO production_plans (
  plan_no, tenant_id, factory_id, plan_name, plan_type, 
  target_month, status, total_quantity, completed_quantity,
  created_by, updated_by, created_at, updated_at
) VALUES
-- DEMO-1: FR3 已批准计划
('PLAN-DEMO-FR3-202604-W1', 'JP', 'JP-MICROTEC', 'FR3 4月第1周生产计划', 'monthly', '2026-04', 'approved', 50, 0, 
 (SELECT id FROM auth.users LIMIT 1), (SELECT id FROM auth.users LIMIT 1), 
 '2026-04-01 09:00:00', '2026-04-05 10:00:00'),

-- DEMO-2: FR5 进行中计划
('PLAN-DEMO-FR5-202604-W2', 'JP', 'JP-MICROTEC', 'FR5 4月第2周生产计划', 'monthly', '2026-04', 'active', 30, 15,
 (SELECT id FROM auth.users LIMIT 1), (SELECT id FROM auth.users LIMIT 1),
 '2026-04-08 09:00:00', '2026-04-15 14:00:00'),

-- DEMO-3: FR3 草稿计划
('PLAN-DEMO-FR3-202605-W1', 'JP', 'JP-MICROTEC', 'FR3 5月第1周生产计划', 'monthly', '2026-05', 'draft', 60, 0,
 (SELECT id FROM auth.users LIMIT 1), (SELECT id FROM auth.users LIMIT 1),
 '2026-04-16 09:00:00', '2026-04-16 09:00:00'),

-- DEMO-4: FR5 已提交计划
('PLAN-DEMO-FR5-202605-W1', 'JP', 'JP-MICROTEC', 'FR5 5月第1周生产计划', 'monthly', '2026-05', 'submitted', 40, 0,
 (SELECT id FROM auth.users LIMIT 1), (SELECT id FROM auth.users LIMIT 1),
 '2026-04-16 10:00:00', '2026-04-16 15:00:00'),

-- DEMO-5: FR3 已关闭计划
('PLAN-DEMO-FR3-202603-W4', 'JP', 'JP-MICROTEC', 'FR3 3月第4周生产计划', 'monthly', '2026-03', 'closed', 40, 40,
 (SELECT id FROM auth.users LIMIT 1), (SELECT id FROM auth.users LIMIT 1),
 '2026-03-24 09:00:00', '2026-04-01 16:00:00');

-- 2.2 生产计划版本
INSERT INTO production_plan_versions (
  plan_id, version_number, change_description, total_quantity,
  created_by, created_at
)
SELECT 
  p.id,
  1,
  '初始版本',
  p.total_quantity,
  p.created_by,
  p.created_at
FROM production_plans p
WHERE p.plan_no LIKE 'PLAN-DEMO-%';

-- 添加 FR3 4月计划的 V2 版本
INSERT INTO production_plan_versions (
  plan_id, version_number, change_description, total_quantity,
  created_by, created_at
)
SELECT 
  p.id,
  2,
  '根据客户需求调整数量：40 -> 50',
  50,
  p.created_by,
  p.updated_at
FROM production_plans p
WHERE p.plan_no = 'PLAN-DEMO-FR3-202604-W1';

-- ============================================================
-- 3. 中国侧执行：生产订单
-- ============================================================

INSERT INTO production_orders (
  order_no, tenant_id, factory_id, plan_id, product_model_id,
  order_quantity, completed_quantity, status,
  scheduled_start_date, scheduled_end_date,
  actual_start_date, actual_end_date,
  created_by, updated_by, created_at, updated_at
)
SELECT
  'PO-DEMO-FR3-001',
  'JP',
  'CN-FACTORY-01',
  p.id,
  (SELECT id FROM product_models WHERE model_code = 'FR3' LIMIT 1),
  25,
  25,
  'completed',
  '2026-04-01',
  '2026-04-05',
  '2026-04-01 08:00:00',
  '2026-04-05 18:00:00',
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  '2026-04-01 09:00:00',
  '2026-04-05 18:00:00'
FROM production_plans p
WHERE p.plan_no = 'PLAN-DEMO-FR3-202604-W1'

UNION ALL

SELECT
  'PO-DEMO-FR3-002',
  'JP',
  'CN-FACTORY-01',
  p.id,
  (SELECT id FROM product_models WHERE model_code = 'FR3' LIMIT 1),
  25,
  20,
  'in_progress',
  '2026-04-08',
  '2026-04-12',
  '2026-04-08 08:00:00',
  NULL,
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  '2026-04-08 09:00:00',
  '2026-04-16 14:00:00'
FROM production_plans p
WHERE p.plan_no = 'PLAN-DEMO-FR3-202604-W1'

UNION ALL

SELECT
  'PO-DEMO-FR5-001',
  'JP',
  'CN-FACTORY-01',
  p.id,
  (SELECT id FROM product_models WHERE model_code = 'FR5' LIMIT 1),
  15,
  15,
  'completed',
  '2026-04-08',
  '2026-04-12',
  '2026-04-08 08:00:00',
  '2026-04-12 18:00:00',
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  '2026-04-08 09:00:00',
  '2026-04-12 18:00:00'
FROM production_plans p
WHERE p.plan_no = 'PLAN-DEMO-FR5-202604-W2'

UNION ALL

SELECT
  'PO-DEMO-FR5-002',
  'JP',
  'CN-FACTORY-01',
  p.id,
  (SELECT id FROM product_models WHERE model_code = 'FR5' LIMIT 1),
  15,
  0,
  'pending',
  '2026-04-15',
  '2026-04-19',
  NULL,
  NULL,
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  '2026-04-15 09:00:00',
  '2026-04-15 09:00:00'
FROM production_plans p
WHERE p.plan_no = 'PLAN-DEMO-FR5-202604-W2';

-- ============================================================
-- 4. 中国侧执行：中国质检记录
-- ============================================================

INSERT INTO cn_quality_inspection_records (
  production_order_id, inspector_id, inspection_date,
  inspected_quantity, pass_quantity, fail_quantity, rework_quantity,
  inspection_result, notes, tenant_id, factory_id,
  created_at, updated_at
)
SELECT
  po.id,
  (SELECT id FROM auth.users LIMIT 1),
  '2026-04-05',
  25,
  25,
  0,
  0,
  'pass',
  'FR3 第一批次质检全部通过',
  'JP',
  'CN-FACTORY-01',
  '2026-04-05 16:00:00',
  '2026-04-05 16:00:00'
FROM production_orders po
WHERE po.order_no = 'PO-DEMO-FR3-001'

UNION ALL

SELECT
  po.id,
  (SELECT id FROM auth.users LIMIT 1),
  '2026-04-12',
  15,
  15,
  0,
  0,
  'pass',
  'FR5 第一批次质检全部通过',
  'JP',
  'CN-FACTORY-01',
  '2026-04-12 16:00:00',
  '2026-04-12 16:00:00'
FROM production_orders po
WHERE po.order_no = 'PO-DEMO-FR5-001'

UNION ALL

SELECT
  po.id,
  (SELECT id FROM auth.users LIMIT 1),
  '2026-04-16',
  20,
  18,
  2,
  0,
  'fail',
  'FR3 第二批次发现 2 件不良品，需返工',
  'JP',
  'CN-FACTORY-01',
  '2026-04-16 16:00:00',
  '2026-04-16 16:00:00'
FROM production_orders po
WHERE po.order_no = 'PO-DEMO-FR3-002';

-- ============================================================
-- 5. 发货/ASN：ASN/发货单
-- ============================================================

INSERT INTO asn_shipments (
  asn_no, tenant_id, factory_id, production_order_id,
  shipment_date, estimated_arrival_date, carrier, tracking_no,
  total_quantity, status, notes,
  created_by, updated_by, created_at, updated_at
)
SELECT
  'ASN-DEMO-FR3-20260406-01',
  'JP',
  'CN-FACTORY-01',
  po.id,
  '2026-04-06',
  '2026-04-08',
  'DHL Express',
  'DHL-FR3-20260406-001',
  25,
  'received',
  'FR3 第一批次发货，25 套关键件',
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  '2026-04-06 10:00:00',
  '2026-04-08 14:00:00'
FROM production_orders po
WHERE po.order_no = 'PO-DEMO-FR3-001'

UNION ALL

SELECT
  'ASN-DEMO-FR5-20260413-01',
  'JP',
  'CN-FACTORY-01',
  po.id,
  '2026-04-13',
  '2026-04-15',
  'FedEx',
  'FDX-FR5-20260413-001',
  15,
  'received',
  'FR5 第一批次发货，15 套关键件',
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  '2026-04-13 10:00:00',
  '2026-04-15 14:00:00'
FROM production_orders po
WHERE po.order_no = 'PO-DEMO-FR5-001'

UNION ALL

SELECT
  'ASN-DEMO-FR3-20260417-01',
  'JP',
  'CN-FACTORY-01',
  po.id,
  '2026-04-17',
  '2026-04-19',
  'DHL Express',
  'DHL-FR3-20260417-001',
  20,
  'shipped',
  'FR3 第二批次发货，20 套关键件（含 2 件返工品）',
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  '2026-04-17 10:00:00',
  '2026-04-17 10:00:00'
FROM production_orders po
WHERE po.order_no = 'PO-DEMO-FR3-002';

-- ============================================================
-- 6. 发货/ASN：ASN 明细
-- ============================================================

-- ASN-DEMO-FR3-20260406-01 明细（25 套 FR3 关键件）
INSERT INTO asn_shipment_items (
  asn_id, part_no, part_name, part_type, quantity, batch_no,
  pallet_no, carton_no, notes, tenant_id, factory_id,
  created_at, updated_at
)
SELECT
  asn.id,
  'CB-FR3-V1',
  'FR3 控制箱',
  'control_box',
  25,
  'BATCH-FR3-CB-20260401',
  'PLT-001',
  'CTN-001',
  'FR3 控制箱 25 件',
  'JP',
  'CN-FACTORY-01',
  '2026-04-06 10:00:00',
  '2026-04-06 10:00:00'
FROM asn_shipments asn
WHERE asn.asn_no = 'ASN-DEMO-FR3-20260406-01'

UNION ALL

SELECT
  asn.id,
  'TP-FR3-V1',
  'FR3 示教器',
  'teaching_pendant',
  25,
  'BATCH-FR3-TP-20260401',
  'PLT-001',
  'CTN-002',
  'FR3 示教器 25 件',
  'JP',
  'CN-FACTORY-01',
  '2026-04-06 10:00:00',
  '2026-04-06 10:00:00'
FROM asn_shipments asn
WHERE asn.asn_no = 'ASN-DEMO-FR3-20260406-01'

UNION ALL

SELECT
  asn.id,
  'MB-FR3-V1',
  'FR3 主板',
  'main_board',
  25,
  'BATCH-FR3-MB-20260401',
  'PLT-001',
  'CTN-003',
  'FR3 主板 25 件',
  'JP',
  'CN-FACTORY-01',
  '2026-04-06 10:00:00',
  '2026-04-06 10:00:00'
FROM asn_shipments asn
WHERE asn.asn_no = 'ASN-DEMO-FR3-20260406-01';

-- ASN-DEMO-FR5-20260413-01 明细（15 套 FR5 关键件）
INSERT INTO asn_shipment_items (
  asn_id, part_no, part_name, part_type, quantity, batch_no,
  pallet_no, carton_no, notes, tenant_id, factory_id,
  created_at, updated_at
)
SELECT
  asn.id,
  'CB-FR5-V1',
  'FR5 控制箱',
  'control_box',
  15,
  'BATCH-FR5-CB-20260408',
  'PLT-002',
  'CTN-004',
  'FR5 控制箱 15 件',
  'JP',
  'CN-FACTORY-01',
  '2026-04-13 10:00:00',
  '2026-04-13 10:00:00'
FROM asn_shipments asn
WHERE asn.asn_no = 'ASN-DEMO-FR5-20260413-01'

UNION ALL

SELECT
  asn.id,
  'TP-FR5-V1',
  'FR5 示教器',
  'teaching_pendant',
  15,
  'BATCH-FR5-TP-20260408',
  'PLT-002',
  'CTN-005',
  'FR5 示教器 15 件',
  'JP',
  'CN-FACTORY-01',
  '2026-04-13 10:00:00',
  '2026-04-13 10:00:00'
FROM asn_shipments asn
WHERE asn.asn_no = 'ASN-DEMO-FR5-20260413-01'

UNION ALL

SELECT
  asn.id,
  'MB-FR5-V1',
  'FR5 主板',
  'main_board',
  15,
  'BATCH-FR5-MB-20260408',
  'PLT-002',
  'CTN-006',
  'FR5 主板 15 件',
  'JP',
  'CN-FACTORY-01',
  '2026-04-13 10:00:00',
  '2026-04-13 10:00:00'
FROM asn_shipments asn
WHERE asn.asn_no = 'ASN-DEMO-FR5-20260413-01';

-- ASN-DEMO-FR3-20260417-01 明细（20 套 FR3 关键件）
INSERT INTO asn_shipment_items (
  asn_id, part_no, part_name, part_type, quantity, batch_no,
  pallet_no, carton_no, notes, tenant_id, factory_id,
  created_at, updated_at
)
SELECT
  asn.id,
  'CB-FR3-V1',
  'FR3 控制箱',
  'control_box',
  20,
  'BATCH-FR3-CB-20260408',
  'PLT-003',
  'CTN-007',
  'FR3 控制箱 20 件',
  'JP',
  'CN-FACTORY-01',
  '2026-04-17 10:00:00',
  '2026-04-17 10:00:00'
FROM asn_shipments asn
WHERE asn.asn_no = 'ASN-DEMO-FR3-20260417-01'

UNION ALL

SELECT
  asn.id,
  'TP-FR3-V1',
  'FR3 示教器',
  'teaching_pendant',
  20,
  'BATCH-FR3-TP-20260408',
  'PLT-003',
  'CTN-008',
  'FR3 示教器 20 件',
  'JP',
  'CN-FACTORY-01',
  '2026-04-17 10:00:00',
  '2026-04-17 10:00:00'
FROM asn_shipments asn
WHERE asn.asn_no = 'ASN-DEMO-FR3-20260417-01'

UNION ALL

SELECT
  asn.id,
  'MB-FR3-V1',
  'FR3 主板',
  'main_board',
  20,
  'BATCH-FR3-MB-20260408',
  'PLT-003',
  'CTN-009',
  'FR3 主板 20 件',
  'JP',
  'CN-FACTORY-01',
  '2026-04-17 10:00:00',
  '2026-04-17 10:00:00'
FROM asn_shipments asn
WHERE asn.asn_no = 'ASN-DEMO-FR3-20260417-01';

-- ============================================================
-- 7. 日本收货：收货记录
-- ============================================================

INSERT INTO receiving_records (
  receiving_no, asn_id, tenant_id, factory_id,
  receiving_date, receiver_id, status, notes,
  created_at, updated_at
)
SELECT
  'RCV-DEMO-JP-20260408-01',
  asn.id,
  'JP',
  'JP-MICROTEC',
  '2026-04-08',
  (SELECT id FROM auth.users LIMIT 1),
  'completed',
  'FR3 第一批次收货完成，正常收货',
  '2026-04-08 14:00:00',
  '2026-04-08 16:00:00'
FROM asn_shipments asn
WHERE asn.asn_no = 'ASN-DEMO-FR3-20260406-01'

UNION ALL

SELECT
  'RCV-DEMO-JP-20260415-01',
  asn.id,
  'JP',
  'JP-MICROTEC',
  '2026-04-15',
  (SELECT id FROM auth.users LIMIT 1),
  'completed',
  'FR5 第一批次收货完成，发现 1 件控制箱破损',
  '2026-04-15 14:00:00',
  '2026-04-15 16:00:00'
FROM asn_shipments asn
WHERE asn.asn_no = 'ASN-DEMO-FR5-20260413-01';

-- ============================================================
-- 8. 日本收货：收货明细（含序列号）
-- ============================================================

-- RCV-DEMO-JP-20260408-01 明细（FR3 正常收货）
INSERT INTO receiving_record_items (
  receiving_record_id, asn_item_id, part_no, part_name, part_type,
  expected_qty, received_qty, variance_qty, variance_type,
  batch_no, serial_number, storage_location, status,
  on_hand_qty, available_qty, reserved_qty, consumed_qty, blocked_qty,
  tenant_id, factory_id, created_at, updated_at
)
SELECT
  rcv.id,
  asn_item.id,
  'CB-FR3-V1',
  'FR3 控制箱',
  'control_box',
  25,
  25,
  0,
  NULL,
  'BATCH-FR3-CB-20260401',
  'CB-FR3-DEMO-' || LPAD(generate_series::text, 3, '0'),
  'ZONE-A-01',
  'available',
  1,
  1,
  0,
  0,
  0,
  'JP',
  'JP-MICROTEC',
  '2026-04-08 14:00:00',
  '2026-04-08 16:00:00'
FROM receiving_records rcv
JOIN asn_shipments asn ON rcv.asn_id = asn.id
JOIN asn_shipment_items asn_item ON asn_item.asn_id = asn.id AND asn_item.part_type = 'control_box'
CROSS JOIN generate_series(1, 25)
WHERE rcv.receiving_no = 'RCV-DEMO-JP-20260408-01';

INSERT INTO receiving_record_items (
  receiving_record_id, asn_item_id, part_no, part_name, part_type,
  expected_qty, received_qty, variance_qty, variance_type,
  batch_no, serial_number, storage_location, status,
  on_hand_qty, available_qty, reserved_qty, consumed_qty, blocked_qty,
  tenant_id, factory_id, created_at, updated_at
)
SELECT
  rcv.id,
  asn_item.id,
  'TP-FR3-V1',
  'FR3 示教器',
  'teaching_pendant',
  25,
  25,
  0,
  NULL,
  'BATCH-FR3-TP-20260401',
  'TP-FR3-DEMO-' || LPAD(generate_series::text, 3, '0'),
  'ZONE-A-02',
  'available',
  1,
  1,
  0,
  0,
  0,
  'JP',
  'JP-MICROTEC',
  '2026-04-08 14:00:00',
  '2026-04-08 16:00:00'
FROM receiving_records rcv
JOIN asn_shipments asn ON rcv.asn_id = asn.id
JOIN asn_shipment_items asn_item ON asn_item.asn_id = asn.id AND asn_item.part_type = 'teaching_pendant'
CROSS JOIN generate_series(1, 25)
WHERE rcv.receiving_no = 'RCV-DEMO-JP-20260408-01';

INSERT INTO receiving_record_items (
  receiving_record_id, asn_item_id, part_no, part_name, part_type,
  expected_qty, received_qty, variance_qty, variance_type,
  batch_no, serial_number, storage_location, status,
  on_hand_qty, available_qty, reserved_qty, consumed_qty, blocked_qty,
  tenant_id, factory_id, created_at, updated_at
)
SELECT
  rcv.id,
  asn_item.id,
  'MB-FR3-V1',
  'FR3 主板',
  'main_board',
  25,
  25,
  0,
  NULL,
  'BATCH-FR3-MB-20260401',
  'MB-FR3-DEMO-' || LPAD(generate_series::text, 3, '0'),
  'ZONE-A-03',
  'available',
  1,
  1,
  0,
  0,
  0,
  'JP',
  'JP-MICROTEC',
  '2026-04-08 14:00:00',
  '2026-04-08 16:00:00'
FROM receiving_records rcv
JOIN asn_shipments asn ON rcv.asn_id = asn.id
JOIN asn_shipment_items asn_item ON asn_item.asn_id = asn.id AND asn_item.part_type = 'main_board'
CROSS JOIN generate_series(1, 25)
WHERE rcv.receiving_no = 'RCV-DEMO-JP-20260408-01';

-- RCV-DEMO-JP-20260415-01 明细（FR5 收货，1 件控制箱破损）
INSERT INTO receiving_record_items (
  receiving_record_id, asn_item_id, part_no, part_name, part_type,
  expected_qty, received_qty, variance_qty, variance_type,
  batch_no, serial_number, storage_location, status,
  on_hand_qty, available_qty, reserved_qty, consumed_qty, blocked_qty,
  tenant_id, factory_id, created_at, updated_at
)
SELECT
  rcv.id,
  asn_item.id,
  'CB-FR5-V1',
  'FR5 控制箱',
  'control_box',
  15,
  15,
  0,
  NULL,
  'BATCH-FR5-CB-20260408',
  'CB-FR5-DEMO-' || LPAD(generate_series::text, 3, '0'),
  'ZONE-B-01',
  CASE WHEN generate_series = 1 THEN 'blocked' ELSE 'available' END,
  1,
  CASE WHEN generate_series = 1 THEN 0 ELSE 1 END,
  0,
  0,
  CASE WHEN generate_series = 1 THEN 1 ELSE 0 END,
  'JP',
  'JP-MICROTEC',
  '2026-04-15 14:00:00',
  '2026-04-15 16:00:00'
FROM receiving_records rcv
JOIN asn_shipments asn ON rcv.asn_id = asn.id
JOIN asn_shipment_items asn_item ON asn_item.asn_id = asn.id AND asn_item.part_type = 'control_box'
CROSS JOIN generate_series(1, 15)
WHERE rcv.receiving_no = 'RCV-DEMO-JP-20260415-01';

INSERT INTO receiving_record_items (
  receiving_record_id, asn_item_id, part_no, part_name, part_type,
  expected_qty, received_qty, variance_qty, variance_type,
  batch_no, serial_number, storage_location, status,
  on_hand_qty, available_qty, reserved_qty, consumed_qty, blocked_qty,
  tenant_id, factory_id, created_at, updated_at
)
SELECT
  rcv.id,
  asn_item.id,
  'TP-FR5-V1',
  'FR5 示教器',
  'teaching_pendant',
  15,
  15,
  0,
  NULL,
  'BATCH-FR5-TP-20260408',
  'TP-FR5-DEMO-' || LPAD(generate_series::text, 3, '0'),
  'ZONE-B-02',
  'available',
  1,
  1,
  0,
  0,
  0,
  'JP',
  'JP-MICROTEC',
  '2026-04-15 14:00:00',
  '2026-04-15 16:00:00'
FROM receiving_records rcv
JOIN asn_shipments asn ON rcv.asn_id = asn.id
JOIN asn_shipment_items asn_item ON asn_item.asn_id = asn.id AND asn_item.part_type = 'teaching_pendant'
CROSS JOIN generate_series(1, 15)
WHERE rcv.receiving_no = 'RCV-DEMO-JP-20260415-01';

INSERT INTO receiving_record_items (
  receiving_record_id, asn_item_id, part_no, part_name, part_type,
  expected_qty, received_qty, variance_qty, variance_type,
  batch_no, serial_number, storage_location, status,
  on_hand_qty, available_qty, reserved_qty, consumed_qty, blocked_qty,
  tenant_id, factory_id, created_at, updated_at
)
SELECT
  rcv.id,
  asn_item.id,
  'MB-FR5-V1',
  'FR5 主板',
  'main_board',
  15,
  15,
  0,
  NULL,
  'BATCH-FR5-MB-20260408',
  'MB-FR5-DEMO-' || LPAD(generate_series::text, 3, '0'),
  'ZONE-B-03',
  'available',
  1,
  1,
  0,
  0,
  0,
  'JP',
  'JP-MICROTEC',
  '2026-04-15 14:00:00',
  '2026-04-15 16:00:00'
FROM receiving_records rcv
JOIN asn_shipments asn ON rcv.asn_id = asn.id
JOIN asn_shipment_items asn_item ON asn_item.asn_id = asn.id AND asn_item.part_type = 'main_board'
CROSS JOIN generate_series(1, 15)
WHERE rcv.receiving_no = 'RCV-DEMO-JP-20260415-01';

-- ============================================================
-- 9. IQC：IQC 检验
-- ============================================================

-- FR3 第一批次 IQC（全部通过）
INSERT INTO iqc_inspections (
  inspection_no, receiving_record_id, receiving_record_item_id,
  inspector_id, inspection_date, inspection_type, inspection_result,
  sample_size, pass_quantity, fail_quantity, defect_description,
  tenant_id, factory_id, created_at, updated_at
)
SELECT
  'IQC-DEMO-FR3-CB-001',
  rcv.id,
  rcv_item.id,
  (SELECT id FROM auth.users LIMIT 1),
  '2026-04-09',
  'sampling',
  'OK',
  5,
  5,
  0,
  NULL,
  'JP',
  'JP-MICROTEC',
  '2026-04-09 10:00:00',
  '2026-04-09 11:00:00'
FROM receiving_records rcv
JOIN receiving_record_items rcv_item ON rcv_item.receiving_record_id = rcv.id AND rcv_item.part_type = 'control_box'
WHERE rcv.receiving_no = 'RCV-DEMO-JP-20260408-01'
LIMIT 1;

-- FR5 控制箱 IQC（1 件破损，HOLD）
INSERT INTO iqc_inspections (
  inspection_no, receiving_record_id, receiving_record_item_id,
  inspector_id, inspection_date, inspection_type, inspection_result,
  sample_size, pass_quantity, fail_quantity, defect_description,
  tenant_id, factory_id, created_at, updated_at
)
SELECT
  'IQC-DEMO-FR5-CB-001',
  rcv.id,
  rcv_item.id,
  (SELECT id FROM auth.users LIMIT 1),
  '2026-04-16',
  'full',
  'HOLD',
  15,
  14,
  1,
  '1 件控制箱外壳破损，待特采处理',
  'JP',
  'JP-MICROTEC',
  '2026-04-16 10:00:00',
  '2026-04-16 11:00:00'
FROM receiving_records rcv
JOIN receiving_record_items rcv_item ON rcv_item.receiving_record_id = rcv.id AND rcv_item.part_type = 'control_box' AND rcv_item.status = 'blocked'
WHERE rcv.receiving_no = 'RCV-DEMO-JP-20260415-01'
LIMIT 1;

-- ============================================================
-- 10. Disposition / 特采 / 异常
-- ============================================================

-- 异常记录：FR5 控制箱破损
INSERT INTO quality_exceptions (
  exception_no, tenant_id, factory_id, exception_type, severity,
  source_type, source_id, part_no, part_name, batch_no,
  quantity, description, status, reported_by, reported_at,
  created_at, updated_at
)
SELECT
  'EXC-DEMO-FR5-CB-001',
  'JP',
  'JP-MICROTEC',
  'damaged',
  'medium',
  'receiving',
  rcv.id,
  'CB-FR5-V1',
  'FR5 控制箱',
  'BATCH-FR5-CB-20260408',
  1,
  '收货时发现 1 件控制箱外壳破损，功能正常',
  'open',
  (SELECT id FROM auth.users LIMIT 1),
  '2026-04-15 15:00:00',
  '2026-04-15 15:00:00',
  '2026-04-15 15:00:00'
FROM receiving_records rcv
WHERE rcv.receiving_no = 'RCV-DEMO-JP-20260415-01';

-- Disposition 记录：FR5 控制箱破损特采
INSERT INTO incoming_material_dispositions (
  disposition_no, tenant_id, factory_id, receiving_record_id,
  receiving_record_item_id, iqc_inspection_id, exception_id,
  disposition_type, disposition_reason, quantity, status,
  requested_by, requested_at, approved_by, approved_at,
  created_at, updated_at
)
SELECT
  'DISP-DEMO-FR5-CB-001',
  'JP',
  'JP-MICROTEC',
  rcv.id,
  rcv_item.id,
  iqc.id,
  exc.id,
  'special_acceptance',
  '外壳轻微破损，不影响功能，特采通过',
  1,
  'approved',
  (SELECT id FROM auth.users LIMIT 1),
  '2026-04-16 14:00:00',
  (SELECT id FROM auth.users LIMIT 1),
  '2026-04-16 16:00:00',
  '2026-04-16 14:00:00',
  '2026-04-16 16:00:00'
FROM receiving_records rcv
JOIN receiving_record_items rcv_item ON rcv_item.receiving_record_id = rcv.id AND rcv_item.part_type = 'control_box' AND rcv_item.status = 'blocked'
JOIN iqc_inspections iqc ON iqc.receiving_record_item_id = rcv_item.id
JOIN quality_exceptions exc ON exc.source_id = rcv.id AND exc.exception_type = 'damaged'
WHERE rcv.receiving_no = 'RCV-DEMO-JP-20260415-01'
LIMIT 1;

-- 特采通过后，更新库存状态为可用
UPDATE receiving_record_items
SET 
  status = 'available',
  available_qty = 1,
  blocked_qty = 0,
  updated_at = '2026-04-16 16:00:00'
WHERE id IN (
  SELECT rcv_item.id
  FROM receiving_records rcv
  JOIN receiving_record_items rcv_item ON rcv_item.receiving_record_id = rcv.id AND rcv_item.part_type = 'control_box' AND rcv_item.serial_number = 'CB-FR5-DEMO-001'
  WHERE rcv.receiving_no = 'RCV-DEMO-JP-20260415-01'
);

-- 更新异常状态为已解决
UPDATE quality_exceptions
SET 
  status = 'resolved',
  resolved_by = (SELECT id FROM auth.users LIMIT 1),
  resolved_at = '2026-04-16 16:00:00',
  updated_at = '2026-04-16 16:00:00'
WHERE exception_no = 'EXC-DEMO-FR5-CB-001';

-- ============================================================
-- 11. 库存 / 来料映射 / 组装：整机组装记录
-- ============================================================

-- FR3 整机组装记录（5 台）
INSERT INTO finished_unit_traceability (
  finished_product_sn, product_model_id, control_box_sn, teaching_pendant_sn, main_board_sn,
  firmware_version, software_version, binding_time, binding_operator_id,
  aging_required, aging_status, final_test_status, qa_release_status, shipment_status,
  tenant_id, factory_id, assembly_completed_at, created_at, updated_at
)
SELECT
  'FR3-DEMO-' || LPAD(generate_series::text, 3, '0'),
  (SELECT id FROM product_models WHERE model_code = 'FR3' LIMIT 1),
  'CB-FR3-DEMO-' || LPAD(generate_series::text, 3, '0'),
  'TP-FR3-DEMO-' || LPAD(generate_series::text, 3, '0'),
  'MB-FR3-DEMO-' || LPAD(generate_series::text, 3, '0'),
  'FW-FR3-V1.2.0',
  'SW-FR3-V2.1.0',
  '2026-04-10 ' || LPAD((8 + generate_series)::text, 2, '0') || ':00:00',
  (SELECT id FROM auth.users LIMIT 1),
  TRUE,
  CASE 
    WHEN generate_series <= 3 THEN 'passed'
    WHEN generate_series = 4 THEN 'running'
    ELSE 'pending'
  END,
  CASE 
    WHEN generate_series <= 2 THEN 'passed'
    WHEN generate_series = 3 THEN 'pending'
    ELSE 'pending'
  END,
  CASE 
    WHEN generate_series <= 2 THEN 'approved'
    ELSE 'pending'
  END,
  CASE 
    WHEN generate_series = 1 THEN 'shipped'
    WHEN generate_series = 2 THEN 'ready'
    ELSE 'pending'
  END,
  'JP',
  'JP-MICROTEC',
  '2026-04-10 ' || LPAD((8 + generate_series)::text, 2, '0') || ':00:00',
  '2026-04-10 ' || LPAD((8 + generate_series)::text, 2, '0') || ':00:00',
  '2026-04-10 ' || LPAD((8 + generate_series)::text, 2, '0') || ':00:00'
FROM generate_series(1, 5);

-- FR5 整机组装记录（3 台）
INSERT INTO finished_unit_traceability (
  finished_product_sn, product_model_id, control_box_sn, teaching_pendant_sn, main_board_sn,
  firmware_version, software_version, binding_time, binding_operator_id,
  aging_required, aging_status, final_test_status, qa_release_status, shipment_status,
  tenant_id, factory_id, assembly_completed_at, created_at, updated_at
)
SELECT
  'FR5-DEMO-' || LPAD(generate_series::text, 3, '0'),
  (SELECT id FROM product_models WHERE model_code = 'FR5' LIMIT 1),
  'CB-FR5-DEMO-' || LPAD((generate_series + 1)::text, 3, '0'),
  'TP-FR5-DEMO-' || LPAD(generate_series::text, 3, '0'),
  'MB-FR5-DEMO-' || LPAD(generate_series::text, 3, '0'),
  'FW-FR5-V1.3.0',
  'SW-FR5-V2.2.0',
  '2026-04-17 ' || LPAD((8 + generate_series)::text, 2, '0') || ':00:00',
  (SELECT id FROM auth.users LIMIT 1),
  TRUE,
  CASE 
    WHEN generate_series = 1 THEN 'passed'
    ELSE 'pending'
  END,
  CASE 
    WHEN generate_series = 1 THEN 'passed'
    ELSE 'pending'
  END,
  'pending',
  'pending',
  'JP',
  'JP-MICROTEC',
  '2026-04-17 ' || LPAD((8 + generate_series)::text, 2, '0') || ':00:00',
  '2026-04-17 ' || LPAD((8 + generate_series)::text, 2, '0') || ':00:00',
  '2026-04-17 ' || LPAD((8 + generate_series)::text, 2, '0') || ':00:00'
FROM generate_series(1, 3);

-- ============================================================
-- 12. 库存 / 来料映射 / 组装：组装映射记录
-- ============================================================

-- FR3 组装映射记录
INSERT INTO assembly_part_material_mapping (
  robot_sn, part_type, part_no, batch_no, receiving_record_item_id,
  is_consumed, consumed_at, installed_by, tenant_id, factory_id,
  created_at, updated_at
)
SELECT
  fut.finished_product_sn,
  'control_box',
  'CB-FR3-V1',
  'BATCH-FR3-CB-20260401',
  rcv_item.id,
  TRUE,
  fut.assembly_completed_at,
  fut.binding_operator_id,
  'JP',
  'JP-MICROTEC',
  fut.assembly_completed_at,
  fut.assembly_completed_at
FROM finished_unit_traceability fut
JOIN receiving_record_items rcv_item ON rcv_item.serial_number = fut.control_box_sn
WHERE fut.finished_product_sn LIKE 'FR3-DEMO-%';

INSERT INTO assembly_part_material_mapping (
  robot_sn, part_type, part_no, batch_no, receiving_record_item_id,
  is_consumed, consumed_at, installed_by, tenant_id, factory_id,
  created_at, updated_at
)
SELECT
  fut.finished_product_sn,
  'teaching_pendant',
  'TP-FR3-V1',
  'BATCH-FR3-TP-20260401',
  rcv_item.id,
  TRUE,
  fut.assembly_completed_at,
  fut.binding_operator_id,
  'JP',
  'JP-MICROTEC',
  fut.assembly_completed_at,
  fut.assembly_completed_at
FROM finished_unit_traceability fut
JOIN receiving_record_items rcv_item ON rcv_item.serial_number = fut.teaching_pendant_sn
WHERE fut.finished_product_sn LIKE 'FR3-DEMO-%';

INSERT INTO assembly_part_material_mapping (
  robot_sn, part_type, part_no, batch_no, receiving_record_item_id,
  is_consumed, consumed_at, installed_by, tenant_id, factory_id,
  created_at, updated_at
)
SELECT
  fut.finished_product_sn,
  'main_board',
  'MB-FR3-V1',
  'BATCH-FR3-MB-20260401',
  rcv_item.id,
  TRUE,
  fut.assembly_completed_at,
  fut.binding_operator_id,
  'JP',
  'JP-MICROTEC',
  fut.assembly_completed_at,
  fut.assembly_completed_at
FROM finished_unit_traceability fut
JOIN receiving_record_items rcv_item ON rcv_item.serial_number = fut.main_board_sn
WHERE fut.finished_product_sn LIKE 'FR3-DEMO-%';

-- FR5 组装映射记录
INSERT INTO assembly_part_material_mapping (
  robot_sn, part_type, part_no, batch_no, receiving_record_item_id,
  is_consumed, consumed_at, installed_by, tenant_id, factory_id,
  created_at, updated_at
)
SELECT
  fut.finished_product_sn,
  'control_box',
  'CB-FR5-V1',
  'BATCH-FR5-CB-20260408',
  rcv_item.id,
  TRUE,
  fut.assembly_completed_at,
  fut.binding_operator_id,
  'JP',
  'JP-MICROTEC',
  fut.assembly_completed_at,
  fut.assembly_completed_at
FROM finished_unit_traceability fut
JOIN receiving_record_items rcv_item ON rcv_item.serial_number = fut.control_box_sn
WHERE fut.finished_product_sn LIKE 'FR5-DEMO-%';

INSERT INTO assembly_part_material_mapping (
  robot_sn, part_type, part_no, batch_no, receiving_record_item_id,
  is_consumed, consumed_at, installed_by, tenant_id, factory_id,
  created_at, updated_at
)
SELECT
  fut.finished_product_sn,
  'teaching_pendant',
  'TP-FR5-V1',
  'BATCH-FR5-TP-20260408',
  rcv_item.id,
  TRUE,
  fut.assembly_completed_at,
  fut.binding_operator_id,
  'JP',
  'JP-MICROTEC',
  fut.assembly_completed_at,
  fut.assembly_completed_at
FROM finished_unit_traceability fut
JOIN receiving_record_items rcv_item ON rcv_item.serial_number = fut.teaching_pendant_sn
WHERE fut.finished_product_sn LIKE 'FR5-DEMO-%';

INSERT INTO assembly_part_material_mapping (
  robot_sn, part_type, part_no, batch_no, receiving_record_item_id,
  is_consumed, consumed_at, installed_by, tenant_id, factory_id,
  created_at, updated_at
)
SELECT
  fut.finished_product_sn,
  'main_board',
  'MB-FR5-V1',
  'BATCH-FR5-MB-20260408',
  rcv_item.id,
  TRUE,
  fut.assembly_completed_at,
  fut.binding_operator_id,
  'JP',
  'JP-MICROTEC',
  fut.assembly_completed_at,
  fut.assembly_completed_at
FROM finished_unit_traceability fut
JOIN receiving_record_items rcv_item ON rcv_item.serial_number = fut.main_board_sn
WHERE fut.finished_product_sn LIKE 'FR5-DEMO-%';

-- ============================================================
-- 13. P0 库存准确性：material_reservations
-- ============================================================

-- FR3 已消耗预占记录
INSERT INTO material_reservations (
  reservation_code, tenant_id, receiving_record_item_id, reserved_qty,
  reserved_by, source_type, source_reference, status, consumed_at,
  notes, created_at, updated_at
)
SELECT
  'DEMO-RSV-' || fut.finished_product_sn || '-CB',
  'JP',
  rcv_item.id,
  1,
  fut.binding_operator_id,
  'assembly',
  fut.finished_product_sn,
  'consumed',
  fut.assembly_completed_at,
  '组装整机 ' || fut.finished_product_sn,
  fut.assembly_completed_at,
  fut.assembly_completed_at
FROM finished_unit_traceability fut
JOIN receiving_record_items rcv_item ON rcv_item.serial_number = fut.control_box_sn
WHERE fut.finished_product_sn LIKE 'FR3-DEMO-%' OR fut.finished_product_sn LIKE 'FR5-DEMO-%';

INSERT INTO material_reservations (
  reservation_code, tenant_id, receiving_record_item_id, reserved_qty,
  reserved_by, source_type, source_reference, status, consumed_at,
  notes, created_at, updated_at
)
SELECT
  'DEMO-RSV-' || fut.finished_product_sn || '-TP',
  'JP',
  rcv_item.id,
  1,
  fut.binding_operator_id,
  'assembly',
  fut.finished_product_sn,
  'consumed',
  fut.assembly_completed_at,
  '组装整机 ' || fut.finished_product_sn,
  fut.assembly_completed_at,
  fut.assembly_completed_at
FROM finished_unit_traceability fut
JOIN receiving_record_items rcv_item ON rcv_item.serial_number = fut.teaching_pendant_sn
WHERE fut.finished_product_sn LIKE 'FR3-DEMO-%' OR fut.finished_product_sn LIKE 'FR5-DEMO-%';

INSERT INTO material_reservations (
  reservation_code, tenant_id, receiving_record_item_id, reserved_qty,
  reserved_by, source_type, source_reference, status, consumed_at,
  notes, created_at, updated_at
)
SELECT
  'DEMO-RSV-' || fut.finished_product_sn || '-MB',
  'JP',
  rcv_item.id,
  1,
  fut.binding_operator_id,
  'assembly',
  fut.finished_product_sn,
  'consumed',
  fut.assembly_completed_at,
  '组装整机 ' || fut.finished_product_sn,
  fut.assembly_completed_at,
  fut.assembly_completed_at
FROM finished_unit_traceability fut
JOIN receiving_record_items rcv_item ON rcv_item.serial_number = fut.main_board_sn
WHERE fut.finished_product_sn LIKE 'FR3-DEMO-%' OR fut.finished_product_sn LIKE 'FR5-DEMO-%';

-- ============================================================
-- 14. P0 库存准确性：material_consumption_records
-- ============================================================

-- FR3 消耗记录
INSERT INTO material_consumption_records (
  consumption_code, tenant_id, receiving_record_item_id, reservation_id,
  consumed_qty, consumed_by, source_type, source_reference, unit_serial_number,
  notes, created_at, updated_at
)
SELECT
  'DEMO-CSM-' || fut.finished_product_sn || '-CB',
  'JP',
  rcv_item.id,
  rsv.id,
  1,
  fut.binding_operator_id,
  'assembly',
  fut.finished_product_sn,
  fut.finished_product_sn,
  '组装整机 ' || fut.finished_product_sn,
  fut.assembly_completed_at,
  fut.assembly_completed_at
FROM finished_unit_traceability fut
JOIN receiving_record_items rcv_item ON rcv_item.serial_number = fut.control_box_sn
JOIN material_reservations rsv ON rsv.source_reference = fut.finished_product_sn AND rsv.receiving_record_item_id = rcv_item.id
WHERE fut.finished_product_sn LIKE 'FR3-DEMO-%' OR fut.finished_product_sn LIKE 'FR5-DEMO-%';

INSERT INTO material_consumption_records (
  consumption_code, tenant_id, receiving_record_item_id, reservation_id,
  consumed_qty, consumed_by, source_type, source_reference, unit_serial_number,
  notes, created_at, updated_at
)
SELECT
  'DEMO-CSM-' || fut.finished_product_sn || '-TP',
  'JP',
  rcv_item.id,
  rsv.id,
  1,
  fut.binding_operator_id,
  'assembly',
  fut.finished_product_sn,
  fut.finished_product_sn,
  '组装整机 ' || fut.finished_product_sn,
  fut.assembly_completed_at,
  fut.assembly_completed_at
FROM finished_unit_traceability fut
JOIN receiving_record_items rcv_item ON rcv_item.serial_number = fut.teaching_pendant_sn
JOIN material_reservations rsv ON rsv.source_reference = fut.finished_product_sn AND rsv.receiving_record_item_id = rcv_item.id
WHERE fut.finished_product_sn LIKE 'FR3-DEMO-%' OR fut.finished_product_sn LIKE 'FR5-DEMO-%';

INSERT INTO material_consumption_records (
  consumption_code, tenant_id, receiving_record_item_id, reservation_id,
  consumed_qty, consumed_by, source_type, source_reference, unit_serial_number,
  notes, created_at, updated_at
)
SELECT
  'DEMO-CSM-' || fut.finished_product_sn || '-MB',
  'JP',
  rcv_item.id,
  rsv.id,
  1,
  fut.binding_operator_id,
  'assembly',
  fut.finished_product_sn,
  fut.finished_product_sn,
  '组装整机 ' || fut.finished_product_sn,
  fut.assembly_completed_at,
  fut.assembly_completed_at
FROM finished_unit_traceability fut
JOIN receiving_record_items rcv_item ON rcv_item.serial_number = fut.main_board_sn
JOIN material_reservations rsv ON rsv.source_reference = fut.finished_product_sn AND rsv.receiving_record_item_id = rcv_item.id
WHERE fut.finished_product_sn LIKE 'FR3-DEMO-%' OR fut.finished_product_sn LIKE 'FR5-DEMO-%';

-- 更新已消耗来料的库存状态
UPDATE receiving_record_items
SET 
  available_qty = 0,
  reserved_qty = 0,
  consumed_qty = 1,
  updated_at = NOW()
WHERE serial_number IN (
  SELECT control_box_sn FROM finished_unit_traceability WHERE finished_product_sn LIKE 'FR3-DEMO-%' OR finished_product_sn LIKE 'FR5-DEMO-%'
  UNION
  SELECT teaching_pendant_sn FROM finished_unit_traceability WHERE finished_product_sn LIKE 'FR3-DEMO-%' OR finished_product_sn LIKE 'FR5-DEMO-%'
  UNION
  SELECT main_board_sn FROM finished_unit_traceability WHERE finished_product_sn LIKE 'FR3-DEMO-%' OR finished_product_sn LIKE 'FR5-DEMO-%'
);

-- ============================================================
-- 15. 老化：aging_tests
-- ============================================================

-- FR3 老化测试记录
INSERT INTO aging_tests (
  test_no, finished_product_sn, product_model_id, test_type,
  planned_duration_hours, actual_duration_hours, start_time, end_time,
  status, result, operator_id, tenant_id, factory_id,
  created_at, updated_at
)
SELECT
  'AGING-DEMO-' || fut.finished_product_sn,
  fut.finished_product_sn,
  fut.product_model_id,
  'standard',
  48,
  CASE 
    WHEN fut.aging_status = 'passed' THEN 48
    WHEN fut.aging_status = 'running' THEN 24
    ELSE NULL
  END,
  fut.assembly_completed_at + INTERVAL '1 hour',
  CASE 
    WHEN fut.aging_status = 'passed' THEN fut.assembly_completed_at + INTERVAL '49 hours'
    ELSE NULL
  END,
  fut.aging_status,
  CASE 
    WHEN fut.aging_status = 'passed' THEN 'pass'
    ELSE NULL
  END,
  fut.binding_operator_id,
  'JP',
  'JP-MICROTEC',
  fut.assembly_completed_at + INTERVAL '1 hour',
  CASE 
    WHEN fut.aging_status = 'passed' THEN fut.assembly_completed_at + INTERVAL '49 hours'
    ELSE fut.assembly_completed_at + INTERVAL '1 hour'
  END
FROM finished_unit_traceability fut
WHERE fut.finished_product_sn LIKE 'FR3-DEMO-%' OR fut.finished_product_sn LIKE 'FR5-DEMO-%';

-- ============================================================
-- 16. 老化：aging_test_logs
-- ============================================================

-- FR3-DEMO-001 老化日志（已通过）
INSERT INTO aging_test_logs (
  test_id, log_time, elapsed_hours, temperature, humidity,
  power_consumption, vibration_level, status, notes,
  created_at
)
SELECT
  at.id,
  at.start_time + (generate_series || ' hours')::INTERVAL,
  generate_series,
  22.0 + (random() * 3),
  45.0 + (random() * 10),
  150.0 + (random() * 20),
  0.5 + (random() * 0.3),
  'running',
  '老化测试进行中，各项指标正常',
  at.start_time + (generate_series || ' hours')::INTERVAL
FROM aging_tests at
CROSS JOIN generate_series(0, 47, 6)
WHERE at.test_no = 'AGING-DEMO-FR3-DEMO-001';

-- FR3-DEMO-004 老化日志（运行中）
INSERT INTO aging_test_logs (
  test_id, log_time, elapsed_hours, temperature, humidity,
  power_consumption, vibration_level, status, notes,
  created_at
)
SELECT
  at.id,
  at.start_time + (generate_series || ' hours')::INTERVAL,
  generate_series,
  22.0 + (random() * 3),
  45.0 + (random() * 10),
  150.0 + (random() * 20),
  0.5 + (random() * 0.3),
  'running',
  '老化测试进行中，各项指标正常',
  at.start_time + (generate_series || ' hours')::INTERVAL
FROM aging_tests at
CROSS JOIN generate_series(0, 23, 6)
WHERE at.test_no = 'AGING-DEMO-FR3-DEMO-004';

-- ============================================================
-- 17. 最终测试：final_tests
-- ============================================================

-- FR3 最终测试记录
INSERT INTO final_tests (
  test_no, finished_product_sn, product_model_id, test_date,
  tester_id, test_result, test_items, defect_description,
  tenant_id, factory_id, created_at, updated_at
)
SELECT
  'FT-DEMO-' || fut.finished_product_sn,
  fut.finished_product_sn,
  fut.product_model_id,
  (fut.assembly_completed_at + INTERVAL '50 hours')::DATE,
  fut.binding_operator_id,
  CASE 
    WHEN fut.final_test_status = 'passed' THEN 'pass'
    WHEN fut.final_test_status = 'failed' THEN 'fail'
    ELSE 'pending'
  END,
  jsonb_build_object(
    'motion_test', CASE WHEN fut.final_test_status = 'passed' THEN 'pass' ELSE 'pending' END,
    'accuracy_test', CASE WHEN fut.final_test_status = 'passed' THEN 'pass' ELSE 'pending' END,
    'load_test', CASE WHEN fut.final_test_status = 'passed' THEN 'pass' ELSE 'pending' END,
    'safety_test', CASE WHEN fut.final_test_status = 'passed' THEN 'pass' ELSE 'pending' END
  ),
  NULL,
  'JP',
  'JP-MICROTEC',
  fut.assembly_completed_at + INTERVAL '50 hours',
  fut.assembly_completed_at + INTERVAL '50 hours'
FROM finished_unit_traceability fut
WHERE (fut.finished_product_sn LIKE 'FR3-DEMO-%' OR fut.finished_product_sn LIKE 'FR5-DEMO-%')
  AND fut.aging_status = 'passed';

-- ============================================================
-- 18. QA 放行：qa_releases
-- ============================================================

-- FR3 QA 放行记录
INSERT INTO qa_releases (
  release_no, finished_product_sn, product_model_id, release_date,
  qa_inspector_id, release_status, inspection_items, notes,
  tenant_id, factory_id, created_at, updated_at
)
SELECT
  'QA-DEMO-' || fut.finished_product_sn,
  fut.finished_product_sn,
  fut.product_model_id,
  (fut.assembly_completed_at + INTERVAL '51 hours')::DATE,
  fut.binding_operator_id,
  fut.qa_release_status,
  jsonb_build_object(
    'appearance_check', 'pass',
    'function_check', 'pass',
    'documentation_check', 'pass',
    'packaging_check', 'pass'
  ),
  'QA 放行检查通过',
  'JP',
  'JP-MICROTEC',
  fut.assembly_completed_at + INTERVAL '51 hours',
  fut.assembly_completed_at + INTERVAL '51 hours'
FROM finished_unit_traceability fut
WHERE (fut.finished_product_sn LIKE 'FR3-DEMO-%' OR fut.finished_product_sn LIKE 'FR5-DEMO-%')
  AND fut.qa_release_status = 'approved';

-- ============================================================
-- 19. 出货：shipments
-- ============================================================

-- FR3 出货记录
INSERT INTO shipments (
  shipment_no, finished_product_sn, product_model_id, shipment_date,
  carrier, tracking_no, destination, status, notes,
  tenant_id, factory_id, created_by, created_at, updated_at
)
SELECT
  'SHP-DEMO-' || fut.finished_product_sn,
  fut.finished_product_sn,
  fut.product_model_id,
  (fut.assembly_completed_at + INTERVAL '52 hours')::DATE,
  'DHL Express',
  'DHL-' || fut.finished_product_sn,
  '日本客户现场',
  fut.shipment_status,
  '出货至客户现场',
  'JP',
  'JP-MICROTEC',
  fut.binding_operator_id,
  fut.assembly_completed_at + INTERVAL '52 hours',
  fut.assembly_completed_at + INTERVAL '52 hours'
FROM finished_unit_traceability fut
WHERE (fut.finished_product_sn LIKE 'FR3-DEMO-%' OR fut.finished_product_sn LIKE 'FR5-DEMO-%')
  AND fut.shipment_status IN ('ready', 'shipped');

-- ============================================================
-- Demo 数据导入完成
-- ============================================================
