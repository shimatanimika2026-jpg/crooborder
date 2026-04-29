-- UAT测试账号创建说明
-- 注意: Supabase的auth.users表不能直接通过SQL插入,需要使用Supabase Dashboard或API创建

-- 方法1: 使用Supabase Dashboard创建(推荐)
-- 1. 登录Supabase Dashboard
-- 2. 进入Authentication > Users
-- 3. 点击"Add user"按钮
-- 4. 按照下面的账号清单创建用户

-- 方法2: 使用Supabase API创建
-- 使用Edge Function或客户端代码调用supabase.auth.signUp()

-- ============================================
-- UAT测试账号清单
-- ============================================

-- 账号1: 中方协同用户
-- Email: cn_user@test.com
-- Password: Test@123
-- Role: operator
-- Tenant: CN
-- Full Name: 中方协同用户

-- 账号2: 日方现场用户
-- Email: jp_user@test.com
-- Password: Test@123
-- Role: operator
-- Tenant: JP
-- Full Name: 日方現場ユーザー

-- 账号3: 质量经理
-- Email: qa_manager@test.com
-- Password: Test@123
-- Role: quality_manager
-- Tenant: JP
-- Full Name: 品質マネージャー

-- 账号4: 高层管理
-- Email: admin@test.com
-- Password: Test@123
-- Role: admin
-- Tenant: JP
-- Full Name: 管理者

-- ============================================
-- 创建用户Profile表数据(在用户创建后执行)
-- ============================================

-- 注意: 需要替换下面的UUID为实际创建的用户UUID
-- 可以通过以下SQL查询用户UUID:
-- SELECT id, email FROM auth.users WHERE email IN ('cn_user@test.com', 'jp_user@test.com', 'qa_manager@test.com', 'admin@test.com');

-- 示例: 假设用户已创建,UUID如下
-- cn_user: 11111111-1111-1111-1111-111111111111
-- jp_user: 22222222-2222-2222-2222-222222222222
-- qa_manager: 33333333-3333-3333-3333-333333333333
-- admin: 44444444-4444-4444-4444-444444444444

-- 如果user_profiles表存在,插入profile数据
-- INSERT INTO user_profiles (id, username, full_name, role, tenant_id, created_at, updated_at)
-- VALUES 
--   ('11111111-1111-1111-1111-111111111111', 'cn_user', '中方协同用户', 'operator', 'CN', NOW(), NOW()),
--   ('22222222-2222-2222-2222-222222222222', 'jp_user', '日方現場ユーザー', 'operator', 'JP', NOW(), NOW()),
--   ('33333333-3333-3333-3333-333333333333', 'qa_manager', '品質マネージャー', 'quality_manager', 'JP', NOW(), NOW()),
--   ('44444444-4444-4444-4444-444444444444', 'admin', '管理者', 'admin', 'JP', NOW(), NOW());

-- ============================================
-- 验证账号创建
-- ============================================

-- 查询所有测试账号
-- SELECT id, email, created_at FROM auth.users 
-- WHERE email IN ('cn_user@test.com', 'jp_user@test.com', 'qa_manager@test.com', 'admin@test.com')
-- ORDER BY email;

-- 查询用户Profile
-- SELECT * FROM user_profiles 
-- WHERE username IN ('cn_user', 'jp_user', 'qa_manager', 'admin')
-- ORDER BY username;

-- ============================================
-- 测试账号使用说明
-- ============================================

/*
账号1: 中方协同用户
- 用户名: cn_user
- 邮箱: cn_user@test.com
- 密码: Test@123
- 租户: CN (中国工厂)
- 权限: operator (操作员)
- 测试范围: ASN/收货/IQC/特采/组装/老化

账号2: 日方现场用户
- 用户名: jp_user
- 邮箱: jp_user@test.com
- 密码: Test@123
- 租户: JP (日本工厂)
- 权限: operator (操作员)
- 测试范围: Final Test/QA Release/Shipment

账号3: 质量经理
- 用户名: qa_manager
- 邮箱: qa_manager@test.com
- 密码: Test@123
- 租户: JP (日本工厂)
- 权限: quality_manager (质量经理)
- 测试范围: IQC/特采/QA放行

账号4: 高层管理
- 用户名: admin
- 邮箱: admin@test.com
- 密码: Test@123
- 租户: JP (日本工厂)
- 权限: admin (管理员)
- 测试范围: 所有模块+看板
*/

-- ============================================
-- 创建测试账号的Edge Function示例
-- ============================================

/*
-- 文件: supabase/functions/create-test-users/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const testUsers = [
    { email: 'cn_user@test.com', password: 'Test@123', username: 'cn_user', full_name: '中方协同用户', role: 'operator', tenant_id: 'CN' },
    { email: 'jp_user@test.com', password: 'Test@123', username: 'jp_user', full_name: '日方現場ユーザー', role: 'operator', tenant_id: 'JP' },
    { email: 'qa_manager@test.com', password: 'Test@123', username: 'qa_manager', full_name: '品質マネージャー', role: 'quality_manager', tenant_id: 'JP' },
    { email: 'admin@test.com', password: 'Test@123', username: 'admin', full_name: '管理者', role: 'admin', tenant_id: 'JP' }
  ]

  const results = []

  for (const user of testUsers) {
    // 创建auth用户
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true
    })

    if (authError) {
      results.push({ email: user.email, success: false, error: authError.message })
      continue
    }

    // 创建user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        tenant_id: user.tenant_id
      })

    if (profileError) {
      results.push({ email: user.email, success: false, error: profileError.message })
    } else {
      results.push({ email: user.email, success: true, user_id: authData.user.id })
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
*/

COMMENT ON SCHEMA public IS 'UAT测试账号创建说明已准备 - 2026-04-17';
