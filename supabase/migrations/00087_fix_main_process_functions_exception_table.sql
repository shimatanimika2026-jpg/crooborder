-- 修复主流程函数中的异常表引用错误
-- 将 exceptions 表改为 operation_exceptions,并修复字段名映射

-- 重新创建最终测试函数
DROP FUNCTION IF EXISTS create_final_test(TEXT, TEXT, UUID);
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
  -- 检查老化测试状态
  SELECT status INTO v_aging_status 
  FROM aging_tests 
  WHERE finished_product_sn = p_finished_product_sn 
    AND tenant_id = p_tenant_id 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF v_aging_status IS NULL THEN 
    RAISE EXCEPTION '未找到老化测试记录'; 
  END IF;
  
  IF v_aging_status != 'pass' THEN 
    RAISE EXCEPTION '老化测试未通过，无法创建最终测试'; 
  END IF;
  
  -- 创建最终测试记录
  INSERT INTO final_tests (
    finished_product_sn, 
    test_status, 
    tenant_id, 
    created_by
  ) 
  VALUES (
    p_finished_product_sn, 
    'pending', 
    p_tenant_id, 
    p_user_id
  ) 
  RETURNING id INTO v_test_id;
  
  RETURN v_test_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重新创建录入最终测试结果函数
DROP FUNCTION IF EXISTS submit_final_test_result(BIGINT, TEXT, TEXT, TEXT, TEXT, UUID);
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
  v_exception_code TEXT;
BEGIN
  -- 获取测试记录
  SELECT * INTO v_test 
  FROM final_tests 
  WHERE id = p_test_id 
    AND tenant_id = p_tenant_id;
  
  IF NOT FOUND THEN 
    RAISE EXCEPTION '最终测试记录不存在'; 
  END IF;
  
  -- 更新测试结果
  UPDATE final_tests 
  SET 
    test_status = p_test_status,
    tested_at = NOW(),
    tester_id = p_user_id,
    defect_description = p_defect_description,
    notes = p_notes,
    updated_at = NOW()
  WHERE id = p_test_id;
  
  -- 如果测试失败,生成异常
  IF p_test_status = 'fail' THEN
    v_exception_code := 'EXC-FT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('operation_exceptions_id_seq')::TEXT, 6, '0');
    
    INSERT INTO operation_exceptions (
      exception_code,
      exception_type,
      severity,
      current_status,
      source_module,
      related_sn,
      title,
      description,
      reporter_id,
      reported_at,
      tenant_id
    ) 
    VALUES (
      v_exception_code,
      'final_test_failed',
      'high',
      'open',
      'final_test',
      v_test.finished_product_sn,
      '最终测试失败',
      COALESCE(p_defect_description, '最终测试失败'),
      p_user_id,
      NOW(),
      p_tenant_id
    ) 
    RETURNING id INTO v_exception_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重新创建 QA 放行记录函数
DROP FUNCTION IF EXISTS create_qa_release(TEXT, TEXT, UUID);
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
  -- 检查最终测试状态
  SELECT test_status INTO v_test_status 
  FROM final_tests 
  WHERE finished_product_sn = p_finished_product_sn 
    AND tenant_id = p_tenant_id 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF v_test_status IS NULL THEN 
    RAISE EXCEPTION '未找到最终测试记录'; 
  END IF;
  
  IF v_test_status != 'pass' THEN 
    RAISE EXCEPTION '最终测试未通过，无法创建 QA 放行'; 
  END IF;
  
  -- 创建 QA 放行记录
  INSERT INTO qa_releases (
    finished_product_sn, 
    release_status, 
    tenant_id, 
    created_by
  ) 
  VALUES (
    p_finished_product_sn, 
    'pending', 
    p_tenant_id, 
    p_user_id
  ) 
  RETURNING id INTO v_release_id;
  
  RETURN v_release_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重新创建执行 QA 放行函数
DROP FUNCTION IF EXISTS execute_qa_release(BIGINT, TEXT, TEXT, TEXT, TEXT, UUID);
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
  v_exception_code TEXT;
BEGIN
  -- 获取放行记录
  SELECT * INTO v_release 
  FROM qa_releases 
  WHERE id = p_release_id 
    AND tenant_id = p_tenant_id;
  
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'QA 放行记录不存在'; 
  END IF;
  
  -- 更新放行状态
  UPDATE qa_releases 
  SET 
    release_status = p_release_status,
    released_at = NOW(),
    released_by = p_user_id,
    remarks = p_remarks,
    block_reason = p_block_reason,
    updated_at = NOW()
  WHERE id = p_release_id;
  
  -- 如果被阻断,生成异常
  IF p_release_status = 'blocked' THEN
    v_exception_code := 'EXC-QA-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('operation_exceptions_id_seq')::TEXT, 6, '0');
    
    INSERT INTO operation_exceptions (
      exception_code,
      exception_type,
      severity,
      current_status,
      source_module,
      related_sn,
      title,
      description,
      reporter_id,
      reported_at,
      tenant_id
    ) 
    VALUES (
      v_exception_code,
      'qa_blocked',
      'high',
      'open',
      'qa_release',
      v_release.finished_product_sn,
      'QA 放行被阻断',
      COALESCE(p_block_reason, 'QA 放行被阻断'),
      p_user_id,
      NOW(),
      p_tenant_id
    ) 
    RETURNING id INTO v_exception_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重新创建出货记录函数
DROP FUNCTION IF EXISTS create_shipment(TEXT, TEXT, UUID);
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
  -- 检查 QA 放行状态 (修复: 应该是 'released' 而不是 'approved')
  SELECT release_status INTO v_release_status 
  FROM qa_releases 
  WHERE finished_product_sn = p_finished_product_sn 
    AND tenant_id = p_tenant_id 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF v_release_status IS NULL THEN 
    RAISE EXCEPTION '未找到 QA 放行记录'; 
  END IF;
  
  IF v_release_status != 'released' THEN 
    RAISE EXCEPTION 'QA 未放行，无法创建出货记录'; 
  END IF;
  
  -- 生成出货编号
  v_shipment_code := 'SHIP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('shipments_id_seq')::TEXT, 6, '0');
  
  -- 创建出货记录
  INSERT INTO shipments (
    shipment_code, 
    finished_product_sn, 
    shipment_status, 
    tenant_id, 
    created_by
  ) 
  VALUES (
    v_shipment_code, 
    p_finished_product_sn, 
    'pending', 
    p_tenant_id, 
    p_user_id
  ) 
  RETURNING id INTO v_shipment_id;
  
  RETURN v_shipment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重新创建确认出货函数
DROP FUNCTION IF EXISTS confirm_shipment(BIGINT, TEXT, TEXT, TEXT, TEXT, UUID);
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
  v_exception_code TEXT;
BEGIN
  -- 获取出货记录
  SELECT * INTO v_shipment 
  FROM shipments 
  WHERE id = p_shipment_id 
    AND tenant_id = p_tenant_id;
  
  IF NOT FOUND THEN 
    RAISE EXCEPTION '出货记录不存在'; 
  END IF;
  
  -- 更新出货状态
  UPDATE shipments 
  SET 
    shipment_status = p_shipment_status,
    shipped_at = NOW(),
    shipped_by = p_user_id,
    remarks = p_remarks,
    block_reason = p_block_reason,
    updated_at = NOW()
  WHERE id = p_shipment_id;
  
  -- 如果确认出货,创建确认记录
  IF p_shipment_status = 'confirmed' THEN
    INSERT INTO shipment_confirmations (
      shipment_id, 
      confirmed_by, 
      confirmation_notes, 
      tenant_id
    ) 
    VALUES (
      p_shipment_id, 
      p_user_id, 
      p_remarks, 
      p_tenant_id
    );
  END IF;
  
  -- 如果被阻断,生成异常
  IF p_shipment_status = 'blocked' THEN
    v_exception_code := 'EXC-SHIP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('operation_exceptions_id_seq')::TEXT, 6, '0');
    
    INSERT INTO operation_exceptions (
      exception_code,
      exception_type,
      severity,
      current_status,
      source_module,
      related_sn,
      title,
      description,
      reporter_id,
      reported_at,
      tenant_id
    ) 
    VALUES (
      v_exception_code,
      'shipment_blocked',
      'high',
      'open',
      'shipment',
      v_shipment.finished_product_sn,
      '出货被阻断',
      COALESCE(p_block_reason, '出货被阻断'),
      p_user_id,
      NOW(),
      p_tenant_id
    ) 
    RETURNING id INTO v_exception_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;