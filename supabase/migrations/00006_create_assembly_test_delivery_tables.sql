-- 创建组装任务表
CREATE TABLE assembly_tasks (
    id BIGSERIAL PRIMARY KEY,
    task_code VARCHAR(50) UNIQUE NOT NULL,
    receiving_id BIGINT NOT NULL REFERENCES receiving_records(id),
    product_model VARCHAR(100) NOT NULL,
    planned_quantity INTEGER NOT NULL,
    completed_quantity INTEGER DEFAULT 0,
    planned_start_date DATE NOT NULL,
    planned_end_date DATE NOT NULL,
    actual_start_date DATE,
    actual_end_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'paused', 'cancelled')),
    tenant_id VARCHAR(20) DEFAULT 'JP',
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assembly_tasks_receiving ON assembly_tasks(receiving_id);
CREATE INDEX idx_assembly_tasks_status ON assembly_tasks(status);
CREATE INDEX idx_assembly_tasks_code ON assembly_tasks(task_code);

COMMENT ON TABLE assembly_tasks IS '组装任务表';

-- 创建组装工序表
CREATE TABLE assembly_processes (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES assembly_tasks(id) ON DELETE CASCADE,
    process_name VARCHAR(100) NOT NULL,
    process_sequence INTEGER NOT NULL,
    sop_document_url VARCHAR(500),
    planned_work_hours DECIMAL(10,2) NOT NULL,
    actual_work_hours DECIMAL(10,2),
    completed_quantity INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'paused')),
    operator_id UUID REFERENCES profiles(id),
    tenant_id VARCHAR(20) DEFAULT 'JP',
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assembly_processes_task ON assembly_processes(task_id);
CREATE INDEX idx_assembly_processes_status ON assembly_processes(status);

COMMENT ON TABLE assembly_processes IS '组装工序表';

-- 创建工时记录表
CREATE TABLE work_hour_records (
    id BIGSERIAL PRIMARY KEY,
    process_id BIGINT NOT NULL REFERENCES assembly_processes(id) ON DELETE CASCADE,
    operator_id UUID NOT NULL REFERENCES profiles(id),
    work_date DATE NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    work_hours DECIMAL(10,2) GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
    ) STORED,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_work_hour_records_process ON work_hour_records(process_id);
CREATE INDEX idx_work_hour_records_operator ON work_hour_records(operator_id);
CREATE INDEX idx_work_hour_records_date ON work_hour_records(work_date DESC);

COMMENT ON TABLE work_hour_records IS '工时记录表';

-- 创建物料消耗记录表
CREATE TABLE material_consumption_records (
    id BIGSERIAL PRIMARY KEY,
    process_id BIGINT NOT NULL REFERENCES assembly_processes(id) ON DELETE CASCADE,
    batch_code VARCHAR(100) REFERENCES batch_traceability_codes(batch_code),
    material_code VARCHAR(50) NOT NULL,
    material_name VARCHAR(100) NOT NULL,
    consumed_quantity INTEGER NOT NULL,
    consumption_date DATE NOT NULL,
    operator_id UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_material_consumption_process ON material_consumption_records(process_id);
CREATE INDEX idx_material_consumption_batch ON material_consumption_records(batch_code);

COMMENT ON TABLE material_consumption_records IS '物料消耗记录表';

-- 创建组装异常表
CREATE TABLE assembly_anomalies (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES assembly_tasks(id) ON DELETE CASCADE,
    anomaly_type VARCHAR(20) NOT NULL CHECK (anomaly_type IN ('quality', 'equipment', 'material', 'safety', 'other')),
    anomaly_description TEXT NOT NULL,
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    occurred_at TIMESTAMP NOT NULL,
    reporter_id UUID REFERENCES profiles(id),
    handler_id UUID REFERENCES profiles(id),
    resolution TEXT,
    resolved_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    tenant_id VARCHAR(20) DEFAULT 'JP',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assembly_anomalies_task ON assembly_anomalies(task_id);
CREATE INDEX idx_assembly_anomalies_status ON assembly_anomalies(status);
CREATE INDEX idx_assembly_anomalies_severity ON assembly_anomalies(severity);

COMMENT ON TABLE assembly_anomalies IS '组装异常表';

-- 创建异常照片表
CREATE TABLE anomaly_photos (
    id BIGSERIAL PRIMARY KEY,
    anomaly_id BIGINT NOT NULL REFERENCES assembly_anomalies(id) ON DELETE CASCADE,
    photo_url VARCHAR(500) NOT NULL,
    photo_hash VARCHAR(64) NOT NULL,
    description TEXT,
    uploaded_by UUID REFERENCES profiles(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_anomaly_photos_anomaly ON anomaly_photos(anomaly_id);
CREATE INDEX idx_anomaly_photos_hash ON anomaly_photos(photo_hash);

COMMENT ON TABLE anomaly_photos IS '异常照片表';

-- 创建测试记录表
CREATE TABLE test_records (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES assembly_tasks(id),
    product_serial_number VARCHAR(100) UNIQUE NOT NULL,
    test_date DATE NOT NULL,
    tester_id UUID REFERENCES profiles(id),
    test_items JSONB NOT NULL,
    test_results JSONB NOT NULL,
    overall_result VARCHAR(20) NOT NULL CHECK (overall_result IN ('passed', 'failed', 'conditional')),
    notes TEXT,
    tenant_id VARCHAR(20) DEFAULT 'JP',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_records_task ON test_records(task_id);
CREATE INDEX idx_test_records_serial ON test_records(product_serial_number);
CREATE INDEX idx_test_records_result ON test_records(overall_result);

COMMENT ON TABLE test_records IS '测试记录表';

-- 创建测试证书表
CREATE TABLE test_certificates (
    id BIGSERIAL PRIMARY KEY,
    test_id BIGINT NOT NULL REFERENCES test_records(id) ON DELETE CASCADE,
    certificate_number VARCHAR(100) UNIQUE NOT NULL,
    certificate_url VARCHAR(500) NOT NULL,
    issued_date DATE NOT NULL,
    issuer_id UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_certificates_test ON test_certificates(test_id);
CREATE INDEX idx_test_certificates_number ON test_certificates(certificate_number);

COMMENT ON TABLE test_certificates IS '测试证书表';

-- 创建不合格品表
CREATE TABLE defective_products (
    id BIGSERIAL PRIMARY KEY,
    test_id BIGINT NOT NULL REFERENCES test_records(id),
    product_serial_number VARCHAR(100) NOT NULL,
    defect_type VARCHAR(50) NOT NULL,
    defect_description TEXT NOT NULL,
    handling_method VARCHAR(20) NOT NULL CHECK (handling_method IN ('rework', 'scrap', 'downgrade', 'return')),
    handler_id UUID REFERENCES profiles(id),
    handled_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'handling', 'completed')),
    tenant_id VARCHAR(20) DEFAULT 'JP',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_defective_products_test ON defective_products(test_id);
CREATE INDEX idx_defective_products_serial ON defective_products(product_serial_number);
CREATE INDEX idx_defective_products_status ON defective_products(status);

COMMENT ON TABLE defective_products IS '不合格品表';

-- 创建产品溯源码表
CREATE TABLE product_traceability_codes (
    id BIGSERIAL PRIMARY KEY,
    product_code VARCHAR(100) UNIQUE NOT NULL,
    test_id BIGINT NOT NULL REFERENCES test_records(id),
    product_serial_number VARCHAR(100) NOT NULL,
    product_model VARCHAR(100) NOT NULL,
    assembly_date DATE NOT NULL,
    qr_code_data TEXT NOT NULL,
    blockchain_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'delivered', 'warranty', 'retired')),
    tenant_id VARCHAR(20) DEFAULT 'JP',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_codes_test ON product_traceability_codes(test_id);
CREATE INDEX idx_product_codes_product ON product_traceability_codes(product_code);
CREATE INDEX idx_product_codes_hash ON product_traceability_codes(blockchain_hash);

COMMENT ON TABLE product_traceability_codes IS '产品溯源码表';

-- 创建交付订单表
CREATE TABLE delivery_orders (
    id BIGSERIAL PRIMARY KEY,
    delivery_code VARCHAR(50) UNIQUE NOT NULL,
    test_id BIGINT NOT NULL REFERENCES test_records(id),
    delivery_date DATE NOT NULL,
    recipient_name VARCHAR(100) NOT NULL,
    recipient_company VARCHAR(200) NOT NULL,
    recipient_address TEXT NOT NULL,
    recipient_phone VARCHAR(20),
    delivery_method VARCHAR(20) CHECK (delivery_method IN ('pickup', 'delivery', 'express')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'cancelled')),
    tenant_id VARCHAR(20) DEFAULT 'JP',
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_delivery_orders_test ON delivery_orders(test_id);
CREATE INDEX idx_delivery_orders_status ON delivery_orders(status);
CREATE INDEX idx_delivery_orders_code ON delivery_orders(delivery_code);

COMMENT ON TABLE delivery_orders IS '交付订单表';

-- 创建交付签收表
CREATE TABLE delivery_signatures (
    id BIGSERIAL PRIMARY KEY,
    delivery_id BIGINT NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
    signer_name VARCHAR(100) NOT NULL,
    signature_url VARCHAR(500),
    signed_at TIMESTAMP NOT NULL,
    gps_latitude DECIMAL(10,7),
    gps_longitude DECIMAL(10,7),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_delivery_signatures_delivery ON delivery_signatures(delivery_id);

COMMENT ON TABLE delivery_signatures IS '交付签收表';

-- 创建签收照片表
CREATE TABLE signature_photos (
    id BIGSERIAL PRIMARY KEY,
    signature_id BIGINT NOT NULL REFERENCES delivery_signatures(id) ON DELETE CASCADE,
    photo_url VARCHAR(500) NOT NULL,
    photo_hash VARCHAR(64) NOT NULL,
    photo_type VARCHAR(20) DEFAULT 'delivery' CHECK (photo_type IN ('delivery', 'product', 'document')),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_signature_photos_signature ON signature_photos(signature_id);
CREATE INDEX idx_signature_photos_hash ON signature_photos(photo_hash);

COMMENT ON TABLE signature_photos IS '签收照片表';