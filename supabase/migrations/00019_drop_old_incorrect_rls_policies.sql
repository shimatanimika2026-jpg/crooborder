
-- 删除00012中使用错误角色名的旧策略

-- finished_unit_traceability 旧策略
DROP POLICY IF EXISTS "Factory users can manage finished_unit_traceability" ON finished_unit_traceability;

-- aging_tests 旧策略
DROP POLICY IF EXISTS "Factory users can manage aging_tests" ON aging_tests;

-- quality_exceptions 旧策略
DROP POLICY IF EXISTS "Factory users can manage quality_exceptions" ON quality_exceptions;

-- 验证：列出当前所有策略，确保只保留正确角色名的策略
-- SELECT schemaname, tablename, policyname 
-- FROM pg_policies 
-- WHERE tablename IN ('finished_unit_traceability', 'aging_tests', 'quality_exceptions')
-- ORDER BY tablename, policyname;
