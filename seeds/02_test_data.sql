-- =====================================================
-- 测试数据脚本 - 完整链路测试
-- 版本: v1.0
-- 日期: 2026-04-19
-- 说明: 用于验证完整业务链路
-- =====================================================

-- =====================================================
-- 第一部分：测试用户
-- =====================================================

-- 插入测试用户（如果不存在）
-- 注意：实际环境中，用户应该通过注册流程创建

-- 中国工厂管理员
INSERT INTO profiles (id, username, full_name, email, role, tenant_id, language_preference)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'cn_admin', '中国工厂管理员', 'cn_admin@test.com', 'cn_factory_manager', 'CN', 'zh-CN')
ON CONFLICT (id) DO NOTHING;

-- 中国生产人员
INSERT INTO profiles (id, username, full_name, email, role, tenant_id, language_preference)
VALUES 
  ('22222222-2222-2222-2222-222222222222', 'cn_worker', '中国生产人员', 'cn_worker@test.com', 'cn_production_operator', 'CN', 'zh-CN')
ON CONFLICT (id) DO NOTHING;

-- 日本工厂管理员
INSERT INTO profiles (id, username, full_name, email, role, tenant_id, language_preference)
VALUES 
  ('33333333-3333-3333-3333-333333333333', 'jp_admin', '日本工厂管理员', 'jp_admin@test.com', 'jp_factory_manager', 'JP', 'ja-JP')
ON CONFLICT (id) DO NOTHING;

-- 日本组装人员
INSERT INTO profiles (id, username, full_name, email, role, tenant_id, language_preference)
VALUES 
  ('44444444-4444-4444-4444-444444444444', 'jp_assembler', '日本组装人员', 'jp_assembler@test.com', 'jp_assembly_operator', 'JP', 'ja-JP')
ON CONFLICT (id) DO NOTHING;

-- 日本质检人员
INSERT INTO profiles (id, username, full_name, email, role, tenant_id, language_preference)
VALUES 
  ('55555555-5555-5555-5555-555555555555', 'jp_qa', '日本质检人员', 'jp_qa@test.com', 'jp_qa_inspector', 'JP', 'ja-JP')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 第二部分：生产计划
-- =====================================================

-- 插入生产计划（已批准）
INSERT INTO production_plans (
  plan_code, 
  plan_type, 
  plan_period_start, 
  plan_period_end, 
  production_quantity, 
  delivery_date, 
  product_model_id, 
  factory_id, 
  responsible_person_id, 
  status, 
  current_version, 
  tenant_id, 
  created_by,
  approved_by,
  approved_at
)
SELECT 
  'PLAN-2026-04-001',
  'monthly',
  '2026-04-01'::date,
  '2026-04-30'::date,
  10,
  '2026-05-15'::date,
  pm.id,
  'CN-FACTORY',
  '11111111-1111-1111-1111-111111111111'::uuid,
  'approved',
  1,
  'CN',
  '11111111-1111-1111-1111-111111111111'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid,
  NOW() - INTERVAL '7 days'
FROM product_models pm
WHERE pm.model_code = 'FAIRINO-FR5'
ON CONFLICT (plan_code) DO NOTHING;

-- =====================================================
-- 第三部分：生产订单
-- =====================================================

-- 插入生产订单
INSERT INTO production_orders (
  order_code,
  plan_id,
  product_model_id,
  order_quantity,
  completed_quantity,
  start_date,
  end_date,
  priority,
  status,
  tenant_id,
  created_by
)
SELECT 
  'ORDER-2026-04-001',
  pp.id,
  pp.product_model_id,
  10,
  0,
  '2026-04-01'::date,
  '2026-04-30'::date,
  'high',
  'in_progress',
  'CN',
  '11111111-1111-1111-1111-111111111111'::uuid
FROM production_plans pp
WHERE pp.plan_code = 'PLAN-2026-04-001'
ON CONFLICT (order_code) DO NOTHING;

-- =====================================================
-- 第四部分：ASN 发货单
-- =====================================================

-- 插入 ASN 发货单
INSERT INTO asn_shipments (
  shipment_no,
  tenant_id,
  factory_id,
  destination_factory_id,
  product_model_id,
  production_order_id,
  shipment_date,
  eta_date,
  carrier,
  tracking_no,
  status,
  total_boxes,
  total_pallets,
  remarks,
  created_by
)
SELECT 
  'ASN-2026-04-001',
  'CN',
  'CN-FACTORY',
  'JP-FACTORY',
  po.product_model_id,
  po.id,
  NOW() - INTERVAL '5 days',
  NOW() + INTERVAL '2 days',
  '顺丰速运',
  'SF1234567890',
  'shipped',
  5,
  1,
  '测试发货单',
  '11111111-1111-1111-1111-111111111111'::uuid
FROM production_orders po
WHERE po.order_code = 'ORDER-2026-04-001'
ON CONFLICT (shipment_no) DO NOTHING;

-- 插入 ASN 发货明细（正常件）
INSERT INTO asn_shipment_items (
  shipment_id,
  line_no,
  part_no,
  part_name,
  part_category,
  part_type,
  batch_no,
  box_no,
  pallet_no,
  shipped_qty,
  unit,
  remarks
)
SELECT 
  asn.id,
  1,
  'ROBOT-BODY-FR5-001',
  '机器人本体',
  '核心部件',
  'robot_body',
  'BATCH-2026-04-001',
  'BOX-001',
  'PALLET-001',
  10,
  'PCS',
  '正常发货'
FROM asn_shipments asn
WHERE asn.shipment_no = 'ASN-2026-04-001'
ON CONFLICT DO NOTHING;

-- 插入 ASN 发货明细（控制箱）
INSERT INTO asn_shipment_items (
  shipment_id,
  line_no,
  part_no,
  part_name,
  part_category,
  part_type,
  batch_no,
  box_no,
  pallet_no,
  shipped_qty,
  unit,
  remarks
)
SELECT 
  asn.id,
  2,
  'CONTROL-BOX-FR5-001',
  '控制箱',
  '核心部件',
  'control_box',
  'BATCH-2026-04-002',
  'BOX-002',
  'PALLET-001',
  10,
  'PCS',
  '正常发货'
FROM asn_shipments asn
WHERE asn.shipment_no = 'ASN-2026-04-001'
ON CONFLICT DO NOTHING;

-- 插入 ASN 发货明细（示教器）
INSERT INTO asn_shipment_items (
  shipment_id,
  line_no,
  part_no,
  part_name,
  part_category,
  part_type,
  batch_no,
  box_no,
  pallet_no,
  shipped_qty,
  unit,
  remarks
)
SELECT 
  asn.id,
  3,
  'TEACHING-PENDANT-FR5-001',
  '示教器',
  '核心部件',
  'teaching_pendant',
  'BATCH-2026-04-003',
  'BOX-003',
  'PALLET-001',
  10,
  'PCS',
  '正常发货'
FROM asn_shipments asn
WHERE asn.shipment_no = 'ASN-2026-04-001'
ON CONFLICT DO NOTHING;

-- 插入 ASN 发货明细（电缆）
INSERT INTO asn_shipment_items (
  shipment_id,
  line_no,
  part_no,
  part_name,
  part_category,
  part_type,
  batch_no,
  box_no,
  pallet_no,
  shipped_qty,
  unit,
  remarks
)
SELECT 
  asn.id,
  4,
  'CABLE-FR5-001',
  '电缆',
  '核心部件',
  'cable',
  'BATCH-2026-04-004',
  'BOX-004',
  'PALLET-001',
  10,
  'PCS',
  '正常发货'
FROM asn_shipments asn
WHERE asn.shipment_no = 'ASN-2026-04-001'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 第五部分：收货记录
-- =====================================================

-- 插入收货记录
INSERT INTO receiving_records (
  receiving_no,
  receiving_code,
  shipment_id,
  receiving_date,
  receiver_id,
  received_packages,
  received_weight,
  warehouse_location,
  status,
  notes,
  tenant_id,
  created_by
)
SELECT 
  'RCV-2026-04-001',
  'RCV-2026-04-001',
  asn.id,
  NOW() - INTERVAL '3 days',
  '33333333-3333-3333-3333-333333333333'::uuid,
  5,
  500.00,
  'JP-WH-A-01',
  'completed',
  '测试收货',
  'JP',
  '33333333-3333-3333-3333-333333333333'::uuid
FROM asn_shipments asn
WHERE asn.shipment_no = 'ASN-2026-04-001'
ON CONFLICT (receiving_no) DO NOTHING;

-- 插入收货明细（正常）
INSERT INTO receiving_record_items (
  receiving_id,
  shipment_item_id,
  line_no,
  part_no,
  part_name,
  part_type,
  batch_no,
  serial_number,
  box_no,
  expected_qty,
  received_qty,
  unit,
  remarks
)
SELECT 
  rcv.id,
  asi.id,
  1,
  'ROBOT-BODY-FR5-001',
  '机器人本体',
  'robot_body',
  'BATCH-2026-04-001',
  NULL,
  'BOX-001',
  10,
  10,
  'PCS',
  '正常收货'
FROM receiving_records rcv
JOIN asn_shipments asn ON asn.id = rcv.shipment_id
JOIN asn_shipment_items asi ON asi.shipment_id = asn.id AND asi.line_no = 1
WHERE rcv.receiving_no = 'RCV-2026-04-001'
ON CONFLICT DO NOTHING;

-- 插入收货明细（短缺）
INSERT INTO receiving_record_items (
  receiving_id,
  shipment_item_id,
  line_no,
  part_no,
  part_name,
  part_type,
  batch_no,
  serial_number,
  box_no,
  expected_qty,
  received_qty,
  unit,
  remarks
)
SELECT 
  rcv.id,
  asi.id,
  2,
  'CONTROL-BOX-FR5-001',
  '控制箱',
  'control_box',
  'BATCH-2026-04-002',
  NULL,
  'BOX-002',
  10,
  8,
  'PCS',
  '短缺 2 件'
FROM receiving_records rcv
JOIN asn_shipments asn ON asn.id = rcv.shipment_id
JOIN asn_shipment_items asi ON asi.shipment_id = asn.id AND asi.line_no = 2
WHERE rcv.receiving_no = 'RCV-2026-04-001'
ON CONFLICT DO NOTHING;

-- 插入收货明细（正常）
INSERT INTO receiving_record_items (
  receiving_id,
  shipment_item_id,
  line_no,
  part_no,
  part_name,
  part_type,
  batch_no,
  serial_number,
  box_no,
  expected_qty,
  received_qty,
  unit,
  remarks
)
SELECT 
  rcv.id,
  asi.id,
  3,
  'TEACHING-PENDANT-FR5-001',
  '示教器',
  'teaching_pendant',
  'BATCH-2026-04-003',
  NULL,
  'BOX-003',
  10,
  10,
  'PCS',
  '正常收货'
FROM receiving_records rcv
JOIN asn_shipments asn ON asn.id = rcv.shipment_id
JOIN asn_shipment_items asi ON asi.shipment_id = asn.id AND asi.line_no = 3
WHERE rcv.receiving_no = 'RCV-2026-04-001'
ON CONFLICT DO NOTHING;

-- 插入收货明细（正常）
INSERT INTO receiving_record_items (
  receiving_id,
  shipment_item_id,
  line_no,
  part_no,
  part_name,
  part_type,
  batch_no,
  serial_number,
  box_no,
  expected_qty,
  received_qty,
  unit,
  remarks
)
SELECT 
  rcv.id,
  asi.id,
  4,
  'CABLE-FR5-001',
  '电缆',
  'cable',
  'BATCH-2026-04-004',
  NULL,
  'BOX-004',
  10,
  10,
  'PCS',
  '正常收货'
FROM receiving_records rcv
JOIN asn_shipments asn ON asn.id = rcv.shipment_id
JOIN asn_shipment_items asi ON asi.shipment_id = asn.id AND asi.line_no = 4
WHERE rcv.receiving_no = 'RCV-2026-04-001'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 第六部分：IQC 检验记录
-- =====================================================

-- 插入 IQC 检验记录（通过）
INSERT INTO iqc_inspections (
  inspection_no,
  receiving_id,
  receiving_item_id,
  part_no,
  part_name,
  batch_no,
  inspection_type,
  sample_size,
  inspected_qty,
  result,
  defect_code,
  defect_description,
  inspected_at,
  inspected_by,
  remarks,
  tenant_id,
  created_by
)
SELECT 
  'IQC-2026-04-001',
  rcv.id,
  rri.id,
  'ROBOT-BODY-FR5-001',
  '机器人本体',
  'BATCH-2026-04-001',
  'full',
  10,
  10,
  'OK',
  NULL,
  NULL,
  NOW() - INTERVAL '2 days',
  '55555555-5555-5555-5555-555555555555'::uuid,
  '检验通过',
  'JP',
  '55555555-5555-5555-5555-555555555555'::uuid
FROM receiving_records rcv
JOIN receiving_record_items rri ON rri.receiving_id = rcv.id AND rri.line_no = 1
WHERE rcv.receiving_no = 'RCV-2026-04-001'
ON CONFLICT (inspection_no) DO NOTHING;

-- 插入 IQC 检验记录（NG - 用于测试阻断）
INSERT INTO iqc_inspections (
  inspection_no,
  receiving_id,
  receiving_item_id,
  part_no,
  part_name,
  batch_no,
  inspection_type,
  sample_size,
  inspected_qty,
  result,
  defect_code,
  defect_description,
  inspected_at,
  inspected_by,
  remarks,
  tenant_id,
  created_by
)
SELECT 
  'IQC-2026-04-002',
  rcv.id,
  rri.id,
  'CONTROL-BOX-FR5-001',
  '控制箱',
  'BATCH-2026-04-002',
  'full',
  8,
  8,
  'NG',
  'DEFECT-001',
  '外观划痕严重',
  NOW() - INTERVAL '2 days',
  '55555555-5555-5555-5555-555555555555'::uuid,
  '检验不通过',
  'JP',
  '55555555-5555-5555-5555-555555555555'::uuid
FROM receiving_records rcv
JOIN receiving_record_items rri ON rri.receiving_id = rcv.id AND rri.line_no = 2
WHERE rcv.receiving_no = 'RCV-2026-04-001'
ON CONFLICT (inspection_no) DO NOTHING;

-- 插入 IQC 检验记录（通过）
INSERT INTO iqc_inspections (
  inspection_no,
  receiving_id,
  receiving_item_id,
  part_no,
  part_name,
  batch_no,
  inspection_type,
  sample_size,
  inspected_qty,
  result,
  defect_code,
  defect_description,
  inspected_at,
  inspected_by,
  remarks,
  tenant_id,
  created_by
)
SELECT 
  'IQC-2026-04-003',
  rcv.id,
  rri.id,
  'TEACHING-PENDANT-FR5-001',
  '示教器',
  'BATCH-2026-04-003',
  'full',
  10,
  10,
  'OK',
  NULL,
  NULL,
  NOW() - INTERVAL '2 days',
  '55555555-5555-5555-5555-555555555555'::uuid,
  '检验通过',
  'JP',
  '55555555-5555-5555-5555-555555555555'::uuid
FROM receiving_records rcv
JOIN receiving_record_items rri ON rri.receiving_id = rcv.id AND rri.line_no = 3
WHERE rcv.receiving_no = 'RCV-2026-04-001'
ON CONFLICT (inspection_no) DO NOTHING;

-- 插入 IQC 检验记录（通过）
INSERT INTO iqc_inspections (
  inspection_no,
  receiving_id,
  receiving_item_id,
  part_no,
  part_name,
  batch_no,
  inspection_type,
  sample_size,
  inspected_qty,
  result,
  defect_code,
  defect_description,
  inspected_at,
  inspected_by,
  remarks,
  tenant_id,
  created_by
)
SELECT 
  'IQC-2026-04-004',
  rcv.id,
  rri.id,
  'CABLE-FR5-001',
  '电缆',
  'BATCH-2026-04-004',
  'full',
  10,
  10,
  'OK',
  NULL,
  NULL,
  NOW() - INTERVAL '2 days',
  '55555555-5555-5555-5555-555555555555'::uuid,
  '检验通过',
  'JP',
  '55555555-5555-5555-5555-555555555555'::uuid
FROM receiving_records rcv
JOIN receiving_record_items rri ON rri.receiving_id = rcv.id AND rri.line_no = 4
WHERE rcv.receiving_no = 'RCV-2026-04-001'
ON CONFLICT (inspection_no) DO NOTHING;

-- =====================================================
-- 第七部分：来料处置记录
-- =====================================================

-- 插入来料处置记录（NG 件的特采申请）
INSERT INTO incoming_material_dispositions (
  disposition_no,
  source_type,
  source_id,
  receiving_id,
  part_no,
  part_name,
  batch_no,
  affected_qty,
  disposition_type,
  disposition_status,
  approve_required,
  block_reason,
  action_plan,
  responsible_party,
  due_date,
  remarks,
  tenant_id,
  created_by
)
SELECT 
  'DISP-2026-04-001',
  'iqc_inspection',
  iqc.id,
  rcv.id,
  'CONTROL-BOX-FR5-001',
  '控制箱',
  'BATCH-2026-04-002',
  8,
  'special_approval',
  'pending',
  true,
  '外观划痕严重',
  '申请特采使用',
  'CN-FACTORY',
  NOW() + INTERVAL '7 days',
  '等待特采审批',
  'JP',
  '55555555-5555-5555-5555-555555555555'::uuid
FROM iqc_inspections iqc
JOIN receiving_records rcv ON rcv.id = iqc.receiving_id
WHERE iqc.inspection_no = 'IQC-2026-04-002'
ON CONFLICT (disposition_no) DO NOTHING;

-- =====================================================
-- 输出初始化结果
-- =====================================================

DO $$
DECLARE
  user_count INTEGER;
  plan_count INTEGER;
  order_count INTEGER;
  asn_count INTEGER;
  receiving_count INTEGER;
  iqc_count INTEGER;
  disp_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555'
  );
  SELECT COUNT(*) INTO plan_count FROM production_plans WHERE plan_code = 'PLAN-2026-04-001';
  SELECT COUNT(*) INTO order_count FROM production_orders WHERE order_code = 'ORDER-2026-04-001';
  SELECT COUNT(*) INTO asn_count FROM asn_shipments WHERE shipment_no = 'ASN-2026-04-001';
  SELECT COUNT(*) INTO receiving_count FROM receiving_records WHERE receiving_no = 'RCV-2026-04-001';
  SELECT COUNT(*) INTO iqc_count FROM iqc_inspections WHERE inspection_no LIKE 'IQC-2026-04-%';
  SELECT COUNT(*) INTO disp_count FROM incoming_material_dispositions WHERE disposition_no = 'DISP-2026-04-001';
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE '测试数据初始化完成';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '测试用户数量: %', user_count;
  RAISE NOTICE '生产计划数量: %', plan_count;
  RAISE NOTICE '生产订单数量: %', order_count;
  RAISE NOTICE 'ASN 发货单数量: %', asn_count;
  RAISE NOTICE '收货记录数量: %', receiving_count;
  RAISE NOTICE 'IQC 检验数量: %', iqc_count;
  RAISE NOTICE '来料处置数量: %', disp_count;
  RAISE NOTICE '==============================================';
  RAISE NOTICE '注意：控制箱（CONTROL-BOX-FR5-001）IQC 结果为 NG';
  RAISE NOTICE '注意：已创建特采申请（DISP-2026-04-001），状态为 pending';
  RAISE NOTICE '注意：该批次物料应该被阻断，无法用于组装';
  RAISE NOTICE '==============================================';
END $$;
