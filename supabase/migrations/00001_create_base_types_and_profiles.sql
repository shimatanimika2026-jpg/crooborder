-- 创建用户角色枚举类型
CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'cn_factory_manager', 'cn_production_staff', 'cn_quality_inspector', 'cn_logistics_staff', 'jp_factory_manager', 'jp_warehouse_staff', 'jp_assembly_staff', 'jp_quality_inspector', 'executive', 'system_admin');

-- 创建profiles表（用于用户信息同步）
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    language_preference VARCHAR(10) DEFAULT 'zh-CN' CHECK (language_preference IN ('zh-CN', 'ja-JP')),
    organization_id BIGINT,
    tenant_id VARCHAR(20) NOT NULL DEFAULT 'CN' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    role user_role DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'locked')),
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_profiles_organization ON profiles(organization_id);
CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_role ON profiles(role);

COMMENT ON TABLE profiles IS '用户档案表';
COMMENT ON COLUMN profiles.language_preference IS '语言偏好：zh-CN=中文，ja-JP=日语';
COMMENT ON COLUMN profiles.tenant_id IS '租户ID：CN=中方工厂，JP=日方工厂，BOTH=双方共享';

-- 创建handle_new_user触发器函数
CREATE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
  username_value text;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  -- 从email中提取用户名（去掉@miaoda.com后缀）
  username_value := REPLACE(NEW.email, '@miaoda.com', '');
  
  -- 插入profile记录
  INSERT INTO public.profiles (id, username, email, phone, role, tenant_id)
  VALUES (
    NEW.id,
    username_value,
    NEW.email,
    NEW.phone,
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END,
    CASE WHEN user_count = 0 THEN 'BOTH' ELSE 'CN' END
  );
  RETURN NEW;
END;
$$;

-- 创建触发器
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();

-- 创建辅助函数：检查用户角色
CREATE OR REPLACE FUNCTION has_role(uid uuid, role_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = uid AND p.role::text = role_name
  );
$$;

-- 创建辅助函数：检查租户访问权限
CREATE OR REPLACE FUNCTION can_access_tenant(uid uuid, target_tenant text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = uid 
    AND (p.tenant_id = target_tenant OR p.tenant_id = 'BOTH' OR p.role IN ('admin', 'executive', 'system_admin'))
  );
$$;

-- 配置profiles表的RLS策略
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "管理员可以查看所有用户" ON profiles
  FOR SELECT TO authenticated 
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'system_admin') OR has_role(auth.uid(), 'executive'));

CREATE POLICY "用户可以查看自己的档案" ON profiles
  FOR SELECT TO authenticated 
  USING (auth.uid() = id);

CREATE POLICY "管理员可以更新所有用户" ON profiles
  FOR UPDATE TO authenticated 
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'system_admin'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'system_admin'));

CREATE POLICY "用户可以更新自己的档案（除角色外）" ON profiles
  FOR UPDATE TO authenticated 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- 创建公开视图
CREATE VIEW public_profiles AS
  SELECT id, username, full_name, role, tenant_id, organization_id FROM profiles;