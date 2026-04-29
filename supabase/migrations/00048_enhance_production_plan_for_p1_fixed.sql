-- P1 生产计划模块补全：补全字段和状态流转

-- 1. 补全 production_plans 表字段
ALTER TABLE production_plans
ADD COLUMN IF NOT EXISTS product_model_id INTEGER REFERENCES product_models(id),
ADD COLUMN IF NOT EXISTS factory_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS remarks TEXT;

-- 2. 调整 status 枚举值（保留原有值，添加新值）
ALTER TABLE production_plans DROP CONSTRAINT IF EXISTS production_plans_status_check;
ALTER TABLE production_plans ADD CONSTRAINT production_plans_status_check 
  CHECK (status IN ('draft', 'submitted', 'pending_cn_approval', 'pending_jp_approval', 'approved', 'rejected', 'active', 'executing', 'completed', 'closed', 'cancelled'));

-- 3. 创建状态流转 RPC 函数

-- 3.1 提交审批
CREATE OR REPLACE FUNCTION submit_production_plan(
  p_plan_id BIGINT,
  p_submitter_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
  v_plan_code TEXT;
  v_current_version INTEGER;
BEGIN
  -- 检查计划状态
  SELECT status, plan_code, current_version INTO v_current_status, v_plan_code, v_current_version
  FROM production_plans
  WHERE id = p_plan_id;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION '生产计划不存在';
  END IF;
  
  IF v_current_status != 'draft' THEN
    RAISE EXCEPTION '只有草稿状态的计划可以提交审批';
  END IF;
  
  -- 更新状态为 submitted
  UPDATE production_plans
  SET 
    status = 'submitted',
    updated_by = p_submitter_id,
    updated_at = NOW()
  WHERE id = p_plan_id;
  
  -- 创建审批记录
  INSERT INTO production_plan_approvals (
    plan_id,
    version_number,
    approval_stage,
    approval_status
  ) VALUES (
    p_plan_id,
    v_current_version,
    'cn_approval',
    'pending'
  );
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'plan_id', p_plan_id,
    'plan_code', v_plan_code,
    'new_status', 'submitted'
  );
END;
$$;

-- 3.2 审批通过
CREATE OR REPLACE FUNCTION approve_production_plan(
  p_plan_id BIGINT,
  p_approver_id UUID,
  p_approval_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
  v_plan_code TEXT;
  v_approval_id BIGINT;
BEGIN
  -- 检查计划状态
  SELECT status, plan_code INTO v_current_status, v_plan_code
  FROM production_plans
  WHERE id = p_plan_id;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION '生产计划不存在';
  END IF;
  
  IF v_current_status NOT IN ('submitted', 'pending_cn_approval', 'pending_jp_approval') THEN
    RAISE EXCEPTION '只有待审批状态的计划可以审批';
  END IF;
  
  -- 更新状态为 approved
  UPDATE production_plans
  SET 
    status = 'approved',
    updated_by = p_approver_id,
    updated_at = NOW()
  WHERE id = p_plan_id;
  
  -- 查找待审批记录
  SELECT id INTO v_approval_id
  FROM production_plan_approvals
  WHERE plan_id = p_plan_id
    AND approval_status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- 更新审批记录
  IF v_approval_id IS NOT NULL THEN
    UPDATE production_plan_approvals
    SET 
      approver_id = p_approver_id,
      approval_status = 'approved',
      approval_comment = p_approval_comment,
      approved_at = NOW()
    WHERE id = v_approval_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'plan_id', p_plan_id,
    'plan_code', v_plan_code,
    'new_status', 'approved'
  );
END;
$$;

-- 3.3 审批拒绝
CREATE OR REPLACE FUNCTION reject_production_plan(
  p_plan_id BIGINT,
  p_approver_id UUID,
  p_rejection_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
  v_plan_code TEXT;
  v_approval_id BIGINT;
BEGIN
  -- 检查计划状态
  SELECT status, plan_code INTO v_current_status, v_plan_code
  FROM production_plans
  WHERE id = p_plan_id;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION '生产计划不存在';
  END IF;
  
  IF v_current_status NOT IN ('submitted', 'pending_cn_approval', 'pending_jp_approval') THEN
    RAISE EXCEPTION '只有待审批状态的计划可以拒绝';
  END IF;
  
  -- 更新状态为 rejected
  UPDATE production_plans
  SET 
    status = 'rejected',
    updated_by = p_approver_id,
    updated_at = NOW()
  WHERE id = p_plan_id;
  
  -- 查找待审批记录
  SELECT id INTO v_approval_id
  FROM production_plan_approvals
  WHERE plan_id = p_plan_id
    AND approval_status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- 更新审批记录
  IF v_approval_id IS NOT NULL THEN
    UPDATE production_plan_approvals
    SET 
      approver_id = p_approver_id,
      approval_status = 'rejected',
      approval_comment = p_rejection_reason,
      approved_at = NOW()
    WHERE id = v_approval_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'plan_id', p_plan_id,
    'plan_code', v_plan_code,
    'new_status', 'rejected'
  );
END;
$$;

-- 3.4 生效
CREATE OR REPLACE FUNCTION activate_production_plan(
  p_plan_id BIGINT,
  p_operator_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
  v_plan_code TEXT;
BEGIN
  -- 检查计划状态
  SELECT status, plan_code INTO v_current_status, v_plan_code
  FROM production_plans
  WHERE id = p_plan_id;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION '生产计划不存在';
  END IF;
  
  IF v_current_status != 'approved' THEN
    RAISE EXCEPTION '只有已审批的计划可以生效';
  END IF;
  
  -- 更新状态为 active
  UPDATE production_plans
  SET 
    status = 'active',
    updated_by = p_operator_id,
    updated_at = NOW()
  WHERE id = p_plan_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'plan_id', p_plan_id,
    'plan_code', v_plan_code,
    'new_status', 'active'
  );
END;
$$;

-- 3.5 关闭
CREATE OR REPLACE FUNCTION close_production_plan(
  p_plan_id BIGINT,
  p_operator_id UUID,
  p_close_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
  v_plan_code TEXT;
BEGIN
  -- 检查计划状态
  SELECT status, plan_code INTO v_current_status, v_plan_code
  FROM production_plans
  WHERE id = p_plan_id;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION '生产计划不存在';
  END IF;
  
  IF v_current_status NOT IN ('active', 'executing') THEN
    RAISE EXCEPTION '只有生效中的计划可以关闭';
  END IF;
  
  -- 更新状态为 closed
  UPDATE production_plans
  SET 
    status = 'closed',
    remarks = COALESCE(remarks || E'\n', '') || '关闭原因: ' || COALESCE(p_close_reason, '无'),
    updated_by = p_operator_id,
    updated_at = NOW()
  WHERE id = p_plan_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'plan_id', p_plan_id,
    'plan_code', v_plan_code,
    'new_status', 'closed'
  );
END;
$$;

-- 4. 创建版本管理 RPC 函数

-- 4.1 创建新版本（编辑计划时调用）
CREATE OR REPLACE FUNCTION create_production_plan_version(
  p_plan_id BIGINT,
  p_change_reason TEXT,
  p_change_description TEXT,
  p_plan_details JSONB,
  p_creator_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_version INTEGER;
  v_new_version INTEGER;
  v_current_status TEXT;
BEGIN
  -- 检查计划状态
  SELECT status, current_version INTO v_current_status, v_current_version
  FROM production_plans
  WHERE id = p_plan_id;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION '生产计划不存在';
  END IF;
  
  -- 只有 draft 或 rejected 状态可以编辑
  IF v_current_status NOT IN ('draft', 'rejected') THEN
    RAISE EXCEPTION '只有草稿或已拒绝状态的计划可以编辑';
  END IF;
  
  -- 生成新版本号
  v_new_version := v_current_version + 1;
  
  -- 创建版本记录
  INSERT INTO production_plan_versions (
    plan_id,
    version_number,
    change_reason,
    change_description,
    plan_details,
    created_by
  ) VALUES (
    p_plan_id,
    v_new_version,
    p_change_reason,
    p_change_description,
    p_plan_details,
    p_creator_id
  );
  
  -- 更新计划的当前版本号
  UPDATE production_plans
  SET 
    current_version = v_new_version,
    updated_by = p_creator_id,
    updated_at = NOW()
  WHERE id = p_plan_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'plan_id', p_plan_id,
    'new_version', v_new_version
  );
END;
$$;

COMMENT ON FUNCTION submit_production_plan IS 'P1: 提交生产计划审批';
COMMENT ON FUNCTION approve_production_plan IS 'P1: 审批通过生产计划';
COMMENT ON FUNCTION reject_production_plan IS 'P1: 审批拒绝生产计划';
COMMENT ON FUNCTION activate_production_plan IS 'P1: 生效生产计划';
COMMENT ON FUNCTION close_production_plan IS 'P1: 关闭生产计划';
COMMENT ON FUNCTION create_production_plan_version IS 'P1: 创建生产计划新版本';