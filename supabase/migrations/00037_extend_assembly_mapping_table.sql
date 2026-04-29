-- 扩展 assembly_part_material_mapping 表
ALTER TABLE assembly_part_material_mapping
ADD COLUMN IF NOT EXISTS reservation_id BIGINT REFERENCES material_reservations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_consumed BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ;

-- 添加注释
COMMENT ON COLUMN assembly_part_material_mapping.reservation_id IS '关联的预占记录ID';
COMMENT ON COLUMN assembly_part_material_mapping.is_consumed IS '是否已消耗';
COMMENT ON COLUMN assembly_part_material_mapping.consumed_at IS '消耗时间';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_assembly_mapping_reservation ON assembly_part_material_mapping(reservation_id);
CREATE INDEX IF NOT EXISTS idx_assembly_mapping_consumed ON assembly_part_material_mapping(is_consumed);