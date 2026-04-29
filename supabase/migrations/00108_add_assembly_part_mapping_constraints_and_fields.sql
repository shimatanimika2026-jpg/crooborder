-- 添加assembly_part_material_mapping表的约束和字段

-- 1. 添加part_sn字段(关键件序列号)
ALTER TABLE assembly_part_material_mapping 
ADD COLUMN IF NOT EXISTS part_sn TEXT;

-- 2. 添加receiving_record_item_id字段(来料记录项ID)
ALTER TABLE assembly_part_material_mapping 
ADD COLUMN IF NOT EXISTS receiving_record_item_id BIGINT REFERENCES receiving_record_items(id) ON DELETE RESTRICT;

-- 3. 添加UNIQUE(part_sn, part_type)约束,防止同一关键件序列号重复绑定
-- 注意: part_sn可能为NULL,所以使用部分唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_assembly_part_mapping_unique_part_sn 
ON assembly_part_material_mapping(part_sn, part_type) 
WHERE part_sn IS NOT NULL;

-- 4. 添加UNIQUE(receiving_record_item_id, part_type)约束,防止同一来料记录项重复绑定
-- 注意: receiving_record_item_id可能为NULL,所以使用部分唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_assembly_part_mapping_unique_receiving_item 
ON assembly_part_material_mapping(receiving_record_item_id, part_type) 
WHERE receiving_record_item_id IS NOT NULL;

-- 5. 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_assembly_part_mapping_part_sn 
ON assembly_part_material_mapping(part_sn) 
WHERE part_sn IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assembly_part_mapping_receiving_item 
ON assembly_part_material_mapping(receiving_record_item_id) 
WHERE receiving_record_item_id IS NOT NULL;

COMMENT ON COLUMN assembly_part_material_mapping.part_sn IS '关键件序列号(防止重复绑定)';
COMMENT ON COLUMN assembly_part_material_mapping.receiving_record_item_id IS '来料记录项ID(防止重复绑定)';