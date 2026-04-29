-- 创建收货记录 RPC
-- 功能：从 ASN 创建收货记录，包含完整的事务处理和校验
-- 作者：系统
-- 日期：2026-04-17

CREATE OR REPLACE FUNCTION create_receiving_from_asn(
  p_shipment_id INTEGER,
  p_receiving_no TEXT,
  p_receiving_date DATE,
  p_receiver_id UUID,
  p_items JSONB, -- 格式: [{"shipment_item_id": 1, "received_qty": 100, "remarks": "备注"}]
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shipment RECORD;
  v_receiving_id INTEGER;
  v_has_variance BOOLEAN := FALSE;
  v_item JSONB;
  v_shipment_item RECORD;
  v_variance_type TEXT;
  v_disposition_no TEXT;
BEGIN
  -- 1. 校验 shipment_id 存在
  SELECT * INTO v_shipment
  FROM asn_shipments
  WHERE id = p_shipment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ASN_NOT_FOUND',
      'message', 'ASN 不存在'
    );
  END IF;

  -- 2. 校验 ASN 状态可收货（只允许 arrived 状态）
  IF v_shipment.status != 'arrived' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ASN_STATUS_INVALID',
      'message', '当前 ASN 状态不允许创建收货记录',
      'current_status', v_shipment.status
    );
  END IF;

  -- 3. 校验 ASN 明细不为空
  IF NOT EXISTS (
    SELECT 1 FROM asn_shipment_items WHERE shipment_id = p_shipment_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ASN_NO_ITEMS',
      'message', '该 ASN 没有明细数据，无法创建收货记录'
    );
  END IF;

  -- 4. 校验不存在有效收货记录
  IF EXISTS (
    SELECT 1 FROM receiving_records
    WHERE shipment_id = p_shipment_id
    AND status != 'cancelled'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'RECEIVING_EXISTS',
      'message', '该 ASN 已存在有效收货记录，不能重复创建'
    );
  END IF;

  -- 5. 检查是否有差异
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_shipment_item
    FROM asn_shipment_items
    WHERE id = (v_item->>'shipment_item_id')::INTEGER;

    IF v_shipment_item.shipped_qty != (v_item->>'received_qty')::NUMERIC THEN
      v_has_variance := TRUE;
      EXIT;
    END IF;
  END LOOP;

  -- 6. 创建收货主记录
  INSERT INTO receiving_records (
    receiving_no,
    receiving_code,
    shipment_id,
    tenant_id,
    factory_id,
    receiving_date,
    receiver_id,
    received_packages,
    status,
    notes,
    has_variance,
    variance_resolved,
    iqc_required,
    iqc_completed
  ) VALUES (
    p_receiving_no,
    p_receiving_no,
    p_shipment_id,
    'JP',
    'JP-MICROTEC',
    p_receiving_date,
    p_receiver_id,
    v_shipment.total_boxes,
    CASE WHEN v_has_variance THEN 'variance_pending' ELSE 'completed' END,
    p_notes,
    v_has_variance,
    FALSE,
    TRUE,
    FALSE
  )
  RETURNING id INTO v_receiving_id;

  -- 7. 创建收货明细
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_shipment_item
    FROM asn_shipment_items
    WHERE id = (v_item->>'shipment_item_id')::INTEGER;

    -- 计算差异类型
    IF v_shipment_item.shipped_qty = (v_item->>'received_qty')::NUMERIC THEN
      v_variance_type := 'matched';
    ELSIF (v_item->>'received_qty')::NUMERIC < v_shipment_item.shipped_qty THEN
      v_variance_type := 'shortage';
    ELSE
      v_variance_type := 'overage';
    END IF;

    INSERT INTO receiving_record_items (
      receiving_id,
      shipment_item_id,
      line_no,
      part_no,
      part_name,
      batch_no,
      box_no,
      expected_qty,
      received_qty,
      variance_type,
      unit,
      remarks
    ) VALUES (
      v_receiving_id,
      v_shipment_item.id,
      v_shipment_item.line_no,
      v_shipment_item.part_no,
      v_shipment_item.part_name,
      COALESCE(v_shipment_item.batch_no, v_item->>'batch_no'),
      COALESCE(v_shipment_item.box_no, v_item->>'box_no'),
      v_shipment_item.shipped_qty,
      (v_item->>'received_qty')::NUMERIC,
      v_variance_type,
      v_shipment_item.unit,
      v_item->>'remarks'
    );

    -- 8. 如有差异，创建处置单
    IF v_variance_type != 'matched' THEN
      v_disposition_no := 'DISP-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || 
                          LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT, 10, '0') || '-' || 
                          v_shipment_item.line_no::TEXT;

      INSERT INTO incoming_material_dispositions (
        disposition_no,
        source_type,
        source_id,
        receiving_id,
        part_no,
        part_name,
        batch_no,
        affected_qty,
        disposition_type,
        disposition_status,
        approve_required,
        block_reason,
        created_by
      ) VALUES (
        v_disposition_no,
        'receiving_variance',
        v_receiving_id,
        v_receiving_id,
        v_shipment_item.part_no,
        v_shipment_item.part_name,
        COALESCE(v_shipment_item.batch_no, v_item->>'batch_no'),
        ABS(v_shipment_item.shipped_qty - (v_item->>'received_qty')::NUMERIC),
        CASE WHEN v_variance_type = 'shortage' THEN 'return' ELSE 'hold' END,
        'pending',
        TRUE,
        '收货差异: 预期' || v_shipment_item.shipped_qty || v_shipment_item.unit || 
        ', 实收' || (v_item->>'received_qty')::NUMERIC || v_shipment_item.unit,
        p_receiver_id
      );
    END IF;
  END LOOP;

  -- 9. 更新 ASN 状态为 received
  UPDATE asn_shipments
  SET status = 'received',
      updated_at = NOW()
  WHERE id = p_shipment_id;

  -- 10. 返回成功结果
  RETURN jsonb_build_object(
    'success', true,
    'receiving_id', v_receiving_id,
    'has_variance', v_has_variance
  );

EXCEPTION
  WHEN OTHERS THEN
    -- 事务会自动回滚
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INTERNAL_ERROR',
      'message', SQLERRM
    );
END;
$$;

-- 授权
GRANT EXECUTE ON FUNCTION create_receiving_from_asn TO authenticated;

COMMENT ON FUNCTION create_receiving_from_asn IS '从 ASN 创建收货记录（包含完整事务处理）';
