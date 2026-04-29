-- P1: 创建编辑生产计划并生成新版本的 RPC 函数

CREATE OR REPLACE FUNCTION update_production_plan_with_version(
  p_plan_id BIGINT,
  p_plan_code TEXT,
  p_plan_type TEXT,
  p_plan_period_start DATE,
  p_plan_period_end DATE,
  p_production_quantity INTEGER,
  p_delivery_date DATE,
  p_product_model_id INTEGER,
  p_factory_id TEXT,
  p_responsible_person_id UUID,
  p_remarks TEXT,
  p_change_reason TEXT,
  p_change_description TEXT,
  p_updated_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
  v_current_version INTEGER;
  v_new_version INTEGER;
  v_plan_details JSONB;
BEGIN
  -- 检查计划状态
  SELECT status, current_version INTO v_current_status, v_current_version
  FROM production_plans
  WHERE id = p_plan_id;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION '生产计划不存在';
  END IF;
  
  -- 只有 draft 或 rejected 状态可以编辑
  IF v_current_status NOT IN ('draft', 'rejected') THEN
    RAISE EXCEPTION '只有草稿或已拒绝状态的计划可以编辑，当前状态: %', v_current_status;
  END IF;
  
  -- 生成新版本号
  v_new_version := v_current_version + 1;
  
  -- 构建计划详情 JSON
  v_plan_details := jsonb_build_object(
    'plan_code', p_plan_code,
    'plan_type', p_plan_type,
    'plan_period_start', p_plan_period_start,
    'plan_period_end', p_plan_period_end,
    'production_quantity', p_production_quantity,
    'delivery_date', p_delivery_date,
    'product_model_id', p_product_model_id,
    'factory_id', p_factory_id,
    'responsible_person_id', p_responsible_person_id,
    'remarks', p_remarks
  );
  
  -- 更新主表
  UPDATE production_plans
  SET 
    plan_code = p_plan_code,
    plan_type = p_plan_type,
    plan_period_start = p_plan_period_start,
    plan_period_end = p_plan_period_end,
    production_quantity = p_production_quantity,
    delivery_date = p_delivery_date,
    product_model_id = p_product_model_id,
    factory_id = p_factory_id,
    responsible_person_id = p_responsible_person_id,
    remarks = p_remarks,
    current_version = v_new_version,
    status = 'draft',  -- 编辑后重置为草稿状态
    updated_by = p_updated_by,
    updated_at = NOW()
  WHERE id = p_plan_id;
  
  -- 创建新版本记录
  INSERT INTO production_plan_versions (
    plan_id,
    version_number,
    change_reason,
    change_description,
    plan_details,
    created_by
  ) VALUES (
    p_plan_id,
    v_new_version,
    p_change_reason,
    p_change_description,
    v_plan_details,
    p_updated_by
  );
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'plan_id', p_plan_id,
    'new_version', v_new_version
  );
END;
$$;

COMMENT ON FUNCTION update_production_plan_with_version IS 'P1: 编辑生产计划并生成新版本';