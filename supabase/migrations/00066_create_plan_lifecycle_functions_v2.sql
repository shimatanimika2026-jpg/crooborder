-- 1. 修改 production_plans 表，添加审批相关字段
ALTER TABLE production_plans 
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS close_reason TEXT;

-- 2. 创建提交审批函数
CREATE OR REPLACE FUNCTION submit_plan_for_approval(
  p_plan_id BIGINT,
  p_tenant_id TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan RECORD;
BEGIN
  SELECT * INTO v_plan FROM production_plans WHERE id = p_plan_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION '生产计划不存在：ID %', p_plan_id; END IF;
  IF v_plan.status != 'draft' THEN RAISE EXCEPTION '只有草稿状态的计划可以提交审批，当前状态：%', v_plan.status; END IF;
  UPDATE production_plans SET status = 'pending_approval', updated_at = NOW() WHERE id = p_plan_id;
  INSERT INTO production_plan_approvals (plan_id, approval_status) VALUES (p_plan_id, 'pending');
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 创建审批通过函数
CREATE OR REPLACE FUNCTION approve_production_plan(
  p_plan_id BIGINT,
  p_tenant_id TEXT,
  p_approver_id UUID,
  p_comments TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan RECORD;
  v_approval_id BIGINT;
BEGIN
  SELECT * INTO v_plan FROM production_plans WHERE id = p_plan_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION '生产计划不存在：ID %', p_plan_id; END IF;
  IF v_plan.status != 'pending_approval' THEN RAISE EXCEPTION '只有待审批状态的计划可以审批，当前状态：%', v_plan.status; END IF;
  SELECT id INTO v_approval_id FROM production_plan_approvals WHERE plan_id = p_plan_id AND approval_status = 'pending' ORDER BY created_at DESC LIMIT 1;
  IF v_approval_id IS NULL THEN RAISE EXCEPTION '未找到待审批记录'; END IF;
  UPDATE production_plan_approvals SET approval_status = 'approved', approver_id = p_approver_id, approval_comment = p_comments, approved_at = NOW() WHERE id = v_approval_id;
  UPDATE production_plans SET status = 'approved', approved_by = p_approver_id, approved_at = NOW(), updated_at = NOW() WHERE id = p_plan_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 创建审批拒绝函数
CREATE OR REPLACE FUNCTION reject_production_plan(
  p_plan_id BIGINT,
  p_tenant_id TEXT,
  p_approver_id UUID,
  p_comments TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan RECORD;
  v_approval_id BIGINT;
BEGIN
  SELECT * INTO v_plan FROM production_plans WHERE id = p_plan_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION '生产计划不存在：ID %', p_plan_id; END IF;
  IF v_plan.status != 'pending_approval' THEN RAISE EXCEPTION '只有待审批状态的计划可以审批，当前状态：%', v_plan.status; END IF;
  SELECT id INTO v_approval_id FROM production_plan_approvals WHERE plan_id = p_plan_id AND approval_status = 'pending' ORDER BY created_at DESC LIMIT 1;
  IF v_approval_id IS NULL THEN RAISE EXCEPTION '未找到待审批记录'; END IF;
  UPDATE production_plan_approvals SET approval_status = 'rejected', approver_id = p_approver_id, approval_comment = p_comments, approved_at = NOW() WHERE id = v_approval_id;
  UPDATE production_plans SET status = 'draft', updated_at = NOW() WHERE id = p_plan_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 创建生效计划函数
CREATE OR REPLACE FUNCTION activate_production_plan(
  p_plan_id BIGINT,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan RECORD;
BEGIN
  SELECT * INTO v_plan FROM production_plans WHERE id = p_plan_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION '生产计划不存在：ID %', p_plan_id; END IF;
  IF v_plan.status != 'approved' THEN RAISE EXCEPTION '只有已批准状态的计划可以生效，当前状态：%', v_plan.status; END IF;
  UPDATE production_plans SET status = 'active', activated_by = p_user_id, activated_at = NOW(), updated_at = NOW() WHERE id = p_plan_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 创建关闭计划函数
CREATE OR REPLACE FUNCTION close_production_plan(
  p_plan_id BIGINT,
  p_tenant_id TEXT,
  p_user_id UUID,
  p_close_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan RECORD;
BEGIN
  SELECT * INTO v_plan FROM production_plans WHERE id = p_plan_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION '生产计划不存在：ID %', p_plan_id; END IF;
  IF v_plan.status NOT IN ('approved', 'active') THEN RAISE EXCEPTION '只有已批准或已生效状态的计划可以关闭，当前状态：%', v_plan.status; END IF;
  UPDATE production_plans SET status = 'closed', closed_by = p_user_id, closed_at = NOW(), close_reason = p_close_reason, updated_at = NOW() WHERE id = p_plan_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 创建版本管理函数（使用现有表结构）
CREATE OR REPLACE FUNCTION create_production_plan_version(
  p_plan_id BIGINT,
  p_tenant_id TEXT,
  p_user_id UUID,
  p_change_summary TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_plan RECORD;
  v_new_version INTEGER;
  v_plan_data JSONB;
BEGIN
  SELECT * INTO v_plan FROM production_plans WHERE id = p_plan_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION '生产计划不存在：ID %', p_plan_id; END IF;
  v_new_version := COALESCE(v_plan.current_version, 0) + 1;
  v_plan_data := jsonb_build_object('plan_code', v_plan.plan_code, 'plan_type', v_plan.plan_type, 'product_model_id', v_plan.product_model_id, 'production_quantity', v_plan.production_quantity, 'plan_period_start', v_plan.plan_period_start, 'plan_period_end', v_plan.plan_period_end, 'delivery_date', v_plan.delivery_date, 'status', v_plan.status, 'remarks', v_plan.remarks);
  INSERT INTO production_plan_versions (plan_id, version_number, plan_details, change_description, created_by) VALUES (p_plan_id, v_new_version, v_plan_data, p_change_summary, p_user_id);
  UPDATE production_plans SET current_version = v_new_version, updated_at = NOW() WHERE id = p_plan_id;
  RETURN v_new_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;