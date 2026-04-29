
-- 允许authenticated用户为自己创建profile
CREATE POLICY "用户可为自己创建profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id  -- 只能插入自己的id
  AND role IN ('user', 'jp_assembly_staff', 'jp_quality_inspector', 'jp_warehouse_staff')  -- 受限角色
  AND status IN ('active', 'inactive')  -- 受限状态
  AND tenant_id IN ('CN', 'JP', 'BOTH')  -- 受限租户
);

-- 允许用户查看自己的profile
CREATE POLICY "用户可查看自己的profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 允许用户更新自己的profile（仅限部分字段）
CREATE POLICY "用户可更新自己的profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role IN ('user', 'jp_assembly_staff', 'jp_quality_inspector', 'jp_warehouse_staff')
);
