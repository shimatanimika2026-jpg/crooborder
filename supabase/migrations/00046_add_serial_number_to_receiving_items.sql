-- 添加序列号字段到 receiving_record_items 表
ALTER TABLE receiving_record_items
ADD COLUMN IF NOT EXISTS serial_number TEXT;

-- 添加注释
COMMENT ON COLUMN receiving_record_items.serial_number IS '关键件序列号（控制箱、示教器、主板等）';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_receiving_items_serial_number ON receiving_record_items(serial_number) WHERE serial_number IS NOT NULL;

-- 对于关键件，serial_number 必须唯一
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_critical_part_serial_number 
ON receiving_record_items(serial_number)
WHERE part_type IN ('control_box', 'teaching_pendant', 'main_board', 'servo_driver', 'power_supply', 'controller') 
AND serial_number IS NOT NULL;