-- 获取物流看板统计数据
CREATE OR REPLACE FUNCTION get_logistics_dashboard_stats(
  p_tenant_id TEXT,
  p_carrier TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_in_transit_count INT;
  v_exception_count INT;
  v_avg_transport_hours NUMERIC;
  v_avg_customs_hours NUMERIC;
  v_timeout_count INT;
  v_status_distribution JSON;
BEGIN
  -- 在途订单数
  SELECT COUNT(*) INTO v_in_transit_count
  FROM shipping_orders
  WHERE tenant_id = p_tenant_id
    AND status IN ('shipped', 'in_transit', 'customs_clearance', 'delivering')
    AND (p_carrier IS NULL OR carrier = p_carrier)
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
  
  -- 异常订单数
  SELECT COUNT(*) INTO v_exception_count
  FROM shipping_orders
  WHERE tenant_id = p_tenant_id
    AND status = 'exception'
    AND (p_carrier IS NULL OR carrier = p_carrier)
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
  
  -- 平均运输时长（小时）
  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (actual_delivery_date - actual_ship_date)) / 3600), 0)
  INTO v_avg_transport_hours
  FROM shipping_orders
  WHERE tenant_id = p_tenant_id
    AND status = 'delivered'
    AND actual_ship_date IS NOT NULL
    AND actual_delivery_date IS NOT NULL
    AND (p_carrier IS NULL OR carrier = p_carrier)
    AND (p_start_date IS NULL OR actual_ship_date >= p_start_date)
    AND (p_end_date IS NULL OR actual_ship_date <= p_end_date);
  
  -- 平均清关时长（小时）
  WITH customs_durations AS (
    SELECT 
      so.id,
      EXTRACT(EPOCH FROM (
        (SELECT MIN(event_time) FROM logistics_events 
         WHERE shipping_order_id = so.id 
         AND description ILIKE '%清关完成%' OR description ILIKE '%customs cleared%')
        -
        (SELECT MIN(event_time) FROM logistics_events 
         WHERE shipping_order_id = so.id 
         AND description ILIKE '%清关中%' OR description ILIKE '%customs clearance%')
      )) / 3600 AS duration_hours
    FROM shipping_orders so
    WHERE so.tenant_id = p_tenant_id
      AND (p_carrier IS NULL OR so.carrier = p_carrier)
      AND (p_start_date IS NULL OR so.created_at >= p_start_date)
      AND (p_end_date IS NULL OR so.created_at <= p_end_date)
  )
  SELECT COALESCE(AVG(duration_hours), 0)
  INTO v_avg_customs_hours
  FROM customs_durations
  WHERE duration_hours > 0;
  
  -- 超时订单数
  SELECT COUNT(*) INTO v_timeout_count
  FROM shipping_orders
  WHERE tenant_id = p_tenant_id
    AND status NOT IN ('delivered', 'cancelled', 'exception')
    AND estimated_delivery_date IS NOT NULL
    AND estimated_delivery_date < NOW()
    AND (p_carrier IS NULL OR carrier = p_carrier)
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
  
  -- 订单状态分布
  SELECT json_agg(json_build_object('status', status, 'count', count))
  INTO v_status_distribution
  FROM (
    SELECT status, COUNT(*) as count
    FROM shipping_orders
    WHERE tenant_id = p_tenant_id
      AND (p_carrier IS NULL OR carrier = p_carrier)
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
    GROUP BY status
    ORDER BY count DESC
  ) sub;
  
  -- 构建结果
  v_result := json_build_object(
    'in_transit_count', v_in_transit_count,
    'exception_count', v_exception_count,
    'avg_transport_hours', ROUND(v_avg_transport_hours, 1),
    'avg_customs_hours', ROUND(v_avg_customs_hours, 1),
    'timeout_count', v_timeout_count,
    'status_distribution', COALESCE(v_status_distribution, '[]'::json)
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取承运商绩效统计
CREATE OR REPLACE FUNCTION get_carrier_performance_stats(
  p_tenant_id TEXT,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'carrier', carrier,
      'total_orders', total_orders,
      'delivered_orders', delivered_orders,
      'exception_orders', exception_orders,
      'on_time_orders', on_time_orders,
      'on_time_rate', ROUND((on_time_orders::NUMERIC / NULLIF(delivered_orders, 0) * 100), 1),
      'exception_rate', ROUND((exception_orders::NUMERIC / NULLIF(total_orders, 0) * 100), 1),
      'avg_transport_hours', ROUND(avg_transport_hours, 1)
    )
  )
  INTO v_result
  FROM (
    SELECT 
      carrier,
      COUNT(*) as total_orders,
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered_orders,
      COUNT(*) FILTER (WHERE status = 'exception') as exception_orders,
      COUNT(*) FILTER (
        WHERE status = 'delivered' 
        AND actual_delivery_date IS NOT NULL 
        AND estimated_delivery_date IS NOT NULL
        AND actual_delivery_date <= estimated_delivery_date
      ) as on_time_orders,
      AVG(
        EXTRACT(EPOCH FROM (actual_delivery_date - actual_ship_date)) / 3600
      ) FILTER (
        WHERE status = 'delivered' 
        AND actual_ship_date IS NOT NULL 
        AND actual_delivery_date IS NOT NULL
      ) as avg_transport_hours
    FROM shipping_orders
    WHERE tenant_id = p_tenant_id
      AND carrier IS NOT NULL
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
    GROUP BY carrier
    ORDER BY total_orders DESC
  ) sub;
  
  RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取超时订单列表
CREATE OR REPLACE FUNCTION get_timeout_orders(
  p_tenant_id TEXT,
  p_carrier TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10
)
RETURNS TABLE(
  id BIGINT,
  order_code TEXT,
  carrier TEXT,
  tracking_number TEXT,
  status TEXT,
  estimated_delivery_date DATE,
  days_overdue INT,
  consignee_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    so.id,
    so.order_code,
    so.carrier,
    so.tracking_number,
    so.status,
    so.estimated_delivery_date,
    EXTRACT(DAY FROM (NOW() - so.estimated_delivery_date::TIMESTAMPTZ))::INT as days_overdue,
    so.consignee_name
  FROM shipping_orders so
  WHERE so.tenant_id = p_tenant_id
    AND so.status NOT IN ('delivered', 'cancelled', 'exception')
    AND so.estimated_delivery_date IS NOT NULL
    AND so.estimated_delivery_date < CURRENT_DATE
    AND (p_carrier IS NULL OR so.carrier = p_carrier)
  ORDER BY so.estimated_delivery_date ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取异常订单列表
CREATE OR REPLACE FUNCTION get_exception_orders(
  p_tenant_id TEXT,
  p_carrier TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10
)
RETURNS TABLE(
  id BIGINT,
  order_code TEXT,
  carrier TEXT,
  tracking_number TEXT,
  exception_type TEXT,
  exception_description TEXT,
  created_at TIMESTAMPTZ,
  consignee_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    so.id,
    so.order_code,
    so.carrier,
    so.tracking_number,
    le.event_type as exception_type,
    le.description as exception_description,
    le.created_at,
    so.consignee_name
  FROM shipping_orders so
  LEFT JOIN LATERAL (
    SELECT event_type, description, created_at
    FROM logistics_events
    WHERE shipping_order_id = so.id
      AND event_type != 'normal_update'
    ORDER BY created_at DESC
    LIMIT 1
  ) le ON true
  WHERE so.tenant_id = p_tenant_id
    AND so.status = 'exception'
    AND (p_carrier IS NULL OR so.carrier = p_carrier)
  ORDER BY le.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;