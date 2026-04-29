
-- 为receiving_records表添加receiving_no字段并统一命名

-- 添加receiving_no字段
ALTER TABLE receiving_records
ADD COLUMN IF NOT EXISTS receiving_no VARCHAR(50) UNIQUE;

-- 为已有数据生成receiving_no (基于receiving_code)
UPDATE receiving_records
SET receiving_no = receiving_code
WHERE receiving_no IS NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_receiving_records_no ON receiving_records(receiving_no);

COMMENT ON COLUMN receiving_records.receiving_no IS '收货单号(统一使用此字段)';
