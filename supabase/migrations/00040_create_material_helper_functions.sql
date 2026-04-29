-- 创建生成预占编号的函数
CREATE OR REPLACE FUNCTION generate_reservation_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'RSV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    SELECT EXISTS(SELECT 1 FROM material_reservations WHERE reservation_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- 创建生成消耗编号的函数
CREATE OR REPLACE FUNCTION generate_consumption_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'CSM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    SELECT EXISTS(SELECT 1 FROM material_consumption_records WHERE consumption_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- 创建检查物料可用性的函数
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
  
  -- 检查关键件是否已被绑定
  IF p_part_type IN ('control_box', 'teach_pendant', 'main_board', 'servo_driver', 'power_supply', 'controller', 'pendant') THEN
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