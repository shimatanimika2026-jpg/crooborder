-- 修复关键件类型枚举，统一为 teaching_pendant
-- 删除旧的唯一约束
DROP INDEX IF EXISTS idx_unique_critical_part_binding;

-- 重新创建唯一约束，使用正确的枚举值
CREATE UNIQUE INDEX idx_unique_critical_part_binding 
ON assembly_part_material_mapping(receiving_record_item_id)
WHERE part_type IN ('control_box', 'teaching_pendant', 'main_board', 'servo_driver', 'power_supply', 'controller') 
AND is_consumed = TRUE
AND receiving_record_item_id IS NOT NULL;

COMMENT ON INDEX idx_unique_critical_part_binding IS '关键件唯一绑定约束：确保控制箱、示教器、主板等关键件只能被一台整机使用';

-- 重新创建检查物料可用性的函数，使用正确的枚举值
CREATE OR REPLACE FUNCTION check_material_availability(
  p_receiving_item_id BIGINT,
  p_required_qty DECIMAL,
  p_part_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_available_qty DECIMAL;
  v_existing_binding BIGINT;
  v_result JSONB;
BEGIN
  -- 检查可用数量
  SELECT available_qty INTO v_available_qty
  FROM receiving_record_items
  WHERE id = p_receiving_item_id;
  
  IF v_available_qty IS NULL THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', '收货记录不存在',
      'error_code', 'ITEM_NOT_FOUND'
    );
  END IF;
  
  IF v_available_qty < p_required_qty THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', '库存不足',
      'available_qty', v_available_qty,
      'required_qty', p_required_qty,
      'error_code', 'INSUFFICIENT_STOCK'
    );
  END IF;
  
  -- 检查关键件是否已被绑定（统一使用 teaching_pendant）
  IF p_part_type IN ('control_box', 'teaching_pendant', 'main_board', 'servo_driver', 'power_supply', 'controller') THEN
    SELECT id INTO v_existing_binding
    FROM assembly_part_material_mapping
    WHERE receiving_record_item_id = p_receiving_item_id
      AND is_consumed = TRUE
    LIMIT 1;
    
    IF v_existing_binding IS NOT NULL THEN
      RETURN jsonb_build_object(
        'available', false,
        'reason', '该关键件已被其他整机使用',
        'error_code', 'CRITICAL_PART_ALREADY_BOUND'
      );
    END IF;
  END IF;
  
  -- 可用
  RETURN jsonb_build_object(
    'available', true,
    'available_qty', v_available_qty
  );
END;
$$;