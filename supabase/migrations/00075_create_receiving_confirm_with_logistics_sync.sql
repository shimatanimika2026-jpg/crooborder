-- 收货确认时自动同步物流订单状态
CREATE OR REPLACE FUNCTION sync_shipping_order_on_receiving(
  p_shipment_id BIGINT,
  p_tenant_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_shipping_order RECORD;
  v_tracking RECORD;
BEGIN
  -- 查找关联的物流订单
  SELECT * INTO v_shipping_order
  FROM shipping_orders
  WHERE asn_shipment_id = p_shipment_id
    AND tenant_id = p_tenant_id
  LIMIT 1;
  
  IF NOT FOUND THEN
    -- 没有关联的物流订单，直接返回成功
    RETURN TRUE;
  END IF;
  
  -- 更新物流订单状态为已签收
  UPDATE shipping_orders
  SET 
    status = 'delivered',
    actual_delivery_date = NOW(),
    updated_at = NOW()
  WHERE id = v_shipping_order.id;
  
  -- 查找物流轨迹
  SELECT * INTO v_tracking
  FROM logistics_tracking
  WHERE shipping_order_id = v_shipping_order.id
  LIMIT 1;
  
  IF FOUND THEN
    -- 更新物流轨迹状态
    UPDATE logistics_tracking
    SET 
      current_status = 'delivered',
      previous_location = current_location,
      current_location = '日本工厂',
      last_update_time = NOW(),
      updated_at = NOW()
    WHERE id = v_tracking.id;
    
    -- 记录物流事件
    INSERT INTO logistics_events (
      tracking_id,
      shipping_order_id,
      event_type,
      event_status,
      event_time,
      location,
      description,
      tenant_id
    ) VALUES (
      v_tracking.id,
      v_shipping_order.id,
      'normal_update',
      'resolved',
      NOW(),
      '日本工厂',
      '货物已签收',
      p_tenant_id
    );
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- 记录错误但不影响收货流程
    RAISE WARNING '同步物流订单状态失败: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器：收货记录创建时自动同步物流状态
CREATE OR REPLACE FUNCTION trigger_sync_shipping_on_receiving()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果收货记录关联了 ASN，同步物流订单状态
  IF NEW.shipment_id IS NOT NULL THEN
    PERFORM sync_shipping_order_on_receiving(NEW.shipment_id, NEW.tenant_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS sync_shipping_on_receiving_trigger ON receiving_records;

-- 创建触发器
CREATE TRIGGER sync_shipping_on_receiving_trigger
AFTER INSERT ON receiving_records
FOR EACH ROW
EXECUTE FUNCTION trigger_sync_shipping_on_receiving();