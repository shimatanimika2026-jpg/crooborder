
-- 清理旧测试数据
DELETE FROM receiving_record_items WHERE receiving_id IN (SELECT id FROM receiving_records WHERE receiving_no LIKE 'RCV-TEST-%');
DELETE FROM receiving_records WHERE receiving_no LIKE 'RCV-TEST-%';
DELETE FROM iqc_inspections WHERE inspection_no LIKE 'IQC-TEST-%';
DELETE FROM incoming_material_dispositions WHERE disposition_no LIKE 'DISP-TEST-%';

-- 场景1: 正常到货 → IQC OK → 可上线
INSERT INTO receiving_records (receiving_no, receiving_code, tenant_id, factory_id, receiving_date, receiver_id, received_packages, status, has_variance, variance_resolved, iqc_required, iqc_completed, notes)
VALUES
  ('RCV-TEST-001', 'RCV-TEST-001', 'JP', 'JP-MICROTEC', CURRENT_DATE, (SELECT id FROM auth.users LIMIT 1), 10, 'completed', FALSE, TRUE, TRUE, TRUE, '场景1测试: 正常到货,IQC OK')
ON CONFLICT (receiving_no) DO NOTHING;

INSERT INTO receiving_record_items (receiving_id, shipment_item_id, line_no, part_no, part_name, batch_no, box_no, expected_qty, received_qty, variance_type, unit)
SELECT 
  r.id, asi.id, asi.line_no, asi.part_no, asi.part_name, asi.batch_no, asi.box_no, asi.shipped_qty, asi.shipped_qty, 'matched', asi.unit
FROM receiving_records r
CROSS JOIN asn_shipments s
JOIN asn_shipment_items asi ON asi.shipment_id = s.id
WHERE r.receiving_no = 'RCV-TEST-001' AND s.shipment_no = 'ASN-2026-001';

INSERT INTO iqc_inspections (inspection_no, receiving_id, receiving_item_id, part_no, part_name, batch_no, inspection_type, sample_size, inspected_qty, result, inspected_at, remarks)
SELECT 
  'IQC-TEST-001-' || rri.line_no, r.id, rri.id, rri.part_no, rri.part_name, rri.batch_no, 'sampling', 2, 2, 'OK', NOW(), '外观检查合格,功能测试正常'
FROM receiving_records r
JOIN receiving_record_items rri ON rri.receiving_id = r.id
WHERE r.receiving_no = 'RCV-TEST-001'
ON CONFLICT (inspection_no) DO NOTHING;

-- 场景2: 短少 → 生成异常 → 阻断上线
INSERT INTO receiving_records (receiving_no, receiving_code, tenant_id, factory_id, receiving_date, receiver_id, received_packages, status, has_variance, variance_resolved, iqc_required, iqc_completed, notes)
VALUES
  ('RCV-TEST-002', 'RCV-TEST-002', 'JP', 'JP-MICROTEC', CURRENT_DATE, (SELECT id FROM auth.users LIMIT 1), 8, 'variance_pending', TRUE, FALSE, TRUE, FALSE, '场景2测试: 收货短少,差异未闭环')
ON CONFLICT (receiving_no) DO NOTHING;

INSERT INTO receiving_record_items (receiving_id, shipment_item_id, line_no, part_no, part_name, batch_no, box_no, expected_qty, received_qty, variance_type, unit, remarks)
SELECT 
  r.id, asi.id, asi.line_no, asi.part_no, asi.part_name, asi.batch_no, asi.box_no, asi.shipped_qty,
  CASE WHEN asi.part_no = 'MAIN_BOARD_FR5' THEN 2 ELSE asi.shipped_qty END,
  CASE WHEN asi.part_no = 'MAIN_BOARD_FR5' THEN 'shortage' ELSE 'matched' END,
  asi.unit,
  CASE WHEN asi.part_no = 'MAIN_BOARD_FR5' THEN '实收2件,短少1件' ELSE NULL END
FROM receiving_records r
CROSS JOIN asn_shipments s
JOIN asn_shipment_items asi ON asi.shipment_id = s.id
WHERE r.receiving_no = 'RCV-TEST-002' AND s.shipment_no = 'ASN-2026-002';

INSERT INTO incoming_material_dispositions (disposition_no, source_type, source_id, receiving_id, part_no, part_name, batch_no, affected_qty, disposition_type, disposition_status, approve_required, block_reason, action_plan, responsible_party, due_date)
SELECT 
  'DISP-TEST-002', 'receiving_variance', rri.id, r.id, 'MAIN_BOARD_FR5', 'FR5主板', 'BATCH-MB-002', 1, 'return', 'pending', TRUE, '收货差异: 预期3PCS, 实收2PCS', '联系中国工厂确认发货数量,安排补发', 'CN-FAIRINO', CURRENT_DATE + INTERVAL '7 days'
FROM receiving_records r
JOIN receiving_record_items rri ON rri.receiving_id = r.id
WHERE r.receiving_no = 'RCV-TEST-002' AND rri.part_no = 'MAIN_BOARD_FR5'
ON CONFLICT (disposition_no) DO NOTHING;

-- 场景3: IQC NG → 特采审批 → 放行上线
INSERT INTO receiving_records (receiving_no, receiving_code, tenant_id, factory_id, receiving_date, receiver_id, received_packages, status, has_variance, variance_resolved, iqc_required, iqc_completed, notes)
VALUES
  ('RCV-TEST-003', 'RCV-TEST-003', 'JP', 'JP-MICROTEC', CURRENT_DATE, (SELECT id FROM auth.users LIMIT 1), 8, 'completed', FALSE, TRUE, TRUE, TRUE, '场景3测试: IQC NG,特采审批通过')
ON CONFLICT (receiving_no) DO NOTHING;

INSERT INTO receiving_record_items (receiving_id, shipment_item_id, line_no, part_no, part_name, batch_no, box_no, expected_qty, received_qty, variance_type, unit)
SELECT 
  r.id, asi.id, asi.line_no, asi.part_no, asi.part_name, asi.batch_no, asi.box_no, asi.shipped_qty, asi.shipped_qty, 'matched', asi.unit
FROM receiving_records r
CROSS JOIN asn_shipments s
JOIN asn_shipment_items asi ON asi.shipment_id = s.id
WHERE r.receiving_no = 'RCV-TEST-003' AND s.shipment_no = 'ASN-2026-002' AND asi.part_no = 'CABLE_SET_FR5';

INSERT INTO iqc_inspections (inspection_no, receiving_id, receiving_item_id, part_no, part_name, batch_no, inspection_type, sample_size, inspected_qty, result, defect_code, defect_description, inspected_at, remarks)
SELECT 
  'IQC-TEST-003', r.id, rri.id, 'CABLE_SET_FR5', 'FR5线缆套装', 'BATCH-CABLE-002', 'sampling', 3, 3, 'NG', 'DEFECT-001', '线缆接头松动,存在接触不良风险', NOW(), '需要特采审批'
FROM receiving_records r
JOIN receiving_record_items rri ON rri.receiving_id = r.id
WHERE r.receiving_no = 'RCV-TEST-003' AND rri.part_no = 'CABLE_SET_FR5'
ON CONFLICT (inspection_no) DO NOTHING;

INSERT INTO incoming_material_dispositions (disposition_no, source_type, source_id, receiving_id, part_no, part_name, batch_no, affected_qty, disposition_type, disposition_status, approve_required, approved_at, block_reason, action_plan, responsible_party, due_date, remarks)
SELECT 
  'DISP-TEST-003', 'iqc_ng', iqc.id, r.id, 'CABLE_SET_FR5', 'FR5线缆套装', 'BATCH-CABLE-002', 10, 'special_acceptance', 'approved', TRUE, NOW(), 'IQC检验不合格: 线缆接头松动', '评估风险后特采使用,加强后续检验', 'JP-MICROTEC', CURRENT_DATE + INTERVAL '3 days', '特采审批通过: 经评估风险可控,允许使用'
FROM receiving_records r
JOIN iqc_inspections iqc ON iqc.receiving_id = r.id
WHERE r.receiving_no = 'RCV-TEST-003' AND iqc.part_no = 'CABLE_SET_FR5'
ON CONFLICT (disposition_no) DO NOTHING;
