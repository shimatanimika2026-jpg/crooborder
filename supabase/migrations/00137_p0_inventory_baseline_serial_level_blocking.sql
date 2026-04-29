-- P0库存底盘补实: 序列号级别的上线阻断和防重复绑定

-- 1. 创建检查函数: 检查关键件序列号是否可以上线组装
CREATE OR REPLACE FUNCTION check_part_assembly_readiness(
  p_part_no TEXT,
  p_part_sn TEXT,
  p_tenant_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_receiving_item RECORD;
  v_iqc_result TEXT;
  v_has_approved_disposition BOOLEAN;
  v_already_bound BOOLEAN;
  v_active_reservation BOOLEAN;
BEGIN
  -- 1. 检查序列号是否已被绑定到其他整机
  SELECT EXISTS (
    SELECT 1 FROM assembly_part_material_mapping
    WHERE part_sn = p_part_sn
      AND part_no = p_part_no
  ) INTO v_already_bound;
  
  IF v_already_bound THEN
    RETURN jsonb_build_object(
      'can_assemble', false,
      'reason', format('该关键件序列号 %s 已被绑定到其他整机,不能重复使用', p_part_sn),
      'check_type', 'serial_already_bound'
    );
  END IF;
  
  -- 2. 检查序列号是否已有active预占(被其他整机预占中)
  SELECT EXISTS (
    SELECT 1 FROM material_reservations mr
    JOIN receiving_record_items rri ON rri.id = mr.receiving_record_item_id
    WHERE rri.serial_number = p_part_sn
      AND rri.part_no = p_part_no
      AND mr.status = 'active'
      AND mr.tenant_id = p_tenant_id
  ) INTO v_active_reservation;
  
  IF v_active_reservation THEN
    RETURN jsonb_build_object(
      'can_assemble', false,
      'reason', format('该关键件序列号 %s 已被其他整机预占,不能重复使用', p_part_sn),
      'check_type', 'serial_already_reserved'
    );
  END IF;
  
  -- 3. 查找对应的收货明细(基于序列号)
  SELECT rri.* INTO v_receiving_item
  FROM receiving_record_items rri
  JOIN receiving_records rr ON rr.id = rri.receiving_id
  WHERE rri.part_no = p_part_no 
    AND rri.serial_number = p_part_sn
    AND rri.tenant_id = p_tenant_id
  ORDER BY 
    CASE WHEN rr.has_variance = FALSE THEN 0 ELSE 1 END,
    CASE WHEN rr.variance_resolved = TRUE THEN 0 ELSE 1 END,
    rri.created_at DESC
  LIMIT 1;

  -- 如果找不到收货记录,阻断
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_assemble', false,
      'reason', format('未找到该料号 %s 和序列号 %s 的收货记录', p_part_no, p_part_sn),
      'check_type', 'receiving_not_found'
    );
  END IF;

  -- 4. 检查收货差异是否已解决
  IF EXISTS (
    SELECT 1 FROM receiving_records rr
    WHERE rr.id = v_receiving_item.receiving_id
      AND rr.has_variance = TRUE
      AND rr.variance_resolved = FALSE
  ) THEN
    RETURN jsonb_build_object(
      'can_assemble', false,
      'reason', '收货差异未解决,不可上线',
      'check_type', 'variance_unresolved',
      'receiving_id', v_receiving_item.receiving_id
    );
  END IF;

  -- 5. 检查IQC检验结果
  SELECT result INTO v_iqc_result
  FROM iqc_inspections
  WHERE receiving_item_id = v_receiving_item.id
    AND part_no = p_part_no
    AND serial_number = p_part_sn
  ORDER BY inspected_at DESC
  LIMIT 1;

  -- 如果需要IQC但未完成,阻断
  IF EXISTS (
    SELECT 1 FROM receiving_records rr
    WHERE rr.id = v_receiving_item.receiving_id
      AND rr.iqc_required = TRUE
      AND rr.iqc_completed = FALSE
  ) THEN
    RETURN jsonb_build_object(
      'can_assemble', false,
      'reason', 'IQC检验未完成,不可上线',
      'check_type', 'iqc_not_completed',
      'receiving_id', v_receiving_item.receiving_id
    );
  END IF;

  -- 6. 如果IQC结果为HOLD或NG,检查是否有已批准的特采
  IF v_iqc_result IN ('HOLD', 'NG') THEN
    SELECT EXISTS (
      SELECT 1 FROM incoming_material_dispositions
      WHERE part_no = p_part_no
        AND serial_number = p_part_sn
        AND source_type IN ('iqc_hold', 'iqc_ng')
        AND disposition_status IN ('approved', 'completed')
        AND disposition_type = 'special_acceptance'
        AND tenant_id = p_tenant_id
    ) INTO v_has_approved_disposition;

    IF NOT v_has_approved_disposition THEN
      RETURN jsonb_build_object(
        'can_assemble', false,
        'reason', format('IQC检验结果为%s,且无特采审批通过,不可上线', v_iqc_result),
        'check_type', 'iqc_failed_no_approval',
        'iqc_result', v_iqc_result
      );
    END IF;
  END IF;

  -- 7. 检查是否有未完成的处置单(pending或rejected才阻断)
  IF EXISTS (
    SELECT 1 FROM incoming_material_dispositions
    WHERE part_no = p_part_no
      AND serial_number = p_part_sn
      AND disposition_status IN ('pending', 'rejected')
      AND tenant_id = p_tenant_id
  ) THEN
    RETURN jsonb_build_object(
      'can_assemble', false,
      'reason', '存在未完成的物料处置单,不可上线',
      'check_type', 'disposition_pending'
    );
  END IF;

  -- 所有检查通过
  RETURN jsonb_build_object(
    'can_assemble', true,
    'reason', '检查通过,可以上线',
    'check_type', 'passed',
    'receiving_id', v_receiving_item.receiving_id,
    'receiving_item_id', v_receiving_item.id,
    'iqc_result', COALESCE(v_iqc_result, 'OK')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_part_assembly_readiness(TEXT, TEXT, TEXT) IS 'P0库存底盘: 检查关键件序列号是否可以上线组装(检查序列号是否已绑定/是否已预占/IQC状态/HOLD/NG/特采/处置单)';

-- 2. 修改reserve_material函数: 增加序列号级别的防重复预占检查
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
  v_already_bound BOOLEAN;
  v_part_sn TEXT;
BEGIN
  -- 检查来料记录项是否存在
  SELECT * INTO v_item 
  FROM receiving_record_items 
  WHERE id = p_receiving_record_item_id
    AND tenant_id = p_tenant_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '来料记录项不存在';
  END IF;
  
  v_part_sn := v_item.serial_number;
  
  -- ✅ P0补实: 检查序列号是否已被绑定到其他整机
  IF v_part_sn IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM assembly_part_material_mapping
      WHERE part_sn = v_part_sn
        AND part_no = v_item.part_no
    ) INTO v_already_bound;
    
    IF v_already_bound THEN
      RAISE EXCEPTION '该关键件序列号 % 已被绑定到其他整机,不能重复预占', v_part_sn;
    END IF;
  END IF;
  
  -- ✅ P0补实: 检查是否已有active预占(防止重复预占同一receiving_record_item)
  SELECT COUNT(*) INTO v_active_reservation_count
  FROM material_reservations
  WHERE receiving_record_item_id = p_receiving_record_item_id
    AND status = 'active'
    AND tenant_id = p_tenant_id;
  
  IF v_active_reservation_count > 0 THEN
    RAISE EXCEPTION '该物料已被预占,不能重复预占';
  END IF;
  
  -- 检查可用库存
  DECLARE
    v_reserved_total DECIMAL(10,2);
  BEGIN
    SELECT COALESCE(SUM(reserved_qty), 0) INTO v_reserved_total
    FROM material_reservations
    WHERE receiving_record_item_id = p_receiving_record_item_id
      AND status = 'active'
      AND tenant_id = p_tenant_id;
    
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

COMMENT ON FUNCTION reserve_material IS 'P0库存底盘: 预占物料(检查序列号是否已绑定/检查active预占防止重复/检查可用库存/生成预占编号/创建预占记录)';

-- 3. 修改create_assembly_unit_with_reservation函数: 使用新的check_part_assembly_readiness函数
CREATE OR REPLACE FUNCTION create_assembly_unit_with_reservation(
  p_finished_product_sn TEXT,
  p_product_model_id INTEGER,
  p_assembly_date DATE,
  p_assembly_operator_id UUID,
  p_parts JSONB, -- [{part_type, part_no, part_sn, receiving_record_item_id, reserved_qty, batch_no}]
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_part JSONB;
  v_reservation_id BIGINT;
  v_consumption_id BIGINT;
  v_result JSONB;
  v_reservation_ids BIGINT[] := ARRAY[]::BIGINT[];
  v_check_result JSONB;
BEGIN
  -- 开始原子事务(函数本身就是原子的)
  
  -- 1. 检查整机序列号是否已存在
  IF EXISTS (SELECT 1 FROM finished_unit_traceability WHERE finished_product_sn = p_finished_product_sn AND tenant_id = p_tenant_id) THEN
    RAISE EXCEPTION '整机序列号已存在: %', p_finished_product_sn;
  END IF;
  
  -- 2. ✅ P0补实: 检查所有关键件是否满足上线条件(使用序列号级别的检查)
  FOR v_part IN SELECT * FROM jsonb_array_elements(p_parts)
  LOOP
    -- 调用check_part_assembly_readiness检查函数(传入part_no, part_sn, tenant_id)
    SELECT check_part_assembly_readiness(
      (v_part->>'part_no')::TEXT,
      (v_part->>'part_sn')::TEXT,
      p_tenant_id
    ) INTO v_check_result;
    
    IF NOT (v_check_result->>'can_assemble')::BOOLEAN THEN
      RAISE EXCEPTION '关键件不满足上线条件: % (SN: %), 原因: %', 
        v_part->>'part_no',
        v_part->>'part_sn', 
        v_check_result->>'reason';
    END IF;
  END LOOP;
  
  -- 3. 预占所有物料
  FOR v_part IN SELECT * FROM jsonb_array_elements(p_parts)
  LOOP
    -- 调用reserve_material预占物料
    SELECT reserve_material(
      (v_part->>'receiving_record_item_id')::BIGINT,
      (v_part->>'reserved_qty')::DECIMAL(10,2),
      'assembly',
      NULL, -- source_id暂时为NULL
      p_finished_product_sn,
      p_tenant_id,
      p_user_id
    ) INTO v_reservation_id;
    
    -- 记录预占ID
    v_reservation_ids := array_append(v_reservation_ids, v_reservation_id);
  END LOOP;
  
  -- 4. 创建整机追溯记录
  INSERT INTO finished_unit_traceability (
    finished_product_sn,
    product_model_id,
    assembly_date,
    assembly_operator_id,
    tenant_id,
    created_at,
    updated_at
  ) VALUES (
    p_finished_product_sn,
    p_product_model_id,
    p_assembly_date,
    p_assembly_operator_id,
    p_tenant_id,
    NOW(),
    NOW()
  );
  
  -- 5. 创建部件映射记录并消耗物料
  DECLARE
    v_idx INTEGER := 1;
  BEGIN
    FOR v_part IN SELECT * FROM jsonb_array_elements(p_parts)
    LOOP
      -- 创建部件映射记录
      INSERT INTO assembly_part_material_mapping (
        robot_sn,
        part_type,
        part_no,
        part_sn,
        receiving_record_item_id,
        batch_no,
        installed_at,
        installed_by,
        created_at
      ) VALUES (
        p_finished_product_sn,
        (v_part->>'part_type')::TEXT,
        (v_part->>'part_no')::TEXT,
        (v_part->>'part_sn')::TEXT,
        (v_part->>'receiving_record_item_id')::BIGINT,
        (v_part->>'batch_no')::TEXT,
        NOW(),
        p_user_id,
        NOW()
      );
      
      -- 消耗物料
      SELECT consume_material(
        v_reservation_ids[v_idx],
        (v_part->>'reserved_qty')::DECIMAL(10,2),
        p_finished_product_sn,
        p_tenant_id,
        p_user_id
      ) INTO v_consumption_id;
      
      v_idx := v_idx + 1;
    END LOOP;
  END;
  
  -- 6. 返回成功结果
  v_result := jsonb_build_object(
    'success', true,
    'finished_product_sn', p_finished_product_sn,
    'reservation_ids', to_jsonb(v_reservation_ids),
    'message', '整机创建成功'
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- 任何错误都会自动回滚整个事务
    RAISE EXCEPTION '创建整机失败: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_assembly_unit_with_reservation IS 'P0库存底盘: 原子事务创建整机(检查序列号级别的上线条件/预占物料/创建整机追溯/创建部件映射/消耗物料/任一步骤失败回滚所有操作)';
