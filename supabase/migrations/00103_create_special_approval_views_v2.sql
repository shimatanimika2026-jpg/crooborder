-- 创建特采审批效率视图
CREATE OR REPLACE VIEW view_special_approval_efficiency AS
SELECT 
  sar.id AS request_id,
  sar.request_code,
  sar.defect_category,
  sar.status,
  sar.created_at AS request_time,
  MAX(saw.approval_time) AS final_approval_time,
  EXTRACT(EPOCH FROM (MAX(saw.approval_time) - sar.created_at)) / 3600 AS approval_duration_hours,
  COUNT(saw.id) AS approval_stages_count,
  sar.tenant_id
FROM special_approval_requests sar
LEFT JOIN special_approval_workflows saw ON sar.id = saw.request_id
WHERE sar.status IN ('approved', 'rejected')
GROUP BY sar.id, sar.request_code, sar.defect_category, sar.status, sar.created_at, sar.tenant_id;

COMMENT ON VIEW view_special_approval_efficiency IS '特采审批效率视图';

-- 创建供应商质量趋势视图
CREATE OR REPLACE VIEW view_supplier_quality_trend AS
SELECT 
  sqr.supplier_id,
  s.supplier_name,
  sqr.rating_period_start,
  sqr.rating_period_end,
  sqr.incoming_pass_rate,
  sqr.special_approval_rate,
  sqr.major_complaint_count,
  sqr.capa_response_rate,
  sqr.capa_effectiveness_rate,
  sqr.total_score,
  sqr.rating_level,
  sqr.tenant_id
FROM supplier_quality_ratings sqr
JOIN suppliers s ON sqr.supplier_id = s.id
ORDER BY sqr.supplier_id, sqr.rating_period_start DESC;

COMMENT ON VIEW view_supplier_quality_trend IS '供应商质量趋势视图';