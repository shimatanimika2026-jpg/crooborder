-- 添加缺失的关联字段到 operation_exceptions 表

ALTER TABLE operation_exceptions
ADD COLUMN IF NOT EXISTS related_plan_id BIGINT,
ADD COLUMN IF NOT EXISTS related_shipment_id BIGINT,
ADD COLUMN IF NOT EXISTS related_aging_test_id BIGINT,
ADD COLUMN IF NOT EXISTS related_final_test_id BIGINT,
ADD COLUMN IF NOT EXISTS related_iqc_id BIGINT,
ADD COLUMN IF NOT EXISTS related_disposition_id BIGINT,
ADD COLUMN IF NOT EXISTS related_qa_release_id BIGINT,
ADD COLUMN IF NOT EXISTS related_shipment_confirmation_id BIGINT,
ADD COLUMN IF NOT EXISTS source_record_id BIGINT;

-- 添加注释
COMMENT ON COLUMN operation_exceptions.related_plan_id IS '关联的生产计划ID';
COMMENT ON COLUMN operation_exceptions.related_shipment_id IS '关联的出货ID';
COMMENT ON COLUMN operation_exceptions.related_aging_test_id IS '关联的老化测试ID';
COMMENT ON COLUMN operation_exceptions.related_final_test_id IS '关联的最终测试ID';
COMMENT ON COLUMN operation_exceptions.related_iqc_id IS '关联的IQC检验ID';
COMMENT ON COLUMN operation_exceptions.related_disposition_id IS '关联的特采ID';
COMMENT ON COLUMN operation_exceptions.related_qa_release_id IS '关联的QA放行ID';
COMMENT ON COLUMN operation_exceptions.related_shipment_confirmation_id IS '关联的出货确认ID';
COMMENT ON COLUMN operation_exceptions.source_record_id IS '来源记录ID';