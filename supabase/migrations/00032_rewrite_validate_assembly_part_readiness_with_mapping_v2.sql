
-- 删除所有相关触发器
DROP TRIGGER IF EXISTS trg_validate_assembly_part_readiness ON finished_unit_traceability;
DROP TRIGGER IF EXISTS trigger_validate_assembly_parts ON finished_unit_traceability;

-- 删除旧函数
DROP FUNCTION IF EXISTS validate_assembly_part_readiness() CASCADE;

-- 重写validate_assembly_part_readiness函数,基于assembly_part_material_mapping
CREATE OR REPLACE FUNCTION validate_assembly_part_readiness()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_control_box_part_no VARCHAR;
  v_control_box_batch_no VARCHAR;
  v_teaching_pendant_part_no VARCHAR;
  v_teaching_pendant_batch_no VARCHAR;
  v_main_board_part_no VARCHAR;
  v_main_board_batch_no VARCHAR;
  v_check_result RECORD;
BEGIN
  -- 1. 从mapping表获取控制箱的真实料号和批次
  SELECT part_no, batch_no INTO v_control_box_part_no, v_control_box_batch_no
  FROM assembly_part_material_mapping
  WHERE robot_sn = NEW.robot_sn AND part_type = 'control_box'
  ORDER BY installed_at DESC
  LIMIT 1;

  -- 如果找不到控制箱映射,阻断
  IF v_control_box_part_no IS NULL THEN
    RAISE EXCEPTION '控制箱未建立来料映射关系,不可上线 (robot_sn: %)', NEW.robot_sn;
  END IF;

  -- 检查控制箱是否可上线
  SELECT * INTO v_check_result
  FROM check_part_assembly_readiness(v_control_box_part_no, v_control_box_batch_no);

  IF NOT v_check_result.can_assemble THEN
    RAISE EXCEPTION '控制箱来料检查未通过: % (part_no: %, batch_no: %)', 
      v_check_result.block_reason, v_control_box_part_no, v_control_box_batch_no;
  END IF;

  -- 2. 从mapping表获取示教器的真实料号和批次
  SELECT part_no, batch_no INTO v_teaching_pendant_part_no, v_teaching_pendant_batch_no
  FROM assembly_part_material_mapping
  WHERE robot_sn = NEW.robot_sn AND part_type = 'teaching_pendant'
  ORDER BY installed_at DESC
  LIMIT 1;

  -- 如果找不到示教器映射,阻断
  IF v_teaching_pendant_part_no IS NULL THEN
    RAISE EXCEPTION '示教器未建立来料映射关系,不可上线 (robot_sn: %)', NEW.robot_sn;
  END IF;

  -- 检查示教器是否可上线
  SELECT * INTO v_check_result
  FROM check_part_assembly_readiness(v_teaching_pendant_part_no, v_teaching_pendant_batch_no);

  IF NOT v_check_result.can_assemble THEN
    RAISE EXCEPTION '示教器来料检查未通过: % (part_no: %, batch_no: %)', 
      v_check_result.block_reason, v_teaching_pendant_part_no, v_teaching_pendant_batch_no;
  END IF;

  -- 3. 如果有主板,检查主板
  IF NEW.main_board_sn IS NOT NULL THEN
    SELECT part_no, batch_no INTO v_main_board_part_no, v_main_board_batch_no
    FROM assembly_part_material_mapping
    WHERE robot_sn = NEW.robot_sn AND part_type = 'main_board'
    ORDER BY installed_at DESC
    LIMIT 1;

    -- 如果找不到主板映射,阻断
    IF v_main_board_part_no IS NULL THEN
      RAISE EXCEPTION '主板未建立来料映射关系,不可上线 (robot_sn: %)', NEW.robot_sn;
    END IF;

    -- 检查主板是否可上线
    SELECT * INTO v_check_result
    FROM check_part_assembly_readiness(v_main_board_part_no, v_main_board_batch_no);

    IF NOT v_check_result.can_assemble THEN
      RAISE EXCEPTION '主板来料检查未通过: % (part_no: %, batch_no: %)', 
        v_check_result.block_reason, v_main_board_part_no, v_main_board_batch_no;
    END IF;
  END IF;

  -- 所有检查通过,允许插入
  RETURN NEW;
END;
$$;

-- 重新创建触发器
CREATE TRIGGER trg_validate_assembly_part_readiness
BEFORE INSERT ON finished_unit_traceability
FOR EACH ROW
EXECUTE FUNCTION validate_assembly_part_readiness();

COMMENT ON FUNCTION validate_assembly_part_readiness IS '组装上线阻断触发器(基于assembly_part_material_mapping真实来料检查)';
