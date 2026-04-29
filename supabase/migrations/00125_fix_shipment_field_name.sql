-- 修复execute_qa_release函数中的字段名
CREATE OR REPLACE FUNCTION execute_qa_release(
  p_release_id BIGINT,
  p_release_status TEXT,
  p_remarks TEXT,
  p_block_reason TEXT,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_release RECORD;
  v_exception_id BIGINT;
  v_existing_shipment BIGINT;
  v_shipment_id BIGINT;
BEGIN
  -- 获取放行记录
  SELECT * INTO v_release 
  FROM qa_releases 
  WHERE id = p_release_id 
    AND tenant_id = p_tenant_id;
  
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'QA 放行记录不存在'; 
  END IF;
  
  -- 更新放行状态
  UPDATE qa_releases 
  SET 
    release_status = p_release_status,
    released_at = NOW(),
    released_by = p_user_id,
    remarks = p_remarks,
    block_reason = p_block_reason,
    updated_at = NOW()
  WHERE id = p_release_id;
  
  -- 更新整机状态
  UPDATE finished_unit_traceability
  SET qa_release_status = p_release_status
  WHERE finished_product_sn = v_release.finished_product_sn;
  
  -- 如果被阻断,生成异常
  IF p_release_status = 'blocked' THEN
    v_exception_id := create_operation_exception(
      p_exception_type := 'qa_blocked',
      p_severity := 'high',
      p_source_module := 'qa',
      p_source_record_id := p_release_id,
      p_related_sn := v_release.finished_product_sn,
      p_related_qa_release_id := p_release_id,
      p_remarks := 'QA 放行被阻断: ' || COALESCE(p_block_reason, ''),
      p_tenant_id := p_tenant_id,
      p_reported_by := p_user_id
    );
  END IF;
  
  -- 如果放行通过，自动创建出货记录
  IF p_release_status = 'approved' THEN
    -- 检查是否已有出货记录
    SELECT id INTO v_existing_shipment
    FROM shipments
    WHERE finished_product_sn = v_release.finished_product_sn
    LIMIT 1;
    
    IF v_existing_shipment IS NULL THEN
      -- 创建出货记录
      INSERT INTO shipments (
        shipment_code,
        finished_product_sn,
        shipment_status,
        tenant_id,
        created_by,
        created_at
      ) VALUES (
        'SHIP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('shipments_id_seq')::TEXT, 6, '0'),
        v_release.finished_product_sn,
        'pending',
        p_tenant_id,
        p_user_id,
        NOW()
      )
      RETURNING id INTO v_shipment_id;
      
      -- 更新整机状态
      UPDATE finished_unit_traceability
      SET shipment_status = 'pending'
      WHERE finished_product_sn = v_release.finished_product_sn;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;