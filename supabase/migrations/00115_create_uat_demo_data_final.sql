
-- ============================================
-- UAT演示数据 - 完整业务链条（最终版）
-- ============================================
-- 业务场景: FR3协作机器人生产计划 → ASN到货 → 收货 → IQC检验
-- ============================================

-- 步骤1: 创建生产计划
INSERT INTO production_plans (
  plan_code,
  plan_type,
  plan_period_start,
  plan_period_end,
  production_quantity,
  delivery_date,
  product_model_id,
  factory_id,
  status,
  tenant_id,
  created_by,
  approved_by,
  approved_at,
  remarks,
  created_at,
  updated_at
) VALUES (
  'PLAN-UAT-20260420-001',
  'monthly',
  '2026-04-20',
  '2026-05-20',
  50,
  '2026-05-25',
  1, -- FR3型号
  'JP_FACTORY',
  'active', -- 已激活状态
  'JP',
  '2d54ca55-312b-439e-a441-2e2bc92a37a5',
  '2d54ca55-312b-439e-a441-2e2bc92a37a5',
  NOW(),
  'UAT演示用生产计划 - FR3协作机器人50台',
  NOW(),
  NOW()
);

-- 步骤2: 创建ASN（到货通知单）
INSERT INTO asn_shipments (
  shipment_no,
  tenant_id,
  factory_id,
  destination_factory_id,
  product_model_id,
  shipment_date,
  eta_date,
  carrier,
  tracking_no,
  status,
  total_boxes,
  total_pallets,
  remarks,
  created_by,
  created_at,
  updated_at
) VALUES (
  'ASN-UAT-20260420-001',
  'JP',
  'CN_FACTORY',
  'JP_FACTORY',
  1, -- FR3型号
  NOW() - INTERVAL '2 days',
  NOW() + INTERVAL '1 day',
  '日本通运株式会社',
  'JPN-TRK-20260420-12345',
  'in_transit',
  15,
  3,
  'UAT演示用ASN - FR3关键部件到货通知，包含控制箱、示教器、主板等',
  '2d54ca55-312b-439e-a441-2e2bc92a37a5',
  NOW() - INTERVAL '2 days',
  NOW()
);

-- 步骤3: 创建收货记录
INSERT INTO receiving_records (
  receiving_code,
  shipping_id,
  receiving_date,
  receiver_id,
  received_packages,
  received_weight,
  warehouse_location,
  status,
  notes,
  tenant_id,
  factory_id,
  has_variance,
  variance_resolved,
  iqc_required,
  iqc_completed,
  created_by,
  updated_by,
  created_at,
  updated_at
) VALUES (
  'RCV-UAT-20260420-001',
  (SELECT id FROM asn_shipments WHERE shipment_no = 'ASN-UAT-20260420-001'),
  CURRENT_DATE,
  '2d54ca55-312b-439e-a441-2e2bc92a37a5',
  15,
  125.5,
  'A区-01-01',
  'completed', -- 收货完成状态
  'UAT演示用收货记录 - 所有包装完好，数量准确',
  'JP',
  'JP_FACTORY',
  false,
  true,
  true,
  false,
  '2d54ca55-312b-439e-a441-2e2bc92a37a5',
  '2d54ca55-312b-439e-a441-2e2bc92a37a5',
  NOW(),
  NOW()
);

-- 步骤4: 创建IQC检验记录（3条：控制箱、示教器、主板）
-- 4.1 控制箱检验（合格 - OK）
INSERT INTO iqc_inspections (
  inspection_no,
  receiving_id,
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
  created_at
) VALUES (
  'IQC-UAT-20260420-001',
  (SELECT id FROM receiving_records WHERE receiving_code = 'RCV-UAT-20260420-001'),
  'CB-FR3-V2.1',
  '控制箱（FR3专用）',
  'CB-20260415-A01',
  'sampling',
  5,
  50,
  'OK', -- 合格
  NULL,
  NULL,
  NOW(),
  '2d54ca55-312b-439e-a441-2e2bc92a37a5',
  'UAT演示 - 外观检查合格，功能测试通过，尺寸符合图纸要求',
  NOW()
);

-- 4.2 示教器检验（合格 - OK）
INSERT INTO iqc_inspections (
  inspection_no,
  receiving_id,
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
  created_at
) VALUES (
  'IQC-UAT-20260420-002',
  (SELECT id FROM receiving_records WHERE receiving_code = 'RCV-UAT-20260420-001'),
  'TP-FR3-V1.5',
  '示教器（FR3专用）',
  'TP-20260415-B02',
  'sampling',
  3,
  50,
  'OK', -- 合格
  NULL,
  NULL,
  NOW(),
  '2d54ca55-312b-439e-a441-2e2bc92a37a5',
  'UAT演示 - 屏幕显示正常，按键灵敏，通讯测试通过',
  NOW()
);

-- 4.3 主板检验（待处理 - HOLD，演示特采流程）
INSERT INTO iqc_inspections (
  inspection_no,
  receiving_id,
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
  created_at
) VALUES (
  'IQC-UAT-20260420-003',
  (SELECT id FROM receiving_records WHERE receiving_code = 'RCV-UAT-20260420-001'),
  'MB-FR3-V3.0',
  '主控板（FR3专用）',
  'MB-20260415-C03',
  'sampling',
  5,
  50,
  'HOLD', -- 待处理（用于演示特采流程）
  'MINOR-COSMETIC',
  '外观有轻微划痕，但不影响功能和性能，建议特采使用',
  NOW(),
  '2d54ca55-312b-439e-a441-2e2bc92a37a5',
  'UAT演示 - 功能测试全部通过，仅外观有轻微瑕疵，已申请特采',
  NOW()
);

-- 更新收货记录的IQC完成状态
UPDATE receiving_records
SET 
  iqc_completed = true,
  updated_at = NOW()
WHERE receiving_code = 'RCV-UAT-20260420-001';

-- 更新ASN状态为已收货
UPDATE asn_shipments
SET 
  status = 'received',
  updated_at = NOW()
WHERE shipment_no = 'ASN-UAT-20260420-001';
