-- 修复执行进度函数的表名

DROP FUNCTION IF EXISTS get_plan_execution_progress(BIGINT);

CREATE FUNCTION get_plan_execution_progress(p_plan_id BIGINT)
RETURNS TABLE(
  linked_order_count INTEGER,
  completed_quantity INTEGER,
  completion_rate NUMERIC
) AS $$
DECLARE
  v_plan_quantity INTEGER;
BEGIN
  -- 1. 获取计划数量
  SELECT production_quantity INTO v_plan_quantity
  FROM production_plans
  WHERE id = p_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '生产计划不存在：ID %', p_plan_id;
  END IF;

  -- 2. 统计已关联订单数
  SELECT COUNT(*) INTO linked_order_count
  FROM production_orders
  WHERE plan_id = p_plan_id;

  -- 3. 统计已完成数量（使用正确的表名 finished_unit_traceability）
  SELECT COUNT(*) INTO completed_quantity
  FROM finished_unit_traceability fut
  WHERE fut.production_order_id IN (
    SELECT id FROM production_orders WHERE plan_id = p_plan_id
  )
  AND fut.final_test_status = 'passed'
  AND fut.qa_release_status = 'released';

  -- 4. 计算完成率
  IF v_plan_quantity > 0 THEN
    completion_rate := ROUND((completed_quantity::NUMERIC / v_plan_quantity) * 100, 2);
  ELSE
    completion_rate := 0;
  END IF;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_plan_execution_progress IS '获取生产计划执行进度';