
-- 为receiving_records添加shipment_id字段,正式关联asn_shipments

-- 添加shipment_id字段
ALTER TABLE receiving_records
ADD COLUMN IF NOT EXISTS shipment_id BIGINT;

-- 添加外键约束
ALTER TABLE receiving_records
ADD CONSTRAINT fk_receiving_records_shipment_id
FOREIGN KEY (shipment_id) REFERENCES asn_shipments(id)
ON DELETE SET NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_receiving_records_shipment_id ON receiving_records(shipment_id);

COMMENT ON COLUMN receiving_records.shipment_id IS '关联的ASN发货单ID';
COMMENT ON COLUMN receiving_records.shipping_id IS '关联的旧物流订单ID(兼容旧数据)';
