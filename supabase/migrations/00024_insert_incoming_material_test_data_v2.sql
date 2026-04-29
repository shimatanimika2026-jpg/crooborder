
-- 插入物流控制链测试数据（简化版）

-- 1. 插入ASN发货单测试数据
INSERT INTO asn_shipments (shipment_no, tenant_id, factory_id, destination_factory_id, product_model_id, shipment_date, eta_date, carrier, tracking_no, status, total_boxes, total_pallets, remarks)
VALUES
('ASN-2026-001', 'CN', 'CN-FAIRINO', 'JP-MICROTEC', 1, '2026-04-15', '2026-04-20', '顺丰速运', 'SF1234567890', 'arrived', 10, 2, '正常发货，包含FR3控制箱和示教器'),
('ASN-2026-002', 'CN', 'CN-FAIRINO', 'JP-MICROTEC', 2, '2026-04-16', '2026-04-21', 'DHL', 'DHL9876543210', 'arrived', 8, 1, '包含FR5主板和配件-有短少'),
('ASN-2026-003', 'CN', 'CN-FAIRINO', 'JP-MICROTEC', 1, '2026-04-17', '2026-04-22', '顺丰速运', 'SF5555666677', 'shipped', 5, 1, '紧急补货')
ON CONFLICT (shipment_no) DO NOTHING;

-- 2. 插入ASN发货明细
INSERT INTO asn_shipment_items (shipment_id, line_no, part_no, part_name, part_category, batch_no, box_no, shipped_qty, unit)
SELECT 
  s.id,
  1,
  'CONTROL_BOX_FR3',
  'FR3控制箱',
  'control_box',
  'BATCH-FR3-001',
  'BOX-001',
  5,
  'PCS'
FROM asn_shipments s WHERE s.shipment_no = 'ASN-2026-001'
ON CONFLICT (shipment_id, line_no) DO NOTHING;

INSERT INTO asn_shipment_items (shipment_id, line_no, part_no, part_name, part_category, batch_no, box_no, shipped_qty, unit)
SELECT 
  s.id,
  2,
  'TEACHING_PENDANT_FR3',
  'FR3示教器',
  'teaching_pendant',
  'BATCH-TP-001',
  'BOX-002',
  5,
  'PCS'
FROM asn_shipments s WHERE s.shipment_no = 'ASN-2026-001'
ON CONFLICT (shipment_id, line_no) DO NOTHING;

INSERT INTO asn_shipment_items (shipment_id, line_no, part_no, part_name, part_category, batch_no, box_no, shipped_qty, unit)
SELECT 
  s.id,
  1,
  'MAIN_BOARD_FR5',
  'FR5主板',
  'main_board',
  'BATCH-MB-002',
  'BOX-003',
  3,
  'PCS'
FROM asn_shipments s WHERE s.shipment_no = 'ASN-2026-002'
ON CONFLICT (shipment_id, line_no) DO NOTHING;

INSERT INTO asn_shipment_items (shipment_id, line_no, part_no, part_name, part_category, batch_no, box_no, shipped_qty, unit)
SELECT 
  s.id,
  2,
  'CABLE_SET_FR5',
  'FR5线缆套装',
  'cable',
  'BATCH-CABLE-002',
  'BOX-004',
  10,
  'SET'
FROM asn_shipments s WHERE s.shipment_no = 'ASN-2026-002'
ON CONFLICT (shipment_id, line_no) DO NOTHING;

-- 3. 插入IQC检验记录
INSERT INTO iqc_inspections (inspection_no, part_no, part_name, batch_no, inspection_type, sample_size, inspected_qty, result, inspected_at, remarks)
VALUES
('IQC-2026-001', 'CONTROL_BOX_FR3', 'FR3控制箱', 'BATCH-FR3-001', 'sampling', 2, 2, 'OK', NOW() - INTERVAL '1 day', '外观检查合格，功能测试正常'),
('IQC-2026-002', 'TEACHING_PENDANT_FR3', 'FR3示教器', 'BATCH-TP-001', 'sampling', 2, 2, 'OK', NOW() - INTERVAL '1 day', '触摸屏响应正常，按键功能正常'),
('IQC-2026-003', 'CABLE_SET_FR5', 'FR5线缆套装', 'BATCH-CABLE-002', 'sampling', 3, 3, 'NG', NOW() - INTERVAL '12 hours', '线缆接头松动，存在接触不良风险')
ON CONFLICT (inspection_no) DO NOTHING;

-- 4. 插入物料处置记录
INSERT INTO incoming_material_dispositions (disposition_no, source_type, source_id, part_no, part_name, batch_no, affected_qty, disposition_type, disposition_status, approve_required, block_reason, action_plan, responsible_party, due_date)
VALUES
('DISP-2026-001', 'receiving_variance', 1, 'MAIN_BOARD_FR5', 'FR5主板', 'BATCH-MB-002', 1, 'return', 'pending', TRUE, '收货短少1件，需要中国工厂补发', '联系中国工厂确认发货数量，安排补发', 'CN-FAIRINO', NOW() + INTERVAL '7 days'),
('DISP-2026-002', 'iqc_ng', 3, 'CABLE_SET_FR5', 'FR5线缆套装', 'BATCH-CABLE-002', 3, 'special_acceptance', 'pending', TRUE, 'IQC检验不合格：线缆接头松动', '评估风险后决定是否特采使用，或要求返工/退货', 'JP-MICROTEC', NOW() + INTERVAL '3 days')
ON CONFLICT (disposition_no) DO NOTHING;
