-- P2: 补充 final_test / qa / shipment 自动异常

-- ============================================================
-- 1. 最终测试失败自动异常
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_final_test_exception()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 当测试结果为 fail 时自动生成异常
  IF NEW.test_result = 'fail' THEN
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
AFTER INSERT OR UPDATE OF test_result ON final_tests
FOR EACH ROW
WHEN (NEW.test_result = 'fail')
EXECUTE FUNCTION trigger_final_test_exception();

COMMENT ON FUNCTION trigger_final_test_exception IS 'P2: 最终测试失败自动生成异常';

-- ============================================================
-- 2. 最终测试阻断 RPC（前端调用）
-- ============================================================

CREATE OR REPLACE FUNCTION create_final_test_blocked_exception(
  p_finished_product_sn VARCHAR,
  p_block_reason TEXT,
  p_tenant_id VARCHAR
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exception_id BIGINT;
BEGIN
  -- 创建最终测试阻断异常
  v_exception_id := create_operation_exception(
    p_exception_type := 'final_test_blocked',
    p_severity := 'high',
    p_source_module := 'final_test',
    p_source_record_id := NULL,
    p_related_sn := p_finished_product_sn,
    p_remarks := '最终测试被阻断：' || p_block_reason,
    p_tenant_id := p_tenant_id
  );
  
  RETURN v_exception_id;
END;
$$;

COMMENT ON FUNCTION create_final_test_blocked_exception IS 'P2: 创建最终测试阻断异常（前端调用）';

-- ============================================================
-- 3. QA 阻断 RPC（前端调用）
-- ============================================================

CREATE OR REPLACE FUNCTION create_qa_blocked_exception(
  p_finished_product_sn VARCHAR,
  p_block_reason TEXT,
  p_tenant_id VARCHAR,
  p_related_qa_release_id BIGINT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exception_id BIGINT;
BEGIN
  -- 创建 QA 阻断异常
  v_exception_id := create_operation_exception(
    p_exception_type := 'qa_blocked',
    p_severity := 'critical',
    p_source_module := 'qa',
    p_source_record_id := p_related_qa_release_id,
    p_related_sn := p_finished_product_sn,
    p_related_qa_release_id := p_related_qa_release_id,
    p_remarks := 'QA放行被阻断：' || p_block_reason,
    p_tenant_id := p_tenant_id
  );
  
  RETURN v_exception_id;
END;
$$;

COMMENT ON FUNCTION create_qa_blocked_exception IS 'P2: 创建 QA 阻断异常（前端调用）';

-- ============================================================
-- 4. 出货阻断 RPC（前端调用）
-- ============================================================

CREATE OR REPLACE FUNCTION create_shipment_blocked_exception(
  p_finished_product_sn VARCHAR,
  p_block_reason TEXT,
  p_tenant_id VARCHAR,
  p_related_shipment_id BIGINT DEFAULT NULL,
  p_related_shipment_confirmation_id BIGINT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exception_id BIGINT;
BEGIN
  -- 创建出货阻断异常
  v_exception_id := create_operation_exception(
    p_exception_type := 'shipment_blocked',
    p_severity := 'critical',
    p_source_module := 'shipment',
    p_source_record_id := p_related_shipment_confirmation_id,
    p_related_sn := p_finished_product_sn,
    p_related_shipment_id := p_related_shipment_id,
    p_related_shipment_confirmation_id := p_related_shipment_confirmation_id,
    p_remarks := '出货被阻断：' || p_block_reason,
    p_tenant_id := p_tenant_id
  );
  
  RETURN v_exception_id;
END;
$$;

COMMENT ON FUNCTION create_shipment_blocked_exception IS 'P2: 创建出货阻断异常（前端调用）';

-- ============================================================
-- 5. 通用阻断异常创建 RPC（供其他模块使用）
-- ============================================================

CREATE OR REPLACE FUNCTION create_blocked_exception(
  p_exception_type VARCHAR,
  p_source_module VARCHAR,
  p_block_reason TEXT,
  p_related_sn VARCHAR DEFAULT NULL,
  p_source_record_id BIGINT DEFAULT NULL,
  p_tenant_id VARCHAR DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exception_id BIGINT;
  v_tenant_id VARCHAR;
BEGIN
  -- 如果未指定 tenant_id，使用当前用户的 tenant_id
  IF p_tenant_id IS NULL THEN
    SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid();
  ELSE
    v_tenant_id := p_tenant_id;
  END IF;
  
  -- 创建阻断异常
  v_exception_id := create_operation_exception(
    p_exception_type := p_exception_type,
    p_severity := 'high',
    p_source_module := p_source_module,
    p_source_record_id := p_source_record_id,
    p_related_sn := p_related_sn,
    p_remarks := p_block_reason,
    p_tenant_id := v_tenant_id
  );
  
  RETURN v_exception_id;
END;
$$;

COMMENT ON FUNCTION create_blocked_exception IS 'P2: 通用阻断异常创建函数';
