-- 创建新的生产计划审批流程函数

-- =====================================================
-- 1. 为 production_orders 添加 plan_id 关联
-- =====================================================

ALTER TABLE production_orders 
  ADD COLUMN IF NOT EXISTS plan_id BIGINT REFERENCES production_plans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_production_orders_plan_id ON production_orders(plan_id);

COMMENT ON COLUMN production_orders.plan_id IS '关联的生产计划ID';

-- =====================================================
-- 2. 为 production_plans 添加拒绝相关字段
-- =====================================================

ALTER TABLE production_plans 
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

COMMENT ON COLUMN production_plans.rejected_by IS '拒绝人';
COMMENT ON COLUMN production_plans.rejected_at IS '拒绝时间';
COMMENT ON COLUMN production_plans.rejection_reason IS '拒绝原因';

-- =====================================================
-- 3. 为 production_plan_approvals 添加拒绝相关字段
-- =====================================================

ALTER TABLE production_plan_approvals 
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

COMMENT ON COLUMN production_plan_approvals.rejected_by IS '拒绝人';
COMMENT ON COLUMN production_plan_approvals.rejected_at IS '拒绝时间';
COMMENT ON COLUMN production_plan_approvals.rejection_reason IS '拒绝原因';

-- =====================================================
-- 4. 创建获取计划执行进度的函数
-- =====================================================

CREATE FUNCTION get_plan_execution_progress(
  p_plan_id BIGINT
)
RETURNS TABLE (
  linked_order_count BIGINT,
  completed_quantity BIGINT,
  completion_rate NUMERIC
) AS $$
DECLARE
  v_planned_quantity INTEGER;
  v_linked_order_count BIGINT;
  v_completed_quantity BIGINT;
  v_completion_rate NUMERIC;
BEGIN
  -- 获取计划数量
  SELECT production_quantity INTO v_planned_quantity
  FROM production_plans
  WHERE id = p_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '生产计划不存在：ID %', p_plan_id;
  END IF;

  -- 统计已关联的订单数量
  SELECT COUNT(*) INTO v_linked_order_count
  FROM production_orders
  WHERE plan_id = p_plan_id;

  -- 统计已完成的数量（从 finished_products 表统计）
  SELECT COUNT(*) INTO v_completed_quantity
  FROM finished_products fp
  WHERE fp.order_id IN (
    SELECT id FROM production_orders WHERE plan_id = p_plan_id
  );

  -- 计算完成率
  IF v_planned_quantity > 0 THEN
    v_completion_rate := ROUND((v_completed_quantity::NUMERIC / v_planned_quantity::NUMERIC) * 100, 2);
  ELSE
    v_completion_rate := 0;
  END IF;

  -- 返回结果
  RETURN QUERY SELECT v_linked_order_count, v_completed_quantity, v_completion_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_plan_execution_progress IS '获取生产计划执行进度：已关联订单数、已完成数量、完成率';

-- =====================================================
-- 5. 创建提交审批函数
-- =====================================================

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

  -- 5. 创建审批记录
  INSERT INTO production_plan_approvals (
    plan_id,
    status,
    tenant_id
  ) VALUES (
    p_plan_id,
    'submitted',
    p_tenant_id
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION submit_plan_for_approval IS '提交生产计划审批（支持重新提交）';

-- =====================================================
-- 6. 创建审批通过函数
-- =====================================================

CREATE FUNCTION approve_production_plan(
  p_plan_id BIGINT,
  p_tenant_id TEXT,
  p_approver_id UUID,
  p_comments TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan RECORD;
BEGIN
  -- 1. 获取计划信息
  SELECT * INTO v_plan
  FROM production_plans
  WHERE id = p_plan_id
    AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '生产计划不存在：ID %', p_plan_id;
  END IF;

  -- 2. 检查计划状态
  IF v_plan.status != 'submitted' THEN
    RAISE EXCEPTION '只有已提交状态的计划可以审批，当前状态：%', v_plan.status;
  END IF;

  -- 3. 更新计划状态为已批准
  UPDATE production_plans
  SET 
    status = 'approved',
    approved_by = p_approver_id,
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_plan_id;

  -- 4. 更新审批记录
  UPDATE production_plan_approvals
  SET 
    status = 'approved',
    approver_id = p_approver_id,
    comments = p_comments,
    approved_at = NOW(),
    updated_at = NOW()
  WHERE plan_id = p_plan_id
    AND status = 'submitted';

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_production_plan IS '审批通过生产计划';

-- =====================================================
-- 7. 创建审批拒绝函数
-- =====================================================

CREATE FUNCTION reject_production_plan(
  p_plan_id BIGINT,
  p_tenant_id TEXT,
  p_rejector_id UUID,
  p_rejection_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan RECORD;
BEGIN
  -- 1. 获取计划信息
  SELECT * INTO v_plan
  FROM production_plans
  WHERE id = p_plan_id
    AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '生产计划不存在：ID %', p_plan_id;
  END IF;

  -- 2. 检查计划状态
  IF v_plan.status != 'submitted' THEN
    RAISE EXCEPTION '只有已提交状态的计划可以拒绝，当前状态：%', v_plan.status;
  END IF;

  -- 3. 更新计划状态为已拒绝
  UPDATE production_plans
  SET 
    status = 'rejected',
    rejected_by = p_rejector_id,
    rejected_at = NOW(),
    rejection_reason = p_rejection_reason,
    updated_at = NOW()
  WHERE id = p_plan_id;

  -- 4. 更新审批记录
  UPDATE production_plan_approvals
  SET 
    status = 'rejected',
    rejected_by = p_rejector_id,
    rejected_at = NOW(),
    rejection_reason = p_rejection_reason,
    updated_at = NOW()
  WHERE plan_id = p_plan_id
    AND status = 'submitted';

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reject_production_plan IS '审批拒绝生产计划';

-- =====================================================
-- 8. 创建生效函数
-- =====================================================

CREATE FUNCTION activate_production_plan(
  p_plan_id BIGINT,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan RECORD;
BEGIN
  -- 1. 获取计划信息
  SELECT * INTO v_plan
  FROM production_plans
  WHERE id = p_plan_id
    AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '生产计划不存在：ID %', p_plan_id;
  END IF;

  -- 2. 检查计划状态
  IF v_plan.status != 'approved' THEN
    RAISE EXCEPTION '只有已批准状态的计划可以生效，当前状态：%', v_plan.status;
  END IF;

  -- 3. 更新计划状态为已生效
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

COMMENT ON FUNCTION activate_production_plan IS '生效生产计划';

-- =====================================================
-- 9. 创建关闭函数
-- =====================================================

CREATE FUNCTION close_production_plan(
  p_plan_id BIGINT,
  p_tenant_id TEXT,
  p_user_id UUID,
  p_close_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan RECORD;
BEGIN
  -- 1. 获取计划信息
  SELECT * INTO v_plan
  FROM production_plans
  WHERE id = p_plan_id
    AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '生产计划不存在：ID %', p_plan_id;
  END IF;

  -- 2. 检查计划状态
  IF v_plan.status != 'active' THEN
    RAISE EXCEPTION '只有已生效状态的计划可以关闭，当前状态：%', v_plan.status;
  END IF;

  -- 3. 更新计划状态为已关闭
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

COMMENT ON FUNCTION close_production_plan IS '关闭生产计划';