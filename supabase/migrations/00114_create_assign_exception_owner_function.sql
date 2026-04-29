
-- 创建异常指派负责人函数
CREATE OR REPLACE FUNCTION assign_exception_owner(
  p_exception_id BIGINT,
  p_owner_id UUID,
  p_assigned_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 更新异常负责人
  UPDATE operation_exceptions
  SET 
    owner_id = p_owner_id,
    assigned_at = NOW(),
    updated_at = NOW()
  WHERE id = p_exception_id;
  
  -- 如果异常状态是open，更新为assigned
  UPDATE operation_exceptions
  SET current_status = 'assigned'
  WHERE id = p_exception_id
    AND current_status = 'open';
END;
$$;
