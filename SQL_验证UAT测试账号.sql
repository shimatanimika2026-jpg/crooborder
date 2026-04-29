-- ============================================
-- UAT测试账号验证脚本
-- ============================================
-- 用途: 验证UAT测试账号是否创建成功并具有正确权限
-- ============================================

-- 验证1: 检查Profile记录是否存在
SELECT 
  '验证1: Profile记录' as check_item,
  CASE 
    WHEN COUNT(*) = 1 THEN '✓ 通过'
    WHEN COUNT(*) = 0 THEN '✗ 失败 - Profile不存在'
    ELSE '✗ 失败 - 存在重复记录'
  END as result,
  COUNT(*) as record_count
FROM profiles
WHERE email = 'uat_test@miaoda.com';

-- 验证2: 检查角色是否正确
SELECT 
  '验证2: 角色权限' as check_item,
  CASE 
    WHEN role = 'executive' THEN '✓ 通过 - 角色为executive'
    ELSE '✗ 失败 - 角色不正确: ' || role
  END as result,
  role as current_role
FROM profiles
WHERE email = 'uat_test@miaoda.com';

-- 验证3: 检查语言偏好
SELECT 
  '验证3: 语言设置' as check_item,
  CASE 
    WHEN language_preference = 'zh-CN' THEN '✓ 通过 - 默认中文'
    ELSE '⚠ 警告 - 语言为: ' || language_preference
  END as result,
  language_preference as current_language
FROM profiles
WHERE email = 'uat_test@miaoda.com';

-- 验证4: 检查租户ID
SELECT 
  '验证4: 租户配置' as check_item,
  CASE 
    WHEN tenant_id IS NOT NULL THEN '✓ 通过 - 租户ID: ' || tenant_id
    ELSE '⚠ 警告 - 租户ID为空'
  END as result,
  tenant_id as current_tenant
FROM profiles
WHERE email = 'uat_test@miaoda.com';

-- 验证5: 检查executive角色是否在枚举中
SELECT 
  '验证5: 角色枚举' as check_item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumtypid = 'user_role'::regtype 
      AND enumlabel = 'executive'
    ) THEN '✓ 通过 - executive角色已定义'
    ELSE '✗ 失败 - executive角色未定义'
  END as result,
  (
    SELECT string_agg(enumlabel, ', ' ORDER BY enumsortorder)
    FROM pg_enum 
    WHERE enumtypid = 'user_role'::regtype
  ) as available_roles;

-- 验证6: 显示完整的账号信息
SELECT 
  '========== 账号详细信息 ==========' as section,
  NULL as value
UNION ALL
SELECT '邮箱', email FROM profiles WHERE email = 'uat_test@miaoda.com'
UNION ALL
SELECT '姓名', full_name FROM profiles WHERE email = 'uat_test@miaoda.com'
UNION ALL
SELECT '角色', role::text FROM profiles WHERE email = 'uat_test@miaoda.com'
UNION ALL
SELECT '语言', language_preference FROM profiles WHERE email = 'uat_test@miaoda.com'
UNION ALL
SELECT '租户', tenant_id FROM profiles WHERE email = 'uat_test@miaoda.com'
UNION ALL
SELECT '创建时间', TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') FROM profiles WHERE email = 'uat_test@miaoda.com'
UNION ALL
SELECT '更新时间', TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') FROM profiles WHERE email = 'uat_test@miaoda.com';

-- 验证7: 检查RLS策略（确保executive可以访问所有表）
SELECT 
  '验证7: RLS策略检查' as check_item,
  tablename as table_name,
  policyname as policy_name,
  CASE 
    WHEN roles @> ARRAY['executive'] OR roles @> ARRAY['authenticated'] THEN '✓ 可访问'
    ELSE '⚠ 可能无权限'
  END as access_status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'finished_unit_traceability',
    'aging_tests',
    'final_tests',
    'qa_releases',
    'shipments',
    'operation_exceptions',
    'asn_shipments',
    'receiving_records',
    'iqc_inspections'
  )
ORDER BY tablename, policyname
LIMIT 20;

-- 验证8: 测试数据访问权限（模拟查询）
SELECT 
  '验证8: 数据访问测试' as check_item,
  '整机记录' as table_name,
  COUNT(*) as accessible_records,
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ 可以访问数据'
    ELSE '⚠ 无数据或无权限'
  END as result
FROM finished_unit_traceability
UNION ALL
SELECT 
  '验证8: 数据访问测试',
  '老化测试',
  COUNT(*),
  CASE WHEN COUNT(*) > 0 THEN '✓ 可以访问数据' ELSE '⚠ 无数据或无权限' END
FROM aging_tests
UNION ALL
SELECT 
  '验证8: 数据访问测试',
  '最终测试',
  COUNT(*),
  CASE WHEN COUNT(*) > 0 THEN '✓ 可以访问数据' ELSE '⚠ 无数据或无权限' END
FROM final_tests
UNION ALL
SELECT 
  '验证8: 数据访问测试',
  'QA放行',
  COUNT(*),
  CASE WHEN COUNT(*) > 0 THEN '✓ 可以访问数据' ELSE '⚠ 无数据或无权限' END
FROM qa_releases
UNION ALL
SELECT 
  '验证8: 数据访问测试',
  '出货记录',
  COUNT(*),
  CASE WHEN COUNT(*) > 0 THEN '✓ 可以访问数据' ELSE '⚠ 无数据或无权限' END
FROM shipments;

-- 验证9: 生成验证报告摘要
WITH validation_summary AS (
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM profiles WHERE email = 'uat_test@miaoda.com' AND role = 'executive')
      THEN 1 ELSE 0
    END as profile_ok,
    CASE 
      WHEN EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'user_role'::regtype AND enumlabel = 'executive')
      THEN 1 ELSE 0
    END as role_ok,
    CASE 
      WHEN (SELECT COUNT(*) FROM finished_unit_traceability) > 0
      THEN 1 ELSE 0
    END as data_access_ok
)
SELECT 
  '========== 验证报告摘要 ==========' as report_section,
  NULL as status
UNION ALL
SELECT 
  'Profile记录',
  CASE WHEN profile_ok = 1 THEN '✓ 正常' ELSE '✗ 异常' END
FROM validation_summary
UNION ALL
SELECT 
  '角色权限',
  CASE WHEN role_ok = 1 THEN '✓ 正常' ELSE '✗ 异常' END
FROM validation_summary
UNION ALL
SELECT 
  '数据访问',
  CASE WHEN data_access_ok = 1 THEN '✓ 正常' ELSE '⚠ 无数据' END
FROM validation_summary
UNION ALL
SELECT 
  '总体状态',
  CASE 
    WHEN profile_ok = 1 AND role_ok = 1 THEN '✅ 账号创建成功，可以使用'
    ELSE '❌ 账号创建失败或配置不完整'
  END
FROM validation_summary;

-- ============================================
-- 验证完成
-- ============================================
-- 如果所有验证都通过，可以使用以下信息登录:
-- URL: https://app-b10oy6wwe801.appmiaoda.com/login
-- 邮箱: uat_test@miaoda.com
-- 密码: Test@2026
-- ============================================
