-- 为生产计划审批系统添加基于角色的访问权限控制

-- =====================================================
-- 1. 重新创建审批通过函数（增加角色检查）
-- =====================================================
DROP FUNCTION IF EXISTS approve_production_plan(BIGINT, TEXT, UUID, TEXT);

CREATE FUNCTION approve_production_plan(
  p_plan_id BIGINT,
  p_tenant_id TEXT,
  p_approver_id UUID,
  p_comments TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan RECORD;
  v_user_role TEXT;
BEGIN
  -- 1. 检查用户角色（只有 cn_factory_manager 或 jp_factory_manager 可以审批）
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = p_approver_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '用户不存在：ID %', p_approver_id;
  END IF;

  IF v_user_role NOT IN ('cn_factory_manager', 'jp_factory_manager') THEN
    RAISE EXCEPTION '权限不足：只有工厂经理可以审批生产计划（当前角色：%）', v_user_role;
  END IF;

  -- 2. 获取计划信息
  SELECT * INTO v_plan
  FROM production_plans
  WHERE id = p_plan_id
    AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '生产计划不存在：ID %', p_plan_id;
  END IF;

  -- 3. 检查计划状态
  IF v_plan.status != 'submitted' THEN
    RAISE EXCEPTION '只有已提交状态的计划可以审批，当前状态：%', v_plan.status;
  END IF;

  -- 4. 更新计划状态为已批准
  UPDATE production_plans
  SET 
    status = 'approved',
    approved_by = p_approver_id,
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_plan_id;

  -- 5. 更新审批记录
  UPDATE production_plan_approvals
  SET 
    approval_status = 'approved',
    approver_id = p_approver_id,
    approval_comment = p_comments,
    approved_at = NOW()
  WHERE plan_id = p_plan_id
    AND approval_status = 'pending';

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_production_plan IS '审批通过生产计划（需要 cn_factory_manager 或 jp_factory_manager 角色）';

-- =====================================================
-- 2. 重新创建审批拒绝函数（增加角色检查）
-- =====================================================
DROP FUNCTION IF EXISTS reject_production_plan(BIGINT, TEXT, UUID, TEXT);

CREATE FUNCTION reject_production_plan(
  p_plan_id BIGINT,
  p_tenant_id TEXT,
  p_rejector_id UUID,
  p_rejection_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan RECORD;
  v_user_role TEXT;
BEGIN
  -- 1. 检查用户角色（只有 cn_factory_manager 或 jp_factory_manager 可以拒绝）
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = p_rejector_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '用户不存在：ID %', p_rejector_id;
  END IF;

  IF v_user_role NOT IN ('cn_factory_manager', 'jp_factory_manager') THEN
    RAISE EXCEPTION '权限不足：只有工厂经理可以审批生产计划（当前角色：%）', v_user_role;
  END IF;

  -- 2. 获取计划信息
  SELECT * INTO v_plan
  FROM production_plans
  WHERE id = p_plan_id
    AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '生产计划不存在：ID %', p_plan_id;
  END IF;

  -- 3. 检查计划状态
  IF v_plan.status != 'submitted' THEN
    RAISE EXCEPTION '只有已提交状态的计划可以拒绝，当前状态：%', v_plan.status;
  END IF;

  -- 4. 更新计划状态为已拒绝
  UPDATE production_plans
  SET 
    status = 'rejected',
    rejected_by = p_rejector_id,
    rejected_at = NOW(),
    rejection_reason = p_rejection_reason,
    updated_at = NOW()
  WHERE id = p_plan_id;

  -- 5. 更新审批记录
  UPDATE production_plan_approvals
  SET 
    approval_status = 'rejected',
    rejected_by = p_rejector_id,
    rejected_at = NOW(),
    rejection_reason = p_rejection_reason
  WHERE plan_id = p_plan_id
    AND approval_status = 'pending';

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reject_production_plan IS '审批拒绝生产计划（需要 cn_factory_manager 或 jp_factory_manager 角色）';

-- =====================================================
-- 3. 重新创建生效函数（增加角色检查）
-- =====================================================
DROP FUNCTION IF EXISTS activate_production_plan(BIGINT, TEXT, UUID);

CREATE FUNCTION activate_production_plan(
  p_plan_id BIGINT,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan RECORD;
  v_user_role TEXT;
BEGIN
  -- 1. 检查用户角色（只有 executive 可以生效）
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '用户不存在：ID %', p_user_id;
  END IF;

  IF v_user_role != 'executive' THEN
    RAISE EXCEPTION '权限不足：只有高管可以生效生产计划（当前角色：%）', v_user_role;
  END IF;

  -- 2. 获取计划信息
  SELECT * INTO v_plan
  FROM production_plans
  WHERE id = p_plan_id
    AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '生产计划不存在：ID %', p_plan_id;
  END IF;

  -- 3. 检查计划状态
  IF v_plan.status != 'approved' THEN
    RAISE EXCEPTION '只有已批准状态的计划可以生效，当前状态：%', v_plan.status;
  END IF;

  -- 4. 更新计划状态为已生效
  UPDATE production_plans
  SET 
    status = 'active',
    activated_by = p_user_id,
    activated_at = NOW(),
    updated_at = NOW()
  WHERE id = p_plan_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION activate_production_plan IS '生效生产计划（需要 executive 角色）';

-- =====================================================
-- 4. 重新创建关闭函数（增加角色检查）
-- =====================================================
DROP FUNCTION IF EXISTS close_production_plan(BIGINT, TEXT, UUID, TEXT);

CREATE FUNCTION close_production_plan(
  p_plan_id BIGINT,
  p_tenant_id TEXT,
  p_user_id UUID,
  p_close_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan RECORD;
  v_user_role TEXT;
BEGIN
  -- 1. 检查用户角色（只有 executive 可以关闭）
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '用户不存在：ID %', p_user_id;
  END IF;

  IF v_user_role != 'executive' THEN
    RAISE EXCEPTION '权限不足：只有高管可以关闭生产计划（当前角色：%）', v_user_role;
  END IF;

  -- 2. 获取计划信息
  SELECT * INTO v_plan
  FROM production_plans
  WHERE id = p_plan_id
    AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '生产计划不存在：ID %', p_plan_id;
  END IF;

  -- 3. 检查计划状态
  IF v_plan.status != 'active' THEN
    RAISE EXCEPTION '只有已生效状态的计划可以关闭，当前状态：%', v_plan.status;
  END IF;

  -- 4. 更新计划状态为已关闭
  UPDATE production_plans
  SET 
    status = 'closed',
    closed_by = p_user_id,
    closed_at = NOW(),
    close_reason = p_close_reason,
    updated_at = NOW()
  WHERE id = p_plan_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION close_production_plan IS '关闭生产计划（需要 executive 角色）';