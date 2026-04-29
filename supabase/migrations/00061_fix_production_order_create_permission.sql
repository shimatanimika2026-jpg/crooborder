-- 修复生产订单创建权限
-- 问题：当前策略只允许特定角色创建生产订单，普通用户无法创建

-- 删除旧的创建策略
DROP POLICY IF EXISTS "生产人员可以创建生产订单" ON production_orders;

-- 创建新的创建策略：允许所有认证用户创建本租户的生产订单
CREATE POLICY "认证用户可以创建本租户的生产订单" ON production_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    OR
    (SELECT tenant_id FROM profiles WHERE id = auth.uid()) = 'BOTH'
  );

COMMENT ON POLICY "认证用户可以创建本租户的生产订单" ON production_orders IS '允许认证用户创建本租户的生产订单';
