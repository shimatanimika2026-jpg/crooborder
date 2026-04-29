-- ============================================
-- UAT测试账号 - Profile创建脚本
-- ============================================
-- 用途: 为UAT测试账号创建profile记录
-- 注意: 此脚本仅创建profile，Auth用户需通过Supabase Dashboard创建
-- ============================================

-- 步骤1: 生成UUID并创建profile记录
-- 注意: 记录返回的UUID，后续创建Auth用户时需要使用
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 生成新的UUID
  v_user_id := gen_random_uuid();
  
  -- 输出UUID（用于后续创建Auth用户）
  RAISE NOTICE '生成的User ID: %', v_user_id;
  RAISE NOTICE '请在Supabase Dashboard创建Auth用户时使用此UUID';
  RAISE NOTICE '或者记录此UUID，稍后手动创建profile';
  
  -- 创建profile记录
  INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    language_preference,
    tenant_id,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    'uat_test@miaoda.com',
    'UAT Test User',
    'executive',
    'zh-CN',
    'JP',
    NOW(),
    NOW()
  );
  
  RAISE NOTICE 'Profile记录创建成功！';
  RAISE NOTICE '邮箱: uat_test@miaoda.com';
  RAISE NOTICE '角色: executive';
  
END $$;

-- 验证创建结果
SELECT 
  id,
  email,
  full_name,
  role,
  language_preference,
  tenant_id,
  created_at
FROM profiles
WHERE email = 'uat_test@miaoda.com';

-- ============================================
-- 后续步骤:
-- 1. 记录上面输出的User ID
-- 2. 访问Supabase Dashboard: Authentication → Users
-- 3. 点击 "Add user" → "Create new user"
-- 4. 填写:
--    - Email: uat_test@miaoda.com
--    - Password: Test@2026
--    - 勾选 "Auto Confirm User"
-- 5. 创建后，Supabase会自动关联到已创建的profile
-- ============================================

-- 如果需要删除（测试失败时）
-- DELETE FROM profiles WHERE email = 'uat_test@miaoda.com';
