-- =====================================================
-- 库存预占表和事务表（补充版）
-- 用于实现库存预占、消耗、释放功能
-- 确保账、料、机三者一致
-- 注意：material_reservations 和 inventory_transactions 表已存在
-- 本迁移只添加缺失的函数和索引
-- =====================================================

-- 1. 检查并添加 inventory_reservations 表（如果不存在）
-- 注意：使用 material_reservations 表作为预占记录表
-- 添加缺失的索引
CREATE INDEX IF NOT EXISTS idx_material_reservations_receiving_item ON material_reservations(receiving_record_item_id);
CREATE INDEX IF NOT EXISTS idx_material_reservations_status ON material_reservations(status);
CREATE INDEX IF NOT EXISTS idx_material_reservations_tenant_id ON material_reservations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_material_reservations_source_reference ON material_reservations(source_reference);

-- 2. 检查并添加 inventory_transactions 表的索引
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_tenant_id ON inventory_transactions(tenant_id);

-- =====================================================

-- 3. 创建检查库存可用性函数
CREATE OR REPLACE FUNCTION check_inventory_availability(
  p_material_code TEXT,
  p_required_qty NUMERIC,
  p_tenant_id TEXT
)
RETURNS TABLE(
  available BOOLEAN,
  on_hand NUMERIC,
  reserved NUMERIC,
  available_qty NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (COALESCE(inv.current_quantity, 0) - COALESCE(reserved_sum.total_reserved, 0)) >= p_required_qty AS available,
    COALESCE(inv.current_quantity::NUMERIC, 0) AS on_hand,
    COALESCE(reserved_sum.total_reserved, 0) AS reserved,
    (COALESCE(inv.current_quantity, 0) - COALESCE(reserved_sum.total_reserved, 0)) AS available_qty
  FROM 
    inventory_records inv
  LEFT JOIN (
    SELECT 
      rri.material_code,
      SUM(mr.reserved_qty) AS total_reserved
    FROM 
      material_reservations mr
    JOIN receiving_record_items rri ON mr.receiving_record_item_id = rri.id
    WHERE 
      mr.status = 'reserved'
      AND mr.tenant_id = p_tenant_id
    GROUP BY 
      rri.material_code
  ) reserved_sum ON inv.material_code = reserved_sum.material_code
  WHERE 
    inv.material_code = p_material_code
    AND inv.tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_inventory_availability IS '检查库存可用性：返回库存是否足够、在手数量、已预占数量、可用数量';

-- =====================================================

-- 4. 创建预占库存函数
CREATE OR REPLACE FUNCTION reserve_inventory_for_assembly(
  p_material_code TEXT,
  p_qty NUMERIC,
  p_reserved_for_sn TEXT,
  p_tenant_id TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
  v_reservation_id BIGINT;
  v_available_result RECORD;
  v_receiving_item_id BIGINT;
  v_reservation_code TEXT;
BEGIN
  -- 1. 检查库存可用性
  SELECT * INTO v_available_result
  FROM check_inventory_availability(p_material_code, p_qty, p_tenant_id);

  IF NOT v_available_result.available THEN
    RAISE EXCEPTION '库存不足：物料 % 需要 %，可用 %', 
      p_material_code, p_qty, v_available_result.available_qty;
  END IF;

  -- 2. 查找对应的收货记录项（简化处理，取第一个可用的）
  SELECT id INTO v_receiving_item_id
  FROM receiving_record_items
  WHERE material_code = p_material_code
    AND tenant_id = p_tenant_id
  LIMIT 1;

  IF v_receiving_item_id IS NULL THEN
    RAISE EXCEPTION '未找到物料 % 的收货记录', p_material_code;
  END IF;

  -- 3. 生成预占编号
  v_reservation_code := 'RSV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('material_reservations_id_seq')::TEXT, 6, '0');

  -- 4. 创建预占记录
  INSERT INTO material_reservations (
    reservation_code,
    tenant_id,
    receiving_record_item_id,
    reserved_qty,
    reserved_by,
    reserved_at,
    source_type,
    source_reference,
    status
  ) VALUES (
    v_reservation_code,
    p_tenant_id,
    v_receiving_item_id,
    p_qty,
    p_user_id,
    NOW(),
    'assembly',
    p_reserved_for_sn,
    'reserved'
  ) RETURNING id INTO v_reservation_id;

  RETURN v_reservation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reserve_inventory_for_assembly IS '为组装预占库存：检查可用性后创建预占记录';

-- =====================================================

-- 5. 创建消耗库存函数
CREATE OR REPLACE FUNCTION consume_reserved_inventory(
  p_reservation_id BIGINT,
  p_tenant_id TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_reservation RECORD;
  v_material_code TEXT;
BEGIN
  -- 1. 获取预占记录
  SELECT mr.*, rri.material_code
  INTO v_reservation
  FROM material_reservations mr
  JOIN receiving_record_items rri ON mr.receiving_record_item_id = rri.id
  WHERE mr.id = p_reservation_id
    AND mr.tenant_id = p_tenant_id
    AND mr.status = 'reserved';

  IF NOT FOUND THEN
    RAISE EXCEPTION '预占记录不存在或已被处理：ID %', p_reservation_id;
  END IF;

  v_material_code := v_reservation.material_code;

  -- 2. 更新预占记录状态为已消耗
  UPDATE material_reservations
  SET 
    status = 'consumed',
    consumed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_reservation_id;

  -- 3. 减少库存数量
  UPDATE inventory_records
  SET 
    current_quantity = current_quantity - v_reservation.reserved_qty::INTEGER,
    updated_at = NOW(),
    updated_by = p_user_id
  WHERE 
    material_code = v_material_code
    AND tenant_id = p_tenant_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION consume_reserved_inventory IS '消耗预占库存：将预占记录标记为已消耗并减少库存数量';

-- =====================================================

-- 6. 创建释放库存函数
CREATE OR REPLACE FUNCTION release_reserved_inventory(
  p_reservation_id BIGINT,
  p_tenant_id TEXT,
  p_user_id UUID DEFAULT NULL,
  p_remarks TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_reservation RECORD;
BEGIN
  -- 1. 获取预占记录
  SELECT * INTO v_reservation
  FROM material_reservations
  WHERE id = p_reservation_id
    AND tenant_id = p_tenant_id
    AND status = 'reserved';

  IF NOT FOUND THEN
    RAISE EXCEPTION '预占记录不存在或已被处理：ID %', p_reservation_id;
  END IF;

  -- 2. 更新预占记录状态为已释放
  UPDATE material_reservations
  SET 
    status = 'released',
    released_at = NOW(),
    notes = COALESCE(p_remarks, notes),
    updated_at = NOW()
  WHERE id = p_reservation_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION release_reserved_inventory IS '释放预占库存：将预占记录标记为已释放，库存可重新使用';

-- =====================================================

-- 7. 创建检查物料是否已被预占函数
CREATE OR REPLACE FUNCTION check_material_already_reserved(
  p_material_code TEXT,
  p_tenant_id TEXT,
  p_exclude_sn TEXT DEFAULT NULL
)
RETURNS TABLE(
  is_reserved BOOLEAN,
  reserved_for_sn TEXT,
  reserved_qty NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE AS is_reserved,
    mr.source_reference AS reserved_for_sn,
    mr.reserved_qty
  FROM 
    material_reservations mr
  JOIN receiving_record_items rri ON mr.receiving_record_item_id = rri.id
  WHERE 
    rri.material_code = p_material_code
    AND mr.tenant_id = p_tenant_id
    AND mr.status = 'reserved'
    AND (p_exclude_sn IS NULL OR mr.source_reference != p_exclude_sn)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_material_already_reserved IS '检查物料是否已被其他整机预占';

-- =====================================================

-- 8. 创建检查关键件是否已绑定函数
CREATE OR REPLACE FUNCTION check_component_already_bound(
  p_component_sn TEXT,
  p_tenant_id TEXT
)
RETURNS TABLE(
  is_bound BOOLEAN,
  bound_to_sn TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE AS is_bound,
    fut.finished_product_sn AS bound_to_sn
  FROM 
    finished_unit_traceability fut
  WHERE 
    fut.component_sn = p_component_sn
    AND fut.tenant_id = p_tenant_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_component_already_bound IS '检查关键件序列号是否已被绑定到其他整机';

-- =====================================================
-- 迁移完成
-- =====================================================
