-- 刷新库存状态物化视图
-- 问题：物化视图创建后需要手动刷新才能有数据

-- 刷新库存状态物化视图
REFRESH MATERIALIZED VIEW CONCURRENTLY materialized_view_inventory_status;

-- 创建自动刷新函数
CREATE OR REPLACE FUNCTION refresh_inventory_status_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY materialized_view_inventory_status;
END;
$$;

COMMENT ON FUNCTION refresh_inventory_status_view() IS '刷新库存状态物化视图';

-- 创建触发器函数：当 inventory_records 表有变化时自动刷新物化视图
CREATE OR REPLACE FUNCTION trigger_refresh_inventory_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 异步刷新物化视图（避免阻塞）
  PERFORM refresh_inventory_status_view();
  RETURN NULL;
END;
$$;

-- 创建触发器：inventory_records 表变化时刷新视图
DROP TRIGGER IF EXISTS trg_refresh_inventory_status_on_insert ON inventory_records;
CREATE TRIGGER trg_refresh_inventory_status_on_insert
AFTER INSERT OR UPDATE OR DELETE ON inventory_records
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_inventory_status();

COMMENT ON TRIGGER trg_refresh_inventory_status_on_insert ON inventory_records IS '库存记录变化时自动刷新物化视图';
