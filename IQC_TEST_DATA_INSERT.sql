-- ============================================
-- 来料质量控制全流程测试数据插入脚本
-- ============================================
-- 版本: v1.0
-- 日期: 2026-04-19
-- 说明: 本脚本用于生成IQC全流程测试数据
-- ============================================

-- ============================================
-- 第一部分: 清理旧测试数据
-- ============================================

-- 清理IQC检验记录
DELETE FROM iqc_inspections WHERE inspection_no LIKE 'IQC-TEST-%';

-- 清理收货明细
DELETE FROM receiving_record_items WHERE receiving_id IN (
  SELECT id FROM receiving_records WHERE receiving_code LIKE 'RCV-TEST-%'
);

-- 清理收货记录
DELETE FROM receiving_records WHERE receiving_code LIKE 'RCV-TEST-%';

-- 清理异常记录
DELETE FROM operation_exceptions 
WHERE exception_code LIKE 'EXC-RCV-%' 
   OR exception_code LIKE 'EXC-IQC-%';

-- ============================================
-- 第二部分: 插入收货记录
-- ============================================

-- 场景S1: 标准收货流程
-- RCV-TEST-001: 优质供应商,关键物料,IQC合格
INSERT INTO receiving_records (
  receiving_code,
  receiving_date,
  received_packages,
  received_weight,
  warehouse_location,
  status,
  has_variance,
  variance_resolved,
  iqc_required,
  iqc_completed,
  tenant_id,
  factory_id,
  notes,
  created_at,
  updated_at
) VALUES (
  'RCV-TEST-001',
  '2026-04-19',
  2,
  25.5,
  'A区-01-01',
  'completed',
  false,
  false,
  true,
  true,
  'JP',
  'JP',
  '场景S1: 标准收货流程 - 优质供应商交付关键物料,IQC检验合格',
  NOW(),
  NOW()
);

-- 场景S2: 收货数量差异
-- RCV-TEST-002: 普通供应商,数量短缺
INSERT INTO receiving_records (
  receiving_code,
  receiving_date,
  received_packages,
  received_weight,
  warehouse_location,
  status,
  has_variance,
  variance_resolved,
  iqc_required,
  iqc_completed,
  tenant_id,
  factory_id,
  notes,
  created_at,
  updated_at
) VALUES (
  'RCV-TEST-002',
  '2026-04-19',
  5,
  42.0,
  'B区-02-03',
  'variance_pending',
  true,
  false,
  true,
  false,
  'JP',
  'JP',
  '场景S2: 收货数量差异 - 实收数量少于预期15件',
  NOW(),
  NOW()
);

-- 场景S3: 收货批次差异
-- RCV-TEST-003: 普通供应商,批次号不符
INSERT INTO receiving_records (
  receiving_code,
  receiving_date,
  received_packages,
  received_weight,
  warehouse_location,
  status,
  has_variance,
  variance_resolved,
  iqc_required,
  iqc_completed,
  tenant_id,
  factory_id,
  notes,
  created_at,
  updated_at
) VALUES (
  'RCV-TEST-003',
  '2026-04-19',
  10,
  25.0,
  'B区-03-05',
  'variance_pending',
  true,
  false,
  true,
  false,
  'JP',
  'JP',
  '场景S3: 收货批次差异 - 批次号与ASN不符',
  NOW(),
  NOW()
);

-- 场景S4: IQC检验不合格
-- RCV-TEST-004: 问题供应商,IQC NG
INSERT INTO receiving_records (
  receiving_code,
  receiving_date,
  received_packages,
  received_weight,
  warehouse_location,
  status,
  has_variance,
  variance_resolved,
  iqc_required,
  iqc_completed,
  tenant_id,
  factory_id,
  notes,
  created_at,
  updated_at
) VALUES (
  'RCV-TEST-004',
  '2026-04-19',
  5,
  7.5,
  'C区-01-02',
  'iqc_ng',
  false,
  false,
  true,
  true,
  'JP',
  'JP',
  '场景S4: IQC检验不合格 - 问题供应商,硬度不合格',
  NOW(),
  NOW()
);

-- 场景S5: IQC检验HOLD
-- RCV-TEST-005: 普通供应商,IQC HOLD
INSERT INTO receiving_records (
  receiving_code,
  receiving_date,
  received_packages,
  received_weight,
  warehouse_location,
  status,
  has_variance,
  variance_resolved,
  iqc_required,
  iqc_completed,
  tenant_id,
  factory_id,
  notes,
  created_at,
  updated_at
) VALUES (
  'RCV-TEST-005',
  '2026-04-19',
  1,
  76.0,
  'A区-02-01',
  'iqc_hold',
  false,
  false,
  true,
  true,
  'JP',
  'JP',
  '场景S5: IQC检验HOLD - 噪音略高,需管理层评审',
  NOW(),
  NOW()
);

-- 场景S8: 关键物料全检
-- RCV-TEST-008: 优质供应商,关键物料全检通过
INSERT INTO receiving_records (
  receiving_code,
  receiving_date,
  received_packages,
  received_weight,
  warehouse_location,
  status,
  has_variance,
  variance_resolved,
  iqc_required,
  iqc_completed,
  tenant_id,
  factory_id,
  notes,
  created_at,
  updated_at
) VALUES (
  'RCV-TEST-008',
  '2026-04-19',
  1,
  76.0,
  'A区-01-03',
  'completed',
  false,
  false,
  true,
  true,
  'JP',
  'JP',
  '场景S8: 关键物料全检 - 伺服电机100%全检通过',
  NOW(),
  NOW()
);

-- ============================================
-- 第三部分: 插入收货明细
-- ============================================

-- 场景S1明细: 控制箱主板
INSERT INTO receiving_record_items (
  receiving_id,
  line_no,
  part_no,
  part_name,
  batch_no,
  box_no,
  expected_qty,
  received_qty,
  variance_qty,
  variance_type,
  unit,
  on_hand_qty,
  available_qty,
  reserved_qty,
  consumed_qty,
  blocked_qty,
  remarks,
  created_at
) VALUES (
  (SELECT id FROM receiving_records WHERE receiving_code = 'RCV-TEST-001'),
  1,
  'MAT-001',
  '控制箱主板 (PCB-CTRL-V2.0)',
  'BATCH-2026-04-001',
  'BOX-001',
  50,
  50,
  0,
  NULL,
  'PCS',
  50,
  50,
  0,
  0,
  0,
  'IQC检验通过,已解除阻断',
  NOW()
);

-- 场景S2明细: 连接线缆(数量短缺)
INSERT INTO receiving_record_items (
  receiving_id,
  line_no,
  part_no,
  part_name,
  batch_no,
  box_no,
  expected_qty,
  received_qty,
  variance_qty,
  variance_type,
  unit,
  on_hand_qty,
  available_qty,
  reserved_qty,
  consumed_qty,
  blocked_qty,
  remarks,
  created_at
) VALUES (
  (SELECT id FROM receiving_records WHERE receiving_code = 'RCV-TEST-002'),
  1,
  'MAT-003',
  '连接线缆 (CABLE-POWER-5M)',
  'BATCH-2026-04-002',
  'BOX-002',
  200,
  185,
  -15,
  'short',
  'PCS',
  185,
  0,
  0,
  0,
  185,
  '实收数量少于预期15件,需确认原因',
  NOW()
);

-- 场景S3明细: 紧固螺栓(批次不符)
INSERT INTO receiving_record_items (
  receiving_id,
  line_no,
  part_no,
  part_name,
  batch_no,
  box_no,
  expected_qty,
  received_qty,
  variance_qty,
  variance_type,
  unit,
  on_hand_qty,
  available_qty,
  reserved_qty,
  consumed_qty,
  blocked_qty,
  remarks,
  created_at
) VALUES (
  (SELECT id FROM receiving_records WHERE receiving_code = 'RCV-TEST-003'),
  1,
  'MAT-004',
  '紧固螺栓 (BOLT-M8-30)',
  'BATCH-2026-03-999',
  'BOX-003',
  1000,
  1000,
  0,
  'batch_mismatch',
  'PCS',
  1000,
  0,
  0,
  0,
  1000,
  '批次号不符,预期 BATCH-2026-04-003,实收 BATCH-2026-03-999',
  NOW()
);

-- 场景S4明细: 密封圈(IQC NG)
INSERT INTO receiving_record_items (
  receiving_id,
  line_no,
  part_no,
  part_name,
  batch_no,
  box_no,
  expected_qty,
  received_qty,
  variance_qty,
  variance_type,
  unit,
  on_hand_qty,
  available_qty,
  reserved_qty,
  consumed_qty,
  blocked_qty,
  remarks,
  created_at
) VALUES (
  (SELECT id FROM receiving_records WHERE receiving_code = 'RCV-TEST-004'),
  1,
  'MAT-005',
  '密封圈 (SEAL-RING-D50)',
  'BATCH-2026-04-004',
  'BOX-004',
  500,
  500,
  0,
  NULL,
  'PCS',
  500,
  0,
  0,
  0,
  500,
  'IQC检验不合格,全部阻断',
  NOW()
);

-- 场景S5明细: 伺服电机(IQC HOLD)
INSERT INTO receiving_record_items (
  receiving_id,
  line_no,
  part_no,
  part_name,
  batch_no,
  box_no,
  expected_qty,
  received_qty,
  variance_qty,
  variance_type,
  unit,
  on_hand_qty,
  available_qty,
  reserved_qty,
  consumed_qty,
  blocked_qty,
  remarks,
  created_at
) VALUES (
  (SELECT id FROM receiving_records WHERE receiving_code = 'RCV-TEST-005'),
  1,
  'MAT-002',
  '伺服电机 (SERVO-J1-2KW)',
  'BATCH-2026-04-005',
  'BOX-005',
  20,
  20,
  0,
  NULL,
  'PCS',
  20,
  0,
  0,
  0,
  20,
  'IQC检验HOLD,等待管理层评审',
  NOW()
);

-- 场景S8明细: 伺服电机(全检通过)
INSERT INTO receiving_record_items (
  receiving_id,
  line_no,
  part_no,
  part_name,
  batch_no,
  box_no,
  expected_qty,
  received_qty,
  variance_qty,
  variance_type,
  unit,
  on_hand_qty,
  available_qty,
  reserved_qty,
  consumed_qty,
  blocked_qty,
  remarks,
  created_at
) VALUES (
  (SELECT id FROM receiving_records WHERE receiving_code = 'RCV-TEST-008'),
  1,
  'MAT-002',
  '伺服电机 (SERVO-J1-2KW)',
  'BATCH-2026-04-008',
  'BOX-008',
  20,
  20,
  0,
  NULL,
  'PCS',
  20,
  20,
  0,
  0,
  0,
  '全检通过,所有指标均符合要求',
  NOW()
);

-- ============================================
-- 第四部分: 插入IQC检验记录
-- ============================================

-- 场景S1: IQC检验通过
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
  created_at
) VALUES (
  'IQC-TEST-001',
  (SELECT id FROM receiving_records WHERE receiving_code = 'RCV-TEST-001'),
  (SELECT id FROM receiving_record_items WHERE receiving_id = (SELECT id FROM receiving_records WHERE receiving_code = 'RCV-TEST-001') AND line_no = 1),
  'MAT-001',
  '控制箱主板 (PCB-CTRL-V2.0)',
  'BATCH-2026-04-001',
  '全检',
  50,
  50,
  'PASS',
  NULL,
  NULL,
  '2026-04-19 10:00:00+00',
  (SELECT id FROM profiles WHERE tenant_id = 'JP' LIMIT 1),
  '外观良好,功能测试全部通过,尺寸符合要求',
  NOW()
);

-- 场景S4: IQC检验不合格
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
  created_at
) VALUES (
  'IQC-TEST-004',
  (SELECT id FROM receiving_records WHERE receiving_code = 'RCV-TEST-004'),
  (SELECT id FROM receiving_record_items WHERE receiving_id = (SELECT id FROM receiving_records WHERE receiving_code = 'RCV-TEST-004') AND line_no = 1),
  'MAT-005',
  '密封圈 (SEAL-RING-D50)',
  'BATCH-2026-04-004',
  '加严抽检',
  150,
  150,
  'NG',
  'DEF-HARDNESS',
  '硬度不合格: 发现18件硬度低于标准(邵氏A 65±5),占比12%,超过AQL 1.0标准。缺陷等级: Major。Critical缺陷0件,Major缺陷18件,Minor缺陷5件,总缺陷23件,缺陷率15.3%。',
  '2026-04-19 14:00:00+00',
  (SELECT id FROM profiles WHERE tenant_id = 'JP' LIMIT 1),
  '供应商再次出现质量问题,建议考虑更换供应商',
  NOW()
);

-- 场景S5: IQC检验HOLD
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
  created_at
) VALUES (
  'IQC-TEST-005',
  (SELECT id FROM receiving_records WHERE receiving_code = 'RCV-TEST-005'),
  (SELECT id FROM receiving_record_items WHERE receiving_id = (SELECT id FROM receiving_records WHERE receiving_code = 'RCV-TEST-005') AND line_no = 1),
  'MAT-002',
  '伺服电机 (SERVO-J1-2KW)',
  'BATCH-2026-04-005',
  '全检',
  20,
  20,
  'HOLD',
  'DEF-NOISE',
  '噪音异常: 发现3台电机运行噪音略高于标准(标准≤65dB,实测68-70dB),但未超过极限值75dB。缺陷等级: Minor。Critical缺陷0件,Major缺陷0件,Minor缺陷3件,总缺陷3件,缺陷率15%。',
  '2026-04-19 15:00:00+00',
  (SELECT id FROM profiles WHERE tenant_id = 'JP' LIMIT 1),
  '性能测试其他指标均合格,仅噪音略高。建议质量经理评审是否可接受使用。',
  NOW()
);

-- 场景S8: IQC全检通过
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
  created_at
) VALUES (
  'IQC-TEST-008',
  (SELECT id FROM receiving_records WHERE receiving_code = 'RCV-TEST-008'),
  (SELECT id FROM receiving_record_items WHERE receiving_id = (SELECT id FROM receiving_records WHERE receiving_code = 'RCV-TEST-008') AND line_no = 1),
  'MAT-002',
  '伺服电机 (SERVO-J1-2KW)',
  'BATCH-2026-04-008',
  '全检',
  20,
  20,
  'PASS',
  NULL,
  NULL,
  '2026-04-19 19:00:00+00',
  (SELECT id FROM profiles WHERE tenant_id = 'JP' LIMIT 1),
  '全检通过,所有指标均符合要求,质量优秀。外观检查20/20合格,性能测试20/20合格,噪音测试20/20合格(58-63dB),精度测试20/20合格(±0.01mm)。',
  NOW()
);

-- ============================================
-- 第五部分: 插入异常记录
-- ============================================

-- 场景S2: 收货数量差异异常
INSERT INTO operation_exceptions (
  exception_code,
  exception_type,
  severity,
  current_status,
  source_module,
  source_record_id,
  related_sn,
  title,
  description,
  reporter_id,
  owner_id,
  reported_at,
  tenant_id,
  created_at,
  updated_at
) VALUES (
  'EXC-RCV-002',
  'receiving',
  'medium',
  'open',
  'receiving',
  (SELECT id FROM receiving_records WHERE receiving_code = 'RCV-TEST-002'),
  'RCV-TEST-002',
  '收货数量差异',
  '物料 MAT-003 (连接线缆) 预期收货200件,实收185件,短缺15件。需联系供应商确认原因。',
  (SELECT id FROM profiles WHERE tenant_id = 'JP' LIMIT 1),
  (SELECT id FROM profiles WHERE tenant_id = 'JP' LIMIT 1),
  '2026-04-19 11:00:00+00',
  'JP',
  NOW(),
  NOW()
);

-- 场景S3: 收货批次差异异常
INSERT INTO operation_exceptions (
  exception_code,
  exception_type,
  severity,
  current_status,
  source_module,
  source_record_id,
  related_sn,
  title,
  description,
  reporter_id,
  owner_id,
  reported_at,
  tenant_id,
  created_at,
  updated_at
) VALUES (
  'EXC-RCV-003',
  'receiving',
  'high',
  'open',
  'receiving',
  (SELECT id FROM receiving_records WHERE receiving_code = 'RCV-TEST-003'),
  'RCV-TEST-003',
  '收货批次差异',
  '物料 MAT-004 (紧固螺栓) 批次号不符。预期批次: BATCH-2026-04-003,实收批次: BATCH-2026-03-999。可能是旧批次物料,需确认生产日期和有效期。',
  (SELECT id FROM profiles WHERE tenant_id = 'JP' LIMIT 1),
  (SELECT id FROM profiles WHERE tenant_id = 'JP' LIMIT 1),
  '2026-04-19 12:00:00+00',
  'JP',
  NOW(),
  NOW()
);

-- 场景S4: IQC检验不合格异常
INSERT INTO operation_exceptions (
  exception_code,
  exception_type,
  severity,
  current_status,
  source_module,
  source_record_id,
  related_sn,
  related_iqc_id,
  title,
  description,
  reporter_id,
  owner_id,
  reported_at,
  tenant_id,
  created_at,
  updated_at
) VALUES (
  'EXC-IQC-004',
  'quality',
  'critical',
  'open',
  'iqc',
  (SELECT id FROM iqc_inspections WHERE inspection_no = 'IQC-TEST-004'),
  'RCV-TEST-004',
  (SELECT id FROM iqc_inspections WHERE inspection_no = 'IQC-TEST-004'),
  'IQC检验不合格',
  '物料 MAT-005 (密封圈) IQC检验不合格。缺陷: 硬度不合格,Major缺陷18件,缺陷率15.3%,超过AQL 1.0标准。全部500件物料已阻断,不可用于生产。需启动特采流程或退货处理。',
  (SELECT id FROM profiles WHERE tenant_id = 'JP' LIMIT 1),
  (SELECT id FROM profiles WHERE tenant_id = 'JP' LIMIT 1),
  '2026-04-19 14:30:00+00',
  'JP',
  NOW(),
  NOW()
);

-- 场景S5: IQC检验HOLD异常
INSERT INTO operation_exceptions (
  exception_code,
  exception_type,
  severity,
  current_status,
  source_module,
  source_record_id,
  related_sn,
  related_iqc_id,
  title,
  description,
  reporter_id,
  owner_id,
  reported_at,
  tenant_id,
  created_at,
  updated_at
) VALUES (
  'EXC-IQC-005',
  'quality',
  'high',
  'pending_review',
  'iqc',
  (SELECT id FROM iqc_inspections WHERE inspection_no = 'IQC-TEST-005'),
  'RCV-TEST-005',
  (SELECT id FROM iqc_inspections WHERE inspection_no = 'IQC-TEST-005'),
  'IQC检验HOLD - 需管理层评审',
  '物料 MAT-002 (伺服电机) IQC检验HOLD。问题: 3台电机噪音略高(68-70dB),超过标准65dB但未超过极限75dB。其他性能指标合格。需质量经理评审是否可接受使用。',
  (SELECT id FROM profiles WHERE tenant_id = 'JP' LIMIT 1),
  (SELECT id FROM profiles WHERE tenant_id = 'JP' LIMIT 1),
  '2026-04-19 15:30:00+00',
  'JP',
  NOW(),
  NOW()
);

-- ============================================
-- 第六部分: 验证数据插入
-- ============================================

-- 验证收货记录
SELECT 
  receiving_code,
  status,
  has_variance,
  iqc_required,
  iqc_completed,
  notes
FROM receiving_records
WHERE receiving_code LIKE 'RCV-TEST-%'
ORDER BY receiving_code;

-- 验证收货明细
SELECT 
  r.receiving_code,
  ri.part_no,
  ri.expected_qty,
  ri.received_qty,
  ri.variance_qty,
  ri.variance_type,
  ri.blocked_qty,
  ri.available_qty
FROM receiving_record_items ri
JOIN receiving_records r ON ri.receiving_id = r.id
WHERE r.receiving_code LIKE 'RCV-TEST-%'
ORDER BY r.receiving_code, ri.line_no;

-- 验证IQC检验记录
SELECT 
  inspection_no,
  part_no,
  inspection_type,
  sample_size,
  result,
  defect_code,
  remarks
FROM iqc_inspections
WHERE inspection_no LIKE 'IQC-TEST-%'
ORDER BY inspection_no;

-- 验证异常记录
SELECT 
  exception_code,
  exception_type,
  severity,
  current_status,
  source_module,
  title
FROM operation_exceptions
WHERE exception_code LIKE 'EXC-RCV-%' OR exception_code LIKE 'EXC-IQC-%'
ORDER BY exception_code;

-- ============================================
-- 脚本结束
-- ============================================
