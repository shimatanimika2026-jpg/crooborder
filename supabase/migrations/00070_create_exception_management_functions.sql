-- 关闭运营异常
CREATE OR REPLACE FUNCTION close_operation_exception(
  p_exception_id BIGINT,
  p_user_id UUID,
  p_close_reason TEXT,
  p_tenant_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exception RECORD;
BEGIN
  -- 查询异常记录
  SELECT * INTO v_exception FROM operation_exceptions WHERE id = p_exception_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION '异常记录不存在'; END IF;
  
  -- 状态验证：只有 open 或 resolved 状态可以关闭
  IF v_exception.current_status NOT IN ('open', 'resolved') THEN
    RAISE EXCEPTION '只有开放或已解决状态的异常可以关闭，当前状态：%', v_exception.current_status;
  END IF;
  
  -- 更新异常状态
  UPDATE operation_exceptions 
  SET 
    current_status = 'closed',
    closed_at = NOW(),
    resolver_id = p_user_id,
    close_reason = p_close_reason,
    updated_at = NOW()
  WHERE id = p_exception_id;
  
  -- 记录审计日志
  INSERT INTO exception_audit_logs (exception_type, exception_id, action, old_status, new_status, comment, operator_id, tenant_id)
  VALUES ('operation', p_exception_id, 'closed', v_exception.current_status::TEXT, 'closed', p_close_reason, p_user_id, p_tenant_id);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 解决运营异常
CREATE OR REPLACE FUNCTION resolve_operation_exception(
  p_exception_id BIGINT,
  p_user_id UUID,
  p_solution TEXT,
  p_tenant_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exception RECORD;
BEGIN
  SELECT * INTO v_exception FROM operation_exceptions WHERE id = p_exception_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION '异常记录不存在'; END IF;
  
  IF v_exception.current_status NOT IN ('open', 'assigned') THEN
    RAISE EXCEPTION '只有开放或已分配状态的异常可以解决，当前状态：%', v_exception.current_status;
  END IF;
  
  UPDATE operation_exceptions 
  SET 
    current_status = 'resolved',
    resolved_at = NOW(),
    resolver_id = p_user_id,
    solution = p_solution,
    updated_at = NOW()
  WHERE id = p_exception_id;
  
  INSERT INTO exception_audit_logs (exception_type, exception_id, action, old_status, new_status, comment, operator_id, tenant_id)
  VALUES ('operation', p_exception_id, 'resolved', v_exception.current_status::TEXT, 'resolved', p_solution, p_user_id, p_tenant_id);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 升级运营异常严重程度
CREATE OR REPLACE FUNCTION escalate_operation_exception(
  p_exception_id BIGINT,
  p_user_id UUID,
  p_new_severity TEXT,
  p_escalation_reason TEXT,
  p_tenant_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exception RECORD;
  v_severity_order TEXT[] := ARRAY['low', 'medium', 'high', 'critical'];
  v_old_index INT;
  v_new_index INT;
BEGIN
  SELECT * INTO v_exception FROM operation_exceptions WHERE id = p_exception_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION '异常记录不存在'; END IF;
  
  -- 验证新严重程度
  IF p_new_severity NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION '无效的严重程度：%', p_new_severity;
  END IF;
  
  -- 验证升级逻辑：新严重程度必须高于当前严重程度
  v_old_index := array_position(v_severity_order, v_exception.severity::TEXT);
  v_new_index := array_position(v_severity_order, p_new_severity);
  
  IF v_new_index <= v_old_index THEN
    RAISE EXCEPTION '新严重程度必须高于当前严重程度（当前：%，新：%）', v_exception.severity, p_new_severity;
  END IF;
  
  UPDATE operation_exceptions 
  SET 
    previous_severity = severity::TEXT,
    severity = p_new_severity::exception_severity,
    escalated_by = p_user_id,
    escalated_at = NOW(),
    escalation_reason = p_escalation_reason,
    updated_at = NOW()
  WHERE id = p_exception_id;
  
  INSERT INTO exception_audit_logs (exception_type, exception_id, action, old_severity, new_severity, comment, operator_id, tenant_id)
  VALUES ('operation', p_exception_id, 'escalated', v_exception.severity::TEXT, p_new_severity, p_escalation_reason, p_user_id, p_tenant_id);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 关闭质量异常
CREATE OR REPLACE FUNCTION close_quality_exception(
  p_exception_id BIGINT,
  p_user_id UUID,
  p_close_reason TEXT,
  p_tenant_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exception RECORD;
BEGIN
  SELECT * INTO v_exception FROM quality_exceptions WHERE id = p_exception_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION '异常记录不存在'; END IF;
  
  IF v_exception.status NOT IN ('open', 'resolved') THEN
    RAISE EXCEPTION '只有开放或已解决状态的异常可以关闭，当前状态：%', v_exception.status;
  END IF;
  
  UPDATE quality_exceptions 
  SET 
    status = 'closed',
    closed_at = NOW(),
    closed_by = p_user_id,
    close_reason = p_close_reason,
    updated_at = NOW()
  WHERE id = p_exception_id;
  
  INSERT INTO exception_audit_logs (exception_type, exception_id, action, old_status, new_status, comment, operator_id, tenant_id)
  VALUES ('quality', p_exception_id, 'closed', v_exception.status, 'closed', p_close_reason, p_user_id, p_tenant_id);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 解决质量异常
CREATE OR REPLACE FUNCTION resolve_quality_exception(
  p_exception_id BIGINT,
  p_user_id UUID,
  p_corrective_action TEXT,
  p_tenant_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exception RECORD;
BEGIN
  SELECT * INTO v_exception FROM quality_exceptions WHERE id = p_exception_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION '异常记录不存在'; END IF;
  
  IF v_exception.status NOT IN ('open', 'assigned') THEN
    RAISE EXCEPTION '只有开放或已分配状态的异常可以解决，当前状态：%', v_exception.status;
  END IF;
  
  UPDATE quality_exceptions 
  SET 
    status = 'resolved',
    corrective_action = p_corrective_action,
    updated_at = NOW()
  WHERE id = p_exception_id;
  
  INSERT INTO exception_audit_logs (exception_type, exception_id, action, old_status, new_status, comment, operator_id, tenant_id)
  VALUES ('quality', p_exception_id, 'resolved', v_exception.status, 'resolved', p_corrective_action, p_user_id, p_tenant_id);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 升级质量异常严重程度
CREATE OR REPLACE FUNCTION escalate_quality_exception(
  p_exception_id BIGINT,
  p_user_id UUID,
  p_new_severity TEXT,
  p_escalation_reason TEXT,
  p_tenant_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exception RECORD;
  v_severity_order TEXT[] := ARRAY['low', 'medium', 'high', 'critical'];
  v_old_index INT;
  v_new_index INT;
BEGIN
  SELECT * INTO v_exception FROM quality_exceptions WHERE id = p_exception_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION '异常记录不存在'; END IF;
  
  IF p_new_severity NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION '无效的严重程度：%', p_new_severity;
  END IF;
  
  v_old_index := array_position(v_severity_order, v_exception.severity);
  v_new_index := array_position(v_severity_order, p_new_severity);
  
  IF v_new_index <= v_old_index THEN
    RAISE EXCEPTION '新严重程度必须高于当前严重程度（当前：%，新：%）', v_exception.severity, p_new_severity;
  END IF;
  
  UPDATE quality_exceptions 
  SET 
    previous_severity = severity,
    severity = p_new_severity,
    escalated_by = p_user_id,
    escalated_at = NOW(),
    escalation_reason = p_escalation_reason,
    updated_at = NOW()
  WHERE id = p_exception_id;
  
  INSERT INTO exception_audit_logs (exception_type, exception_id, action, old_severity, new_severity, comment, operator_id, tenant_id)
  VALUES ('quality', p_exception_id, 'escalated', v_exception.severity, p_new_severity, p_escalation_reason, p_user_id, p_tenant_id);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;