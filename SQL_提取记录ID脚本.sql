-- ============================================
-- 整机装配与检验流程 - 记录ID提取脚本
-- ============================================
-- 用途: 在完成完整流程后，提取五张核心表的记录ID
-- 使用方法: 将 'UAT-TEST-001' 替换为实际的整机序列号
-- ============================================

-- 方法1: 详细信息查询（推荐）
-- 显示每个环节的详细信息和状态
SELECT 
  '1. 整机记录 (finished_unit_traceability)' as record_type,
  f.id as record_id,
  f.finished_product_sn,
  f.control_box_sn,
  f.teaching_pendant_sn,
  f.created_at,
  '已组装' as status
FROM finished_unit_traceability f
WHERE f.finished_product_sn = 'UAT-TEST-001'

UNION ALL

SELECT 
  '2. 老化测试 (aging_tests)' as record_type,
  a.id as record_id,
  a.test_code as reference,
  a.status as detail1,
  a.result as detail2,
  a.created_at,
  CASE 
    WHEN a.status = 'passed' AND a.result = 'pass' THEN '✓ 已通过'
    ELSE '✗ 未通过'
  END as status
FROM aging_tests a
WHERE a.finished_product_sn = 'UAT-TEST-001'

UNION ALL

SELECT 
  '3. 最终测试 (final_tests)' as record_type,
  ft.id as record_id,
  ft.finished_product_sn as reference,
  ft.test_status as detail1,
  NULL as detail2,
  ft.created_at,
  CASE 
    WHEN ft.test_status = 'pass' THEN '✓ 已通过'
    WHEN ft.test_status = 'pending' THEN '⏳ 待测试'
    ELSE '✗ 未通过'
  END as status
FROM final_tests ft
WHERE ft.finished_product_sn = 'UAT-TEST-001'

UNION ALL

SELECT 
  '4. QA放行 (qa_releases)' as record_type,
  q.id as record_id,
  q.finished_product_sn as reference,
  q.release_status as detail1,
  NULL as detail2,
  q.created_at,
  CASE 
    WHEN q.release_status = 'approved' THEN '✓ 已批准'
    WHEN q.release_status = 'pending' THEN '⏳ 待放行'
    ELSE '✗ 未批准'
  END as status
FROM qa_releases q
WHERE q.finished_product_sn = 'UAT-TEST-001'

UNION ALL

SELECT 
  '5. 出货记录 (shipments)' as record_type,
  s.id as record_id,
  s.shipment_code as reference,
  s.shipment_status as detail1,
  NULL as detail2,
  s.created_at,
  CASE 
    WHEN s.shipment_status = 'confirmed' THEN '✓ 已确认'
    WHEN s.shipment_status = 'pending' THEN '⏳ 待出货'
    ELSE '✗ 未确认'
  END as status
FROM shipments s
WHERE s.finished_product_sn = 'UAT-TEST-001'

ORDER BY record_type;

-- ============================================

-- 方法2: 简洁ID列表（用于快速复制）
-- 只显示记录ID，方便复制粘贴
SELECT 
  '整机记录ID: ' || f.id as result
FROM finished_unit_traceability f
WHERE f.finished_product_sn = 'UAT-TEST-001'

UNION ALL

SELECT 
  '老化测试ID: ' || a.id
FROM aging_tests a
WHERE a.finished_product_sn = 'UAT-TEST-001'

UNION ALL

SELECT 
  '最终测试ID: ' || ft.id
FROM final_tests ft
WHERE ft.finished_product_sn = 'UAT-TEST-001'

UNION ALL

SELECT 
  'QA放行ID: ' || q.id
FROM qa_releases q
WHERE q.finished_product_sn = 'UAT-TEST-001'

UNION ALL

SELECT 
  '出货记录ID: ' || s.id
FROM shipments s
WHERE s.finished_product_sn = 'UAT-TEST-001';

-- ============================================

-- 方法3: 验证流程完整性
-- 检查是否所有环节都已完成
WITH flow_check AS (
  SELECT 
    f.finished_product_sn,
    f.id as unit_id,
    a.id as aging_id,
    a.status as aging_status,
    a.result as aging_result,
    ft.id as final_test_id,
    ft.test_status as final_test_status,
    q.id as qa_id,
    q.release_status as qa_status,
    s.id as shipment_id,
    s.shipment_status as shipment_status
  FROM finished_unit_traceability f
  LEFT JOIN aging_tests a ON a.finished_product_sn = f.finished_product_sn
  LEFT JOIN final_tests ft ON ft.finished_product_sn = f.finished_product_sn
  LEFT JOIN qa_releases q ON q.finished_product_sn = f.finished_product_sn
  LEFT JOIN shipments s ON s.finished_product_sn = f.finished_product_sn
  WHERE f.finished_product_sn = 'UAT-TEST-001'
)
SELECT 
  finished_product_sn as "整机序列号",
  unit_id as "整机ID",
  aging_id as "老化ID",
  CASE 
    WHEN aging_status = 'passed' AND aging_result = 'pass' THEN '✓'
    ELSE '✗'
  END as "老化通过",
  final_test_id as "测试ID",
  CASE 
    WHEN final_test_status = 'pass' THEN '✓'
    ELSE '✗'
  END as "测试通过",
  qa_id as "QA ID",
  CASE 
    WHEN qa_status = 'approved' THEN '✓'
    ELSE '✗'
  END as "QA批准",
  shipment_id as "出货ID",
  CASE 
    WHEN shipment_status = 'confirmed' THEN '✓'
    ELSE '✗'
  END as "出货确认",
  CASE 
    WHEN aging_status = 'passed' 
      AND aging_result = 'pass'
      AND final_test_status = 'pass'
      AND qa_status = 'approved'
      AND shipment_status = 'confirmed'
    THEN '✅ 流程完整'
    ELSE '⚠️ 流程未完成'
  END as "流程状态"
FROM flow_check;

-- ============================================

-- 方法4: 生成提交报告格式
-- 自动生成可直接提交的文本格式
SELECT 
  '整机装配与检验流程 - 记录ID清单' as report_line
UNION ALL
SELECT '流程执行时间: ' || TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS')
UNION ALL
SELECT '整机序列号: UAT-TEST-001'
UNION ALL
SELECT ''
UNION ALL
SELECT '1. 整机记录ID (finished_unit_traceability): ' || f.id
FROM finished_unit_traceability f
WHERE f.finished_product_sn = 'UAT-TEST-001'
UNION ALL
SELECT '2. 老化测试ID (aging_tests): ' || a.id
FROM aging_tests a
WHERE a.finished_product_sn = 'UAT-TEST-001'
UNION ALL
SELECT '3. 最终测试ID (final_tests): ' || ft.id
FROM final_tests ft
WHERE ft.finished_product_sn = 'UAT-TEST-001'
UNION ALL
SELECT '4. QA放行ID (qa_releases): ' || q.id
FROM qa_releases q
WHERE q.finished_product_sn = 'UAT-TEST-001'
UNION ALL
SELECT '5. 出货记录ID (shipments): ' || s.id
FROM shipments s
WHERE s.finished_product_sn = 'UAT-TEST-001'
UNION ALL
SELECT ''
UNION ALL
SELECT 
  CASE 
    WHEN COUNT(*) = 5 THEN '流程状态: 全部通过 ✓'
    ELSE '流程状态: 未完成 ✗'
  END
FROM (
  SELECT f.id
  FROM finished_unit_traceability f
  WHERE f.finished_product_sn = 'UAT-TEST-001'
  UNION ALL
  SELECT a.id
  FROM aging_tests a
  WHERE a.finished_product_sn = 'UAT-TEST-001'
  UNION ALL
  SELECT ft.id
  FROM final_tests ft
  WHERE ft.finished_product_sn = 'UAT-TEST-001'
  UNION ALL
  SELECT q.id
  FROM qa_releases q
  WHERE q.finished_product_sn = 'UAT-TEST-001'
  UNION ALL
  SELECT s.id
  FROM shipments s
  WHERE s.finished_product_sn = 'UAT-TEST-001'
) all_records;

-- ============================================

-- 方法5: 查询所有完整链路（用于参考）
-- 显示系统中所有已完成的完整流程
SELECT 
  f.finished_product_sn as "整机序列号",
  f.id as "整机ID",
  a.id as "老化ID",
  ft.id as "测试ID",
  q.id as "QA ID",
  s.id as "出货ID",
  f.created_at as "创建时间"
FROM finished_unit_traceability f
INNER JOIN aging_tests a ON a.finished_product_sn = f.finished_product_sn
INNER JOIN final_tests ft ON ft.finished_product_sn = f.finished_product_sn
INNER JOIN qa_releases q ON q.finished_product_sn = f.finished_product_sn
INNER JOIN shipments s ON s.finished_product_sn = f.finished_product_sn
WHERE a.status = 'passed' 
  AND a.result = 'pass'
  AND ft.test_status = 'pass'
  AND q.release_status = 'approved'
  AND s.shipment_status = 'confirmed'
ORDER BY f.created_at DESC;

-- ============================================
-- 使用说明:
-- 1. 将所有 'UAT-TEST-001' 替换为实际的整机序列号
-- 2. 在Supabase Dashboard或数据库客户端中执行
-- 3. 推荐使用"方法1"获取详细信息
-- 4. 使用"方法4"生成提交报告
-- ============================================
