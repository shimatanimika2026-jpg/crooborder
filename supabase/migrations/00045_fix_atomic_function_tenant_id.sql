-- 修复原子事务函数：写入 tenant_id
CREATE OR REPLACE FUNCTION create_assembled_unit_atomic(
  p_finished_product_sn TEXT,
  p_product_model_id INTEGER,
  p_control_box_sn TEXT,
  p_teaching_pendant_sn TEXT,
  p_main_board_sn TEXT,
  p_firmware_version TEXT,
  p_software_version TEXT,
  p_binding_operator_id UUID,
  p_tenant_id TEXT,
  p_factory_id TEXT,
  p_parts JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_part JSONB;
  v_reservation_id BIGINT;
  v_reservation_code TEXT;
  v_consumption_code TEXT;
  v_traceability_id INTEGER;
  v_result JSONB;
  v_check_result JSONB;
BEGIN
  -- 步骤1：检查所有物料可用性
  FOR v_part IN SELECT * FROM jsonb_array_elements(p_parts)
  LOOP
    v_check_result := check_material_availability(
      (v_part->>'receiving_record_item_id')::BIGINT,
      (v_part->>'quantity')::DECIMAL,
      v_part->>'part_type'
    );
    
    IF NOT (v_check_result->>'available')::BOOLEAN THEN
      RAISE EXCEPTION '物料不可用 [% - %]: %', 
        v_part->>'part_type', 
        v_part->>'part_no', 
        v_check_result->>'reason';
    END IF;
  END LOOP;

  -- 步骤2：创建预占记录并更新库存
  FOR v_part IN SELECT * FROM jsonb_array_elements(p_parts)
  LOOP
    -- 生成预占编号
    v_reservation_code := generate_reservation_code();
    
    -- 创建预占记录（✅ 修复：写入 tenant_id）
    INSERT INTO material_reservations (
      reservation_code,
      tenant_id,
      receiving_record_item_id,
      reserved_qty,
      reserved_by,
      source_type,
      source_reference,
      status,
      notes
    ) VALUES (
      v_reservation_code,
      p_tenant_id,  -- ✅ 修复：写入真实 tenant_id
      (v_part->>'receiving_record_item_id')::BIGINT,
      (v_part->>'quantity')::DECIMAL,
      p_binding_operator_id,
      'assembly',
      p_finished_product_sn,
      'active',
      '组装整机 ' || p_finished_product_sn
    ) RETURNING id INTO v_reservation_id;
    
    -- 更新库存（预占）
    PERFORM update_inventory_on_reserve(
      (v_part->>'receiving_record_item_id')::BIGINT,
      (v_part->>'quantity')::DECIMAL
    );
    
    -- 步骤3：创建组装映射记录
    INSERT INTO assembly_part_material_mapping (
      robot_sn,
      part_type,
      part_no,
      batch_no,
      receiving_record_item_id,
      reservation_id,
      is_consumed,
      consumed_at,
      installed_by
    ) VALUES (
      p_finished_product_sn,
      v_part->>'part_type',
      v_part->>'part_no',
      v_part->>'batch_no',
      (v_part->>'receiving_record_item_id')::BIGINT,
      v_reservation_id,
      TRUE,
      NOW(),
      p_binding_operator_id
    );
  END LOOP;

  -- 步骤4：创建整机溯源记录
  INSERT INTO finished_unit_traceability (
    finished_product_sn,
    product_model_id,
    control_box_sn,
    teaching_pendant_sn,
    main_board_sn,
    firmware_version,
    software_version,
    binding_time,
    binding_operator_id,
    aging_required,
    aging_status,
    final_test_status,
    qa_release_status,
    shipment_status,
    tenant_id,
    factory_id,
    assembly_completed_at
  ) VALUES (
    p_finished_product_sn,
    p_product_model_id,
    p_control_box_sn,
    p_teaching_pendant_sn,
    p_main_board_sn,
    p_firmware_version,
    p_software_version,
    NOW(),
    p_binding_operator_id,
    TRUE,
    'pending',
    'pending',
    'pending',
    'pending',
    p_tenant_id,
    p_factory_id,
    NOW()
  ) RETURNING id INTO v_traceability_id;

  -- 步骤5：创建消耗记录并更新库存
  FOR v_part IN SELECT * FROM jsonb_array_elements(p_parts)
  LOOP
    -- 获取对应的预占记录ID
    SELECT id INTO v_reservation_id
    FROM material_reservations
    WHERE receiving_record_item_id = (v_part->>'receiving_record_item_id')::BIGINT
      AND source_reference = p_finished_product_sn
      AND status = 'active'
    LIMIT 1;
    
    -- 生成消耗编号
    v_consumption_code := generate_consumption_code();
    
    -- 创建消耗记录（✅ 修复：写入 tenant_id）
    INSERT INTO material_consumption_records (
      consumption_code,
      tenant_id,
      receiving_record_item_id,
      reservation_id,
      consumed_qty,
      consumed_by,
      source_type,
      source_reference,
      unit_serial_number,
      notes
    ) VALUES (
      v_consumption_code,
      p_tenant_id,  -- ✅ 修复：写入真实 tenant_id
      (v_part->>'receiving_record_item_id')::BIGINT,
      v_reservation_id,
      (v_part->>'quantity')::DECIMAL,
      p_binding_operator_id,
      'assembly',
      p_finished_product_sn,
      p_finished_product_sn,
      '组装整机 ' || p_finished_product_sn
    );
    
    -- 更新库存（消耗）
    PERFORM update_inventory_on_consume(
      (v_part->>'receiving_record_item_id')::BIGINT,
      (v_part->>'quantity')::DECIMAL
    );
    
    -- 更新预占状态为已消耗
    UPDATE material_reservations
    SET 
      status = 'consumed',
      consumed_at = NOW(),
      updated_at = NOW()
    WHERE id = v_reservation_id;
  END LOOP;

  -- 返回成功结果
  v_result := jsonb_build_object(
    'success', TRUE,
    'traceability_id', v_traceability_id,
    'finished_product_sn', p_finished_product_sn
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    -- 任何错误都会自动回滚整个事务
    RAISE EXCEPTION '创建组装整机失败: %', SQLERRM;
END;
$$;