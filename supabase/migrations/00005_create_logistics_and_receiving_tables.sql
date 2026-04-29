-- 创建发货订单表
CREATE TABLE shipping_orders (
    id BIGSERIAL PRIMARY KEY,
    shipping_code VARCHAR(50) UNIQUE NOT NULL,
    order_id BIGINT NOT NULL REFERENCES production_orders(id),
    shipping_date DATE NOT NULL,
    estimated_arrival_date DATE NOT NULL,
    actual_arrival_date DATE,
    shipping_method VARCHAR(20) NOT NULL CHECK (shipping_method IN ('sea', 'air', 'land', 'express')),
    shipping_company VARCHAR(100),
    total_packages INTEGER NOT NULL,
    total_weight DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'preparing' CHECK (status IN ('preparing', 'shipped', 'in_transit', 'customs', 'arrived', 'cancelled')),
    tenant_id VARCHAR(20) DEFAULT 'CN',
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shipping_orders_order ON shipping_orders(order_id);
CREATE INDEX idx_shipping_orders_status ON shipping_orders(status);
CREATE INDEX idx_shipping_orders_code ON shipping_orders(shipping_code);

COMMENT ON TABLE shipping_orders IS '发货订单表';

-- 创建物流跟踪表
CREATE TABLE logistics_tracking (
    id BIGSERIAL PRIMARY KEY,
    shipping_id BIGINT NOT NULL REFERENCES shipping_orders(id) ON DELETE CASCADE,
    tracking_number VARCHAR(100) UNIQUE NOT NULL,
    logistics_company VARCHAR(100) NOT NULL,
    current_location VARCHAR(200),
    current_status VARCHAR(50),
    estimated_arrival_date DATE,
    gps_latitude DECIMAL(10,7),
    gps_longitude DECIMAL(10,7),
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logistics_tracking_shipping ON logistics_tracking(shipping_id);
CREATE INDEX idx_logistics_tracking_number ON logistics_tracking(tracking_number);

COMMENT ON TABLE logistics_tracking IS '物流跟踪表';

-- 创建物流事件表
CREATE TABLE logistics_events (
    id BIGSERIAL PRIMARY KEY,
    tracking_id BIGINT NOT NULL REFERENCES logistics_tracking(id) ON DELETE CASCADE,
    event_time TIMESTAMP NOT NULL,
    event_location VARCHAR(200),
    event_description TEXT NOT NULL,
    event_type VARCHAR(20) CHECK (event_type IN ('pickup', 'in_transit', 'customs', 'delay', 'arrived', 'exception')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logistics_events_tracking ON logistics_events(tracking_id);
CREATE INDEX idx_logistics_events_time ON logistics_events(event_time DESC);

COMMENT ON TABLE logistics_events IS '物流事件表';

-- 创建接收记录表
CREATE TABLE receiving_records (
    id BIGSERIAL PRIMARY KEY,
    receiving_code VARCHAR(50) UNIQUE NOT NULL,
    shipping_id BIGINT NOT NULL REFERENCES shipping_orders(id),
    receiving_date DATE NOT NULL,
    receiver_id UUID REFERENCES profiles(id),
    received_packages INTEGER NOT NULL,
    received_weight DECIMAL(10,2),
    warehouse_location VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'inspecting', 'accepted', 'rejected', 'partial')),
    notes TEXT,
    tenant_id VARCHAR(20) DEFAULT 'JP',
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_receiving_records_shipping ON receiving_records(shipping_id);
CREATE INDEX idx_receiving_records_status ON receiving_records(status);
CREATE INDEX idx_receiving_records_code ON receiving_records(receiving_code);

COMMENT ON TABLE receiving_records IS '接收记录表';

-- 创建接收检验表
CREATE TABLE receiving_inspections (
    id BIGSERIAL PRIMARY KEY,
    receiving_id BIGINT NOT NULL REFERENCES receiving_records(id) ON DELETE CASCADE,
    batch_code VARCHAR(100) REFERENCES batch_traceability_codes(batch_code),
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
    ai_vision_result JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed', 'rework')),
    tenant_id VARCHAR(20) DEFAULT 'JP',
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_receiving_inspections_receiving ON receiving_inspections(receiving_id);
CREATE INDEX idx_receiving_inspections_batch ON receiving_inspections(batch_code);
CREATE INDEX idx_receiving_inspections_status ON receiving_inspections(status);

COMMENT ON TABLE receiving_inspections IS '接收检验表';
COMMENT ON COLUMN receiving_inspections.ai_vision_result IS 'AI视觉检验结果JSON';

-- 配置RLS策略
ALTER TABLE shipping_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看本租户的发货订单" ON shipping_orders
  FOR SELECT TO authenticated 
  USING (can_access_tenant(auth.uid(), tenant_id) OR can_access_tenant(auth.uid(), 'JP'));

CREATE POLICY "物流人员可以管理发货订单" ON shipping_orders
  FOR ALL TO authenticated 
  USING (can_access_tenant(auth.uid(), tenant_id))
  WITH CHECK (can_access_tenant(auth.uid(), tenant_id));

ALTER TABLE logistics_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有认证用户可以查看物流跟踪" ON logistics_tracking
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "物流人员可以管理物流跟踪" ON logistics_tracking
  FOR ALL TO authenticated 
  WITH CHECK (true);

ALTER TABLE logistics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有认证用户可以查看物流事件" ON logistics_events
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "物流人员可以创建物流事件" ON logistics_events
  FOR INSERT TO authenticated 
  WITH CHECK (true);

ALTER TABLE receiving_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看本租户的接收记录" ON receiving_records
  FOR SELECT TO authenticated 
  USING (can_access_tenant(auth.uid(), tenant_id) OR can_access_tenant(auth.uid(), 'CN'));

CREATE POLICY "仓库人员可以管理接收记录" ON receiving_records
  FOR ALL TO authenticated 
  USING (can_access_tenant(auth.uid(), tenant_id))
  WITH CHECK (can_access_tenant(auth.uid(), tenant_id));

ALTER TABLE receiving_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看本租户的接收检验" ON receiving_inspections
  FOR SELECT TO authenticated 
  USING (can_access_tenant(auth.uid(), tenant_id) OR can_access_tenant(auth.uid(), 'CN'));

CREATE POLICY "质检人员可以管理接收检验" ON receiving_inspections
  FOR ALL TO authenticated 
  USING (can_access_tenant(auth.uid(), tenant_id))
  WITH CHECK (can_access_tenant(auth.uid(), tenant_id));