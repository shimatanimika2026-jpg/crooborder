-- 创建供应商质量评级表
CREATE TABLE IF NOT EXISTS supplier_quality_ratings (
  id BIGSERIAL PRIMARY KEY,
  supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  rating_period_start DATE NOT NULL,
  rating_period_end DATE NOT NULL,
  incoming_pass_rate DECIMAL(5,2),
  special_approval_rate DECIMAL(5,2),
  major_complaint_count INTEGER DEFAULT 0,
  capa_response_rate DECIMAL(5,2),
  capa_effectiveness_rate DECIMAL(5,2),
  total_score DECIMAL(5,2),
  rating_level VARCHAR(10) CHECK (rating_level IN ('A', 'B', 'C', 'D')),
  rating_details JSONB,
  tenant_id VARCHAR(20) NOT NULL CHECK (tenant_id IN ('CN', 'JP')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_supplier_ratings_supplier ON supplier_quality_ratings(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_period ON supplier_quality_ratings(rating_period_start, rating_period_end);
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_level ON supplier_quality_ratings(rating_level);

COMMENT ON TABLE supplier_quality_ratings IS '供应商质量评级表';

-- 创建供应商质量问题表
CREATE TABLE IF NOT EXISTS supplier_quality_issues (
  id BIGSERIAL PRIMARY KEY,
  issue_code VARCHAR(50) UNIQUE NOT NULL,
  supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
  receiving_inspection_id BIGINT REFERENCES iqc_inspections(id),
  material_code VARCHAR(50) NOT NULL,
  batch_code VARCHAR(50) NOT NULL,
  issue_type VARCHAR(50) NOT NULL CHECK (issue_type IN ('incoming_defect', 'customer_complaint', 'production_feedback')),
  issue_description TEXT NOT NULL,
  severity_level VARCHAR(10) CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
  reported_by UUID REFERENCES auth.users(id),
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'reported' CHECK (status IN ('reported', 'investigating', 'action_required', 'closed')),
  tenant_id VARCHAR(20) NOT NULL CHECK (tenant_id IN ('CN', 'JP')),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_supplier_issues_supplier ON supplier_quality_issues(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_issues_inspection ON supplier_quality_issues(receiving_inspection_id);
CREATE INDEX IF NOT EXISTS idx_supplier_issues_status ON supplier_quality_issues(status);
CREATE INDEX IF NOT EXISTS idx_supplier_issues_code ON supplier_quality_issues(issue_code);

COMMENT ON TABLE supplier_quality_issues IS '供应商质量问题表';

-- 创建供应商改善措施表
CREATE TABLE IF NOT EXISTS supplier_improvement_actions (
  id BIGSERIAL PRIMARY KEY,
  action_code VARCHAR(50) UNIQUE NOT NULL,
  issue_id BIGINT NOT NULL REFERENCES supplier_quality_issues(id) ON DELETE CASCADE,
  supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
  action_type VARCHAR(50) CHECK (action_type IN ('8d_report', 'corrective_action', 'preventive_action')),
  root_cause_analysis TEXT,
  corrective_measures TEXT NOT NULL,
  preventive_measures TEXT,
  responsible_person VARCHAR(100),
  planned_completion_date DATE NOT NULL,
  actual_completion_date DATE,
  verification_standard TEXT,
  verification_result VARCHAR(20) CHECK (verification_result IN ('pending', 'effective', 'ineffective')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'pending_verification', 'closed')),
  tenant_id VARCHAR(20) NOT NULL CHECK (tenant_id IN ('CN', 'JP')),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_supplier_actions_issue ON supplier_improvement_actions(issue_id);
CREATE INDEX IF NOT EXISTS idx_supplier_actions_supplier ON supplier_improvement_actions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_actions_status ON supplier_improvement_actions(status);
CREATE INDEX IF NOT EXISTS idx_supplier_actions_code ON supplier_improvement_actions(action_code);

COMMENT ON TABLE supplier_improvement_actions IS '供应商改善措施表';

-- 启用RLS
ALTER TABLE supplier_quality_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_quality_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_improvement_actions ENABLE ROW LEVEL SECURITY;

-- RLS策略: 质量评级 - 所有认证用户可以查看
CREATE POLICY "supplier_ratings_select_policy" ON supplier_quality_ratings
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS策略: 质量评级 - 质量管理员可以创建
CREATE POLICY "supplier_ratings_insert_policy" ON supplier_quality_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'system_admin', 'jp_quality_manager', 'cn_quality_inspector')
    )
  );

-- RLS策略: 质量问题 - 所有认证用户可以查看
CREATE POLICY "supplier_issues_select_policy" ON supplier_quality_issues
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS策略: 质量问题 - 认证用户可以创建
CREATE POLICY "supplier_issues_insert_policy" ON supplier_quality_issues
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reported_by);

-- RLS策略: 质量问题 - 报告人和管理员可以更新
CREATE POLICY "supplier_issues_update_policy" ON supplier_quality_issues
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = reported_by OR
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'system_admin', 'jp_quality_manager')
    )
  );

-- RLS策略: 改善措施 - 所有认证用户可以查看
CREATE POLICY "supplier_actions_select_policy" ON supplier_improvement_actions
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS策略: 改善措施 - 认证用户可以创建
CREATE POLICY "supplier_actions_insert_policy" ON supplier_improvement_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- RLS策略: 改善措施 - 创建人和管理员可以更新
CREATE POLICY "supplier_actions_update_policy" ON supplier_improvement_actions
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'system_admin', 'jp_quality_manager')
    )
  );