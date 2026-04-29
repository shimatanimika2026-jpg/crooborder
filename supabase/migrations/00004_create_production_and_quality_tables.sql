-- 创建生产订单表
CREATE TABLE production_orders (
    id BIGSERIAL PRIMARY KEY,
    order_code VARCHAR(50) UNIQUE NOT NULL,
    plan_id BIGINT REFERENCES production_plans(id),
    part_name VARCHAR(100) NOT NULL,
    part_code VARCHAR(50) NOT NULL,
    production_quantity INTEGER NOT NULL CHECK (production_quantity > 0),
    planned_start_date DATE NOT NULL,
    planned_end_date DATE NOT NULL,
    actual_start_date DATE,
    actual_end_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    tenant_id VARCHAR(20) DEFAULT 'CN',
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_production_orders_plan ON production_orders(plan_id);
CREATE INDEX idx_production_orders_status ON production_orders(status);
CREATE INDEX idx_production_orders_code ON production_orders(order_code);

COMMENT ON TABLE production_orders IS '生产订单表';

-- 创建生产工序表
CREATE TABLE production_processes (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    process_name VARCHAR(100) NOT NULL,
    process_sequence INTEGER NOT NULL,
    planned_work_hours DECIMAL(10,2) NOT NULL,
    actual_work_hours DECIMAL(10,2),
    completed_quantity INTEGER DEFAULT 0,
    qualified_quantity INTEGER DEFAULT 0,
    defective_quantity INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    operator_id UUID REFERENCES profiles(id),
    tenant_id VARCHAR(20) DEFAULT 'CN',
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_production_processes_order ON production_processes(order_id);
CREATE INDEX idx_production_processes_status ON production_processes(status);

COMMENT ON TABLE production_processes IS '生产工序表';

-- 创建工序照片表
CREATE TABLE process_photos (
    id BIGSERIAL PRIMARY KEY,
    process_id BIGINT NOT NULL REFERENCES production_processes(id) ON DELETE CASCADE,
    photo_url VARCHAR(500) NOT NULL,
    photo_hash VARCHAR(64) NOT NULL,
    photo_type VARCHAR(20) DEFAULT 'process' CHECK (photo_type IN ('process', 'quality', 'anomaly')),
    description TEXT,
    uploaded_by UUID REFERENCES profiles(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_process_photos_process ON process_photos(process_id);
CREATE INDEX idx_process_photos_hash ON process_photos(photo_hash);

COMMENT ON TABLE process_photos IS '工序照片表';
COMMENT ON COLUMN process_photos.photo_hash IS 'SHA-256哈希值，确保照片不可篡改';

-- 创建质量检验表
CREATE TABLE quality_inspections (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    inspection_type VARCHAR(20) NOT NULL CHECK (inspection_type IN ('incoming', 'in_process', 'final', 'sampling')),
    inspection_date DATE NOT NULL,
    inspector_id UUID REFERENCES profiles(id),
    inspected_quantity INTEGER NOT NULL,
    qualified_quantity INTEGER NOT NULL,
    defective_quantity INTEGER NOT NULL,
    qualification_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN inspected_quantity > 0 
        THEN (qualified_quantity::DECIMAL / inspected_quantity * 100)
        ELSE 0 END
    ) STORED,
    defect_description TEXT,
    corrective_action TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed', 'rework')),
    tenant_id VARCHAR(20) DEFAULT 'CN',
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quality_inspections_order ON quality_inspections(order_id);
CREATE INDEX idx_quality_inspections_status ON quality_inspections(status);
CREATE INDEX idx_quality_inspections_date ON quality_inspections(inspection_date DESC);

COMMENT ON TABLE quality_inspections IS '质量检验表';

-- 创建检验照片表
CREATE TABLE inspection_photos (
    id BIGSERIAL PRIMARY KEY,
    inspection_id BIGINT NOT NULL REFERENCES quality_inspections(id) ON DELETE CASCADE,
    photo_url VARCHAR(500) NOT NULL,
    photo_hash VARCHAR(64) NOT NULL,
    photo_type VARCHAR(20) DEFAULT 'inspection' CHECK (photo_type IN ('inspection', 'defect', 'certificate')),
    description TEXT,
    uploaded_by UUID REFERENCES profiles(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inspection_photos_inspection ON inspection_photos(inspection_id);
CREATE INDEX idx_inspection_photos_hash ON inspection_photos(photo_hash);

COMMENT ON TABLE inspection_photos IS '检验照片表';

-- 创建批次溯源码表
CREATE TABLE batch_traceability_codes (
    id BIGSERIAL PRIMARY KEY,
    batch_code VARCHAR(100) UNIQUE NOT NULL,
    order_id BIGINT NOT NULL REFERENCES production_orders(id),
    part_code VARCHAR(50) NOT NULL,
    part_name VARCHAR(100) NOT NULL,
    batch_quantity INTEGER NOT NULL,
    production_date DATE NOT NULL,
    expiry_date DATE,
    qr_code_data TEXT NOT NULL,
    blockchain_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'shipped', 'received', 'consumed', 'expired')),
    tenant_id VARCHAR(20) DEFAULT 'CN',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_batch_codes_order ON batch_traceability_codes(order_id);
CREATE INDEX idx_batch_codes_batch ON batch_traceability_codes(batch_code);
CREATE INDEX idx_batch_codes_hash ON batch_traceability_codes(blockchain_hash);

COMMENT ON TABLE batch_traceability_codes IS '批次溯源码表';
COMMENT ON COLUMN batch_traceability_codes.blockchain_hash IS 'SHA-256哈希值，用于区块链级验证';

-- 配置RLS策略
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看本租户的生产订单" ON production_orders
  FOR SELECT TO authenticated 
  USING (can_access_tenant(auth.uid(), tenant_id));

CREATE POLICY "生产人员可以创建生产订单" ON production_orders
  FOR INSERT TO authenticated 
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'cn_factory_manager') OR 
    has_role(auth.uid(), 'cn_production_staff')
  );

CREATE POLICY "生产人员可以更新生产订单" ON production_orders
  FOR UPDATE TO authenticated 
  USING (can_access_tenant(auth.uid(), tenant_id))
  WITH CHECK (can_access_tenant(auth.uid(), tenant_id));

ALTER TABLE production_processes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看本租户的生产工序" ON production_processes
  FOR SELECT TO authenticated 
  USING (can_access_tenant(auth.uid(), tenant_id));

CREATE POLICY "生产人员可以管理生产工序" ON production_processes
  FOR ALL TO authenticated 
  USING (can_access_tenant(auth.uid(), tenant_id))
  WITH CHECK (can_access_tenant(auth.uid(), tenant_id));

ALTER TABLE process_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有认证用户可以查看工序照片" ON process_photos
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "生产人员可以上传工序照片" ON process_photos
  FOR INSERT TO authenticated 
  WITH CHECK (true);

ALTER TABLE quality_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看本租户的质量检验" ON quality_inspections
  FOR SELECT TO authenticated 
  USING (can_access_tenant(auth.uid(), tenant_id));

CREATE POLICY "质检人员可以管理质量检验" ON quality_inspections
  FOR ALL TO authenticated 
  USING (can_access_tenant(auth.uid(), tenant_id))
  WITH CHECK (can_access_tenant(auth.uid(), tenant_id));

ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有认证用户可以查看检验照片" ON inspection_photos
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "质检人员可以上传检验照片" ON inspection_photos
  FOR INSERT TO authenticated 
  WITH CHECK (true);

ALTER TABLE batch_traceability_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有认证用户可以查看批次溯源码" ON batch_traceability_codes
  FOR SELECT TO authenticated 
  USING (can_access_tenant(auth.uid(), tenant_id));

CREATE POLICY "生产人员可以创建批次溯源码" ON batch_traceability_codes
  FOR INSERT TO authenticated 
  WITH CHECK (can_access_tenant(auth.uid(), tenant_id));