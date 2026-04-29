-- 插入测试用的来料数据（用于组装测试）

-- 1. 创建测试用的收货记录
INSERT INTO receiving_records (
  id, receiving_code, shipping_id, receiving_date, status, tenant_id, 
  received_packages, received_weight, created_at
)
VALUES 
  (100, 'RCV-TEST-ASSEMBLY-001', 7, '2026-04-20', 'completed', 'CN', 3, 10.5, NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. 插入控制箱来料（3个）
INSERT INTO receiving_record_items (
  id, receiving_id, line_no, part_no, part_name, part_type,
  batch_no, serial_number, expected_qty, received_qty, variance_type,
  unit, on_hand_qty, available_qty, reserved_qty, consumed_qty, blocked_qty, created_at
)
VALUES 
  (1001, 100, 1, 'CTRL-BOX-001', '控制箱', 'control_box', 'BATCH-CB-001', 'CB-SN-001', 1, 1, 'matched', 'pcs', 1, 1, 0, 0, 0, NOW()),
  (1002, 100, 2, 'CTRL-BOX-001', '控制箱', 'control_box', 'BATCH-CB-001', 'CB-SN-002', 1, 1, 'matched', 'pcs', 1, 1, 0, 0, 0, NOW()),
  (1003, 100, 3, 'CTRL-BOX-001', '控制箱', 'control_box', 'BATCH-CB-001', 'CB-SN-003', 1, 1, 'matched', 'pcs', 1, 1, 0, 0, 0, NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. 插入示教器来料（3个）
INSERT INTO receiving_record_items (
  id, receiving_id, line_no, part_no, part_name, part_type,
  batch_no, serial_number, expected_qty, received_qty, variance_type,
  unit, on_hand_qty, available_qty, reserved_qty, consumed_qty, blocked_qty, created_at
)
VALUES 
  (1004, 100, 4, 'TEACH-PEND-001', '示教器', 'teaching_pendant', 'BATCH-TP-001', 'TP-SN-001', 1, 1, 'matched', 'pcs', 1, 1, 0, 0, 0, NOW()),
  (1005, 100, 5, 'TEACH-PEND-001', '示教器', 'teaching_pendant', 'BATCH-TP-001', 'TP-SN-002', 1, 1, 'matched', 'pcs', 1, 1, 0, 0, 0, NOW()),
  (1006, 100, 6, 'TEACH-PEND-001', '示教器', 'teaching_pendant', 'BATCH-TP-001', 'TP-SN-003', 1, 1, 'matched', 'pcs', 1, 1, 0, 0, 0, NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. 插入主板来料（3个）
INSERT INTO receiving_record_items (
  id, receiving_id, line_no, part_no, part_name, part_type,
  batch_no, serial_number, expected_qty, received_qty, variance_type,
  unit, on_hand_qty, available_qty, reserved_qty, consumed_qty, blocked_qty, created_at
)
VALUES 
  (1007, 100, 7, 'MAIN-BOARD-001', '主板', 'main_board', 'BATCH-MB-001', 'MB-SN-001', 1, 1, 'matched', 'pcs', 1, 1, 0, 0, 0, NOW()),
  (1008, 100, 8, 'MAIN-BOARD-001', '主板', 'main_board', 'BATCH-MB-001', 'MB-SN-002', 1, 1, 'matched', 'pcs', 1, 1, 0, 0, 0, NOW()),
  (1009, 100, 9, 'MAIN-BOARD-001', '主板', 'main_board', 'BATCH-MB-001', 'MB-SN-003', 1, 1, 'matched', 'pcs', 1, 1, 0, 0, 0, NOW())
ON CONFLICT (id) DO NOTHING;

-- 5. 为每个物料创建IQC检验记录（全部OK）
INSERT INTO iqc_inspections (
  id, inspection_no, receiving_id, receiving_item_id, part_no, part_name, batch_no,
  inspection_type, sample_size, inspected_qty, result, inspected_at, created_at
)
VALUES 
  (1001, 'IQC-TEST-001', 100, 1001, 'CTRL-BOX-001', '控制箱', 'BATCH-CB-001', 'sampling', 1, 1, 'OK', NOW(), NOW()),
  (1002, 'IQC-TEST-002', 100, 1002, 'CTRL-BOX-001', '控制箱', 'BATCH-CB-001', 'sampling', 1, 1, 'OK', NOW(), NOW()),
  (1003, 'IQC-TEST-003', 100, 1003, 'CTRL-BOX-001', '控制箱', 'BATCH-CB-001', 'sampling', 1, 1, 'OK', NOW(), NOW()),
  (1004, 'IQC-TEST-004', 100, 1004, 'TEACH-PEND-001', '示教器', 'BATCH-TP-001', 'sampling', 1, 1, 'OK', NOW(), NOW()),
  (1005, 'IQC-TEST-005', 100, 1005, 'TEACH-PEND-001', '示教器', 'BATCH-TP-001', 'sampling', 1, 1, 'OK', NOW(), NOW()),
  (1006, 'IQC-TEST-006', 100, 1006, 'TEACH-PEND-001', '示教器', 'BATCH-TP-001', 'sampling', 1, 1, 'OK', NOW(), NOW()),
  (1007, 'IQC-TEST-007', 100, 1007, 'MAIN-BOARD-001', '主板', 'BATCH-MB-001', 'sampling', 1, 1, 'OK', NOW(), NOW()),
  (1008, 'IQC-TEST-008', 100, 1008, 'MAIN-BOARD-001', '主板', 'BATCH-MB-001', 'sampling', 1, 1, 'OK', NOW(), NOW()),
  (1009, 'IQC-TEST-009', 100, 1009, 'MAIN-BOARD-001', '主板', 'BATCH-MB-001', 'sampling', 1, 1, 'OK', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;