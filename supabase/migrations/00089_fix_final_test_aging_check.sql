-- 修复最终测试函数的老化状态检查
-- 应该检查 result = 'pass' 而不是 status = 'pass'

DROP FUNCTION IF EXISTS create_final_test(TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION create_final_test(
  p_finished_product_sn TEXT,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BIGINT AS $$
DECLARE
  v_test_id BIGINT;
  v_aging_result TEXT;
BEGIN
  -- 检查老化测试结果 (修复: 检查 result 而不是 status)
  SELECT result INTO v_aging_result 
  FROM aging_tests 
  WHERE finished_product_sn = p_finished_product_sn 
    AND tenant_id = p_tenant_id 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF v_aging_result IS NULL THEN 
    RAISE EXCEPTION '未找到老化测试记录'; 
  END IF;
  
  IF v_aging_result != 'pass' THEN 
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