-- 修正blocked exception函数: 使用真实类型和真实业务口径

-- 1. 最终测试阻断异常
CREATE OR REPLACE FUNCTION create_final_test_blocked_exception(
  p_test_id BIGINT,
  p_finished_product_sn TEXT,
  p_block_reason TEXT,
  p_tenant_id TEXT,
  p_user_id UUID
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exception_id BIGINT;
  v_exception_code TEXT;
BEGIN
  -- 生成异常编号
  v_exception_code := 'EXC-FT-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS');
  
  -- 创建异常记录 (使用真实类型和真实业务口径)
  INSERT INTO operation_exceptions (
    exception_code,
    exception_type,
    severity,
    current_status,
    source_module,
    source_record_id,
    related_sn,
    related_final_test_id,
    title,
    description,
    reporter_id,
    owner_id,
    reported_at,
    tenant_id
  ) VALUES (
    v_exception_code,
    'final_test_blocked',  -- 真实类型,不是模糊大类'quality'
    'high',
    'open',
    'final_test',  -- 真实业务口径,不是旧口径'testing'
    p_test_id,
    p_finished_product_sn,
    p_test_id,
    '最终测试阻断',
    p_block_reason,
    p_user_id,
    p_user_id,
    NOW(),
    p_tenant_id
  ) RETURNING id INTO v_exception_id;
  
  RETURN v_exception_id;
END;
$$;

-- 2. QA 放行阻断异常
CREATE OR REPLACE FUNCTION create_qa_blocked_exception(
  p_release_id BIGINT,
  p_finished_product_sn TEXT,
  p_block_reason TEXT,
  p_tenant_id TEXT,
  p_user_id UUID
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exception_id BIGINT;
  v_exception_code TEXT;
BEGIN
  -- 生成异常编号
  v_exception_code := 'EXC-QA-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS');
  
  -- 创建异常记录 (使用真实类型和真实业务口径)
  INSERT INTO operation_exceptions (
    exception_code,
    exception_type,
    severity,
    current_status,
    source_module,
    source_record_id,
    related_sn,
    related_qa_release_id,
    title,
    description,
    reporter_id,
    owner_id,
    reported_at,
    tenant_id
  ) VALUES (
    v_exception_code,
    'qa_blocked',  -- 真实类型,不是模糊大类'quality'
    'high',
    'open',
    'qa',  -- 真实业务口径,不是旧口径'quality'
    p_release_id,
    p_finished_product_sn,
    p_release_id,
    'QA放行阻断',
    p_block_reason,
    p_user_id,
    p_user_id,
    NOW(),
    p_tenant_id
  ) RETURNING id INTO v_exception_id;
  
  RETURN v_exception_id;
END;
$$;

-- 3. 出货阻断异常
CREATE OR REPLACE FUNCTION create_shipment_blocked_exception(
  p_shipment_id BIGINT,
  p_finished_product_sn TEXT,
  p_block_reason TEXT,
  p_tenant_id TEXT,
  p_user_id UUID
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exception_id BIGINT;
  v_exception_code TEXT;
BEGIN
  -- 生成异常编号
  v_exception_code := 'EXC-SHIP-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS');
  
  -- 创建异常记录 (使用真实类型和真实业务口径)
  INSERT INTO operation_exceptions (
    exception_code,
    exception_type,
    severity,
    current_status,
    source_module,
    source_record_id,
    related_sn,
    related_shipment_confirmation_id,
    title,
    description,
    reporter_id,
    owner_id,
    reported_at,
    tenant_id
  ) VALUES (
    v_exception_code,
    'shipment_blocked',  -- 真实类型,不是模糊大类'logistics'
    'high',
    'open',
    'shipment',  -- 真实业务口径,不是旧口径'shipping'
    p_shipment_id,
    p_finished_product_sn,
    p_shipment_id,
    '出货阻断',
    p_block_reason,
    p_user_id,
    p_user_id,
    NOW(),
    p_tenant_id
  ) RETURNING id INTO v_exception_id;
  
  RETURN v_exception_id;
END;
$$;

COMMENT ON FUNCTION create_final_test_blocked_exception IS '创建最终测试阻断异常(使用真实类型final_test_blocked和真实业务口径final_test)';
COMMENT ON FUNCTION create_qa_blocked_exception IS '创建QA放行阻断异常(使用真实类型qa_blocked和真实业务口径qa)';
COMMENT ON FUNCTION create_shipment_blocked_exception IS '创建出货阻断异常(使用真实类型shipment_blocked和真实业务口径shipment)';