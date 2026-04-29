-- 扩展 receiving_record_items 表，添加库存数量字段
ALTER TABLE receiving_record_items
ADD COLUMN IF NOT EXISTS on_hand_qty DECIMAL(10,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS available_qty DECIMAL(10,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS reserved_qty DECIMAL(10,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS consumed_qty DECIMAL(10,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS blocked_qty DECIMAL(10,2) DEFAULT 0 NOT NULL;

-- 添加注释
COMMENT ON COLUMN receiving_record_items.on_hand_qty IS '实际库存数量';
COMMENT ON COLUMN receiving_record_items.available_qty IS '可用数量（on_hand - reserved - blocked）';
COMMENT ON COLUMN receiving_record_items.reserved_qty IS '预占数量（已选择但未消耗）';
COMMENT ON COLUMN receiving_record_items.consumed_qty IS '已消耗数量';
COMMENT ON COLUMN receiving_record_items.blocked_qty IS '冻结数量（IQC NG/HOLD）';

-- 初始化现有数据：将 received_qty 同步到 on_hand_qty 和 available_qty
UPDATE receiving_record_items
SET 
  on_hand_qty = COALESCE(received_qty, 0),
  available_qty = COALESCE(received_qty, 0)
WHERE on_hand_qty = 0;