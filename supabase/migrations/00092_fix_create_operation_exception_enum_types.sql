-- 修复 create_operation_exception 函数的枚举类型转换

DROP FUNCTION IF EXISTS create_operation_exception(VARCHAR, VARCHAR, VARCHAR, BIGINT, VARCHAR, BIGINT, BIGINT, BIGINT, BIGINT, BIGINT, BIGINT, BIGINT, BIGINT, BIGINT, UUID, UUID, DATE, TEXT, VARCHAR, VARCHAR);

CREATE OR REPLACE FUNCTION create_operation_exception(
  p_exception_type TEXT,
  p_severity TEXT,
  p_source_module TEXT,
  p_source_record_id BIGINT,
  p_related_sn TEXT DEFAULT NULL,
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
  p_tenant_id TEXT DEFAULT NULL,
  p_factory_id TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exception_id BIGINT;
  v_tenant_id TEXT;
  v_exception_code TEXT;
BEGIN
  -- 如果未指定 tenant_id，使用当前用户的 tenant_id
  IF p_tenant_id IS NULL THEN
    SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid();
  ELSE
    v_tenant_id := p_tenant_id;
  END IF;
  
  -- 生成异常编号
  v_exception_code := 'EXC-' || UPPER(SUBSTRING(p_source_module, 1, 3)) || '-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('operation_exceptions_id_seq')::TEXT, 6, '0');
  
  -- 插入异常记录 (使用显式类型转换)
  INSERT INTO operation_exceptions (
    exception_code,
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
    reporter_id,
    reported_at,
    title,
    description,
    tenant_id,
    current_status
  ) VALUES (
    v_exception_code,
    p_exception_type::exception_type,
    p_severity::severity_level,
    p_source_module::source_module_type,
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
    COALESCE(p_remarks, '异常: ' || p_exception_type),
    COALESCE(p_remarks, ''),
    v_tenant_id,
    'open'::exception_status
  )
  RETURNING id INTO v_exception_id;
  
  RETURN v_exception_id;
END;
$$;