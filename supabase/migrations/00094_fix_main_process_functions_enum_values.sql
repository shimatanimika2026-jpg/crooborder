-- 修复主流程函数中的异常生成,使用正确的枚举值

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
  
  -- 如果测试失败,生成异常 (使用真实异常类型和来源模块)
  IF p_test_status = 'fail' THEN
    v_exception_id := create_operation_exception(
      p_exception_type := 'final_test_failed',
      p_severity := 'high',
      p_source_module := 'final_test',
      p_source_record_id := p_test_id,
      p_related_sn := v_test.finished_product_sn,
      p_related_final_test_id := p_test_id,
      p_remarks := '最终测试失败: ' || COALESCE(p_defect_description, ''),
      p_tenant_id := p_tenant_id,
      p_reported_by := p_user_id
    );
  END IF;
  
  RETURN TRUE;
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
  
  -- 如果被阻断,生成异常 (使用真实异常类型和来源模块)
  IF p_release_status = 'blocked' THEN
    v_exception_id := create_operation_exception(
      p_exception_type := 'qa_blocked',
      p_severity := 'high',
      p_source_module := 'qa',
      p_source_record_id := p_release_id,
      p_related_sn := v_release.finished_product_sn,
      p_related_qa_release_id := p_release_id,
      p_remarks := 'QA 放行被阻断: ' || COALESCE(p_block_reason, ''),
      p_tenant_id := p_tenant_id,
      p_reported_by := p_user_id
    );
  END IF;
  
  RETURN TRUE;
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
  
  -- 如果被阻断,生成异常 (使用真实异常类型和来源模块)
  IF p_shipment_status = 'blocked' THEN
    v_exception_id := create_operation_exception(
      p_exception_type := 'shipment_blocked',
      p_severity := 'high',
      p_source_module := 'shipment',
      p_source_record_id := p_shipment_id,
      p_related_sn := v_shipment.finished_product_sn,
      p_related_shipment_id := p_shipment_id,
      p_remarks := '出货被阻断: ' || COALESCE(p_block_reason, ''),
      p_tenant_id := p_tenant_id,
      p_reported_by := p_user_id
    );
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;