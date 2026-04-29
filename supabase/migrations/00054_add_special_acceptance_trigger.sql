-- P2: 补充特采和阻断异常自动生成触发器

-- 1. 特采待审批自动生成异常触发器
CREATE OR REPLACE FUNCTION trigger_special_acceptance_exception()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 只有特采类型且状态为 pending 才生成异常
  IF NEW.disposition_type = 'special_acceptance' AND NEW.status = 'pending' THEN
    -- 创建异常
    PERFORM create_operation_exception(
      p_exception_type := 'special_acceptance_pending',
      p_severity := 'high',
      p_source_module := 'disposition',
      p_source_record_id := NEW.id,
      p_related_iqc_id := NEW.inspection_id,
      p_related_disposition_id := NEW.id,
      p_remarks := '特采待审批：' || COALESCE(NEW.reason, ''),
      p_tenant_id := NEW.tenant_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_disposition_create_exception
AFTER INSERT OR UPDATE OF status ON material_dispositions
FOR EACH ROW
WHEN (NEW.disposition_type = 'special_acceptance' AND NEW.status = 'pending')
EXECUTE FUNCTION trigger_special_acceptance_exception();

-- 2. 更新 create_operation_exception 函数以支持更多关联字段
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
  p_related_iqc_id BIGINT DEFAULT NULL,
  p_related_disposition_id BIGINT DEFAULT NULL,
  p_related_qa_release_id BIGINT DEFAULT NULL,
  p_related_shipment_confirmation_id BIGINT DEFAULT NULL,
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
    related_iqc_id,
    related_disposition_id,
    related_qa_release_id,
    related_shipment_confirmation_id,
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
    p_related_iqc_id,
    p_related_disposition_id,
    p_related_qa_release_id,
    p_related_shipment_confirmation_id,
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

COMMENT ON FUNCTION trigger_special_acceptance_exception IS 'P2: 特采待审批自动生成异常';
