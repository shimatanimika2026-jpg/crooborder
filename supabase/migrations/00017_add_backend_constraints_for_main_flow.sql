
-- 创建最终测试前置检查函数
CREATE OR REPLACE FUNCTION check_final_test_prerequisites(p_finished_product_sn TEXT)
RETURNS TABLE(can_test BOOLEAN, block_reason TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN fut.aging_status = 'passed' THEN TRUE
      ELSE FALSE
    END as can_test,
    CASE 
      WHEN fut.aging_status IS NULL THEN '未进行老化试验'
      WHEN fut.aging_status != 'passed' THEN '48小时老化试验未通过，当前状态: ' || fut.aging_status
      ELSE ''
    END as block_reason
  FROM finished_unit_traceability fut
  WHERE fut.finished_product_sn = p_finished_product_sn;
END;
$$;

-- 创建QA放行前置检查函数
CREATE OR REPLACE FUNCTION check_qa_release_prerequisites(p_finished_product_sn TEXT)
RETURNS TABLE(can_release BOOLEAN, block_reason TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN fut.aging_status = 'passed' AND fut.final_test_status = 'passed' THEN TRUE
      ELSE FALSE
    END as can_release,
    CASE 
      WHEN fut.aging_status != 'passed' THEN '48小时老化试验未通过，不允许放行'
      WHEN fut.final_test_status != 'passed' THEN '最终测试未通过，不允许放行'
      ELSE ''
    END as block_reason
  FROM finished_unit_traceability fut
  WHERE fut.finished_product_sn = p_finished_product_sn;
END;
$$;

-- 创建出货前置检查函数
CREATE OR REPLACE FUNCTION check_shipment_prerequisites(p_finished_product_sn TEXT)
RETURNS TABLE(can_ship BOOLEAN, block_reason TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN fut.aging_status = 'passed' 
        AND fut.final_test_status = 'passed' 
        AND fut.qa_release_status = 'approved' THEN TRUE
      ELSE FALSE
    END as can_ship,
    CASE 
      WHEN fut.aging_status != 'passed' THEN '老化状态异常，不允许出货'
      WHEN fut.final_test_status != 'passed' THEN '最终测试未通过，不允许出货'
      WHEN fut.qa_release_status != 'approved' THEN 'QA未放行，不允许出货'
      ELSE ''
    END as block_reason
  FROM finished_unit_traceability fut
  WHERE fut.finished_product_sn = p_finished_product_sn;
END;
$$;

-- 创建最终测试更新触发器函数
CREATE OR REPLACE FUNCTION validate_final_test_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 只在更新final_test_status为passed时检查
  IF NEW.final_test_status = 'passed' AND (OLD.final_test_status IS DISTINCT FROM 'passed') THEN
    IF NEW.aging_status != 'passed' THEN
      RAISE EXCEPTION '48小时老化试验未通过，不允许最终测试通过';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 创建QA放行更新触发器函数
CREATE OR REPLACE FUNCTION validate_qa_release_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 只在更新qa_release_status为approved时检查
  IF NEW.qa_release_status = 'approved' AND (OLD.qa_release_status IS DISTINCT FROM 'approved') THEN
    IF NEW.aging_status != 'passed' THEN
      RAISE EXCEPTION '48小时老化试验未通过，不允许QA放行';
    END IF;
    IF NEW.final_test_status != 'passed' THEN
      RAISE EXCEPTION '最终测试未通过，不允许QA放行';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 创建出货更新触发器函数
CREATE OR REPLACE FUNCTION validate_shipment_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 只在更新shipment_status为shipped时检查
  IF NEW.shipment_status = 'shipped' AND (OLD.shipment_status IS DISTINCT FROM 'shipped') THEN
    IF NEW.aging_status != 'passed' THEN
      RAISE EXCEPTION '老化状态异常，不允许出货';
    END IF;
    IF NEW.final_test_status != 'passed' THEN
      RAISE EXCEPTION '最终测试未通过，不允许出货';
    END IF;
    IF NEW.qa_release_status != 'approved' THEN
      RAISE EXCEPTION 'QA未放行，不允许出货';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS trigger_validate_final_test ON finished_unit_traceability;
DROP TRIGGER IF EXISTS trigger_validate_qa_release ON finished_unit_traceability;
DROP TRIGGER IF EXISTS trigger_validate_shipment ON finished_unit_traceability;

-- 创建触发器
CREATE TRIGGER trigger_validate_final_test
  BEFORE UPDATE ON finished_unit_traceability
  FOR EACH ROW
  EXECUTE FUNCTION validate_final_test_update();

CREATE TRIGGER trigger_validate_qa_release
  BEFORE UPDATE ON finished_unit_traceability
  FOR EACH ROW
  EXECUTE FUNCTION validate_qa_release_update();

CREATE TRIGGER trigger_validate_shipment
  BEFORE UPDATE ON finished_unit_traceability
  FOR EACH ROW
  EXECUTE FUNCTION validate_shipment_update();
