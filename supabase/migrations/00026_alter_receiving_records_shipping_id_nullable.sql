
-- 将shipping_id改为可空,因为新的来料控制链不一定关联原有shipping_orders
ALTER TABLE receiving_records ALTER COLUMN shipping_id DROP NOT NULL;

COMMENT ON COLUMN receiving_records.shipping_id IS '关联的物流订单ID(可选,兼容旧数据)';
