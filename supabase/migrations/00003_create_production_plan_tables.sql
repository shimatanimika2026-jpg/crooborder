-- 创建生产计划表
CREATE TABLE production_plans (
    id BIGSERIAL PRIMARY KEY,
    plan_code VARCHAR(50) UNIQUE NOT NULL,
    plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('annual', 'monthly', 'weekly')),
    plan_period_start DATE NOT NULL,
    plan_period_end DATE NOT NULL,
    production_quantity INTEGER NOT NULL CHECK (production_quantity > 0),
    delivery_date DATE NOT NULL,
    responsible_person_id UUID REFERENCES profiles(id),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_cn_approval', 'pending_jp_approval', 'approved', 'rejected', 'executing', 'completed', 'cancelled')),
    current_version INTEGER DEFAULT 1,
    tenant_id VARCHAR(20) DEFAULT 'BOTH',
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_production_plans_status ON production_plans(status);
CREATE INDEX idx_production_plans_period ON production_plans(plan_period_start, plan_period_end);
CREATE INDEX idx_production_plans_code ON production_plans(plan_code);

COMMENT ON TABLE production_plans IS '生产计划表';

-- 创建生产计划版本表
CREATE TABLE production_plan_versions (
    id BIGSERIAL PRIMARY KEY,
    plan_id BIGINT NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    change_reason TEXT,
    change_description TEXT,
    impact_analysis TEXT,
    plan_details JSONB NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plan_id, version_number)
);

CREATE INDEX idx_plan_versions_plan ON production_plan_versions(plan_id);
CREATE INDEX idx_plan_versions_version ON production_plan_versions(version_number DESC);

COMMENT ON TABLE production_plan_versions IS '生产计划版本表';
COMMENT ON COLUMN production_plan_versions.plan_details IS '计划详细内容JSON：包含产品型号、数量、工艺要求等';

-- 创建生产计划审批表
CREATE TABLE production_plan_approvals (
    id BIGSERIAL PRIMARY KEY,
    plan_id BIGINT NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    approval_stage VARCHAR(20) NOT NULL CHECK (approval_stage IN ('cn_approval', 'jp_approval')),
    approver_id UUID REFERENCES profiles(id),
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approval_comment TEXT,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_plan_approvals_plan ON production_plan_approvals(plan_id);
CREATE INDEX idx_plan_approvals_status ON production_plan_approvals(approval_status);

COMMENT ON TABLE production_plan_approvals IS '生产计划审批表';

-- 插入示例生产计划数据
INSERT INTO production_plans (plan_code, plan_type, plan_period_start, plan_period_end, production_quantity, delivery_date, status, tenant_id) VALUES
('PLAN-2026-Q2', 'monthly', '2026-04-01', '2026-06-30', 5000, '2026-07-15', 'draft', 'BOTH');

-- 配置RLS策略
ALTER TABLE production_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有认证用户可以查看生产计划" ON production_plans
  FOR SELECT TO authenticated 
  USING (can_access_tenant(auth.uid(), tenant_id));

CREATE POLICY "管理人员可以创建生产计划" ON production_plans
  FOR INSERT TO authenticated 
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'cn_factory_manager') OR 
    has_role(auth.uid(), 'jp_factory_manager') OR 
    has_role(auth.uid(), 'executive')
  );

CREATE POLICY "管理人员可以更新生产计划" ON production_plans
  FOR UPDATE TO authenticated 
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'cn_factory_manager') OR 
    has_role(auth.uid(), 'jp_factory_manager') OR 
    has_role(auth.uid(), 'executive')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'cn_factory_manager') OR 
    has_role(auth.uid(), 'jp_factory_manager') OR 
    has_role(auth.uid(), 'executive')
  );

ALTER TABLE production_plan_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有认证用户可以查看计划版本" ON production_plan_versions
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "管理人员可以创建计划版本" ON production_plan_versions
  FOR INSERT TO authenticated 
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'cn_factory_manager') OR 
    has_role(auth.uid(), 'jp_factory_manager') OR 
    has_role(auth.uid(), 'executive')
  );

ALTER TABLE production_plan_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有认证用户可以查看审批记录" ON production_plan_approvals
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "审批人可以创建审批记录" ON production_plan_approvals
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY "审批人可以更新审批记录" ON production_plan_approvals
  FOR UPDATE TO authenticated 
  USING (approver_id = auth.uid())
  WITH CHECK (approver_id = auth.uid());