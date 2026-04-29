-- P0: 主流程硬闭合 - 补充前置校验和状态流转逻辑

-- ============================================================
-- 0. 先补充 shipment_confirmations 表字段
-- ============================================================

DO $$
BEGIN
  -- 添加 finished_product_sn 字段（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shipment_confirmations' AND column_name = 'finished_product_sn'
  ) THEN
    ALTER TABLE shipment_confirmations ADD COLUMN finished_product_sn TEXT;
  END IF;

  -- 添加 block_reason 字段（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shipment_confirmations' AND column_name = 'block_reason'
  ) THEN
    ALTER TABLE shipment_confirmations ADD COLUMN block_reason TEXT;
  END IF;

  -- 添加 confirmation_status 字段（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shipment_confirmations' AND column_name = 'confirmation_status'
  ) THEN
    ALTER TABLE shipment_confirmations ADD COLUMN confirmation_status TEXT DEFAULT 'pending';
  END IF;

  -- 添加 remarks 字段（如果不存在）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shipment_confirmations' AND column_name = 'remarks'
  ) THEN
    ALTER TABLE shipment_confirmations ADD COLUMN remarks TEXT;
  END IF;
END $$;

-- 添加约束（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'shipment_confirmations_confirmation_status_check'
  ) THEN
    ALTER TABLE shipment_confirmations 
    ADD CONSTRAINT shipment_confirmations_confirmation_status_check 
    CHECK (confirmation_status IN ('pending', 'confirmed', 'blocked', 'cancelled'));
  END IF;
END $$;

COMMENT ON COLUMN shipment_confirmations.finished_product_sn IS 'P0: 产品序列号';
COMMENT ON COLUMN shipment_confirmations.block_reason IS 'P0: 出货阻断原因';
COMMENT ON COLUMN shipment_confirmations.confirmation_status IS 'P0: 出货确认状态';
COMMENT ON COLUMN shipment_confirmations.remarks IS 'P0: 备注';

-- ============================================================
-- 1. Final Test 前置校验：老化必须通过
-- ============================================================

CREATE OR REPLACE FUNCTION validate_final_test_prerequisite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_aging_status TEXT;
  v_aging_result TEXT;
BEGIN
  -- 查询老化测试状态
  SELECT status, result INTO v_aging_status, v_aging_result
  FROM aging_tests
  WHERE finished_product_sn = NEW.finished_product_sn
  ORDER BY created_at DESC
  LIMIT 1;

  -- 检查老化测试是否通过
  IF v_aging_result IS NULL OR v_aging_result != 'pass' THEN
    RAISE EXCEPTION '老化测试未通过，不允许进行最终测试。产品序列号: %', NEW.finished_product_sn;
  END IF;

  IF v_aging_status != 'passed' THEN
    RAISE EXCEPTION '老化测试状态异常（%），不允许进行最终测试。产品序列号: %', v_aging_status, NEW.finished_product_sn;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_final_test_prerequisite ON final_tests;

CREATE TRIGGER trigger_validate_final_test_prerequisite
  BEFORE INSERT ON final_tests
  FOR EACH ROW
  EXECUTE FUNCTION validate_final_test_prerequisite();

COMMENT ON FUNCTION validate_final_test_prerequisite IS 'P0: Final Test 前置校验 - 老化必须通过';

-- ============================================================
-- 2. Final Test 结果提交时自动生成 blocked 异常
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_final_test_blocked_exception()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 当测试状态为 blocked 时自动生成异常
  IF NEW.test_status = 'blocked' AND (OLD.test_status IS NULL OR OLD.test_status != 'blocked') THEN
    PERFORM create_operation_exception(
      p_exception_type := 'final_test_blocked',
      p_severity := 'high',
      p_source_module := 'final_test',
      p_source_record_id := NEW.id,
      p_related_sn := NEW.finished_product_sn,
      p_related_final_test_id := NEW.id,
      p_remarks := '最终测试被阻断：' || COALESCE(NEW.defect_description, COALESCE(NEW.notes, COALESCE(NEW.remarks, '未知原因'))),
      p_tenant_id := NEW.tenant_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_final_test_blocked ON final_tests;

CREATE TRIGGER trigger_final_test_blocked
AFTER INSERT OR UPDATE OF test_status ON final_tests
FOR EACH ROW
WHEN (NEW.test_status = 'blocked')
EXECUTE FUNCTION trigger_final_test_blocked_exception();

COMMENT ON FUNCTION trigger_final_test_blocked_exception IS 'P0: Final Test blocked 时自动生成异常';

-- ============================================================
-- 3. QA Release 前置校验：Final Test 必须 pass
-- ============================================================

CREATE OR REPLACE FUNCTION validate_qa_release_prerequisite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_final_test_status TEXT;
BEGIN
  -- 查询最终测试状态
  SELECT test_status INTO v_final_test_status
  FROM final_tests
  WHERE finished_product_sn = NEW.finished_product_sn
  ORDER BY created_at DESC
  LIMIT 1;

  -- 检查最终测试是否通过
  IF v_final_test_status IS NULL THEN
    RAISE EXCEPTION '未找到最终测试记录，不允许 QA 放行。产品序列号: %', NEW.finished_product_sn;
  END IF;

  IF v_final_test_status != 'pass' THEN
    RAISE EXCEPTION '最终测试未通过（状态: %），不允许 QA 放行。产品序列号: %', v_final_test_status, NEW.finished_product_sn;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_qa_release_prerequisite ON qa_releases;

CREATE TRIGGER trigger_validate_qa_release_prerequisite
  BEFORE INSERT ON qa_releases
  FOR EACH ROW
  EXECUTE FUNCTION validate_qa_release_prerequisite();

COMMENT ON FUNCTION validate_qa_release_prerequisite IS 'P0: QA Release 前置校验 - Final Test 必须 pass';

-- ============================================================
-- 4. QA Release blocked 时自动生成异常
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_qa_release_blocked_exception()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 当放行状态为 blocked 时自动生成异常
  IF NEW.release_status = 'blocked' AND (OLD.release_status IS NULL OR OLD.release_status != 'blocked') THEN
    PERFORM create_operation_exception(
      p_exception_type := 'qa_blocked',
      p_severity := 'critical',
      p_source_module := 'qa',
      p_source_record_id := NEW.id,
      p_related_sn := NEW.finished_product_sn,
      p_related_qa_release_id := NEW.id,
      p_remarks := 'QA 放行被阻断：' || COALESCE(NEW.block_reason, COALESCE(NEW.remarks, '未知原因')),
      p_tenant_id := NEW.tenant_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_qa_release_blocked ON qa_releases;

CREATE TRIGGER trigger_qa_release_blocked
AFTER INSERT OR UPDATE OF release_status ON qa_releases
FOR EACH ROW
WHEN (NEW.release_status = 'blocked')
EXECUTE FUNCTION trigger_qa_release_blocked_exception();

COMMENT ON FUNCTION trigger_qa_release_blocked_exception IS 'P0: QA Release blocked 时自动生成异常';

-- ============================================================
-- 5. Shipment 前置校验：QA 必须 approved
-- ============================================================

CREATE OR REPLACE FUNCTION validate_shipment_prerequisite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_qa_release_status TEXT;
BEGIN
  -- 查询 QA 放行状态
  SELECT release_status INTO v_qa_release_status
  FROM qa_releases
  WHERE finished_product_sn = NEW.finished_product_sn
  ORDER BY created_at DESC
  LIMIT 1;

  -- 检查 QA 是否放行
  IF v_qa_release_status IS NULL THEN
    RAISE EXCEPTION '未找到 QA 放行记录，不允许出货。产品序列号: %', NEW.finished_product_sn;
  END IF;

  IF v_qa_release_status != 'approved' THEN
    RAISE EXCEPTION 'QA 未放行（状态: %），不允许出货。产品序列号: %', v_qa_release_status, NEW.finished_product_sn;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_shipment_prerequisite ON shipment_confirmations;

CREATE TRIGGER trigger_validate_shipment_prerequisite
  BEFORE INSERT ON shipment_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION validate_shipment_prerequisite();

COMMENT ON FUNCTION validate_shipment_prerequisite IS 'P0: Shipment 前置校验 - QA 必须 approved';

-- ============================================================
-- 6. Shipment blocked 时自动生成异常
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_shipment_blocked_exception()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 当出货状态为 blocked 时自动生成异常
  IF NEW.confirmation_status = 'blocked' AND (OLD.confirmation_status IS NULL OR OLD.confirmation_status != 'blocked') THEN
    PERFORM create_operation_exception(
      p_exception_type := 'shipment_blocked',
      p_severity := 'critical',
      p_source_module := 'shipment',
      p_source_record_id := NEW.id,
      p_related_sn := NEW.finished_product_sn,
      p_related_shipment_confirmation_id := NEW.id,
      p_remarks := '出货被阻断：' || COALESCE(NEW.block_reason, COALESCE(NEW.remarks, '未知原因')),
      p_tenant_id := NEW.tenant_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_shipment_blocked ON shipment_confirmations;

CREATE TRIGGER trigger_shipment_blocked
AFTER INSERT OR UPDATE OF confirmation_status ON shipment_confirmations
FOR EACH ROW
WHEN (NEW.confirmation_status = 'blocked')
EXECUTE FUNCTION trigger_shipment_blocked_exception();

COMMENT ON FUNCTION trigger_shipment_blocked_exception IS 'P0: Shipment blocked 时自动生成异常';
