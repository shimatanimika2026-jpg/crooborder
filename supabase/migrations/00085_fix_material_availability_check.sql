-- 修复物料可用性检查函数：增加 IQC 结果和特采状态检查

DROP FUNCTION IF EXISTS check_material_availability(BIGINT, DECIMAL, TEXT);

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
  v_part_no TEXT;
  v_batch_no TEXT;
  v_receiving_id BIGINT;
  v_iqc_result TEXT;
  v_disposition_status TEXT;
  v_result JSONB;
BEGIN
  -- 获取收货明细信息
  SELECT 
    rri.available_qty,
    rri.part_no,
    rri.batch_no,
    rri.receiving_id
  INTO 
    v_available_qty,
    v_part_no,
    v_batch_no,
    v_receiving_id
  FROM receiving_record_items rri
  WHERE rri.id = p_receiving_item_id;
  
  -- 检查收货记录是否存在
  IF v_available_qty IS NULL THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', '收货记录不存在',
      'error_code', 'ITEM_NOT_FOUND'
    );
  END IF;
  
  -- 检查库存数量
  IF v_available_qty < p_required_qty THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', '库存不足',
      'available_qty', v_available_qty,
      'required_qty', p_required_qty,
      'error_code', 'INSUFFICIENT_STOCK'
    );
  END IF;
  
  -- 检查 IQC 结果
  SELECT iqc.result INTO v_iqc_result
  FROM iqc_inspections iqc
  WHERE iqc.receiving_item_id = p_receiving_item_id
    AND iqc.part_no = v_part_no
    AND iqc.batch_no = v_batch_no
  ORDER BY iqc.created_at DESC
  LIMIT 1;
  
  -- 如果有 IQC 记录，检查结果
  IF v_iqc_result IS NOT NULL THEN
    IF v_iqc_result = 'NG' THEN
      -- 检查是否有特采批准
      SELECT disp.disposition_status INTO v_disposition_status
      FROM incoming_material_dispositions disp
      WHERE disp.receiving_id = v_receiving_id
        AND disp.part_no = v_part_no
        AND disp.batch_no = v_batch_no
        AND disp.disposition_type = 'special_approval'
      ORDER BY disp.created_at DESC
      LIMIT 1;
      
      -- 如果没有特采或特采未批准，阻断
      IF v_disposition_status IS NULL OR v_disposition_status != 'approved' THEN
        RETURN jsonb_build_object(
          'available', false,
          'reason', 'IQC 检验不合格，且未获得特采批准',
          'iqc_result', v_iqc_result,
          'disposition_status', COALESCE(v_disposition_status, 'none'),
          'error_code', 'IQC_NG_NOT_APPROVED'
        );
      END IF;
    ELSIF v_iqc_result = 'HOLD' THEN
      -- HOLD 状态也需要特采批准
      SELECT disp.disposition_status INTO v_disposition_status
      FROM incoming_material_dispositions disp
      WHERE disp.receiving_id = v_receiving_id
        AND disp.part_no = v_part_no
        AND disp.batch_no = v_batch_no
        AND disp.disposition_type IN ('special_approval', 'hold')
      ORDER BY disp.created_at DESC
      LIMIT 1;
      
      IF v_disposition_status IS NULL OR v_disposition_status != 'approved' THEN
        RETURN jsonb_build_object(
          'available', false,
          'reason', 'IQC 检验暂扣，且未获得特采批准',
          'iqc_result', v_iqc_result,
          'disposition_status', COALESCE(v_disposition_status, 'none'),
          'error_code', 'IQC_HOLD_NOT_APPROVED'
        );
      END IF;
    END IF;
  END IF;
  
  -- 检查关键件是否已被绑定
  IF p_part_type IN ('robot_body', 'control_box', 'teaching_pendant', 'cable', 'main_board', 'servo_driver', 'power_supply', 'controller', 'pendant') THEN
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
    'available_qty', v_available_qty,
    'iqc_result', COALESCE(v_iqc_result, 'not_inspected'),
    'disposition_status', COALESCE(v_disposition_status, 'none')
  );
END;
$$;

COMMENT ON FUNCTION check_material_availability IS 'P0: 检查物料可用性（包括库存、IQC 结果、特采状态、关键件绑定）';
