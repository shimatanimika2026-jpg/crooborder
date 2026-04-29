-- 删除旧函数
DROP FUNCTION IF EXISTS create_shipping_order(bigint,text,text,text,text,text,text,text,date,jsonb,text,uuid);
DROP FUNCTION IF EXISTS confirm_shipment(bigint,text,timestamptz,text,uuid);
DROP FUNCTION IF EXISTS update_logistics_status(bigint,text,text,text,text);
DROP FUNCTION IF EXISTS create_logistics_exception_event(bigint,text,text,text,text,uuid);
DROP FUNCTION IF EXISTS detect_logistics_timeout_exceptions(int,text);

-- 创建发货订单
CREATE FUNCTION create_shipping_order(
  p_asn_shipment_id BIGINT,
  p_shipper_name TEXT,
  p_shipper_contact TEXT,
  p_shipper_address TEXT,
  p_consignee_name TEXT,
  p_consignee_contact TEXT,
  p_consignee_address TEXT,
  p_carrier TEXT,
  p_estimated_ship_date DATE,
  p_items JSONB,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BIGINT AS $$
DECLARE
  v_order_id BIGINT;
  v_order_code TEXT;
BEGIN
  v_order_code := 'SHIP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('shipping_orders_id_seq')::TEXT, 6, '0');
  
  INSERT INTO shipping_orders (
    order_code, asn_shipment_id, shipper_name, shipper_contact, shipper_address,
    consignee_name, consignee_contact, consignee_address,
    carrier, estimated_ship_date, items, status, tenant_id, created_by
  ) VALUES (
    v_order_code, p_asn_shipment_id, p_shipper_name, p_shipper_contact, p_shipper_address,
    p_consignee_name, p_consignee_contact, p_consignee_address,
    p_carrier, p_estimated_ship_date, p_items, 'pending', p_tenant_id, p_user_id
  ) RETURNING id INTO v_order_id;
  
  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 确认发货并创建物流轨迹
CREATE FUNCTION confirm_shipment(
  p_order_id BIGINT,
  p_tracking_number TEXT,
  p_actual_ship_date TIMESTAMPTZ,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_order RECORD;
  v_tracking_id BIGINT;
BEGIN
  SELECT * INTO v_order FROM shipping_orders WHERE id = p_order_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION '发货订单不存在'; END IF;
  
  IF v_order.status NOT IN ('pending', 'preparing') THEN
    RAISE EXCEPTION '只有待发货或准备中的订单可以确认发货';
  END IF;
  
  UPDATE shipping_orders 
  SET 
    status = 'shipped',
    tracking_number = p_tracking_number,
    actual_ship_date = p_actual_ship_date,
    updated_at = NOW()
  WHERE id = p_order_id;
  
  INSERT INTO logistics_tracking (
    shipping_order_id, tracking_number, carrier, current_status,
    current_location, last_update_time, tenant_id
  ) VALUES (
    p_order_id, p_tracking_number, v_order.carrier, 'picked_up',
    v_order.shipper_address, p_actual_ship_date, p_tenant_id
  ) RETURNING id INTO v_tracking_id;
  
  INSERT INTO logistics_events (
    tracking_id, shipping_order_id, event_type, event_status,
    event_time, location, description, tenant_id
  ) VALUES (
    v_tracking_id, p_order_id, 'normal_update', 'resolved',
    p_actual_ship_date, v_order.shipper_address, '货物已揽收', p_tenant_id
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 更新物流状态
CREATE FUNCTION update_logistics_status(
  p_tracking_id BIGINT,
  p_new_status TEXT,
  p_location TEXT,
  p_description TEXT,
  p_tenant_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_tracking RECORD;
  v_order_status TEXT;
BEGIN
  SELECT * INTO v_tracking FROM logistics_tracking WHERE id = p_tracking_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION '物流轨迹不存在'; END IF;
  
  UPDATE logistics_tracking 
  SET 
    current_status = p_new_status,
    previous_location = current_location,
    current_location = p_location,
    last_update_time = NOW(),
    updated_at = NOW()
  WHERE id = p_tracking_id;
  
  v_order_status := CASE p_new_status
    WHEN 'picked_up' THEN 'shipped'
    WHEN 'departed' THEN 'in_transit'
    WHEN 'in_transit' THEN 'in_transit'
    WHEN 'arrived_port' THEN 'in_transit'
    WHEN 'customs_clearance' THEN 'customs_clearance'
    WHEN 'customs_cleared' THEN 'in_transit'
    WHEN 'out_for_delivery' THEN 'delivering'
    WHEN 'delivered' THEN 'delivered'
    WHEN 'exception' THEN 'exception'
    ELSE 'in_transit'
  END;
  
  UPDATE shipping_orders 
  SET 
    status = v_order_status,
    actual_delivery_date = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE actual_delivery_date END,
    updated_at = NOW()
  WHERE id = v_tracking.shipping_order_id;
  
  INSERT INTO logistics_events (
    tracking_id, shipping_order_id, event_type, event_status,
    event_time, location, description, tenant_id
  ) VALUES (
    p_tracking_id, v_tracking.shipping_order_id, 
    CASE WHEN p_new_status = 'exception' THEN 'other' ELSE 'normal_update' END,
    'resolved',
    NOW(), p_location, p_description, p_tenant_id
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 记录物流异常事件
CREATE FUNCTION create_logistics_exception_event(
  p_tracking_id BIGINT,
  p_event_type TEXT,
  p_description TEXT,
  p_location TEXT,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BIGINT AS $$
DECLARE
  v_tracking RECORD;
  v_event_id BIGINT;
  v_exception_id BIGINT;
BEGIN
  SELECT * INTO v_tracking FROM logistics_tracking WHERE id = p_tracking_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION '物流轨迹不存在'; END IF;
  
  INSERT INTO logistics_events (
    tracking_id, shipping_order_id, event_type, event_status,
    event_time, location, description, tenant_id
  ) VALUES (
    p_tracking_id, v_tracking.shipping_order_id, p_event_type, 'pending',
    NOW(), p_location, p_description, p_tenant_id
  ) RETURNING id INTO v_event_id;
  
  UPDATE logistics_tracking 
  SET 
    current_status = 'exception',
    updated_at = NOW()
  WHERE id = p_tracking_id;
  
  UPDATE shipping_orders 
  SET 
    status = 'exception',
    updated_at = NOW()
  WHERE id = v_tracking.shipping_order_id;
  
  INSERT INTO operation_exceptions (
    exception_code, exception_type, severity, current_status, source_module,
    title, description, tenant_id, reporter_id
  ) VALUES (
    'LOG-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('operation_exceptions_id_seq')::TEXT, 6, '0'),
    'logistics_exception', 'high', 'open', 'logistics',
    '物流异常：' || p_event_type, p_description, p_tenant_id, p_user_id
  ) RETURNING id INTO v_exception_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检测物流异常（超时无更新）
CREATE FUNCTION detect_logistics_timeout_exceptions(
  p_hours_threshold INT DEFAULT 48,
  p_tenant_id TEXT DEFAULT NULL
)
RETURNS TABLE(tracking_id BIGINT, order_code TEXT, hours_since_update INT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lt.id AS tracking_id,
    so.order_code,
    EXTRACT(EPOCH FROM (NOW() - lt.last_update_time))::INT / 3600 AS hours_since_update
  FROM logistics_tracking lt
  JOIN shipping_orders so ON lt.shipping_order_id = so.id
  WHERE 
    lt.current_status NOT IN ('delivered', 'exception')
    AND EXTRACT(EPOCH FROM (NOW() - lt.last_update_time)) / 3600 > p_hours_threshold
    AND (p_tenant_id IS NULL OR lt.tenant_id = p_tenant_id)
  ORDER BY hours_since_update DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;