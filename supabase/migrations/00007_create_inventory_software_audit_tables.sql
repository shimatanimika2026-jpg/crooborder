-- 创建软件版本表
CREATE TABLE software_versions (
    id BIGSERIAL PRIMARY KEY,
    version_code VARCHAR(50) UNIQUE NOT NULL,
    version_name VARCHAR(100) NOT NULL,
    version_type VARCHAR(20) NOT NULL CHECK (version_type IN ('firmware', 'software', 'patch')),
    release_date DATE NOT NULL,
    release_notes TEXT,
    file_url VARCHAR(500) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'archived')),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_software_versions_code ON software_versions(version_code);
CREATE INDEX idx_software_versions_status ON software_versions(status);

COMMENT ON TABLE software_versions IS '软件版本表';

-- 创建升级任务表
CREATE TABLE upgrade_tasks (
    id BIGSERIAL PRIMARY KEY,
    task_code VARCHAR(50) UNIQUE NOT NULL,
    version_id BIGINT NOT NULL REFERENCES software_versions(id),
    target_products JSONB NOT NULL,
    scheduled_time TIMESTAMP NOT NULL,
    execution_time TIMESTAMP,
    completion_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_upgrade_tasks_version ON upgrade_tasks(version_id);
CREATE INDEX idx_upgrade_tasks_status ON upgrade_tasks(status);

COMMENT ON TABLE upgrade_tasks IS '升级任务表';
COMMENT ON COLUMN upgrade_tasks.target_products IS '目标产品列表JSON';

-- 创建升级日志表
CREATE TABLE upgrade_logs (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES upgrade_tasks(id) ON DELETE CASCADE,
    product_code VARCHAR(100) NOT NULL,
    previous_version VARCHAR(50),
    target_version VARCHAR(50) NOT NULL,
    upgrade_status VARCHAR(20) NOT NULL CHECK (upgrade_status IN ('success', 'failed', 'rollback')),
    error_message TEXT,
    upgrade_start_time TIMESTAMP NOT NULL,
    upgrade_end_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_upgrade_logs_task ON upgrade_logs(task_id);
CREATE INDEX idx_upgrade_logs_product ON upgrade_logs(product_code);
CREATE INDEX idx_upgrade_logs_status ON upgrade_logs(upgrade_status);

COMMENT ON TABLE upgrade_logs IS '升级日志表';

-- 创建库存记录表
CREATE TABLE inventory_records (
    id BIGSERIAL PRIMARY KEY,
    material_code VARCHAR(50) NOT NULL,
    material_name VARCHAR(100) NOT NULL,
    material_type VARCHAR(20) NOT NULL CHECK (material_type IN ('raw_material', 'component', 'semi_finished', 'finished')),
    warehouse_location VARCHAR(100) NOT NULL,
    current_quantity INTEGER NOT NULL DEFAULT 0,
    safety_stock_threshold INTEGER NOT NULL,
    unit VARCHAR(20) NOT NULL,
    unit_price DECIMAL(10,2),
    tenant_id VARCHAR(20) NOT NULL CHECK (tenant_id IN ('CN', 'JP')),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(material_code, warehouse_location, tenant_id)
);

CREATE INDEX idx_inventory_records_material ON inventory_records(material_code);
CREATE INDEX idx_inventory_records_tenant ON inventory_records(tenant_id);
CREATE INDEX idx_inventory_records_location ON inventory_records(warehouse_location);

COMMENT ON TABLE inventory_records IS '库存记录表';

-- 创建库存事务表
CREATE TABLE inventory_transactions (
    id BIGSERIAL PRIMARY KEY,
    inventory_id BIGINT NOT NULL REFERENCES inventory_records(id),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('in', 'out', 'transfer', 'adjust', 'return')),
    transaction_quantity INTEGER NOT NULL,
    transaction_date DATE NOT NULL,
    related_module VARCHAR(50),
    related_id BIGINT,
    operator_id UUID REFERENCES profiles(id),
    notes TEXT,
    tenant_id VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_transactions_inventory ON inventory_transactions(inventory_id);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_transactions_date ON inventory_transactions(transaction_date DESC);

COMMENT ON TABLE inventory_transactions IS '库存事务表';

-- 创建库存预警表
CREATE TABLE inventory_alerts (
    id BIGSERIAL PRIMARY KEY,
    inventory_id BIGINT NOT NULL REFERENCES inventory_records(id),
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'overstock', 'expiring')),
    alert_level VARCHAR(10) NOT NULL CHECK (alert_level IN ('info', 'warning', 'critical')),
    alert_message TEXT NOT NULL,
    triggered_at TIMESTAMP NOT NULL,
    acknowledged_by UUID REFERENCES profiles(id),
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    tenant_id VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_alerts_inventory ON inventory_alerts(inventory_id);
CREATE INDEX idx_inventory_alerts_status ON inventory_alerts(status);
CREATE INDEX idx_inventory_alerts_level ON inventory_alerts(alert_level);

COMMENT ON TABLE inventory_alerts IS '库存预警表';

-- 创建操作日志表（不可篡改）
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id),
    operation_module VARCHAR(50) NOT NULL,
    operation_action VARCHAR(50) NOT NULL,
    operation_content TEXT NOT NULL,
    operation_result VARCHAR(20) NOT NULL CHECK (operation_result IN ('success', 'failure')),
    ip_address VARCHAR(50),
    user_agent TEXT,
    request_params JSONB,
    response_data JSONB,
    log_hash VARCHAR(64) NOT NULL,
    operation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_module ON audit_logs(operation_module);
CREATE INDEX idx_audit_logs_time ON audit_logs(operation_time DESC);
CREATE INDEX idx_audit_logs_hash ON audit_logs(log_hash);

COMMENT ON TABLE audit_logs IS '操作日志表（不可删除）';
COMMENT ON COLUMN audit_logs.log_hash IS 'SHA-256哈希值，确保日志不可篡改';

-- 创建触发器：禁止删除和更新操作日志
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION '操作日志不可删除或修改';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_audit_log_delete
BEFORE DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER trigger_prevent_audit_log_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- 创建数据备份表
CREATE TABLE data_backups (
    id BIGSERIAL PRIMARY KEY,
    backup_name VARCHAR(100) NOT NULL,
    backup_type VARCHAR(20) NOT NULL CHECK (backup_type IN ('full', 'incremental', 'differential')),
    backup_content TEXT,
    backup_file_path VARCHAR(500) NOT NULL,
    backup_file_size BIGINT,
    backup_status VARCHAR(20) DEFAULT 'in_progress' CHECK (backup_status IN ('in_progress', 'completed', 'failed')),
    backup_start_time TIMESTAMP NOT NULL,
    backup_end_time TIMESTAMP,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_data_backups_status ON data_backups(backup_status);
CREATE INDEX idx_data_backups_time ON data_backups(backup_start_time DESC);

COMMENT ON TABLE data_backups IS '数据备份表';

-- 配置RLS策略
ALTER TABLE inventory_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看本租户的库存" ON inventory_records
  FOR SELECT TO authenticated 
  USING (can_access_tenant(auth.uid(), tenant_id));

CREATE POLICY "管理人员可以管理库存" ON inventory_records
  FOR ALL TO authenticated 
  USING (can_access_tenant(auth.uid(), tenant_id))
  WITH CHECK (can_access_tenant(auth.uid(), tenant_id));

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看本租户的库存事务" ON inventory_transactions
  FOR SELECT TO authenticated 
  USING (can_access_tenant(auth.uid(), tenant_id));

CREATE POLICY "操作人员可以创建库存事务" ON inventory_transactions
  FOR INSERT TO authenticated 
  WITH CHECK (can_access_tenant(auth.uid(), tenant_id));

ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看本租户的库存预警" ON inventory_alerts
  FOR SELECT TO authenticated 
  USING (can_access_tenant(auth.uid(), tenant_id));

CREATE POLICY "系统可以创建库存预警" ON inventory_alerts
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY "用户可以确认库存预警" ON inventory_alerts
  FOR UPDATE TO authenticated 
  USING (can_access_tenant(auth.uid(), tenant_id))
  WITH CHECK (can_access_tenant(auth.uid(), tenant_id));

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "管理员可以查看所有操作日志" ON audit_logs
  FOR SELECT TO authenticated 
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'system_admin'));

CREATE POLICY "用户可以查看自己的操作日志" ON audit_logs
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "系统可以创建操作日志" ON audit_logs
  FOR INSERT TO authenticated 
  WITH CHECK (true);