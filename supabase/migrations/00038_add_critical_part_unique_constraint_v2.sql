-- 先添加 receiving_record_item_id 字段（如果不存在）
ALTER TABLE assembly_part_material_mapping
ADD COLUMN IF NOT EXISTS receiving_record_item_id BIGINT REFERENCES receiving_record_items(id) ON DELETE SET NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_assembly_mapping_receiving_item ON assembly_part_material_mapping(receiving_record_item_id);

-- 添加关键件唯一绑定约束
-- 确保控制箱、示教器、主板、伺服驱动器等关键件只能被一台整机使用
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_critical_part_binding 
ON assembly_part_material_mapping(receiving_record_item_id)
WHERE part_type IN ('control_box', 'teach_pendant', 'main_board', 'servo_driver', 'power_supply', 'controller', 'pendant') 
AND is_consumed = TRUE
AND receiving_record_item_id IS NOT NULL;

-- 添加注释
COMMENT ON COLUMN assembly_part_material_mapping.receiving_record_item_id IS '收货明细ID';
COMMENT ON INDEX idx_unique_critical_part_binding IS '关键件唯一绑定约束：确保控制箱、示教器、主板等关键件只能被一台整机使用';