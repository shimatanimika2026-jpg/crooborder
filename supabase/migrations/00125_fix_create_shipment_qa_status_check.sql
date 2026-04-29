-- 修复 create_shipment 函数中的 QA 放行状态检查
-- 问题: 函数检查 'released' 但实际状态是 'approved'

DROP FUNCTION IF EXISTS create_shipment(TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION create_shipment(
  p_finished_product_sn TEXT,
  p_tenant_id TEXT,
  p_user_id UUID
)
RETURNS BIGINT AS $$
DECLARE
  v_shipment_id BIGINT;
  v_release_status TEXT;
  v_shipment_code TEXT;
BEGIN
  -- 检查 QA 放行状态 (修复: 应该是 'approved' 而不是 'released')
  SELECT release_status INTO v_release_status 
  FROM qa_releases 
  WHERE finished_product_sn = p_finished_product_sn 
    AND tenant_id = p_tenant_id 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF v_release_status IS NULL THEN 
    RAISE EXCEPTION '未找到 QA 放行记录'; 
  END IF;
  
  IF v_release_status != 'approved' THEN 
    RAISE EXCEPTION 'QA 未批准，无法创建出货记录'; 
  END IF;
  
  -- 生成出货编号
  v_shipment_code := 'SHIP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('shipments_id_seq')::TEXT, 6, '0');
  
  -- 创建出货记录
  INSERT INTO shipments (
    shipment_code, 
    finished_product_sn, 
    shipment_status, 
    tenant_id,
    created_by,
    created_at,
    updated_at
  ) 
  VALUES (
    v_shipment_code, 
    p_finished_product_sn, 
    'pending', 
    p_tenant_id,
    p_user_id,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_shipment_id;
  
  RETURN v_shipment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_shipment IS '创建出货记录 (前置条件: QA 放行状态为 approved)';
