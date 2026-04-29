-- 执行委托单动作 RPC
-- 功能：统一执行委托单动作，包含完整的事务处理和状态流转
-- 作者：系统
-- 日期：2026-04-17

CREATE OR REPLACE FUNCTION execute_commission_action(
  p_commission_id INTEGER,
  p_action_type TEXT,
  p_operator_id UUID,
  p_action_data JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_commission RECORD;
  v_target_status TEXT;
  v_previous_status TEXT;
  v_operation_id INTEGER;
BEGIN
  -- 1. 校验委托单存在
  SELECT * INTO v_commission
  FROM commissions
  WHERE id = p_commission_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'COMMISSION_NOT_FOUND',
      'message', '委托单不存在'
    );
  END IF;

  -- 2. 校验操作是否允许
  -- accept: pending_acceptance
  IF p_action_type = 'accept' AND v_commission.status != 'pending_acceptance' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_STATUS',
      'message', '当前状态不允许接受操作',
      'current_status', v_commission.status
    );
  END IF;

  -- reject: pending_acceptance
  IF p_action_type = 'reject' AND v_commission.status != 'pending_acceptance' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_STATUS',
      'message', '当前状态不允许拒绝操作',
      'current_status', v_commission.status
    );
  END IF;

  -- register_plan: accepted
  IF p_action_type = 'register_plan' AND v_commission.status != 'accepted' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_STATUS',
      'message', '当前状态不允许登记计划操作',
      'current_status', v_commission.status
    );
  END IF;

  -- update_progress: in_production
  IF p_action_type = 'update_progress' AND v_commission.status != 'in_production' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_STATUS',
      'message', '当前状态不允许更新进度操作',
      'current_status', v_commission.status
    );
  END IF;

  -- register_shipment: in_production
  IF p_action_type = 'register_shipment' AND v_commission.status != 'in_production' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_STATUS',
      'message', '当前状态不允许登记发货操作',
      'current_status', v_commission.status
    );
  END IF;

  -- confirm_arrival: shipped
  IF p_action_type = 'confirm_arrival' AND v_commission.status != 'shipped' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_STATUS',
      'message', '当前状态不允许确认到货操作',
      'current_status', v_commission.status
    );
  END IF;

  -- report_exception: pending_acceptance, accepted, in_production, shipped
  IF p_action_type = 'report_exception' AND v_commission.status NOT IN ('pending_acceptance', 'accepted', 'in_production', 'shipped') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_STATUS',
      'message', '当前状态不允许上报异常操作',
      'current_status', v_commission.status
    );
  END IF;

  -- close_exception: exception
  IF p_action_type = 'close_exception' AND v_commission.status != 'exception' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_STATUS',
      'message', '当前状态不允许关闭异常操作',
      'current_status', v_commission.status
    );
  END IF;

  -- 3. 确定目标状态
  v_previous_status := v_commission.status;

  CASE p_action_type
    WHEN 'accept' THEN
      v_target_status := 'accepted';
    WHEN 'reject' THEN
      v_target_status := 'rejected';
    WHEN 'register_plan' THEN
      v_target_status := 'in_production';
    WHEN 'update_progress' THEN
      v_target_status := NULL; -- 不改变状态
    WHEN 'register_shipment' THEN
      v_target_status := 'shipped';
    WHEN 'confirm_arrival' THEN
      v_target_status := 'completed';
    WHEN 'report_exception' THEN
      v_target_status := 'exception';
    WHEN 'close_exception' THEN
      -- 从 action_data 中读取 previous_status
      v_target_status := p_action_data->>'previous_status';
      IF v_target_status IS NULL THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'MISSING_PREVIOUS_STATUS',
          'message', '关闭异常需要提供 previous_status'
        );
      END IF;
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'INVALID_ACTION_TYPE',
        'message', '无效的操作类型'
      );
  END CASE;

  -- 4. 写操作日志
  INSERT INTO commission_operations (
    commission_id,
    operation_type,
    operator_id,
    operation_data,
    previous_status,
    new_status
  ) VALUES (
    p_commission_id,
    p_action_type,
    p_operator_id,
    p_action_data,
    v_previous_status,
    COALESCE(v_target_status, v_previous_status)
  )
  RETURNING id INTO v_operation_id;

  -- 5. 更新委托单状态
  IF v_target_status IS NOT NULL THEN
    UPDATE commissions
    SET status = v_target_status,
        updated_at = NOW()
    WHERE id = p_commission_id;
  END IF;

  -- 6. 根据动作类型更新业务字段
  CASE p_action_type
    WHEN 'register_plan' THEN
      UPDATE commissions
      SET planned_start_date = (p_action_data->>'planned_start_date')::DATE,
          planned_end_date = (p_action_data->>'planned_end_date')::DATE,
          responsible_person = p_action_data->>'responsible_person',
          updated_at = NOW()
      WHERE id = p_commission_id;
    
    WHEN 'update_progress' THEN
      UPDATE commissions
      SET progress_percentage = (p_action_data->>'progress_percentage')::INTEGER,
          updated_at = NOW()
      WHERE id = p_commission_id;
    
    WHEN 'register_shipment' THEN
      UPDATE commissions
      SET shipment_date = (p_action_data->>'shipment_date')::DATE,
          tracking_no = p_action_data->>'tracking_no',
          carrier = p_action_data->>'carrier',
          updated_at = NOW()
      WHERE id = p_commission_id;
    
    WHEN 'confirm_arrival' THEN
      UPDATE commissions
      SET arrival_date = (p_action_data->>'arrival_date')::DATE,
          receiver = p_action_data->>'receiver',
          updated_at = NOW()
      WHERE id = p_commission_id;
    
    ELSE
      -- 其他动作不需要更新业务字段
      NULL;
  END CASE;

  -- 7. 返回成功结果
  RETURN jsonb_build_object(
    'success', true,
    'operation_id', v_operation_id,
    'previous_status', v_previous_status,
    'new_status', COALESCE(v_target_status, v_previous_status)
  );

EXCEPTION
  WHEN OTHERS THEN
    -- 事务会自动回滚
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INTERNAL_ERROR',
      'message', SQLERRM
    );
END;
$$;

-- 授权
GRANT EXECUTE ON FUNCTION execute_commission_action TO authenticated;

COMMENT ON FUNCTION execute_commission_action IS '执行委托单动作（包含完整事务处理）';
