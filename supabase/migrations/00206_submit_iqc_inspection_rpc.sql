-- 提交 IQC 检验 RPC
-- 功能：提交 IQC 检验记录，包含完整的事务处理和后续处理
-- 作者：系统
-- 日期：2026-04-17

CREATE OR REPLACE FUNCTION submit_iqc_inspection(
  p_receiving_id INTEGER,
  p_receiving_item_id INTEGER,
  p_inspection_type TEXT,
  p_sample_size INTEGER,
  p_inspected_qty NUMERIC,
  p_result TEXT,
  p_defect_code TEXT DEFAULT NULL,
  p_defect_description TEXT DEFAULT NULL,
  p_remarks TEXT DEFAULT NULL,
  p_inspector_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_receiving RECORD;
  v_receiving_item RECORD;
  v_inspection_id INTEGER;
  v_inspection_no TEXT;
  v_request_code TEXT;
  v_disposition_no TEXT;
  v_defect_category TEXT;
  v_all_items_inspected BOOLEAN;
BEGIN
  -- 1. 校验 receiving_id 存在且状态为已完成
  SELECT * INTO v_receiving
  FROM receiving_records
  WHERE id = p_receiving_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'RECEIVING_NOT_FOUND',
      'message', '收货记录不存在'
    );
  END IF;

  IF v_receiving.status = 'cancelled' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'RECEIVING_CANCELLED',
      'message', '收货记录已取消，无法进行 IQC 检验'
    );
  END IF;

  -- 2. 校验 receiving_item_id 存在
  SELECT * INTO v_receiving_item
  FROM receiving_record_items
  WHERE id = p_receiving_item_id
  AND receiving_id = p_receiving_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'RECEIVING_ITEM_NOT_FOUND',
      'message', '收货明细不存在'
    );
  END IF;

  -- 3. 校验不存在有效 IQC 检验记录
  IF EXISTS (
    SELECT 1 FROM iqc_inspections
    WHERE receiving_item_id = p_receiving_item_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'IQC_EXISTS',
      'message', '该收货明细已存在 IQC 检验记录，不能重复提交'
    );
  END IF;

  -- 4. 生成检验单号
  v_inspection_no := 'IQC-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || 
                     LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT, 10, '0');

  -- 5. 创建 IQC 检验记录
  INSERT INTO iqc_inspections (
    inspection_no,
    receiving_id,
    receiving_item_id,
    part_no,
    part_name,
    batch_no,
    inspection_type,
    sample_size,
    inspected_qty,
    result,
    defect_code,
    defect_description,
    inspected_at,
    inspected_by,
    remarks
  ) VALUES (
    v_inspection_no,
    p_receiving_id,
    p_receiving_item_id,
    v_receiving_item.part_no,
    v_receiving_item.part_name,
    v_receiving_item.batch_no,
    p_inspection_type,
    p_sample_size,
    p_inspected_qty,
    p_result,
    p_defect_code,
    p_defect_description,
    NOW(),
    p_inspector_id,
    p_remarks
  )
  RETURNING id INTO v_inspection_id;

  -- 6. 如果结果为 NG，创建特采申请
  IF p_result = 'NG' THEN
    v_request_code := 'SA-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || 
                      LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT, 10, '0');

    -- 确定缺陷类型
    v_defect_category := 'other';
    IF p_defect_code IS NOT NULL THEN
      IF p_defect_code LIKE '%外观%' OR p_defect_code LIKE '%appearance%' THEN
        v_defect_category := 'appearance_defect';
      ELSIF p_defect_code LIKE '%尺寸%' OR p_defect_code LIKE '%dimension%' THEN
        v_defect_category := 'dimension_deviation';
      ELSIF p_defect_code LIKE '%工艺%' OR p_defect_code LIKE '%process%' THEN
        v_defect_category := 'process_deviation';
      END IF;
    END IF;

    INSERT INTO special_approval_requests (
      request_code,
      receiving_inspection_id,
      material_code,
      material_name,
      batch_code,
      quantity,
      defect_category,
      defect_description,
      applicant_department,
      applicant_id,
      status,
      acceptance_conditions,
      tenant_id,
      created_by
    ) VALUES (
      v_request_code,
      v_inspection_id,
      v_receiving_item.part_no,
      v_receiving_item.part_name,
      COALESCE(v_receiving_item.batch_no, 'BATCH-' || LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT, 10, '0')),
      p_inspected_qty,
      v_defect_category,
      COALESCE(p_defect_description, 'IQC检验不合格'),
      '质量部',
      p_inspector_id,
      'pending_approval',
      'IQC检验不合格，需要特采审批。' || E'\n' ||
      '检验单号：' || v_inspection_no || E'\n' ||
      '缺陷代码：' || COALESCE(p_defect_code, '未指定') || E'\n' ||
      '缺陷描述：' || COALESCE(p_defect_description, '无'),
      'JP',
      p_inspector_id
    );
  END IF;

  -- 7. 如果结果为 HOLD，创建处置单
  IF p_result = 'HOLD' THEN
    v_disposition_no := 'DISP-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || 
                        LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT, 10, '0');

    INSERT INTO incoming_material_dispositions (
      disposition_no,
      source_type,
      source_id,
      receiving_id,
      part_no,
      part_name,
      batch_no,
      affected_qty,
      disposition_type,
      disposition_status,
      approve_required,
      block_reason,
      created_by
    ) VALUES (
      v_disposition_no,
      'iqc_hold',
      p_receiving_item_id,
      p_receiving_id,
      v_receiving_item.part_no,
      v_receiving_item.part_name,
      v_receiving_item.batch_no,
      p_inspected_qty,
      'hold',
      'pending',
      TRUE,
      'IQC检验待定: ' || COALESCE(p_defect_description, '需要进一步处理'),
      p_inspector_id
    );
  END IF;

  -- 8. 检查该收货单的所有明细是否都已完成 IQC 检验
  SELECT NOT EXISTS (
    SELECT 1
    FROM receiving_record_items
    WHERE receiving_id = p_receiving_id
    AND id NOT IN (
      SELECT receiving_item_id
      FROM iqc_inspections
      WHERE receiving_id = p_receiving_id
    )
  ) INTO v_all_items_inspected;

  -- 9. 如果所有明细都完成 IQC，更新 receiving_records.iqc_completed
  IF v_all_items_inspected THEN
    UPDATE receiving_records
    SET iqc_completed = TRUE,
        updated_at = NOW()
    WHERE id = p_receiving_id;
  END IF;

  -- 10. 返回成功结果
  RETURN jsonb_build_object(
    'success', true,
    'inspection_id', v_inspection_id,
    'inspection_no', v_inspection_no,
    'result', p_result,
    'all_items_inspected', v_all_items_inspected
  );

EXCEPTION
  WHEN OTHERS THEN
    -- 事务会自动回滚
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INTERNAL_ERROR',
      'message', SQLERRM
    );
END;
$$;

-- 授权
GRANT EXECUTE ON FUNCTION submit_iqc_inspection TO authenticated;

COMMENT ON FUNCTION submit_iqc_inspection IS '提交 IQC 检验记录（包含完整事务处理）';
