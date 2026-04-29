-- 创建原子事务函数: 创建整机并处理库存预占/消耗

CREATE OR REPLACE FUNCTION create_assembly_unit_with_reservation(
  p_finished_product_sn TEXT,
  p_product_model_id INTEGER,
  p_assembly_date DATE,
  p_assembly_operator_id UUID,
  p_parts JSONB, -- [{part_type, part_no, part_sn, receiving_record_item_id, reserved_qty}]
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
BEGIN
  -- 开始原子事务(函数本身就是原子的)
  
  -- 1. 检查整机序列号是否已存在
  IF EXISTS (SELECT 1 FROM finished_unit_traceability WHERE finished_product_sn = p_finished_product_sn) THEN
    RAISE EXCEPTION '整机序列号已存在: %', p_finished_product_sn;
  END IF;
  
  -- 2. 检查所有关键件是否满足上线条件
  FOR v_part IN SELECT * FROM jsonb_array_elements(p_parts)
  LOOP
    -- 调用check_part_assembly_readiness检查函数
    DECLARE
      v_check_result JSONB;
    BEGIN
      SELECT check_part_assembly_readiness(
        (v_part->>'part_no')::TEXT,
        (v_part->>'part_sn')::TEXT,
        p_tenant_id
      ) INTO v_check_result;
      
      IF NOT (v_check_result->>'can_assemble')::BOOLEAN THEN
        RAISE EXCEPTION '关键件不满足上线条件: %, 原因: %', 
          v_part->>'part_sn', 
          v_check_result->>'reason';
      END IF;
    END;
  END LOOP;
  
  -- 3. 预占所有物料
  FOR v_part IN SELECT * FROM jsonb_array_elements(p_parts)
  LOOP
    -- 调用reserve_material预占物料
    SELECT reserve_material(
      (v_part->>'receiving_record_item_id')::BIGINT,
      (v_part->>'reserved_qty')::DECIMAL(10,2),
      'assembly',
      NULL, -- source_id暂时为NULL,后面会更新
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

COMMENT ON FUNCTION create_assembly_unit_with_reservation IS '原子事务创建整机(检查上线条件/预占物料/创建整机追溯/创建部件映射/消耗物料/任一步骤失败回滚所有操作)';