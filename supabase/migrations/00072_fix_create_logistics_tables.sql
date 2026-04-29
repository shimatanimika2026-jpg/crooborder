-- 删除之前失败的表（如果存在）
DROP TABLE IF EXISTS logistics_events CASCADE;
DROP TABLE IF EXISTS logistics_tracking CASCADE;
DROP TABLE IF EXISTS shipping_orders CASCADE;

-- 创建发货订单表（修正 ASN 外键）
CREATE TABLE IF NOT EXISTS shipping_orders (
  id BIGSERIAL PRIMARY KEY,
  order_code TEXT UNIQUE NOT NULL,
  asn_shipment_id BIGINT REFERENCES asn_shipments(id),
  shipper_name TEXT NOT NULL,
  shipper_contact TEXT,
  shipper_address TEXT,
  consignee_name TEXT NOT NULL,
  consignee_contact TEXT NOT NULL,
  consignee_address TEXT NOT NULL,
  consignee_country TEXT DEFAULT 'JP',
  warehouse_id TEXT,
  carrier TEXT,
  tracking_number TEXT,
  estimated_ship_date DATE,
  actual_ship_date TIMESTAMPTZ,
  estimated_delivery_date DATE,
  actual_delivery_date TIMESTAMPTZ,
  total_weight DECIMAL(10, 2),
  total_volume DECIMAL(10, 2),
  declared_value DECIMAL(12, 2),
  currency TEXT DEFAULT 'CNY',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'shipped', 'in_transit', 'customs_clearance', 'delivering', 'delivered', 'exception', 'cancelled')),
  items JSONB,
  remarks TEXT,
  tenant_id TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipping_orders_asn ON shipping_orders(asn_shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipping_orders_tracking ON shipping_orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipping_orders_status ON shipping_orders(status);
CREATE INDEX IF NOT EXISTS idx_shipping_orders_tenant ON shipping_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shipping_orders_ship_date ON shipping_orders(actual_ship_date);

-- 创建物流轨迹表
CREATE TABLE IF NOT EXISTS logistics_tracking (
  id BIGSERIAL PRIMARY KEY,
  shipping_order_id BIGINT NOT NULL REFERENCES shipping_orders(id) ON DELETE CASCADE,
  tracking_number TEXT NOT NULL,
  carrier TEXT NOT NULL,
  current_status TEXT NOT NULL CHECK (current_status IN ('picked_up', 'departed', 'in_transit', 'arrived_port', 'customs_clearance', 'customs_cleared', 'out_for_delivery', 'delivered', 'exception')),
  current_location TEXT,
  current_city TEXT,
  current_country TEXT,
  previous_location TEXT,
  next_expected_location TEXT,
  last_update_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estimated_delivery_time TIMESTAMPTZ,
  actual_delivery_time TIMESTAMPTZ,
  tenant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logistics_tracking_order ON logistics_tracking(shipping_order_id);
CREATE INDEX IF NOT EXISTS idx_logistics_tracking_number ON logistics_tracking(tracking_number);
CREATE INDEX IF NOT EXISTS idx_logistics_tracking_status ON logistics_tracking(current_status);
CREATE INDEX IF NOT EXISTS idx_logistics_tracking_tenant ON logistics_tracking(tenant_id);

-- 创建物流事件表
CREATE TABLE IF NOT EXISTS logistics_events (
  id BIGSERIAL PRIMARY KEY,
  tracking_id BIGINT NOT NULL REFERENCES logistics_tracking(id) ON DELETE CASCADE,
  shipping_order_id BIGINT NOT NULL REFERENCES shipping_orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('normal_update', 'delay', 'damage', 'customs_issue', 'address_error', 'lost', 'returned', 'other')),
  event_status TEXT NOT NULL DEFAULT 'pending' CHECK (event_status IN ('pending', 'in_progress', 'resolved', 'closed')),
  event_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  description TEXT NOT NULL,
  node_name TEXT,
  handler_id UUID REFERENCES auth.users(id),
  handler_notes TEXT,
  resolved_at TIMESTAMPTZ,
  tenant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logistics_events_tracking ON logistics_events(tracking_id);
CREATE INDEX IF NOT EXISTS idx_logistics_events_order ON logistics_events(shipping_order_id);
CREATE INDEX IF NOT EXISTS idx_logistics_events_type ON logistics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_logistics_events_status ON logistics_events(event_status);
CREATE INDEX IF NOT EXISTS idx_logistics_events_tenant ON logistics_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logistics_events_time ON logistics_events(event_time);

-- 设置 RLS 策略
ALTER TABLE shipping_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "租户隔离 - shipping_orders" ON shipping_orders FOR ALL TO authenticated USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE logistics_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "租户隔离 - logistics_tracking" ON logistics_tracking FOR ALL TO authenticated USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE logistics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "租户隔离 - logistics_events" ON logistics_events FOR ALL TO authenticated USING (tenant_id = current_setting('app.current_tenant', true));