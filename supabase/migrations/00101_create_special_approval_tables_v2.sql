-- 创建特采申请表
CREATE TABLE IF NOT EXISTS special_approval_requests (
  id BIGSERIAL PRIMARY KEY,
  request_code VARCHAR(50) UNIQUE NOT NULL,
  receiving_inspection_id BIGINT REFERENCES iqc_inspections(id),
  material_code VARCHAR(50) NOT NULL,
  material_name VARCHAR(100) NOT NULL,
  batch_code VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  supplier_id BIGINT REFERENCES suppliers(id),
  defect_category VARCHAR(50) NOT NULL CHECK (defect_category IN ('appearance_defect', 'dimension_deviation', 'process_deviation', 'urgent_demand', 'other')),
  defect_description TEXT NOT NULL,
  applicant_department VARCHAR(100) NOT NULL,
  applicant_id UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'cancelled')),
  acceptance_conditions TEXT,
  tenant_id VARCHAR(20) DEFAULT 'JP',
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_special_requests_inspection ON special_approval_requests(receiving_inspection_id);
CREATE INDEX IF NOT EXISTS idx_special_requests_status ON special_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_special_requests_code ON special_approval_requests(request_code);
CREATE INDEX IF NOT EXISTS idx_special_requests_supplier ON special_approval_requests(supplier_id);

COMMENT ON TABLE special_approval_requests IS '特采申请表';

-- 创建特采审批流程表
CREATE TABLE IF NOT EXISTS special_approval_workflows (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES special_approval_requests(id) ON DELETE CASCADE,
  approval_stage VARCHAR(50) NOT NULL CHECK (approval_stage IN ('department_manager', 'quality_dept', 'engineering_dept', 'procurement_dept', 'executive')),
  approver_id UUID REFERENCES auth.users(id),
  approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approval_comment TEXT,
  approval_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_special_workflows_request ON special_approval_workflows(request_id);
CREATE INDEX IF NOT EXISTS idx_special_workflows_status ON special_approval_workflows(approval_status);
CREATE INDEX IF NOT EXISTS idx_special_workflows_stage ON special_approval_workflows(approval_stage);

COMMENT ON TABLE special_approval_workflows IS '特采审批流程表';

-- 创建特采附件表
CREATE TABLE IF NOT EXISTS special_approval_attachments (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES special_approval_requests(id) ON DELETE CASCADE,
  file_name VARCHAR(200) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) CHECK (file_type IN ('photo', 'video', 'document')),
  file_hash VARCHAR(64) NOT NULL,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_special_attachments_request ON special_approval_attachments(request_id);
CREATE INDEX IF NOT EXISTS idx_special_attachments_hash ON special_approval_attachments(file_hash);

COMMENT ON TABLE special_approval_attachments IS '特采附件表';

-- 创建特采物料跟踪表
CREATE TABLE IF NOT EXISTS special_material_tracking (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES special_approval_requests(id) ON DELETE CASCADE,
  material_code VARCHAR(50) NOT NULL,
  batch_code VARCHAR(50) NOT NULL,
  usage_process VARCHAR(100),
  usage_quantity INTEGER NOT NULL,
  usage_date DATE NOT NULL,
  quality_feedback TEXT,
  feedback_status VARCHAR(20) DEFAULT 'pending' CHECK (feedback_status IN ('pending', 'normal', 'abnormal')),
  tenant_id VARCHAR(20) DEFAULT 'JP',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_special_tracking_request ON special_material_tracking(request_id);
CREATE INDEX IF NOT EXISTS idx_special_tracking_batch ON special_material_tracking(batch_code);
CREATE INDEX IF NOT EXISTS idx_special_tracking_status ON special_material_tracking(feedback_status);

COMMENT ON TABLE special_material_tracking IS '特采物料跟踪表';

-- 启用RLS
ALTER TABLE special_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_approval_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_material_tracking ENABLE ROW LEVEL SECURITY;

-- RLS策略: 特采申请 - 所有认证用户可以查看
CREATE POLICY "special_requests_select_policy" ON special_approval_requests
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS策略: 特采申请 - 认证用户可以创建
CREATE POLICY "special_requests_insert_policy" ON special_approval_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = applicant_id);

-- RLS策略: 特采申请 - 申请人和管理员可以更新
CREATE POLICY "special_requests_update_policy" ON special_approval_requests
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = applicant_id OR
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'system_admin', 'jp_quality_manager')
    )
  );

-- RLS策略: 审批流程 - 所有认证用户可以查看
CREATE POLICY "special_workflows_select_policy" ON special_approval_workflows
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS策略: 审批流程 - 系统自动创建
CREATE POLICY "special_workflows_insert_policy" ON special_approval_workflows
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS策略: 审批流程 - 审批人可以更新
CREATE POLICY "special_workflows_update_policy" ON special_approval_workflows
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = approver_id);

-- RLS策略: 附件 - 所有认证用户可以查看
CREATE POLICY "special_attachments_select_policy" ON special_approval_attachments
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS策略: 附件 - 认证用户可以上传
CREATE POLICY "special_attachments_insert_policy" ON special_approval_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

-- RLS策略: 物料跟踪 - 所有认证用户可以查看
CREATE POLICY "special_tracking_select_policy" ON special_material_tracking
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS策略: 物料跟踪 - 认证用户可以创建
CREATE POLICY "special_tracking_insert_policy" ON special_material_tracking
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);