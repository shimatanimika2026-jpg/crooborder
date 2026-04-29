-- 修复主流程函数中的状态值不匹配和source_module错误

-- 1. 修复create_final_test函数: 老化状态应该检查'passed'而不是'pass'
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
  -- 检查老化测试状态 (修复: 应该是'passed'而不是'pass')
  SELECT status INTO v_aging_status 
  FROM aging_tests 
  WHERE finished_product_sn = p_finished_product_sn 
    AND tenant_id = p_tenant_id 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF v_aging_status IS NULL THEN 
    RAISE EXCEPTION '未找到老化测试记录'; 
  END IF;
  
  IF v_aging_status != 'passed' THEN 
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

-- 2. 修复execute_qa_release函数: source_module应该是'qa'而不是'qa_release'
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
  
  -- 如果被阻断,生成异常 (修复: source_module应该是'qa'而不是'qa_release')
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
      'qa',  -- 修复: 使用真实业务口径'qa'而不是'qa_release'
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

-- 3. 修复create_shipment函数: QA放行状态应该检查'approved'而不是'released'
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
  -- 检查 QA 放行状态 (修复: 应该是'approved'而不是'released')
  SELECT release_status INTO v_release_status 
  FROM qa_releases 
  WHERE finished_product_sn = p_finished_product_sn 
    AND tenant_id = p_tenant_id 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF v_release_status IS NULL THEN 
    RAISE EXCEPTION '未找到 QA 放行记录'; 
  END IF;
  
  IF v_release_status != 'approved' THEN 
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

COMMENT ON FUNCTION create_final_test IS '创建最终测试记录(修复:检查老化状态为passed)';
COMMENT ON FUNCTION execute_qa_release IS '执行QA放行(修复:source_module使用真实业务口径qa)';
COMMENT ON FUNCTION create_shipment IS '创建出货记录(修复:检查QA放行状态为approved)';