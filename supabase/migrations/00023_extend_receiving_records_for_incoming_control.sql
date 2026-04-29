
-- 扩展receiving_records表以支持来料控制链

ALTER TABLE receiving_records
ADD COLUMN IF NOT EXISTS has_variance BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS variance_resolved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS iqc_required BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS iqc_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS factory_id VARCHAR(50);

-- 更新status字段约束
ALTER TABLE receiving_records DROP CONSTRAINT IF EXISTS receiving_records_status_check;
ALTER TABLE receiving_records ADD CONSTRAINT receiving_records_status_check 
CHECK (status IN ('draft', 'completed', 'variance_pending', 'variance_resolved', 'cancelled', 'preparing', 'shipped', 'in_transit', 'customs', 'arrived'));

COMMENT ON COLUMN receiving_records.has_variance IS '是否有收货差异';
COMMENT ON COLUMN receiving_records.variance_resolved IS '差异是否已解决';
COMMENT ON COLUMN receiving_records.iqc_required IS '是否需要IQC检验';
COMMENT ON COLUMN receiving_records.iqc_completed IS 'IQC检验是否已完成';
COMMENT ON COLUMN receiving_records.factory_id IS '收货工厂ID';
