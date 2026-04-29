
-- ============================================
-- UAT演示数据 - 完整业务闭环
-- ============================================
-- 整机序列号: UAT-UNIT-20260420-001
-- 流程: 老化测试 → Final Test → QA放行 → 出货
-- ============================================

-- 步骤1: 完成老化测试
-- 1.1 更新老化测试记录状态为passed
UPDATE aging_tests
SET 
  status = 'passed',
  ended_at = NOW() + INTERVAL '48 hours',
  actual_duration_hours = 48.0,
  result = 'pass',
  temperature_avg = 25.5,
  qa_reviewer_id = '2d54ca55-312b-439e-a441-2e2bc92a37a5'
WHERE test_code = 'AGING-UAT-20260420-001';

-- 1.2 更新整机记录的老化状态
UPDATE finished_unit_traceability
SET 
  aging_status = 'passed',
  aging_passed_at = NOW() + INTERVAL '48 hours'
WHERE finished_product_sn = 'UAT-UNIT-20260420-001';

-- 步骤2: 创建并完成Final Test
-- 2.1 创建Final Test记录
INSERT INTO final_tests (
  finished_product_sn,
  test_status,
  tested_at,
  tester_id,
  notes,
  remarks,
  tenant_id,
  created_by,
  created_at,
  updated_at
) VALUES (
  'UAT-UNIT-20260420-001',
  'pass', -- 测试通过
  NOW() + INTERVAL '50 hours', -- 老化测试完成后2小时
  '2d54ca55-312b-439e-a441-2e2bc92a37a5',
  'UAT演示 - Final Test全部测试项通过：精度测试、负载测试、速度测试、安全测试、通讯测试',
  '所有测试项目均符合FR3产品规格要求，性能指标优秀',
  'JP',
  '2d54ca55-312b-439e-a441-2e2bc92a37a5',
  NOW() + INTERVAL '50 hours',
  NOW() + INTERVAL '50 hours'
);

-- 2.2 更新整机记录的Final Test状态
UPDATE finished_unit_traceability
SET 
  final_test_status = 'passed',
  final_test_passed_at = NOW() + INTERVAL '50 hours'
WHERE finished_product_sn = 'UAT-UNIT-20260420-001';

-- 步骤3: 创建并批准QA放行
-- 3.1 创建QA放行记录
INSERT INTO qa_releases (
  finished_product_sn,
  release_status,
  released_at,
  released_by,
  remarks,
  tenant_id,
  created_by,
  created_at,
  updated_at
) VALUES (
  'UAT-UNIT-20260420-001',
  'approved', -- 批准放行
  NOW() + INTERVAL '51 hours', -- Final Test完成后1小时
  '2d54ca55-312b-439e-a441-2e2bc92a37a5',
  'UAT演示 - QA审核通过：老化测试合格、Final Test合格、物料追溯完整、文档齐全，批准放行出货',
  'JP',
  '2d54ca55-312b-439e-a441-2e2bc92a37a5',
  NOW() + INTERVAL '51 hours',
  NOW() + INTERVAL '51 hours'
);

-- 3.2 更新整机记录的QA放行状态
UPDATE finished_unit_traceability
SET 
  qa_release_status = 'approved',
  qa_release_at = NOW() + INTERVAL '51 hours',
  qa_release_by = '2d54ca55-312b-439e-a441-2e2bc92a37a5'
WHERE finished_product_sn = 'UAT-UNIT-20260420-001';

-- 步骤4: 创建并确认出货
-- 4.1 创建出货记录
INSERT INTO shipments (
  shipment_code,
  finished_product_sn,
  shipment_status,
  shipped_at,
  shipped_by,
  remarks,
  tenant_id,
  created_by,
  created_at,
  updated_at
) VALUES (
  'SHIP-UAT-20260420-001',
  'UAT-UNIT-20260420-001',
  'shipped', -- 已出货
  NOW() + INTERVAL '52 hours', -- QA放行后1小时
  '2d54ca55-312b-439e-a441-2e2bc92a37a5',
  'UAT演示 - 出货至日本客户，运输方式：空运，预计到达时间：2026-04-25',
  'JP',
  '2d54ca55-312b-439e-a441-2e2bc92a37a5',
  NOW() + INTERVAL '52 hours',
  NOW() + INTERVAL '52 hours'
);

-- 4.2 更新整机记录的出货状态
UPDATE finished_unit_traceability
SET 
  shipment_status = 'shipped'
WHERE finished_product_sn = 'UAT-UNIT-20260420-001';

-- 4.3 创建出货确认记录
INSERT INTO shipment_confirmations (
  shipment_id,
  confirmed_at,
  confirmed_by,
  confirmation_notes,
  tenant_id,
  created_at
) VALUES (
  (SELECT id FROM shipments WHERE shipment_code = 'SHIP-UAT-20260420-001'),
  NOW() + INTERVAL '52 hours',
  '2d54ca55-312b-439e-a441-2e2bc92a37a5',
  'UAT演示 - 出货确认：包装完好，文档齐全，已交付物流公司',
  'JP',
  NOW() + INTERVAL '52 hours'
);
