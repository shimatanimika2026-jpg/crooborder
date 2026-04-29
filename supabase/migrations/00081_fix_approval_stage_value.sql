-- 修复审批阶段值

DROP FUNCTION IF EXISTS submit_plan_for_approval(BIGINT, TEXT, UUID);

CREATE FUNCTION submit_plan_for_approval(
  p_plan_id BIGINT,
  p_tenant_id TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan RECORD;
  v_current_version INTEGER;
BEGIN
  -- 1. 获取计划信息
  SELECT * INTO v_plan
  FROM production_plans
  WHERE id = p_plan_id
    AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '生产计划不存在：ID %', p_plan_id;
  END IF;

  -- 2. 检查计划状态（draft 或 rejected 可以提交）
  IF v_plan.status NOT IN ('draft', 'rejected') THEN
    RAISE EXCEPTION '只有草稿或已拒绝状态的计划可以提交审批，当前状态：%', v_plan.status;
  END IF;

  -- 3. 如果是重新提交，版本号+1
  IF v_plan.status = 'rejected' THEN
    v_current_version := COALESCE(v_plan.current_version, 1) + 1;
    
    -- 保存版本快照
    INSERT INTO production_plan_versions (
      plan_id,
      version,
      plan_data,
      change_summary,
      created_by,
      tenant_id
    ) VALUES (
      p_plan_id,
      v_current_version,
      row_to_json(v_plan)::JSONB,
      '重新提交审批',
      p_user_id,
      p_tenant_id
    );
    
    -- 更新版本号
    UPDATE production_plans
    SET current_version = v_current_version
    WHERE id = p_plan_id;
  ELSE
    v_current_version := COALESCE(v_plan.current_version, 1);
  END IF;

  -- 4. 更新计划状态为已提交
  UPDATE production_plans
  SET 
    status = 'submitted',
    updated_at = NOW()
  WHERE id = p_plan_id;

  -- 5. 创建审批记录（使用 cn_approval 作为默认审批阶段）
  INSERT INTO production_plan_approvals (
    plan_id,
    version_number,
    approval_stage,
    approval_status,
    tenant_id
  ) VALUES (
    p_plan_id,
    v_current_version,
    'cn_approval',
    'pending',
    p_tenant_id
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION submit_plan_for_approval IS '提交生产计划审批（支持重新提交）';