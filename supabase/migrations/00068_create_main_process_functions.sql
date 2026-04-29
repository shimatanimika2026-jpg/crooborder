-- 创建最终测试记录函数
CREATE OR REPLACE FUNCTION create_final_test(
  p_finished_product_sn TEXT,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BIGINT AS $$
DECLARE
  v_test_id BIGINT;
  v_aging_status TEXT;
BEGIN
  SELECT status INTO v_aging_status FROM aging_tests WHERE finished_product_sn = p_finished_product_sn AND tenant_id = p_tenant_id ORDER BY created_at DESC LIMIT 1;
  IF v_aging_status IS NULL THEN RAISE EXCEPTION '未找到老化测试记录'; END IF;
  IF v_aging_status != 'pass' THEN RAISE EXCEPTION '老化测试未通过，无法创建最终测试'; END IF;
  INSERT INTO final_tests (finished_product_sn, test_status, tenant_id, created_by) VALUES (p_finished_product_sn, 'pending', p_tenant_id, p_user_id) RETURNING id INTO v_test_id;
  RETURN v_test_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 录入最终测试结果函数
CREATE OR REPLACE FUNCTION submit_final_test_result(
  p_test_id BIGINT,
  p_test_status TEXT,
  p_defect_description TEXT,
  p_notes TEXT,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_test RECORD;
  v_exception_id BIGINT;
BEGIN
  SELECT * INTO v_test FROM final_tests WHERE id = p_test_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION '最终测试记录不存在'; END IF;
  UPDATE final_tests SET test_status = p_test_status, tested_at = NOW(), tester_id = p_user_id, defect_description = p_defect_description, notes = p_notes, updated_at = NOW() WHERE id = p_test_id;
  IF p_test_status = 'fail' THEN
    INSERT INTO exceptions (exception_type, severity, source_type, source_reference, description, status, tenant_id, created_by) VALUES ('final_test_failed', 'high', 'final_test', v_test.finished_product_sn, COALESCE(p_defect_description, '最终测试失败'), 'open', p_tenant_id, p_user_id) RETURNING id INTO v_exception_id;
  END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建 QA 放行记录函数
CREATE OR REPLACE FUNCTION create_qa_release(
  p_finished_product_sn TEXT,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BIGINT AS $$
DECLARE
  v_release_id BIGINT;
  v_test_status TEXT;
BEGIN
  SELECT test_status INTO v_test_status FROM final_tests WHERE finished_product_sn = p_finished_product_sn AND tenant_id = p_tenant_id ORDER BY created_at DESC LIMIT 1;
  IF v_test_status IS NULL THEN RAISE EXCEPTION '未找到最终测试记录'; END IF;
  IF v_test_status != 'pass' THEN RAISE EXCEPTION '最终测试未通过，无法创建 QA 放行'; END IF;
  INSERT INTO qa_releases (finished_product_sn, release_status, tenant_id, created_by) VALUES (p_finished_product_sn, 'pending', p_tenant_id, p_user_id) RETURNING id INTO v_release_id;
  RETURN v_release_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 执行 QA 放行函数
CREATE OR REPLACE FUNCTION execute_qa_release(
  p_release_id BIGINT,
  p_release_status TEXT,
  p_remarks TEXT,
  p_block_reason TEXT,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_release RECORD;
  v_exception_id BIGINT;
BEGIN
  SELECT * INTO v_release FROM qa_releases WHERE id = p_release_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'QA 放行记录不存在'; END IF;
  UPDATE qa_releases SET release_status = p_release_status, released_at = NOW(), released_by = p_user_id, remarks = p_remarks, block_reason = p_block_reason, updated_at = NOW() WHERE id = p_release_id;
  IF p_release_status = 'blocked' THEN
    INSERT INTO exceptions (exception_type, severity, source_type, source_reference, description, status, tenant_id, created_by) VALUES ('qa_blocked', 'high', 'qa_release', v_release.finished_product_sn, COALESCE(p_block_reason, 'QA 放行被阻断'), 'open', p_tenant_id, p_user_id) RETURNING id INTO v_exception_id;
  END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建出货记录函数
CREATE OR REPLACE FUNCTION create_shipment(
  p_finished_product_sn TEXT,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BIGINT AS $$
DECLARE
  v_shipment_id BIGINT;
  v_release_status TEXT;
  v_shipment_code TEXT;
BEGIN
  SELECT release_status INTO v_release_status FROM qa_releases WHERE finished_product_sn = p_finished_product_sn AND tenant_id = p_tenant_id ORDER BY created_at DESC LIMIT 1;
  IF v_release_status IS NULL THEN RAISE EXCEPTION '未找到 QA 放行记录'; END IF;
  IF v_release_status != 'approved' THEN RAISE EXCEPTION 'QA 未放行，无法创建出货记录'; END IF;
  v_shipment_code := 'SHIP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('shipments_id_seq')::TEXT, 6, '0');
  INSERT INTO shipments (shipment_code, finished_product_sn, shipment_status, tenant_id, created_by) VALUES (v_shipment_code, p_finished_product_sn, 'pending', p_tenant_id, p_user_id) RETURNING id INTO v_shipment_id;
  RETURN v_shipment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 确认出货函数
CREATE OR REPLACE FUNCTION confirm_shipment(
  p_shipment_id BIGINT,
  p_shipment_status TEXT,
  p_remarks TEXT,
  p_block_reason TEXT,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_shipment RECORD;
  v_exception_id BIGINT;
BEGIN
  SELECT * INTO v_shipment FROM shipments WHERE id = p_shipment_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION '出货记录不存在'; END IF;
  UPDATE shipments SET shipment_status = p_shipment_status, shipped_at = NOW(), shipped_by = p_user_id, remarks = p_remarks, block_reason = p_block_reason, updated_at = NOW() WHERE id = p_shipment_id;
  IF p_shipment_status = 'confirmed' THEN
    INSERT INTO shipment_confirmations (shipment_id, confirmed_by, confirmation_notes, tenant_id) VALUES (p_shipment_id, p_user_id, p_remarks, p_tenant_id);
  END IF;
  IF p_shipment_status = 'blocked' THEN
    INSERT INTO exceptions (exception_type, severity, source_type, source_reference, description, status, tenant_id, created_by) VALUES ('shipment_blocked', 'high', 'shipment', v_shipment.finished_product_sn, COALESCE(p_block_reason, '出货被阻断'), 'open', p_tenant_id, p_user_id) RETURNING id INTO v_exception_id;
  END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;