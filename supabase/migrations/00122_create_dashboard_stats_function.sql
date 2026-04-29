
-- 创建首页看板统计函数
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  total_count int;
  in_production_count int;
  exception_count int;
  this_week_shipment_count int;
BEGIN
  -- 统计委托总数
  SELECT COUNT(*) INTO total_count
  FROM commissions;

  -- 统计生产中的委托数
  SELECT COUNT(*) INTO in_production_count
  FROM commissions
  WHERE status = 'in_production';

  -- 统计异常中的委托数
  SELECT COUNT(*) INTO exception_count
  FROM commissions
  WHERE status = 'exception';

  -- 统计本周待出货的委托数（目标交期在本周内的）
  SELECT COUNT(*) INTO this_week_shipment_count
  FROM commissions
  WHERE target_delivery_date >= date_trunc('week', CURRENT_DATE)
    AND target_delivery_date < date_trunc('week', CURRENT_DATE) + interval '1 week'
    AND status IN ('in_production', 'accepted');

  -- 构建返回结果
  result := json_build_object(
    'total', total_count,
    'in_production', in_production_count,
    'exception', exception_count,
    'this_week_shipment', this_week_shipment_count
  );

  RETURN result;
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION get_dashboard_stats() TO authenticated;
