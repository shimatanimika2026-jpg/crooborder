-- 添加 part_type 字段到 receiving_record_items 表
ALTER TABLE receiving_record_items
ADD COLUMN IF NOT EXISTS part_type TEXT;

-- 添加注释
COMMENT ON COLUMN receiving_record_items.part_type IS '零件类型：control_box, teaching_pendant, main_board, servo_driver, power_supply, cable, etc.';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_receiving_items_part_type ON receiving_record_items(part_type);

-- 根据 part_name 或 part_no 推断 part_type（初始化现有数据）
UPDATE receiving_record_items
SET part_type = CASE
  WHEN part_name ILIKE '%控制箱%' OR part_name ILIKE '%controller%' OR part_name ILIKE '%control box%' THEN 'control_box'
  WHEN part_name ILIKE '%示教器%' OR part_name ILIKE '%teaching pendant%' OR part_name ILIKE '%pendant%' THEN 'teaching_pendant'
  WHEN part_name ILIKE '%主板%' OR part_name ILIKE '%main board%' OR part_name ILIKE '%motherboard%' THEN 'main_board'
  WHEN part_name ILIKE '%伺服%' OR part_name ILIKE '%servo%' THEN 'servo_driver'
  WHEN part_name ILIKE '%电源%' OR part_name ILIKE '%power%' THEN 'power_supply'
  WHEN part_name ILIKE '%电缆%' OR part_name ILIKE '%cable%' THEN 'cable'
  ELSE 'other'
END
WHERE part_type IS NULL;