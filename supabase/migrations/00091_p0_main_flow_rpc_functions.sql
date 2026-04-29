-- P0: 主流程 RPC 函数

-- 删除旧函数（如果存在）
DROP FUNCTION IF EXISTS create_final_test(TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS submit_final_test_result(BIGINT, TEXT, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS create_qa_release(TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS execute_qa_release(BIGINT, TEXT, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS create_shipment_confirmation(TEXT, BIGINT, TEXT, UUID);
DROP FUNCTION IF EXISTS confirm_shipment(BIGINT, TEXT, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS confirm_shipment(BIGINT, TEXT, TIMESTAMPTZ, TEXT, UUID);
DROP FUNCTION IF EXISTS complete_aging_test(BIGINT, TEXT, TEXT, TEXT, UUID);

-- ============================================================
-- 1. 创建 Final Test 记录
-- ============================================================

CREATE OR REPLACE FUNCTION create_final_test(
  p_finished_product_sn TEXT,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_test_id BIGINT;
BEGIN
  -- 插入 final_tests 记录（触发器会自动校验前置条件）
  INSERT INTO final_tests (
    finished_product_sn,
    test_status,
    tenant_id,
    created_by,
    tester_id
  ) VALUES (
    p_finished_product_sn,
    'pending',
    p_tenant_id,
    p_user_id,
    p_user_id
  ) RETURNING id INTO v_test_id;

  RETURN v_test_id;
END;
$$;

COMMENT ON FUNCTION create_final_test IS 'P0: 创建 Final Test 记录';

-- ============================================================
-- 2. 提交 Final Test 结果
-- ============================================================

CREATE OR REPLACE FUNCTION submit_final_test_result(
  p_test_id BIGINT,
  p_test_status TEXT,
  p_defect_description TEXT,
  p_notes TEXT,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 更新测试结果
  UPDATE final_tests
  SET
    test_status = p_test_status,
    defect_description = p_defect_description,
    notes = p_notes,
    tested_at = NOW(),
    tester_id = p_user_id
  WHERE id = p_test_id AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '未找到测试记录 ID: %', p_test_id;
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION submit_final_test_result IS 'P0: 提交 Final Test 结果';

-- ============================================================
-- 3. 创建 QA Release 记录
-- ============================================================

CREATE OR REPLACE FUNCTION create_qa_release(
  p_finished_product_sn TEXT,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_release_id BIGINT;
BEGIN
  -- 插入 qa_releases 记录（触发器会自动校验前置条件）
  INSERT INTO qa_releases (
    finished_product_sn,
    release_status,
    tenant_id,
    created_by
  ) VALUES (
    p_finished_product_sn,
    'pending',
    p_tenant_id,
    p_user_id
  ) RETURNING id INTO v_release_id;

  RETURN v_release_id;
END;
$$;

COMMENT ON FUNCTION create_qa_release IS 'P0: 创建 QA Release 记录';

-- ============================================================
-- 4. 执行 QA Release
-- ============================================================

CREATE OR REPLACE FUNCTION execute_qa_release(
  p_release_id BIGINT,
  p_release_status TEXT,
  p_remarks TEXT,
  p_block_reason TEXT,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 更新放行状态
  UPDATE qa_releases
  SET
    release_status = p_release_status,
    remarks = p_remarks,
    block_reason = p_block_reason,
    released_at = NOW(),
    released_by = p_user_id
  WHERE id = p_release_id AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '未找到 QA 放行记录 ID: %', p_release_id;
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION execute_qa_release IS 'P0: 执行 QA Release';

-- ============================================================
-- 5. 创建 Shipment Confirmation 记录
-- ============================================================

CREATE OR REPLACE FUNCTION create_shipment_confirmation(
  p_finished_product_sn TEXT,
  p_shipment_id BIGINT,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_confirmation_id BIGINT;
BEGIN
  -- 插入 shipment_confirmations 记录（触发器会自动校验前置条件）
  INSERT INTO shipment_confirmations (
    finished_product_sn,
    shipment_id,
    confirmation_status,
    confirmed_at,
    confirmed_by,
    tenant_id
  ) VALUES (
    p_finished_product_sn,
    p_shipment_id,
    'pending',
    NOW(),
    p_user_id,
    p_tenant_id
  ) RETURNING id INTO v_confirmation_id;

  RETURN v_confirmation_id;
END;
$$;

COMMENT ON FUNCTION create_shipment_confirmation IS 'P0: 创建 Shipment Confirmation 记录';

-- ============================================================
-- 6. 确认出货
-- ============================================================

CREATE OR REPLACE FUNCTION confirm_shipment(
  p_confirmation_id BIGINT,
  p_confirmation_status TEXT,
  p_remarks TEXT,
  p_block_reason TEXT,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 更新确认状态
  UPDATE shipment_confirmations
  SET
    confirmation_status = p_confirmation_status,
    remarks = p_remarks,
    block_reason = p_block_reason,
    confirmed_at = NOW(),
    confirmed_by = p_user_id
  WHERE id = p_confirmation_id AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '未找到出货确认记录 ID: %', p_confirmation_id;
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION confirm_shipment IS 'P0: 确认出货';

-- ============================================================
-- 7. 完成老化测试（更新状态为 passed）
-- ============================================================

CREATE OR REPLACE FUNCTION complete_aging_test(
  p_test_id BIGINT,
  p_result TEXT,
  p_remarks TEXT,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 更新老化测试结果
  UPDATE aging_tests
  SET
    status = CASE 
      WHEN p_result = 'pass' THEN 'passed'
      WHEN p_result = 'fail' THEN 'failed'
      ELSE 'interrupted'
    END,
    result = p_result,
    remarks = p_remarks,
    ended_at = NOW(),
    qa_reviewer_id = p_user_id
  WHERE id = p_test_id AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '未找到老化测试记录 ID: %', p_test_id;
  END IF;

  -- 更新整机追溯表的老化状态
  UPDATE finished_unit_traceability
  SET aging_status = CASE 
    WHEN p_result = 'pass' THEN 'passed'
    WHEN p_result = 'fail' THEN 'failed'
    ELSE 'interrupted'
  END
  WHERE finished_product_sn = (
    SELECT finished_product_sn FROM aging_tests WHERE id = p_test_id
  );

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION complete_aging_test IS 'P0: 完成老化测试';
