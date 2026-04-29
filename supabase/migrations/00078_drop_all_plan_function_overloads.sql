-- 删除所有生产计划函数的重载

DROP FUNCTION IF EXISTS submit_plan_for_approval(BIGINT, TEXT, UUID);
DROP FUNCTION IF EXISTS approve_production_plan(BIGINT, UUID, TEXT);
DROP FUNCTION IF EXISTS approve_production_plan(BIGINT, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS reject_production_plan(BIGINT, UUID, TEXT);
DROP FUNCTION IF EXISTS reject_production_plan(BIGINT, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS activate_production_plan(BIGINT, UUID);
DROP FUNCTION IF EXISTS activate_production_plan(BIGINT, TEXT, UUID);
DROP FUNCTION IF EXISTS close_production_plan(BIGINT, UUID, TEXT);
DROP FUNCTION IF EXISTS close_production_plan(BIGINT, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS get_plan_execution_progress(BIGINT);