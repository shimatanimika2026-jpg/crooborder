-- 为 receiving_record_items 表添加库存管理字段和 part_type 字段

-- 添加 part_type 字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receiving_record_items' AND column_name = 'part_type'
  ) THEN
    ALTER TABLE receiving_record_items
    ADD COLUMN part_type part_type;
  END IF;
END $$;

-- 添加库存管理字段
ALTER TABLE receiving_record_items
ADD COLUMN IF NOT EXISTS reserved_qty DECIMAL(10,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS available_qty DECIMAL(10,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS consumed_qty DECIMAL(10,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 初始化现有记录的 available_qty（等于 received_qty）
UPDATE receiving_record_items
SET available_qty = received_qty
WHERE available_qty = 0 AND received_qty > 0;

-- 创建触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_receiving_item_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_receiving_item_updated_at ON receiving_record_items;

CREATE TRIGGER trigger_update_receiving_item_updated_at
BEFORE UPDATE ON receiving_record_items
FOR EACH ROW
EXECUTE FUNCTION update_receiving_item_updated_at();

-- 创建触发器：自动初始化 available_qty
CREATE OR REPLACE FUNCTION init_receiving_item_available_qty()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- 如果 available_qty 未设置，自动设置为 received_qty
  IF NEW.available_qty IS NULL OR NEW.available_qty = 0 THEN
    NEW.available_qty := NEW.received_qty;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_init_receiving_item_available_qty ON receiving_record_items;

CREATE TRIGGER trigger_init_receiving_item_available_qty
BEFORE INSERT ON receiving_record_items
FOR EACH ROW
EXECUTE FUNCTION init_receiving_item_available_qty();

COMMENT ON COLUMN receiving_record_items.part_type IS '部件类型';
COMMENT ON COLUMN receiving_record_items.reserved_qty IS '预占数量';
COMMENT ON COLUMN receiving_record_items.available_qty IS '可用数量';
COMMENT ON COLUMN receiving_record_items.consumed_qty IS '已消耗数量';
COMMENT ON COLUMN receiving_record_items.updated_at IS '更新时间';
