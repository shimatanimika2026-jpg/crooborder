-- 添加组装完成时间字段
ALTER TABLE finished_unit_traceability
ADD COLUMN IF NOT EXISTS assembly_completed_at TIMESTAMPTZ;