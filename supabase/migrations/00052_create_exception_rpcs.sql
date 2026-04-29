-- P2: 创建异常状态更新 RPC 函数

-- 1. 更新异常状态
CREATE OR REPLACE FUNCTION update_exception_status(
  p_exception_id BIGINT,
  p_new_status VARCHAR,
  p_updated_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status VARCHAR;
BEGIN
  -- 获取当前状态
  SELECT current_status INTO v_current_status
  FROM operation_exceptions
  WHERE id = p_exception_id;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION '异常不存在';
  END IF;
  
  -- 更新状态
  UPDATE operation_exceptions
  SET 
    current_status = p_new_status,
    updated_at = NOW()
  WHERE id = p_exception_id;
  
  -- 如果状态为 closed，记录关闭信息
  IF p_new_status = 'closed' THEN
    UPDATE operation_exceptions
    SET 
      closed_by = p_updated_by,
      closed_at = NOW()
    WHERE id = p_exception_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'exception_id', p_exception_id,
    'old_status', v_current_status,
    'new_status', p_new_status
  );
END;
$$;

-- 2. 指派异常负责人
CREATE OR REPLACE FUNCTION assign_exception_owner(
  p_exception_id BIGINT,
  p_owner_id UUID,
  p_assigned_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE operation_exceptions
  SET 
    owner_id = p_owner_id,
    current_status = CASE 
      WHEN current_status = 'open' THEN 'in_progress'
      ELSE current_status
    END,
    updated_at = NOW()
  WHERE id = p_exception_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '异常不存在';
  END IF;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'exception_id', p_exception_id,
    'owner_id', p_owner_id
  );
END;
$$;

-- 3. 更新异常处理信息
CREATE OR REPLACE FUNCTION update_exception_details(
  p_exception_id BIGINT,
  p_temporary_action TEXT DEFAULT NULL,
  p_root_cause TEXT DEFAULT NULL,
  p_corrective_action TEXT DEFAULT NULL,
  p_resolution_summary TEXT DEFAULT NULL,
  p_remarks TEXT DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE operation_exceptions
  SET 
    temporary_action = COALESCE(p_temporary_action, temporary_action),
    root_cause = COALESCE(p_root_cause, root_cause),
    corrective_action = COALESCE(p_corrective_action, corrective_action),
    resolution_summary = COALESCE(p_resolution_summary, resolution_summary),
    remarks = COALESCE(p_remarks, remarks),
    updated_at = NOW()
  WHERE id = p_exception_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '异常不存在';
  END IF;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'exception_id', p_exception_id
  );
END;
$$;

COMMENT ON FUNCTION update_exception_status IS 'P2: 更新异常状态';
COMMENT ON FUNCTION assign_exception_owner IS 'P2: 指派异常负责人';
COMMENT ON FUNCTION update_exception_details IS 'P2: 更新异常处理信息';
