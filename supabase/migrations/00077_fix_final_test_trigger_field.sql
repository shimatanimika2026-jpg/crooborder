-- 修复 final_test 触发器字段名

DROP TRIGGER IF EXISTS trigger_final_test_create_exception ON final_tests;
DROP FUNCTION IF EXISTS trigger_final_test_exception();

CREATE OR REPLACE FUNCTION trigger_final_test_exception()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 当测试状态为 fail 时自动生成异常
  IF NEW.test_status = 'fail' THEN
    PERFORM create_operation_exception(
      p_exception_type := 'final_test_failed',
      p_severity := 'high',
      p_source_module := 'final_test',
      p_source_record_id := NEW.id,
      p_related_sn := NEW.finished_product_sn,
      p_related_final_test_id := NEW.id,
      p_remarks := '最终测试失败：' || COALESCE(NEW.defect_description, COALESCE(NEW.notes, COALESCE(NEW.remarks, ''))),
      p_tenant_id := NEW.tenant_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_final_test_create_exception
AFTER INSERT OR UPDATE OF test_status ON final_tests
FOR EACH ROW
WHEN (NEW.test_status = 'fail')
EXECUTE FUNCTION trigger_final_test_exception();

COMMENT ON FUNCTION trigger_final_test_exception IS 'P2: 最终测试失败自动生成异常 - 使用 test_status 字段';