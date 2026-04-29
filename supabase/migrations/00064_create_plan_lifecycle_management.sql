-- =====================================================
-- 生产计划审批、生效、关闭和版本管理
-- 实现计划的完整生命周期管理
-- =====================================================

-- 1. 修改 production_plans 表，添加状态和审批相关字段
ALTER TABLE production_plans 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'active', 'closed')),
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS close_reason TEXT;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_production_plans_status ON production_plans(status);
CREATE INDEX IF NOT EXISTS idx_production_plans_version ON production_plans(version);

-- 添加注释
COMMENT ON COLUMN production_plans.status IS '计划状态：draft-草稿, pending_approval-待审批, approved-已批准, active-已生效, closed-已关闭';
COMMENT ON COLUMN production_plans.version IS '版本号';
COMMENT ON COLUMN production_plans.approved_by IS '审批人';
COMMENT ON COLUMN production_plans.approved_at IS '审批时间';
COMMENT ON COLUMN production_plans.activated_by IS '生效操作人';
COMMENT ON COLUMN production_plans.activated_at IS '生效时间';
COMMENT ON COLUMN production_plans.closed_by IS '关闭操作人';
COMMENT ON COLUMN production_plans.closed_at IS '关闭时间';
COMMENT ON COLUMN production_plans.close_reason IS '关闭原因';

-- =====================================================

-- 2. 创建生产计划审批记录表
CREATE TABLE IF NOT EXISTS production_plan_approvals (
  id BIGSERIAL PRIMARY KEY,
  plan_id BIGINT NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comments TEXT,
  approved_at TIMESTAMPTZ,
  tenant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_production_plan_approvals_plan_id ON production_plan_approvals(plan_id);
CREATE INDEX idx_production_plan_approvals_status ON production_plan_approvals(status);
CREATE INDEX idx_production_plan_approvals_tenant_id ON production_plan_approvals(tenant_id);

-- 添加注释
COMMENT ON TABLE production_plan_approvals IS '生产计划审批记录表';
COMMENT ON COLUMN production_plan_approvals.plan_id IS '关联的生产计划ID';
COMMENT ON COLUMN production_plan_approvals.approver_id IS '审批人';
COMMENT ON COLUMN production_plan_approvals.status IS '审批状态：pending-待审批, approved-已批准, rejected-已拒绝';
COMMENT ON COLUMN production_plan_approvals.comments IS '审批意见';
COMMENT ON COLUMN production_plan_approvals.approved_at IS '审批时间';

-- =====================================================

-- 3. 创建生产计划版本记录表
CREATE TABLE IF NOT EXISTS production_plan_versions (
  id BIGSERIAL PRIMARY KEY,
  plan_id BIGINT NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  plan_data JSONB NOT NULL,
  change_summary TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id TEXT NOT NULL
);

-- 创建索引
CREATE INDEX idx_production_plan_versions_plan_id ON production_plan_versions(plan_id);
CREATE INDEX idx_production_plan_versions_version ON production_plan_versions(version);
CREATE INDEX idx_production_plan_versions_tenant_id ON production_plan_versions(tenant_id);

-- 添加唯一约束：同一计划的版本号不能重复
CREATE UNIQUE INDEX idx_production_plan_versions_plan_version ON production_plan_versions(plan_id, version);

-- 添加注释
COMMENT ON TABLE production_plan_versions IS '生产计划版本记录表';
COMMENT ON COLUMN production_plan_versions.plan_id IS '关联的生产计划ID';
COMMENT ON COLUMN production_plan_versions.version IS '版本号';
COMMENT ON COLUMN production_plan_versions.plan_data IS '计划数据快照（JSONB格式）';
COMMENT ON COLUMN production_plan_versions.change_summary IS '修改摘要';
COMMENT ON COLUMN production_plan_versions.created_by IS '创建人';

-- =====================================================

-- 4. 创建提交审批函数
CREATE OR REPLACE FUNCTION submit_plan_for_approval(
  p_plan_id BIGINT,
  p_tenant_id TEXT,
  p_user_id UUID DEFAULT NULL
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
  IF v_plan.status != 'draft' THEN
    RAISE EXCEPTION '只有草稿状态的计划可以提交审批，当前状态：%', v_plan.status;
  END IF;

  -- 3. 更新计划状态为待审批
  UPDATE production_plans
  SET 
    status = 'pending_approval',
    updated_at = NOW()
  WHERE id = p_plan_id;

  -- 4. 创建审批记录
  INSERT INTO production_plan_approvals (
    plan_id,
    status,
    tenant_id
  ) VALUES (
    p_plan_id,
    'pending',
    p_tenant_id
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION submit_plan_for_approval IS '提交生产计划审批';

-- =====================================================

-- 5. 创建审批通过函数
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
  -- 1. 获取计划信息
  SELECT * INTO v_plan
  FROM production_plans
  WHERE id = p_plan_id
    AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '生产计划不存在：ID %', p_plan_id;
  END IF;

  -- 2. 检查计划状态
  IF v_plan.status != 'pending_approval' THEN
    RAISE EXCEPTION '只有待审批状态的计划可以审批，当前状态：%', v_plan.status;
  END IF;

  -- 3. 获取待审批记录
  SELECT id INTO v_approval_id
  FROM production_plan_approvals
  WHERE plan_id = p_plan_id
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_approval_id IS NULL THEN
    RAISE EXCEPTION '未找到待审批记录';
  END IF;

  -- 4. 更新审批记录
  UPDATE production_plan_approvals
  SET 
    status = 'approved',
    approver_id = p_approver_id,
    comments = p_comments,
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = v_approval_id;

  -- 5. 更新计划状态为已批准
  UPDATE production_plans
  SET 
    status = 'approved',
    approved_by = p_approver_id,
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_plan_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_production_plan IS '审批通过生产计划';

-- =====================================================

-- 6. 创建审批拒绝函数
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
  -- 1. 获取计划信息
  SELECT * INTO v_plan
  FROM production_plans
  WHERE id = p_plan_id
    AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '生产计划不存在：ID %', p_plan_id;
  END IF;

  -- 2. 检查计划状态
  IF v_plan.status != 'pending_approval' THEN
    RAISE EXCEPTION '只有待审批状态的计划可以审批，当前状态：%', v_plan.status;
  END IF;

  -- 3. 获取待审批记录
  SELECT id INTO v_approval_id
  FROM production_plan_approvals
  WHERE plan_id = p_plan_id
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_approval_id IS NULL THEN
    RAISE EXCEPTION '未找到待审批记录';
  END IF;

  -- 4. 更新审批记录
  UPDATE production_plan_approvals
  SET 
    status = 'rejected',
    approver_id = p_approver_id,
    comments = p_comments,
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = v_approval_id;

  -- 5. 更新计划状态为草稿（允许重新修改）
  UPDATE production_plans
  SET 
    status = 'draft',
    updated_at = NOW()
  WHERE id = p_plan_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reject_production_plan IS '审批拒绝生产计划';

-- =====================================================

-- 7. 创建生效计划函数
CREATE OR REPLACE FUNCTION activate_production_plan(
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

-- 8. 创建关闭计划函数
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
  -- 1. 获取计划信息
  SELECT * INTO v_plan
  FROM production_plans
  WHERE id = p_plan_id
    AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '生产计划不存在：ID %', p_plan_id;
  END IF;

  -- 2. 检查计划状态
  IF v_plan.status NOT IN ('approved', 'active') THEN
    RAISE EXCEPTION '只有已批准或已生效状态的计划可以关闭，当前状态：%', v_plan.status;
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

-- =====================================================

-- 9. 创建版本管理函数
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
  -- 1. 获取计划信息
  SELECT * INTO v_plan
  FROM production_plans
  WHERE id = p_plan_id
    AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '生产计划不存在：ID %', p_plan_id;
  END IF;

  -- 2. 计算新版本号
  v_new_version := v_plan.version + 1;

  -- 3. 构建计划数据快照
  v_plan_data := jsonb_build_object(
    'plan_code', v_plan.plan_code,
    'plan_name', v_plan.plan_name,
    'product_model_id', v_plan.product_model_id,
    'target_quantity', v_plan.target_quantity,
    'start_date', v_plan.start_date,
    'end_date', v_plan.end_date,
    'priority', v_plan.priority,
    'status', v_plan.status,
    'notes', v_plan.notes
  );

  -- 4. 创建版本记录
  INSERT INTO production_plan_versions (
    plan_id,
    version,
    plan_data,
    change_summary,
    created_by,
    tenant_id
  ) VALUES (
    p_plan_id,
    v_new_version,
    v_plan_data,
    p_change_summary,
    p_user_id,
    p_tenant_id
  );

  -- 5. 更新计划的版本号
  UPDATE production_plans
  SET 
    version = v_new_version,
    updated_at = NOW()
  WHERE id = p_plan_id;

  RETURN v_new_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_production_plan_version IS '创建生产计划新版本';

-- =====================================================

-- 10. 设置 RLS 策略

-- production_plan_approvals 表的 RLS 策略
ALTER TABLE production_plan_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "租户隔离 - production_plan_approvals" ON production_plan_approvals
  FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM production_plans WHERE id = plan_id));

-- production_plan_versions 表的 RLS 策略
ALTER TABLE production_plan_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "租户隔离 - production_plan_versions" ON production_plan_versions
  FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM production_plans WHERE id = plan_id));

-- =====================================================
-- 迁移完成
-- =====================================================
