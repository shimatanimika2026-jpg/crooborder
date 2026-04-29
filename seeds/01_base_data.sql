-- =====================================================
-- 数据库初始化脚本 - 基础数据
-- 版本: v1.0
-- 日期: 2026-04-19
-- 说明: 不写死 ID，使用 CTE 和子查询
-- =====================================================

-- =====================================================
-- 第一部分：组织架构初始化
-- =====================================================

-- 使用 CTE 插入组织架构，避免写死 ID
WITH cn_factory AS (
  INSERT INTO organizations (org_code, org_name_zh, org_name_ja, org_type, parent_id, tenant_id)
  VALUES ('CN-FACTORY', '中国工厂', '中国工場', 'factory', NULL, 'CN')
  RETURNING id, org_code
),
jp_factory AS (
  INSERT INTO organizations (org_code, org_name_zh, org_name_ja, org_type, parent_id, tenant_id)
  VALUES ('JP-FACTORY', '日本工厂', '日本工場', 'factory', NULL, 'JP')
  RETURNING id, org_code
),
cn_depts AS (
  INSERT INTO organizations (org_code, org_name_zh, org_name_ja, org_type, parent_id, tenant_id)
  SELECT 
    dept.org_code,
    dept.org_name_zh,
    dept.org_name_ja,
    'department',
    cn_factory.id,
    'CN'
  FROM cn_factory
  CROSS JOIN (VALUES
    ('CN-PROD-DEPT', '中国生产部', '中国生産部'),
    ('CN-QC-DEPT', '中国质检部', '中国品質管理部'),
    ('CN-LOGISTICS-DEPT', '中国物流部', '中国物流部')
  ) AS dept(org_code, org_name_zh, org_name_ja)
  RETURNING id, org_code
)
INSERT INTO organizations (org_code, org_name_zh, org_name_ja, org_type, parent_id, tenant_id)
SELECT 
  dept.org_code,
  dept.org_name_zh,
  dept.org_name_ja,
  'department',
  jp_factory.id,
  'JP'
FROM jp_factory
CROSS JOIN (VALUES
  ('JP-WAREHOUSE-DEPT', '日本仓库部', '日本倉庫部'),
  ('JP-ASSEMBLY-DEPT', '日本组装部', '日本組立部'),
  ('JP-QC-DEPT', '日本质检部', '日本品質管理部')
) AS dept(org_code, org_name_zh, org_name_ja);

-- =====================================================
-- 第二部分：产品型号初始化
-- =====================================================

INSERT INTO product_models (
  model_code, 
  model_name_zh, 
  model_name_ja, 
  model_category, 
  specifications, 
  standard_cycle_time, 
  status, 
  tenant_id
) VALUES
('FAIRINO-FR5', 'FAIRINO FR5协作机器人', 'FAIRINO FR5協働ロボット', '协作机器人', 
 '{"payload": "5kg", "reach": "900mm", "repeatability": "±0.02mm"}', 
 120, 'active', 'BOTH'),
('FAIRINO-FR10', 'FAIRINO FR10协作机器人', 'FAIRINO FR10協働ロボット', '协作机器人', 
 '{"payload": "10kg", "reach": "1300mm", "repeatability": "±0.03mm"}', 
 150, 'active', 'BOTH'),
('FAIRINO-FR20', 'FAIRINO FR20协作机器人', 'FAIRINO FR20協働ロボット', '协作机器人', 
 '{"payload": "20kg", "reach": "1800mm", "repeatability": "±0.05mm"}', 
 180, 'active', 'BOTH');

-- =====================================================
-- 第三部分：工作站初始化（如果需要）
-- =====================================================

-- 注意：这里不插入工作站数据，因为工作站表可能在后续 migration 中定义
-- 如需插入，请确保 work_stations 表已创建

-- =====================================================
-- 第四部分：基础配置数据
-- =====================================================

-- 插入默认库位（示例）
-- 注意：inventory_records 表通常由业务逻辑动态插入，这里仅作示例

-- =====================================================
-- 结束
-- =====================================================

-- 输出初始化结果
DO $$
DECLARE
  org_count INTEGER;
  model_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO org_count FROM organizations;
  SELECT COUNT(*) INTO model_count FROM product_models;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE '数据库初始化完成';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '组织架构数量: %', org_count;
  RAISE NOTICE '产品型号数量: %', model_count;
  RAISE NOTICE '==============================================';
END $$;
