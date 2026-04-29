-- P2: 修正异常自动生成触发器 - 挂载到正确的表

-- ============================================================
-- A. 收货差异自动异常 - 修正为 receiving_record_items
-- ============================================================

-- 1. 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS trigger_receiving_variance_create_exception ON receiving_variances;
DROP FUNCTION IF EXISTS trigger_receiving_variance_exception();

-- 2. 创建新的收货差异异常触发函数
CREATE OR REPLACE FUNCTION trigger_receiving_item_variance_exception()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_severity VARCHAR;
BEGIN
  -- 只有差异类型不是 matched 才生成异常
  IF NEW.variance_type IS NOT NULL AND NEW.variance_type != 'matched' THEN
    -- 根据差异类型确定严重等级
    CASE NEW.variance_type
      WHEN 'shortage' THEN v_severity := 'high';
      WHEN 'overage' THEN v_severity := 'medium';
      WHEN 'wrong_item' THEN v_severity := 'high';
      WHEN 'damaged' THEN v_severity := 'critical';
      ELSE v_severity := 'medium';
    END CASE;
    
    -- 创建异常
    PERFORM create_operation_exception(
      p_exception_type := NEW.variance_type,
      p_severity := v_severity,
      p_source_module := 'receiving',
      p_source_record_id := NEW.id,
      p_related_receiving_id := NEW.receiving_id,
      p_remarks := '收货差异：' || COALESCE(NEW.remarks, '数量差异 ' || COALESCE(NEW.variance_qty::TEXT, '0')),
      p_tenant_id := (SELECT tenant_id FROM receiving_records WHERE id = NEW.receiving_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. 创建新触发器 - 挂载到 receiving_record_items
CREATE TRIGGER trigger_receiving_item_variance_create_exception
AFTER INSERT OR UPDATE OF variance_type ON receiving_record_items
FOR EACH ROW
WHEN (NEW.variance_type IS NOT NULL AND NEW.variance_type != 'matched')
EXECUTE FUNCTION trigger_receiving_item_variance_exception();

COMMENT ON FUNCTION trigger_receiving_item_variance_exception IS 'P2: 收货差异自动生成异常 - 基于 receiving_record_items';

-- ============================================================
-- B. IQC HOLD/NG 自动异常 - 修正为 iqc_inspections
-- ============================================================

-- 1. 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS trigger_iqc_create_exception ON quality_inspections;
DROP FUNCTION IF EXISTS trigger_iqc_ng_exception();

-- 2. 创建新的 IQC 异常触发函数
CREATE OR REPLACE FUNCTION trigger_iqc_inspection_exception()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exception_type VARCHAR;
  v_severity VARCHAR;
BEGIN
  -- 只有 HOLD 或 NG 才生成异常
  IF NEW.result IN ('HOLD', 'NG') THEN
    -- 确定异常类型和严重等级
    IF NEW.result = 'NG' THEN
      v_exception_type := 'incoming_ng';
      v_severity := 'critical';
    ELSE
      v_exception_type := 'hold';
      v_severity := 'high';
    END IF;
    
    -- 创建异常
    PERFORM create_operation_exception(
      p_exception_type := v_exception_type,
      p_severity := v_severity,
      p_source_module := 'iqc',
      p_source_record_id := NEW.id,
      p_related_iqc_id := NEW.id,
      p_related_receiving_id := NEW.receiving_id,
      p_remarks := 'IQC检验' || NEW.result || '：' || COALESCE(NEW.defect_description, COALESCE(NEW.remarks, '检验不合格')),
      p_tenant_id := (SELECT tenant_id FROM receiving_records WHERE id = NEW.receiving_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. 创建新触发器 - 挂载到 iqc_inspections
CREATE TRIGGER trigger_iqc_inspection_create_exception
AFTER INSERT OR UPDATE OF result ON iqc_inspections
FOR EACH ROW
WHEN (NEW.result IN ('HOLD', 'NG'))
EXECUTE FUNCTION trigger_iqc_inspection_exception();

COMMENT ON FUNCTION trigger_iqc_inspection_exception IS 'P2: IQC HOLD/NG 自动生成异常 - 基于 iqc_inspections';

-- ============================================================
-- C. 特采待审批自动异常 - 修正为 incoming_material_dispositions
-- ============================================================

-- 1. 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS trigger_disposition_create_exception ON material_dispositions;
DROP FUNCTION IF EXISTS trigger_special_acceptance_exception();

-- 2. 创建新的特采异常触发函数
CREATE OR REPLACE FUNCTION trigger_incoming_disposition_exception()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 只有特采类型且状态为 pending 才生成异常
  IF NEW.disposition_type = 'special_acceptance' AND NEW.disposition_status = 'pending' THEN
    -- 创建异常
    PERFORM create_operation_exception(
      p_exception_type := 'special_acceptance_pending',
      p_severity := 'high',
      p_source_module := 'disposition',
      p_source_record_id := NEW.id,
      p_related_disposition_id := NEW.id,
      p_remarks := '特采待审批：' || COALESCE(NEW.remarks, COALESCE(NEW.block_reason, '')),
      p_tenant_id := NEW.tenant_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. 创建新触发器 - 挂载到 incoming_material_dispositions
CREATE TRIGGER trigger_incoming_disposition_create_exception
AFTER INSERT OR UPDATE OF disposition_status ON incoming_material_dispositions
FOR EACH ROW
WHEN (NEW.disposition_type = 'special_acceptance' AND NEW.disposition_status = 'pending')
EXECUTE FUNCTION trigger_incoming_disposition_exception();

COMMENT ON FUNCTION trigger_incoming_disposition_exception IS 'P2: 特采待审批自动生成异常 - 基于 incoming_material_dispositions';

-- ============================================================
-- D. 老化异常 - 修正字段名为 finished_product_sn
-- ============================================================

-- 1. 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS trigger_aging_create_exception ON aging_tests;
DROP FUNCTION IF EXISTS trigger_aging_failure_exception();

-- 2. 创建新的老化异常触发函数
CREATE OR REPLACE FUNCTION trigger_aging_test_exception()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exception_type VARCHAR;
  v_severity VARCHAR;
BEGIN
  -- 只有 interrupted 或 failed 才生成异常
  IF NEW.status IN ('interrupted', 'failed') THEN
    -- 确定异常类型和严重等级
    IF NEW.status = 'failed' THEN
      v_exception_type := 'aging_failed';
      v_severity := 'high';
    ELSE
      v_exception_type := 'aging_interrupted';
      v_severity := 'medium';
    END IF;
    
    -- 创建异常（使用正确的字段名 finished_product_sn）
    PERFORM create_operation_exception(
      p_exception_type := v_exception_type,
      p_severity := v_severity,
      p_source_module := 'aging',
      p_source_record_id := NEW.id,
      p_related_sn := NEW.finished_product_sn,
      p_related_aging_test_id := NEW.id,
      p_remarks := '老化测试' || NEW.status || '：' || COALESCE(NEW.last_interruption_reason_code, COALESCE(NEW.remarks, '')),
      p_tenant_id := NEW.tenant_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. 创建新触发器 - 挂载到 aging_tests
CREATE TRIGGER trigger_aging_test_create_exception
AFTER UPDATE OF status ON aging_tests
FOR EACH ROW
WHEN (NEW.status IN ('interrupted', 'failed') AND OLD.status != NEW.status)
EXECUTE FUNCTION trigger_aging_test_exception();

COMMENT ON FUNCTION trigger_aging_test_exception IS 'P2: 老化中断/失败自动生成异常 - 使用 finished_product_sn';
