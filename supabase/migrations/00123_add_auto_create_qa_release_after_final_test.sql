-- 修改submit_final_test_result函数，在终测通过后自动创建QA放行记录
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
  v_existing_qa_release BIGINT;
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
  
  -- 更新整机状态
  UPDATE finished_unit_traceability
  SET final_test_status = p_test_status
  WHERE finished_product_sn = v_test.finished_product_sn;
  
  -- 如果测试失败,生成异常
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
  
  -- 如果测试通过，自动创建QA放行记录
  IF p_test_status = 'pass' THEN
    -- 检查是否已有QA放行记录
    SELECT id INTO v_existing_qa_release
    FROM qa_releases
    WHERE finished_product_sn = v_test.finished_product_sn
    LIMIT 1;
    
    IF v_existing_qa_release IS NULL THEN
      -- 创建QA放行记录
      INSERT INTO qa_releases (
        finished_product_sn,
        release_status,
        tenant_id,
        created_by,
        created_at
      ) VALUES (
        v_test.finished_product_sn,
        'pending',
        p_tenant_id,
        p_user_id,
        NOW()
      );
      
      -- 更新整机状态
      UPDATE finished_unit_traceability
      SET qa_release_status = 'pending'
      WHERE finished_product_sn = v_test.finished_product_sn;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;