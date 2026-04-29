
-- 创建组装零件与来料批次映射表
CREATE TABLE IF NOT EXISTS assembly_part_material_mapping (
  id BIGSERIAL PRIMARY KEY,
  robot_sn VARCHAR(100) NOT NULL,
  part_type VARCHAR(50) NOT NULL, -- control_box, teaching_pendant, main_board等
  part_no VARCHAR(100) NOT NULL, -- 具体料号如CONTROL_BOX_FR3
  batch_no VARCHAR(100), -- 来料批次号
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  installed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(robot_sn, part_type)
);

CREATE INDEX IF NOT EXISTS idx_assembly_part_mapping_sn ON assembly_part_material_mapping(robot_sn);
CREATE INDEX IF NOT EXISTS idx_assembly_part_mapping_part_no ON assembly_part_material_mapping(part_no);
CREATE INDEX IF NOT EXISTS idx_assembly_part_mapping_batch_no ON assembly_part_material_mapping(batch_no);

COMMENT ON TABLE assembly_part_material_mapping IS '组装零件与来料批次映射表';
COMMENT ON COLUMN assembly_part_material_mapping.robot_sn IS '机器人序列号';
COMMENT ON COLUMN assembly_part_material_mapping.part_type IS '零件类型';
COMMENT ON COLUMN assembly_part_material_mapping.part_no IS '具体料号';
COMMENT ON COLUMN assembly_part_material_mapping.batch_no IS '来料批次号';

-- 删除旧函数
DROP FUNCTION IF EXISTS check_part_assembly_readiness(VARCHAR, VARCHAR);

-- 重新创建check_part_assembly_readiness函数,基于真实来料记录检查
CREATE OR REPLACE FUNCTION check_part_assembly_readiness(
  p_part_no VARCHAR,
  p_batch_no VARCHAR
)
RETURNS TABLE(
  can_assemble BOOLEAN,
  block_reason TEXT,
  check_details JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_receiving_item RECORD;
  v_iqc_result VARCHAR;
  v_disposition_status VARCHAR;
  v_has_approved_disposition BOOLEAN;
BEGIN
  -- 1. 查找对应的收货明细
  SELECT rri.* INTO v_receiving_item
  FROM receiving_record_items rri
  JOIN receiving_records rr ON rr.id = rri.receiving_id
  WHERE rri.part_no = p_part_no 
    AND rri.batch_no = p_batch_no
  ORDER BY rri.created_at DESC
  LIMIT 1;

  -- 如果找不到收货记录,阻断
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE,
      '未找到该料号和批次的收货记录',
      jsonb_build_object(
        'part_no', p_part_no,
        'batch_no', p_batch_no,
        'check_type', 'receiving_not_found'
      );
    RETURN;
  END IF;

  -- 2. 检查收货差异是否已解决
  IF EXISTS (
    SELECT 1 FROM receiving_records rr
    WHERE rr.id = v_receiving_item.receiving_id
      AND rr.has_variance = TRUE
      AND rr.variance_resolved = FALSE
  ) THEN
    RETURN QUERY SELECT 
      FALSE,
      '收货差异未解决,不可上线',
      jsonb_build_object(
        'part_no', p_part_no,
        'batch_no', p_batch_no,
        'receiving_id', v_receiving_item.receiving_id,
        'check_type', 'variance_unresolved'
      );
    RETURN;
  END IF;

  -- 3. 检查IQC检验结果
  SELECT result INTO v_iqc_result
  FROM iqc_inspections
  WHERE receiving_item_id = v_receiving_item.id
    AND part_no = p_part_no
    AND batch_no = p_batch_no
  ORDER BY inspected_at DESC
  LIMIT 1;

  -- 如果需要IQC但未完成,阻断
  IF EXISTS (
    SELECT 1 FROM receiving_records rr
    WHERE rr.id = v_receiving_item.receiving_id
      AND rr.iqc_required = TRUE
      AND rr.iqc_completed = FALSE
  ) THEN
    RETURN QUERY SELECT 
      FALSE,
      'IQC检验未完成,不可上线',
      jsonb_build_object(
        'part_no', p_part_no,
        'batch_no', p_batch_no,
        'receiving_id', v_receiving_item.receiving_id,
        'check_type', 'iqc_not_completed'
      );
    RETURN;
  END IF;

  -- 如果IQC结果为HOLD或NG,检查是否有已批准的特采
  IF v_iqc_result IN ('HOLD', 'NG') THEN
    SELECT EXISTS (
      SELECT 1 FROM incoming_material_dispositions
      WHERE part_no = p_part_no
        AND batch_no = p_batch_no
        AND source_type IN ('iqc_hold', 'iqc_ng')
        AND disposition_status = 'approved'
        AND disposition_type = 'special_acceptance'
    ) INTO v_has_approved_disposition;

    IF NOT v_has_approved_disposition THEN
      RETURN QUERY SELECT 
        FALSE,
        format('IQC检验结果为%s,且无特采审批通过,不可上线', v_iqc_result),
        jsonb_build_object(
          'part_no', p_part_no,
          'batch_no', p_batch_no,
          'iqc_result', v_iqc_result,
          'check_type', 'iqc_failed_no_approval'
        );
      RETURN;
    END IF;
  END IF;

  -- 4. 检查是否有未完成的处置单
  IF EXISTS (
    SELECT 1 FROM incoming_material_dispositions
    WHERE part_no = p_part_no
      AND batch_no = p_batch_no
      AND disposition_status IN ('pending', 'rejected')
  ) THEN
    RETURN QUERY SELECT 
      FALSE,
      '存在未完成的物料处置单,不可上线',
      jsonb_build_object(
        'part_no', p_part_no,
        'batch_no', p_batch_no,
        'check_type', 'disposition_pending'
      );
    RETURN;
  END IF;

  -- 所有检查通过
  RETURN QUERY SELECT 
    TRUE,
    '检查通过,可以上线',
    jsonb_build_object(
      'part_no', p_part_no,
      'batch_no', p_batch_no,
      'receiving_id', v_receiving_item.receiving_id,
      'iqc_result', COALESCE(v_iqc_result, 'OK'),
      'check_type', 'passed'
    );
END;
$$;

COMMENT ON FUNCTION check_part_assembly_readiness IS '检查零件是否可以上线组装(基于料号+批次号)';
