-- 创建库存底盘RPC函数

-- 1. reserve_material: 预占物料
CREATE OR REPLACE FUNCTION reserve_material(
  p_receiving_record_item_id BIGINT,
  p_reserved_qty DECIMAL(10,2),
  p_source_type TEXT,
  p_source_id BIGINT,
  p_source_reference TEXT,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BIGINT AS $$
DECLARE
  v_reservation_id BIGINT;
  v_reservation_code TEXT;
  v_active_reservation_count INTEGER;
  v_item RECORD;
BEGIN
  -- 检查来料记录项是否存在
  SELECT * INTO v_item 
  FROM receiving_record_items 
  WHERE id = p_receiving_record_item_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '来料记录项不存在';
  END IF;
  
  -- 检查是否已有active预占(防止重复预占)
  SELECT COUNT(*) INTO v_active_reservation_count
  FROM material_reservations
  WHERE receiving_record_item_id = p_receiving_record_item_id
    AND status = 'active'
    AND source_type = p_source_type
    AND source_id = p_source_id;
  
  IF v_active_reservation_count > 0 THEN
    RAISE EXCEPTION '该物料已被预占,不能重复预占';
  END IF;
  
  -- 检查可用库存(假设receiving_record_items.received_qty为可用库存)
  -- 计算已预占数量
  DECLARE
    v_reserved_total DECIMAL(10,2);
  BEGIN
    SELECT COALESCE(SUM(reserved_qty), 0) INTO v_reserved_total
    FROM material_reservations
    WHERE receiving_record_item_id = p_receiving_record_item_id
      AND status = 'active';
    
    -- 检查可用库存是否足够
    IF (v_item.received_qty - v_reserved_total) < p_reserved_qty THEN
      RAISE EXCEPTION '可用库存不足,可用: %, 需要: %', (v_item.received_qty - v_reserved_total), p_reserved_qty;
    END IF;
  END;
  
  -- 生成预占编号 (RES-YYYYMMDD-NNNNNN)
  v_reservation_code := 'RES-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('material_reservations_id_seq')::TEXT, 6, '0');
  
  -- 创建预占记录
  INSERT INTO material_reservations (
    reservation_code,
    tenant_id,
    receiving_record_item_id,
    reserved_qty,
    reserved_by,
    reserved_at,
    source_type,
    source_id,
    source_reference,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_reservation_code,
    p_tenant_id,
    p_receiving_record_item_id,
    p_reserved_qty,
    p_user_id,
    NOW(),
    p_source_type,
    p_source_id,
    p_source_reference,
    'active',
    NOW(),
    NOW()
  ) RETURNING id INTO v_reservation_id;
  
  RETURN v_reservation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. consume_material: 消耗物料
CREATE OR REPLACE FUNCTION consume_material(
  p_reservation_id BIGINT,
  p_consumed_qty DECIMAL(10,2),
  p_unit_serial_number TEXT,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BIGINT AS $$
DECLARE
  v_consumption_id BIGINT;
  v_consumption_code TEXT;
  v_reservation RECORD;
BEGIN
  -- 获取预占记录
  SELECT * INTO v_reservation
  FROM material_reservations
  WHERE id = p_reservation_id
    AND tenant_id = p_tenant_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '预占记录不存在';
  END IF;
  
  -- 检查预占状态
  IF v_reservation.status != 'active' THEN
    RAISE EXCEPTION '预占记录状态不是active,无法消耗';
  END IF;
  
  -- 检查消耗数量是否超过预占数量
  IF p_consumed_qty > v_reservation.reserved_qty THEN
    RAISE EXCEPTION '消耗数量超过预占数量,预占: %, 消耗: %', v_reservation.reserved_qty, p_consumed_qty;
  END IF;
  
  -- 生成消耗编号 (CONS-YYYYMMDD-NNNNNN)
  v_consumption_code := 'CONS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('material_consumption_records_id_seq')::TEXT, 6, '0');
  
  -- 创建消耗记录
  INSERT INTO material_consumption_records (
    consumption_code,
    tenant_id,
    receiving_record_item_id,
    reservation_id,
    consumed_qty,
    consumed_by,
    consumed_at,
    source_type,
    source_id,
    source_reference,
    unit_serial_number,
    created_at
  ) VALUES (
    v_consumption_code,
    p_tenant_id,
    v_reservation.receiving_record_item_id,
    p_reservation_id,
    p_consumed_qty,
    p_user_id,
    NOW(),
    v_reservation.source_type,
    v_reservation.source_id,
    v_reservation.source_reference,
    p_unit_serial_number,
    NOW()
  ) RETURNING id INTO v_consumption_id;
  
  -- 更新预占状态为consumed
  UPDATE material_reservations
  SET 
    status = 'consumed',
    consumed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_reservation_id;
  
  RETURN v_consumption_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. release_material: 释放物料
CREATE OR REPLACE FUNCTION release_material(
  p_reservation_id BIGINT,
  p_tenant_id TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_reservation RECORD;
BEGIN
  -- 获取预占记录
  SELECT * INTO v_reservation
  FROM material_reservations
  WHERE id = p_reservation_id
    AND tenant_id = p_tenant_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '预占记录不存在';
  END IF;
  
  -- 检查预占状态
  IF v_reservation.status != 'active' THEN
    RAISE EXCEPTION '预占记录状态不是active,无法释放';
  END IF;
  
  -- 更新预占状态为released
  UPDATE material_reservations
  SET 
    status = 'released',
    released_at = NOW(),
    notes = COALESCE(p_notes, notes),
    updated_at = NOW()
  WHERE id = p_reservation_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reserve_material IS '预占物料(检查active预占防止重复/检查可用库存/生成预占编号/创建预占记录)';
COMMENT ON FUNCTION consume_material IS '消耗物料(获取预占记录/生成消耗编号/创建消耗记录/更新预占状态为consumed)';
COMMENT ON FUNCTION release_material IS '释放物料(获取预占记录/更新预占状态为released/更新released_at时间戳)';