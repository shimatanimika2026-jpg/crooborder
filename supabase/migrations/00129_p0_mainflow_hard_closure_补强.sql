-- P0主流程硬闭合补强: 确保所有阻断场景都正确生成异常

-- 1. 补充submit_final_test_result函数，支持blocked状态生成异常
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
  
  -- 如果测试失败或被阻断,生成异常
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
  ELSIF p_test_status = 'blocked' THEN
    v_exception_id := create_operation_exception(
      p_exception_type := 'final_test_blocked',
      p_severity := 'high',
      p_source_module := 'final_test',
      p_source_record_id := p_test_id,
      p_related_sn := v_test.finished_product_sn,
      p_related_final_test_id := p_test_id,
      p_remarks := '最终测试被阻断: ' || COALESCE(p_defect_description, ''),
      p_tenant_id := p_tenant_id,
      p_reported_by := p_user_id
    );
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 创建老化测试失败/中断时生成异常的函数
CREATE OR REPLACE FUNCTION create_aging_test_exception(
  p_test_id BIGINT,
  p_finished_product_sn TEXT,
  p_status TEXT,
  p_failure_reason TEXT,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BIGINT AS $$
DECLARE
  v_exception_id BIGINT;
  v_exception_type TEXT;
  v_remarks TEXT;
BEGIN
  -- 根据状态确定异常类型
  IF p_status = 'failed' THEN
    v_exception_type := 'aging_test_failed';
    v_remarks := '老化测试失败: ' || COALESCE(p_failure_reason, '');
  ELSIF p_status = 'interrupted' THEN
    v_exception_type := 'aging_test_interrupted';
    v_remarks := '老化测试中断: ' || COALESCE(p_failure_reason, '');
  ELSE
    RAISE EXCEPTION '无效的异常状态: %', p_status;
  END IF;
  
  -- 创建异常
  v_exception_id := create_operation_exception(
    p_exception_type := v_exception_type,
    p_severity := 'high',
    p_source_module := 'aging_test',
    p_source_record_id := p_test_id,
    p_related_sn := p_finished_product_sn,
    p_related_aging_test_id := p_test_id,
    p_remarks := v_remarks,
    p_tenant_id := p_tenant_id,
    p_reported_by := p_user_id
  );
  
  RETURN v_exception_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 创建出货确认被阻断时生成异常的函数
CREATE OR REPLACE FUNCTION create_shipment_blocked_exception(
  p_shipment_id BIGINT,
  p_finished_product_sn TEXT,
  p_block_reason TEXT,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BIGINT AS $$
DECLARE
  v_exception_id BIGINT;
BEGIN
  v_exception_id := create_operation_exception(
    p_exception_type := 'shipment_blocked',
    p_severity := 'high',
    p_source_module := 'shipment',
    p_source_record_id := p_shipment_id,
    p_related_sn := p_finished_product_sn,
    p_related_shipment_id := p_shipment_id,
    p_remarks := '出货被阻断: ' || COALESCE(p_block_reason, ''),
    p_tenant_id := p_tenant_id,
    p_reported_by := p_user_id
  );
  
  RETURN v_exception_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 补充execute_shipment_confirmation函数，支持blocked状态
CREATE OR REPLACE FUNCTION execute_shipment_confirmation(
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
  
  -- 如果被阻断,生成异常
  IF p_shipment_status = 'blocked' THEN
    v_exception_id := create_shipment_blocked_exception(
      p_shipment_id := p_shipment_id,
      p_finished_product_sn := v_shipment.finished_product_sn,
      p_block_reason := p_block_reason,
      p_tenant_id := p_tenant_id,
      p_user_id := p_user_id
    );
  END IF;
  
  -- 如果确认出货,创建出货确认记录
  IF p_shipment_status = 'confirmed' OR p_shipment_status = 'shipped' THEN
    INSERT INTO shipment_confirmations (
      shipment_id,
      confirmed_at,
      confirmed_by,
      confirmation_notes,
      tenant_id
    ) VALUES (
      p_shipment_id,
      NOW(),
      p_user_id,
      p_remarks,
      p_tenant_id
    );
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;