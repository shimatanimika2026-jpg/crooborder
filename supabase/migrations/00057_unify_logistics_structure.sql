-- P3: 统一物流数据结构并打通 ASN-物流-收货链路

-- ============================================================
-- 1. 统一 shipping_orders 字段（物流订单表）
-- ============================================================

-- 添加缺失字段
ALTER TABLE shipping_orders 
ADD COLUMN IF NOT EXISTS tracking_no VARCHAR(100),
ADD COLUMN IF NOT EXISTS carrier VARCHAR(100),
ADD COLUMN IF NOT EXISTS origin VARCHAR(200),
ADD COLUMN IF NOT EXISTS destination VARCHAR(200),
ADD COLUMN IF NOT EXISTS current_location VARCHAR(200),
ADD COLUMN IF NOT EXISTS current_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 统一状态枚举（扩展现有状态）
ALTER TABLE shipping_orders 
DROP CONSTRAINT IF EXISTS shipping_orders_status_check;

ALTER TABLE shipping_orders
ADD CONSTRAINT shipping_orders_status_check 
CHECK (status IN (
  'created',           -- 已创建
  'preparing',         -- 准备中
  'shipped',           -- 已发货
  'in_transit',        -- 在途
  'delayed',           -- 延误
  'customs_hold',      -- 海关扣留
  'arrived',           -- 已到达
  'partially_received',-- 部分收货
  'received',          -- 已收货
  'cancelled'          -- 已取消
));

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_shipping_orders_tracking_no ON shipping_orders(tracking_no);
CREATE INDEX IF NOT EXISTS idx_shipping_orders_carrier ON shipping_orders(carrier);

COMMENT ON COLUMN shipping_orders.tracking_no IS '物流跟踪号';
COMMENT ON COLUMN shipping_orders.carrier IS '承运商';
COMMENT ON COLUMN shipping_orders.origin IS '起运地';
COMMENT ON COLUMN shipping_orders.destination IS '目的地';
COMMENT ON COLUMN shipping_orders.current_location IS '当前位置';
COMMENT ON COLUMN shipping_orders.current_status IS '当前状态描述';
COMMENT ON COLUMN shipping_orders.last_update IS '最后更新时间';

-- ============================================================
-- 2. 统一 logistics_tracking 字段（物流跟踪表）
-- ============================================================

-- 添加缺失字段
ALTER TABLE logistics_tracking
ADD COLUMN IF NOT EXISTS shipment_no VARCHAR(100),
ADD COLUMN IF NOT EXISTS carrier VARCHAR(100),
ADD COLUMN IF NOT EXISTS origin VARCHAR(200),
ADD COLUMN IF NOT EXISTS destination VARCHAR(200),
ADD COLUMN IF NOT EXISTS actual_arrival_date DATE;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_logistics_tracking_shipment_no ON logistics_tracking(shipment_no);

COMMENT ON COLUMN logistics_tracking.shipment_no IS '物流单号（与 shipping_orders.shipping_code 对应）';
COMMENT ON COLUMN logistics_tracking.carrier IS '承运商';
COMMENT ON COLUMN logistics_tracking.origin IS '起运地';
COMMENT ON COLUMN logistics_tracking.destination IS '目的地';
COMMENT ON COLUMN logistics_tracking.actual_arrival_date IS '实际到达日期';

-- ============================================================
-- 3. 统一 logistics_events 字段（物流事件表）
-- ============================================================

-- 添加缺失字段
ALTER TABLE logistics_events
ADD COLUMN IF NOT EXISTS shipment_no VARCHAR(100),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- 扩展事件类型枚举
ALTER TABLE logistics_events
DROP CONSTRAINT IF EXISTS logistics_events_event_type_check;

ALTER TABLE logistics_events
ADD CONSTRAINT logistics_events_event_type_check
CHECK (event_type IN (
  'shipped',           -- 已发货
  'pickup',            -- 已取件
  'in_transit',        -- 运输中
  'customs_clearance', -- 清关中
  'customs_hold',      -- 海关扣留
  'delay',             -- 延误
  'delayed',           -- 延误（兼容）
  'arrived',           -- 已到达
  'delivered',         -- 已交付
  'exception',         -- 异常
  'damaged',           -- 货损
  'missing'            -- 丢失
));

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_logistics_events_shipment_no ON logistics_events(shipment_no);

COMMENT ON COLUMN logistics_events.shipment_no IS '物流单号（冗余字段，方便查询）';
COMMENT ON COLUMN logistics_events.created_by IS '事件创建人';

-- ============================================================
-- 4. ASN 与物流关联
-- ============================================================

-- asn_shipments 添加物流关联字段
ALTER TABLE asn_shipments
ADD COLUMN IF NOT EXISTS related_shipment_id BIGINT REFERENCES shipping_orders(id),
ADD COLUMN IF NOT EXISTS related_tracking_no VARCHAR(100);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_asn_shipments_shipment ON asn_shipments(related_shipment_id);
CREATE INDEX IF NOT EXISTS idx_asn_shipments_tracking_no ON asn_shipments(related_tracking_no);

COMMENT ON COLUMN asn_shipments.related_shipment_id IS '关联物流订单 ID';
COMMENT ON COLUMN asn_shipments.related_tracking_no IS '关联物流跟踪号';

-- ============================================================
-- 5. 物流异常类型补充
-- ============================================================

-- 补充物流相关异常类型（在 operation_exceptions 表中使用）
COMMENT ON TABLE operation_exceptions IS 'P2+P3: 统一异常管理表，支持物流异常类型：
- logistics_delayed: 物流延误
- logistics_damaged: 货物损坏
- logistics_missing: 货物丢失
- logistics_customs_issue: 海关问题';

-- ============================================================
-- 6. 创建物流异常 RPC 函数
-- ============================================================

CREATE OR REPLACE FUNCTION create_logistics_exception(
  p_exception_type VARCHAR,
  p_shipment_no VARCHAR,
  p_tracking_no VARCHAR DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_severity VARCHAR DEFAULT 'high',
  p_tenant_id VARCHAR DEFAULT 'CN'
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exception_id BIGINT;
  v_shipment_id BIGINT;
BEGIN
  -- 查找物流订单 ID
  SELECT id INTO v_shipment_id
  FROM shipping_orders
  WHERE shipping_code = p_shipment_no
  LIMIT 1;
  
  -- 创建物流异常
  v_exception_id := create_operation_exception(
    p_exception_type := p_exception_type,
    p_severity := p_severity,
    p_source_module := 'logistics',
    p_source_record_id := v_shipment_id,
    p_remarks := COALESCE(p_description, '物流异常：' || p_exception_type),
    p_tenant_id := p_tenant_id
  );
  
  RETURN v_exception_id;
END;
$$;

COMMENT ON FUNCTION create_logistics_exception IS 'P3: 创建物流异常';

-- ============================================================
-- 7. 创建物流状态更新 RPC 函数
-- ============================================================

CREATE OR REPLACE FUNCTION update_logistics_status(
  p_shipment_no VARCHAR,
  p_new_status VARCHAR,
  p_current_location VARCHAR DEFAULT NULL,
  p_event_description TEXT DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shipment_id BIGINT;
  v_tracking_id BIGINT;
BEGIN
  -- 更新 shipping_orders 状态
  UPDATE shipping_orders
  SET 
    status = p_new_status,
    current_status = COALESCE(p_event_description, p_new_status),
    current_location = COALESCE(p_current_location, current_location),
    last_update = NOW(),
    updated_at = NOW(),
    updated_by = p_updated_by
  WHERE shipping_code = p_shipment_no
  RETURNING id INTO v_shipment_id;
  
  IF v_shipment_id IS NULL THEN
    RAISE EXCEPTION '物流订单不存在: %', p_shipment_no;
  END IF;
  
  -- 更新 logistics_tracking 状态
  UPDATE logistics_tracking
  SET 
    current_status = COALESCE(p_event_description, p_new_status),
    current_location = COALESCE(p_current_location, current_location),
    last_updated_at = NOW()
  WHERE shipping_id = v_shipment_id
  RETURNING id INTO v_tracking_id;
  
  -- 创建物流事件
  IF v_tracking_id IS NOT NULL THEN
    INSERT INTO logistics_events (
      tracking_id,
      shipment_no,
      event_time,
      event_location,
      event_description,
      event_type,
      created_by
    ) VALUES (
      v_tracking_id,
      p_shipment_no,
      NOW(),
      p_current_location,
      COALESCE(p_event_description, '状态更新：' || p_new_status),
      CASE 
        WHEN p_new_status = 'delayed' THEN 'delay'
        WHEN p_new_status = 'customs_hold' THEN 'customs_hold'
        WHEN p_new_status = 'arrived' THEN 'arrived'
        WHEN p_new_status = 'in_transit' THEN 'in_transit'
        ELSE 'in_transit'
      END,
      p_updated_by
    );
  END IF;
  
  -- 如果状态为 delayed，自动生成异常
  IF p_new_status = 'delayed' THEN
    PERFORM create_logistics_exception(
      p_exception_type := 'logistics_delayed',
      p_shipment_no := p_shipment_no,
      p_description := COALESCE(p_event_description, '物流延误'),
      p_severity := 'high'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'shipment_id', v_shipment_id,
    'new_status', p_new_status
  );
END;
$$;

COMMENT ON FUNCTION update_logistics_status IS 'P3: 更新物流状态并自动生成异常';

-- ============================================================
-- 8. 创建物流-ASN 联动查询 view
-- ============================================================

CREATE OR REPLACE VIEW view_logistics_with_asn AS
SELECT 
  so.id AS shipment_id,
  so.shipping_code AS shipment_no,
  so.tracking_no,
  so.carrier,
  so.origin,
  so.destination,
  so.shipping_date,
  so.estimated_arrival_date,
  so.actual_arrival_date,
  so.status,
  so.current_location,
  so.current_status,
  so.last_update,
  so.tenant_id,
  lt.tracking_number,
  lt.logistics_company,
  lt.gps_latitude,
  lt.gps_longitude,
  asn.id AS asn_id,
  asn.shipment_no AS asn_no,
  asn.status AS asn_status,
  rr.id AS receiving_id,
  rr.receiving_code,
  rr.status AS receiving_status
FROM shipping_orders so
LEFT JOIN logistics_tracking lt ON lt.shipping_id = so.id
LEFT JOIN asn_shipments asn ON asn.related_shipment_id = so.id
LEFT JOIN receiving_records rr ON rr.shipping_id = so.id
ORDER BY so.last_update DESC;

COMMENT ON VIEW view_logistics_with_asn IS 'P3: 物流-ASN-收货联动查询视图';
