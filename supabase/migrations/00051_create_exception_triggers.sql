-- P2: 创建自动生成异常的 RPC 函数

-- 1. 通用异常创建函数
CREATE OR REPLACE FUNCTION create_operation_exception(
  p_exception_type VARCHAR,
  p_severity VARCHAR,
  p_source_module VARCHAR,
  p_source_record_id BIGINT,
  p_related_sn VARCHAR DEFAULT NULL,
  p_related_plan_id BIGINT DEFAULT NULL,
  p_related_shipment_id BIGINT DEFAULT NULL,
  p_related_receiving_id BIGINT DEFAULT NULL,
  p_related_aging_test_id BIGINT DEFAULT NULL,
  p_related_final_test_id BIGINT DEFAULT NULL,
  p_owner_id UUID DEFAULT NULL,
  p_reported_by UUID DEFAULT NULL,
  p_due_date DATE DEFAULT NULL,
  p_remarks TEXT DEFAULT NULL,
  p_tenant_id VARCHAR DEFAULT NULL,
  p_factory_id VARCHAR DEFAULT NULL
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
  
  -- 插入异常记录
  INSERT INTO operation_exceptions (
    exception_type,
    severity,
    source_module,
    source_record_id,
    related_sn,
    related_plan_id,
    related_shipment_id,
    related_receiving_id,
    related_aging_test_id,
    related_final_test_id,
    owner_id,
    reported_by,
    reported_at,
    due_date,
    remarks,
    tenant_id,
    factory_id,
    current_status
  ) VALUES (
    p_exception_type,
    p_severity,
    p_source_module,
    p_source_record_id,
    p_related_sn,
    p_related_plan_id,
    p_related_shipment_id,
    p_related_receiving_id,
    p_related_aging_test_id,
    p_related_final_test_id,
    p_owner_id,
    COALESCE(p_reported_by, auth.uid()),
    NOW(),
    p_due_date,
    p_remarks,
    v_tenant_id,
    p_factory_id,
    'open'
  )
  RETURNING id INTO v_exception_id;
  
  RETURN v_exception_id;
END;
$$;

-- 2. 收货差异自动生成异常触发器
CREATE OR REPLACE FUNCTION trigger_receiving_variance_exception()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_severity VARCHAR;
  v_exception_type VARCHAR;
BEGIN
  -- 只有非 matched 的差异才生成异常
  IF NEW.variance_type != 'matched' THEN
    -- 根据差异类型确定异常类型和严重等级
    CASE NEW.variance_type
      WHEN 'shortage' THEN
        v_exception_type := 'shortage';
        v_severity := 'high';
      WHEN 'overage' THEN
        v_exception_type := 'overage';
        v_severity := 'medium';
      WHEN 'wrong_item' THEN
        v_exception_type := 'wrong_item';
        v_severity := 'high';
      WHEN 'damaged' THEN
        v_exception_type := 'damaged';
        v_severity := 'critical';
      ELSE
        v_exception_type := NEW.variance_type;
        v_severity := 'medium';
    END CASE;
    
    -- 创建异常
    PERFORM create_operation_exception(
      p_exception_type := v_exception_type,
      p_severity := v_severity,
      p_source_module := 'receiving',
      p_source_record_id := NEW.id,
      p_related_receiving_id := NEW.receiving_id,
      p_remarks := '收货差异：' || NEW.variance_type || '，差异数量：' || NEW.variance_quantity,
      p_tenant_id := NEW.tenant_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_receiving_variance_create_exception
AFTER INSERT ON receiving_variances
FOR EACH ROW
EXECUTE FUNCTION trigger_receiving_variance_exception();

-- 3. IQC HOLD/NG 自动生成异常触发器
CREATE OR REPLACE FUNCTION trigger_iqc_ng_exception()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_severity VARCHAR;
  v_exception_type VARCHAR;
BEGIN
  -- 只有 HOLD 或 NG 才生成异常
  IF NEW.result IN ('HOLD', 'NG') THEN
    CASE NEW.result
      WHEN 'HOLD' THEN
        v_exception_type := 'hold';
        v_severity := 'high';
      WHEN 'NG' THEN
        v_exception_type := 'incoming_ng';
        v_severity := 'critical';
    END CASE;
    
    -- 创建异常
    PERFORM create_operation_exception(
      p_exception_type := v_exception_type,
      p_severity := v_severity,
      p_source_module := 'iqc',
      p_source_record_id := NEW.id,
      p_related_receiving_id := NEW.receiving_id,
      p_remarks := 'IQC检验结果：' || NEW.result || '，不合格数量：' || NEW.defective_quantity,
      p_tenant_id := NEW.tenant_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_iqc_create_exception
AFTER INSERT OR UPDATE OF result ON quality_inspections
FOR EACH ROW
WHEN (NEW.inspection_type = 'incoming' AND NEW.result IN ('HOLD', 'NG'))
EXECUTE FUNCTION trigger_iqc_ng_exception();

-- 4. 老化中断/失败自动生成异常触发器
CREATE OR REPLACE FUNCTION trigger_aging_failure_exception()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_severity VARCHAR;
  v_exception_type VARCHAR;
BEGIN
  -- 只有 interrupted 或 failed 才生成异常
  IF NEW.status IN ('interrupted', 'failed') THEN
    CASE NEW.status
      WHEN 'interrupted' THEN
        v_exception_type := 'aging_interrupted';
        v_severity := 'medium';
      WHEN 'failed' THEN
        v_exception_type := 'aging_failed';
        v_severity := 'high';
    END CASE;
    
    -- 创建异常
    PERFORM create_operation_exception(
      p_exception_type := v_exception_type,
      p_severity := v_severity,
      p_source_module := 'aging',
      p_source_record_id := NEW.id,
      p_related_sn := NEW.serial_number,
      p_related_aging_test_id := NEW.id,
      p_remarks := '老化测试异常：' || NEW.status,
      p_tenant_id := NEW.tenant_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_aging_create_exception
AFTER UPDATE OF status ON aging_tests
FOR EACH ROW
WHEN (NEW.status IN ('interrupted', 'failed') AND OLD.status != NEW.status)
EXECUTE FUNCTION trigger_aging_failure_exception();

COMMENT ON FUNCTION create_operation_exception IS 'P2: 通用异常创建函数';
COMMENT ON FUNCTION trigger_receiving_variance_exception IS 'P2: 收货差异自动生成异常';
COMMENT ON FUNCTION trigger_iqc_ng_exception IS 'P2: IQC HOLD/NG 自动生成异常';
COMMENT ON FUNCTION trigger_aging_failure_exception IS 'P2: 老化中断/失败自动生成异常';
