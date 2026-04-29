
-- 删除旧的错误角色策略
DROP POLICY IF EXISTS "管理员和质检员可管理整机追溯" ON finished_unit_traceability;
DROP POLICY IF EXISTS "管理员和质检员可管理老化试验" ON aging_tests;
DROP POLICY IF EXISTS "管理员和质检员可管理质量异常" ON quality_exceptions;

-- finished_unit_traceability: 日本组装人员、质检员、管理员可写入
CREATE POLICY "日本现场人员可管理整机追溯"
ON finished_unit_traceability
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'system_admin', 'jp_factory_manager', 'jp_assembly_staff', 'jp_quality_inspector')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'system_admin', 'jp_factory_manager', 'jp_assembly_staff', 'jp_quality_inspector')
  )
);

-- aging_tests: 日本组装人员、质检员、管理员可管理
CREATE POLICY "日本现场人员可管理老化试验"
ON aging_tests
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'system_admin', 'jp_factory_manager', 'jp_assembly_staff', 'jp_quality_inspector')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'system_admin', 'jp_factory_manager', 'jp_assembly_staff', 'jp_quality_inspector')
  )
);

-- aging_test_logs: 日本现场人员可写入
CREATE POLICY "日本现场人员可管理老化日志"
ON aging_test_logs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'system_admin', 'jp_factory_manager', 'jp_assembly_staff', 'jp_quality_inspector')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'system_admin', 'jp_factory_manager', 'jp_assembly_staff', 'jp_quality_inspector')
  )
);

-- quality_exceptions: 质检员、管理员可管理
CREATE POLICY "质检员和管理员可管理质量异常"
ON quality_exceptions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'system_admin', 'jp_factory_manager', 'jp_quality_inspector', 'cn_quality_inspector')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'system_admin', 'jp_factory_manager', 'jp_quality_inspector', 'cn_quality_inspector')
  )
);
