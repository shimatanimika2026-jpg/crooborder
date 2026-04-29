
-- ============================================
-- UAT演示数据 - 完整组装链条（正确状态版）
-- ============================================

-- 步骤1: 创建ASN明细（3种物料）
INSERT INTO asn_shipment_items (shipment_id, line_no, part_no, part_name, part_category, batch_no, box_no, shipped_qty, unit, remarks, created_at)
VALUES 
(14, 1, 'CB-FR3-V2.1', '控制箱（FR3专用）', 'control_box', 'CB-20260415-A01', 'BOX-001', 50, 'pcs', 'UAT演示 - 控制箱物料', NOW() - INTERVAL '2 days'),
(14, 2, 'TP-FR3-V1.5', '示教器（FR3专用）', 'teaching_pendant', 'TP-20260415-B02', 'BOX-002', 50, 'pcs', 'UAT演示 - 示教器物料', NOW() - INTERVAL '2 days'),
(14, 3, 'MB-FR3-V3.0', '主控板（FR3专用）', 'main_board', 'MB-20260415-C03', 'BOX-003', 50, 'pcs', 'UAT演示 - 主控板物料', NOW() - INTERVAL '2 days');

-- 步骤2: 创建收货明细（3种物料）
INSERT INTO receiving_record_items (receiving_id, shipment_item_id, line_no, part_no, part_name, batch_no, box_no, expected_qty, received_qty, unit, on_hand_qty, available_qty, reserved_qty, consumed_qty, blocked_qty, remarks, created_at)
VALUES 
(31, (SELECT id FROM asn_shipment_items WHERE shipment_id = 14 AND line_no = 1), 1, 'CB-FR3-V2.1', '控制箱（FR3专用）', 'CB-20260415-A01', 'BOX-001', 50, 50, 'pcs', 50, 49, 0, 1, 0, 'UAT演示 - 控制箱收货明细，IQC已通过', NOW()),
(31, (SELECT id FROM asn_shipment_items WHERE shipment_id = 14 AND line_no = 2), 2, 'TP-FR3-V1.5', '示教器（FR3专用）', 'TP-20260415-B02', 'BOX-002', 50, 50, 'pcs', 50, 49, 0, 1, 0, 'UAT演示 - 示教器收货明细，IQC已通过', NOW()),
(31, (SELECT id FROM asn_shipment_items WHERE shipment_id = 14 AND line_no = 3), 3, 'MB-FR3-V3.0', '主控板（FR3专用）', 'MB-20260415-C03', 'BOX-003', 50, 50, 'pcs', 50, 49, 0, 1, 0, 'UAT演示 - 主控板收货明细，IQC状态HOLD（待特采）', NOW());

-- 步骤3: 创建物料映射记录（3种物料）
INSERT INTO assembly_part_material_mapping (robot_sn, part_type, part_no, batch_no, part_sn, installed_at, installed_by, created_at, is_consumed, consumed_at, receiving_record_item_id)
VALUES 
('UAT-UNIT-20260420-001', 'control_box', 'CB-FR3-V2.1', 'CB-20260415-A01', 'CB-FR3-V2.1-SN-20260420-001', NOW(), '2d54ca55-312b-439e-a441-2e2bc92a37a5', NOW(), true, NOW(), (SELECT id FROM receiving_record_items WHERE receiving_id = 31 AND line_no = 1)),
('UAT-UNIT-20260420-001', 'teaching_pendant', 'TP-FR3-V1.5', 'TP-20260415-B02', 'TP-FR3-V1.5-SN-20260420-001', NOW(), '2d54ca55-312b-439e-a441-2e2bc92a37a5', NOW(), true, NOW(), (SELECT id FROM receiving_record_items WHERE receiving_id = 31 AND line_no = 2)),
('UAT-UNIT-20260420-001', 'main_board', 'MB-FR3-V3.0', 'MB-20260415-C03', 'MB-FR3-V3.0-SN-20260420-001', NOW(), '2d54ca55-312b-439e-a441-2e2bc92a37a5', NOW(), true, NOW(), (SELECT id FROM receiving_record_items WHERE receiving_id = 31 AND line_no = 3));

-- 步骤4: 创建整机记录（使用running状态）
INSERT INTO finished_unit_traceability (
  finished_product_sn, product_model_id, control_box_sn, teaching_pendant_sn, main_board_sn,
  motor_sn_j1, motor_sn_j2, motor_sn_j3, motor_sn_j4, motor_sn_j5, motor_sn_j6,
  firmware_version, software_version, binding_time, binding_operator_id,
  aging_required, aging_status, final_test_status, qa_release_status, shipment_status,
  tenant_id, factory_id
) VALUES (
  'UAT-UNIT-20260420-001', 1, 'CB-FR3-V2.1-SN-20260420-001', 'TP-FR3-V1.5-SN-20260420-001', 'MB-FR3-V3.0-SN-20260420-001',
  'MOTOR-J1-20260420-001', 'MOTOR-J2-20260420-001', 'MOTOR-J3-20260420-001', 'MOTOR-J4-20260420-001', 'MOTOR-J5-20260420-001', 'MOTOR-J6-20260420-001',
  'FW-FR3-V2.5.1', 'SW-FR3-V3.2.0', NOW(), '2d54ca55-312b-439e-a441-2e2bc92a37a5',
  true, 'running', 'pending', 'pending', 'pending',
  'JP', 'JP_FACTORY'
);

-- 步骤5: 创建老化测试记录
INSERT INTO aging_tests (
  test_code, tenant_id, factory_id, finished_product_sn, product_model_id,
  control_box_sn, teaching_pendant_sn, aging_station_id, aging_program_version,
  started_at, planned_end_at, required_duration_hours, status, interruption_count, operator_id
) VALUES (
  'AGING-UAT-20260420-001', 'JP', 'JP_FACTORY', 'UAT-UNIT-20260420-001', 1,
  'CB-FR3-V2.1-SN-20260420-001', 'TP-FR3-V1.5-SN-20260420-001', 1, 'AGING-PROG-FR3-V1.0',
  NOW(), NOW() + INTERVAL '48 hours', 48, 'running', 0, '2d54ca55-312b-439e-a441-2e2bc92a37a5'
);
