-- 创建预占时更新库存的函数
CREATE OR REPLACE FUNCTION update_inventory_on_reserve(
  p_receiving_item_id BIGINT,
  p_reserved_qty DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE receiving_record_items
  SET 
    reserved_qty = reserved_qty + p_reserved_qty,
    available_qty = available_qty - p_reserved_qty,
    updated_at = NOW()
  WHERE id = p_receiving_item_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '收货记录不存在';
  END IF;
END;
$$;

-- 创建消耗时更新库存的函数
CREATE OR REPLACE FUNCTION update_inventory_on_consume(
  p_receiving_item_id BIGINT,
  p_consumed_qty DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE receiving_record_items
  SET 
    reserved_qty = reserved_qty - p_consumed_qty,
    consumed_qty = consumed_qty + p_consumed_qty,
    updated_at = NOW()
  WHERE id = p_receiving_item_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '收货记录不存在';
  END IF;
END;
$$;

-- 创建释放时更新库存的函数
CREATE OR REPLACE FUNCTION update_inventory_on_release(
  p_receiving_item_id BIGINT,
  p_released_qty DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE receiving_record_items
  SET 
    reserved_qty = reserved_qty - p_released_qty,
    available_qty = available_qty + p_released_qty,
    updated_at = NOW()
  WHERE id = p_receiving_item_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '收货记录不存在';
  END IF;
END;
$$;