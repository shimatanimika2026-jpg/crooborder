
-- 创建物流控制链后端约束

-- 1. 检查函数：验证部件是否可以上线组装
CREATE OR REPLACE FUNCTION check_part_assembly_readiness(
  p_part_no VARCHAR,
  p_batch_no VARCHAR
) RETURNS TABLE (
  can_assemble BOOLEAN,
  block_reason TEXT
) AS $$
DECLARE
  v_receiving_completed BOOLEAN;
  v_has_variance BOOLEAN;
  v_variance_resolved BOOLEAN;
  v_iqc_completed BOOLEAN;
  v_iqc_result VARCHAR;
  v_has_hold BOOLEAN;
  v_has_ng BOOLEAN;
  v_special_acceptance_approved BOOLEAN;
BEGIN
  -- 检查是否有收货记录
  SELECT 
    COALESCE(bool_and(rr.status = 'completed'), FALSE),
    COALESCE(bool_or(rr.has_variance), FALSE),
    COALESCE(bool_and(rr.variance_resolved), TRUE)
  INTO v_receiving_completed, v_has_variance, v_variance_resolved
  FROM receiving_records rr
  JOIN receiving_record_items rri ON rri.receiving_id = rr.id
  WHERE rri.part_no = p_part_no
  AND (p_batch_no IS NULL OR rri.batch_no = p_batch_no);

  -- 如果没有收货记录，不允许上线
  IF NOT FOUND OR v_receiving_completed IS NULL THEN
    RETURN QUERY SELECT FALSE, '该零件尚未收货，不允许上线组装';
    RETURN;
  END IF;

  -- 如果收货未完成，不允许上线
  IF NOT v_receiving_completed THEN
    RETURN QUERY SELECT FALSE, '收货流程未完成，不允许上线组装';
    RETURN;
  END IF;

  -- 如果有差异且未解决，不允许上线
  IF v_has_variance AND NOT v_variance_resolved THEN
    RETURN QUERY SELECT FALSE, '收货差异未解决，不允许上线组装';
    RETURN;
  END IF;

  -- 检查IQC检验结果
  SELECT 
    COALESCE(bool_and(iqc.result IS NOT NULL), FALSE),
    COALESCE(bool_or(iqc.result = 'HOLD'), FALSE),
    COALESCE(bool_or(iqc.result = 'NG'), FALSE)
  INTO v_iqc_completed, v_has_hold, v_has_ng
  FROM iqc_inspections iqc
  WHERE iqc.part_no = p_part_no
  AND (p_batch_no IS NULL OR iqc.batch_no = p_batch_no);

  -- 如果需要IQC但未完成，不允许上线
  IF NOT v_iqc_completed THEN
    RETURN QUERY SELECT FALSE, 'IQC检验未完成，不允许上线组装';
    RETURN;
  END IF;

  -- 如果IQC结果为NG，检查是否有特采审批
  IF v_has_ng THEN
    SELECT COALESCE(bool_or(
      imd.disposition_type = 'special_acceptance' 
      AND imd.disposition_status = 'approved'
    ), FALSE)
    INTO v_special_acceptance_approved
    FROM incoming_material_dispositions imd
    WHERE imd.part_no = p_part_no
    AND (p_batch_no IS NULL OR imd.batch_no = p_batch_no);

    IF NOT v_special_acceptance_approved THEN
      RETURN QUERY SELECT FALSE, 'IQC检验不合格且未获特采审批，不允许上线组装';
      RETURN;
    END IF;
  END IF;

  -- 如果IQC结果为HOLD，不允许上线
  IF v_has_hold THEN
    RETURN QUERY SELECT FALSE, 'IQC检验结果为HOLD，不允许上线组装';
    RETURN;
  END IF;

  -- 检查是否有未完成的处置单
  IF EXISTS (
    SELECT 1 FROM incoming_material_dispositions imd
    WHERE imd.part_no = p_part_no
    AND (p_batch_no IS NULL OR imd.batch_no = p_batch_no)
    AND imd.disposition_status IN ('pending', 'approved')
    AND imd.disposition_type IN ('hold', 'rework', 'return')
  ) THEN
    RETURN QUERY SELECT FALSE, '存在未完成的物料处置单，不允许上线组装';
    RETURN;
  END IF;

  -- 所有检查通过，允许上线
  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 触发器函数：验证组装完成时的部件状态
CREATE OR REPLACE FUNCTION validate_assembly_part_readiness()
RETURNS TRIGGER AS $$
DECLARE
  v_can_assemble BOOLEAN;
  v_block_reason TEXT;
  v_control_box_check RECORD;
  v_pendant_check RECORD;
  v_main_board_check RECORD;
BEGIN
  -- 检查控制箱
  IF NEW.control_box_sn IS NOT NULL THEN
    SELECT * INTO v_control_box_check
    FROM check_part_assembly_readiness('CONTROL_BOX', NEW.control_box_sn);
    
    IF NOT v_control_box_check.can_assemble THEN
      RAISE EXCEPTION '控制箱(%)不满足上线条件: %', NEW.control_box_sn, v_control_box_check.block_reason;
    END IF;
  END IF;

  -- 检查示教器
  IF NEW.teaching_pendant_sn IS NOT NULL THEN
    SELECT * INTO v_pendant_check
    FROM check_part_assembly_readiness('TEACHING_PENDANT', NEW.teaching_pendant_sn);
    
    IF NOT v_pendant_check.can_assemble THEN
      RAISE EXCEPTION '示教器(%)不满足上线条件: %', NEW.teaching_pendant_sn, v_pendant_check.block_reason;
    END IF;
  END IF;

  -- 检查主板
  IF NEW.main_board_sn IS NOT NULL THEN
    SELECT * INTO v_main_board_check
    FROM check_part_assembly_readiness('MAIN_BOARD', NEW.main_board_sn);
    
    IF NOT v_main_board_check.can_assemble THEN
      RAISE EXCEPTION '主板(%)不满足上线条件: %', NEW.main_board_sn, v_main_board_check.block_reason;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 创建触发器（仅在INSERT时检查，避免影响已有数据）
DROP TRIGGER IF EXISTS trigger_validate_assembly_parts ON finished_unit_traceability;
CREATE TRIGGER trigger_validate_assembly_parts
  BEFORE INSERT ON finished_unit_traceability
  FOR EACH ROW
  EXECUTE FUNCTION validate_assembly_part_readiness();

COMMENT ON FUNCTION check_part_assembly_readiness IS '检查零件是否满足上线组装条件';
COMMENT ON FUNCTION validate_assembly_part_readiness IS '验证组装完成时的部件状态';
