-- 创建索引
CREATE INDEX IF NOT EXISTS idx_finished_unit_traceability_sn ON finished_unit_traceability(finished_product_sn);
CREATE INDEX IF NOT EXISTS idx_finished_unit_traceability_model ON finished_unit_traceability(product_model_id);
CREATE INDEX IF NOT EXISTS idx_aging_tests_sn ON aging_tests(finished_product_sn);
CREATE INDEX IF NOT EXISTS idx_aging_tests_status ON aging_tests(status);
CREATE INDEX IF NOT EXISTS idx_aging_test_logs_test ON aging_test_logs(aging_test_id);
CREATE INDEX IF NOT EXISTS idx_quality_exceptions_sn ON quality_exceptions(finished_product_sn);
CREATE INDEX IF NOT EXISTS idx_quality_exceptions_status ON quality_exceptions(status);
CREATE INDEX IF NOT EXISTS idx_cobot_devices_sn ON cobot_devices(finished_product_sn);

-- RLS策略
ALTER TABLE product_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE finished_unit_traceability ENABLE ROW LEVEL SECURITY;
ALTER TABLE aging_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE aging_test_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobot_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All users can view product_models" ON product_models;
CREATE POLICY "All users can view product_models" ON product_models FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage product_models" ON product_models;
CREATE POLICY "Admins can manage product_models" ON product_models FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "All users can view finished_unit_traceability" ON finished_unit_traceability;
CREATE POLICY "All users can view finished_unit_traceability" ON finished_unit_traceability FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Factory users can manage finished_unit_traceability" ON finished_unit_traceability;
CREATE POLICY "Factory users can manage finished_unit_traceability" ON finished_unit_traceability FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'china_factory') OR has_role(auth.uid(), 'japan_factory'));

DROP POLICY IF EXISTS "All users can view aging_tests" ON aging_tests;
CREATE POLICY "All users can view aging_tests" ON aging_tests FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Factory users can manage aging_tests" ON aging_tests;
CREATE POLICY "Factory users can manage aging_tests" ON aging_tests FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'japan_factory') OR has_role(auth.uid(), 'quality'));

DROP POLICY IF EXISTS "All users can view aging_test_logs" ON aging_test_logs;
CREATE POLICY "All users can view aging_test_logs" ON aging_test_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Factory users can create aging_test_logs" ON aging_test_logs;
CREATE POLICY "Factory users can create aging_test_logs" ON aging_test_logs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "All users can view quality_exceptions" ON quality_exceptions;
CREATE POLICY "All users can view quality_exceptions" ON quality_exceptions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Factory users can manage quality_exceptions" ON quality_exceptions;
CREATE POLICY "Factory users can manage quality_exceptions" ON quality_exceptions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'quality'));

DROP POLICY IF EXISTS "All users can view cobot_devices" ON cobot_devices;
CREATE POLICY "All users can view cobot_devices" ON cobot_devices FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage cobot_devices" ON cobot_devices;
CREATE POLICY "Admins can manage cobot_devices" ON cobot_devices FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 业务规则检查函数
CREATE OR REPLACE FUNCTION check_aging_requirement_before_release(p_finished_product_sn TEXT)
RETURNS TABLE(can_release BOOLEAN, block_reason TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_aging_required BOOLEAN;
  v_aging_status TEXT;
  v_aging_passed_at TIMESTAMPTZ;
BEGIN
  SELECT aging_required, aging_status, aging_passed_at
  INTO v_aging_required, v_aging_status, v_aging_passed_at
  FROM finished_unit_traceability
  WHERE finished_product_sn = p_finished_product_sn;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, '整机序列号不存在';
    RETURN;
  END IF;

  IF v_aging_required AND v_aging_status != 'passed' THEN
    RETURN QUERY SELECT false, '48小时老化试验未通过，不允许放行';
    RETURN;
  END IF;

  IF v_aging_required AND v_aging_passed_at IS NULL THEN
    RETURN QUERY SELECT false, '老化试验通过时间未记录';
    RETURN;
  END IF;

  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$;
