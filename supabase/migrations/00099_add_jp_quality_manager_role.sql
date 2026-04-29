-- 添加 jp_quality_manager 角色到 user_role 枚举
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'jp_quality_manager';