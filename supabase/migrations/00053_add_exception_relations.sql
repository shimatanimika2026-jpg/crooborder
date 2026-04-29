-- P2: 补充异常中心关联字段

-- 1. 添加更多关联字段
ALTER TABLE operation_exceptions
ADD COLUMN IF NOT EXISTS related_iqc_id BIGINT REFERENCES quality_inspections(id),
ADD COLUMN IF NOT EXISTS related_disposition_id BIGINT REFERENCES material_dispositions(id),
ADD COLUMN IF NOT EXISTS related_qa_release_id BIGINT,
ADD COLUMN IF NOT EXISTS related_shipment_confirmation_id BIGINT;

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_operation_exceptions_related_iqc_id ON operation_exceptions(related_iqc_id);
CREATE INDEX IF NOT EXISTS idx_operation_exceptions_related_disposition_id ON operation_exceptions(related_disposition_id);

COMMENT ON COLUMN operation_exceptions.related_iqc_id IS '关联IQC检验记录ID';
COMMENT ON COLUMN operation_exceptions.related_disposition_id IS '关联物料处置记录ID';
COMMENT ON COLUMN operation_exceptions.related_qa_release_id IS '关联QA放行记录ID';
COMMENT ON COLUMN operation_exceptions.related_shipment_confirmation_id IS '关联出货确认记录ID';
