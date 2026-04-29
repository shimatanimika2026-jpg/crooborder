-- 创建生产计划执行概览视图
CREATE OR REPLACE VIEW view_production_plan_overview AS
SELECT 
    pp.id AS plan_id,
    pp.plan_code,
    pp.plan_type,
    pp.production_quantity,
    pp.status AS plan_status,
    COUNT(DISTINCT po.id) AS total_orders,
    COUNT(DISTINCT CASE WHEN po.status = 'completed' THEN po.id END) AS completed_orders,
    COALESCE(SUM(po.production_quantity), 0) AS total_production_quantity,
    COALESCE(SUM(CASE WHEN po.status = 'completed' THEN po.production_quantity ELSE 0 END), 0) AS completed_quantity,
    ROUND(COALESCE(SUM(CASE WHEN po.status = 'completed' THEN po.production_quantity ELSE 0 END) * 100.0 / NULLIF(pp.production_quantity, 0), 0), 2) AS completion_rate
FROM production_plans pp
LEFT JOIN production_orders po ON pp.id = po.plan_id
GROUP BY pp.id, pp.plan_code, pp.plan_type, pp.production_quantity, pp.status;

COMMENT ON VIEW view_production_plan_overview IS '生产计划执行概览视图';

-- 创建质量合格率统计视图
CREATE OR REPLACE VIEW view_quality_qualification_rate AS
SELECT 
    qi.order_id,
    po.order_code,
    po.part_name,
    COUNT(qi.id) AS total_inspections,
    SUM(qi.qualified_quantity) AS total_qualified,
    SUM(qi.defective_quantity) AS total_defective,
    ROUND(AVG(qi.qualification_rate), 2) AS avg_qualification_rate,
    qi.tenant_id
FROM quality_inspections qi
JOIN production_orders po ON qi.order_id = po.id
GROUP BY qi.order_id, po.order_code, po.part_name, qi.tenant_id;

COMMENT ON VIEW view_quality_qualification_rate IS '质量合格率统计视图';

-- 创建库存实时状态物化视图
CREATE MATERIALIZED VIEW materialized_view_inventory_status AS
SELECT 
    ir.id AS inventory_id,
    ir.material_code,
    ir.material_name,
    ir.material_type,
    ir.warehouse_location,
    ir.current_quantity,
    ir.safety_stock_threshold,
    ir.tenant_id,
    CASE 
        WHEN ir.current_quantity = 0 THEN 'out_of_stock'
        WHEN ir.current_quantity <= ir.safety_stock_threshold THEN 'low_stock'
        ELSE 'normal'
    END AS stock_status,
    ir.updated_at
FROM inventory_records ir;

CREATE UNIQUE INDEX idx_mv_inventory_status_id ON materialized_view_inventory_status(inventory_id);
CREATE INDEX idx_mv_inventory_status_material ON materialized_view_inventory_status(material_code);
CREATE INDEX idx_mv_inventory_status_tenant ON materialized_view_inventory_status(tenant_id);
CREATE INDEX idx_mv_inventory_status_status ON materialized_view_inventory_status(stock_status);

COMMENT ON MATERIALIZED VIEW materialized_view_inventory_status IS '库存实时状态物化视图（建议每5分钟刷新）';

-- 创建异常处理时效统计视图
CREATE OR REPLACE VIEW view_anomaly_handling_efficiency AS
SELECT 
    aa.id AS anomaly_id,
    aa.task_id,
    aa.anomaly_type,
    aa.status,
    aa.occurred_at,
    aa.resolved_at,
    EXTRACT(EPOCH FROM (aa.resolved_at - aa.occurred_at)) / 3600 AS handling_hours,
    CASE 
        WHEN aa.resolved_at IS NULL THEN 'pending'
        WHEN EXTRACT(EPOCH FROM (aa.resolved_at - aa.occurred_at)) / 3600 <= 4 THEN 'on_time'
        ELSE 'delayed'
    END AS handling_timeliness,
    aa.tenant_id
FROM assembly_anomalies aa
WHERE aa.status IN ('resolved', 'closed');

COMMENT ON VIEW view_anomaly_handling_efficiency IS '异常处理时效统计视图';

-- 创建物流在途货物实时视图
CREATE OR REPLACE VIEW view_logistics_in_transit AS
SELECT 
    so.id AS shipping_id,
    so.shipping_code,
    so.shipping_date,
    lt.tracking_number,
    lt.logistics_company,
    lt.current_location,
    lt.current_status,
    lt.estimated_arrival_date,
    lt.gps_latitude,
    lt.gps_longitude,
    lt.last_updated_at,
    CASE 
        WHEN lt.estimated_arrival_date < CURRENT_DATE AND so.status != 'arrived' THEN 'delayed'
        ELSE 'on_schedule'
    END AS delivery_status
FROM shipping_orders so
JOIN logistics_tracking lt ON so.id = lt.shipping_id
WHERE so.status IN ('shipped', 'in_transit', 'customs');

COMMENT ON VIEW view_logistics_in_transit IS '物流在途货物实时视图';

-- 插入示例库存数据
INSERT INTO inventory_records (material_code, material_name, material_type, warehouse_location, current_quantity, safety_stock_threshold, unit, unit_price, tenant_id) VALUES
('PART-001', '机械臂关节', 'component', 'CN-WH-A01', 1000, 200, '个', 150.00, 'CN'),
('PART-002', '控制器主板', 'component', 'CN-WH-A02', 500, 100, '个', 800.00, 'CN'),
('PART-003', '电机驱动器', 'component', 'CN-WH-A03', 800, 150, '个', 300.00, 'CN'),
('PART-004', '传感器模块', 'component', 'JP-WH-B01', 300, 50, '个', 200.00, 'JP'),
('PART-005', '电缆组件', 'component', 'JP-WH-B02', 1500, 300, '套', 50.00, 'JP');

-- 插入示例生产订单数据
INSERT INTO production_orders (order_code, plan_id, part_name, part_code, production_quantity, planned_start_date, planned_end_date, status, tenant_id) VALUES
('PO-2026-001', 1, '机械臂关节', 'PART-001', 1000, '2026-04-20', '2026-05-10', 'pending', 'CN'),
('PO-2026-002', 1, '控制器主板', 'PART-002', 500, '2026-04-25', '2026-05-15', 'pending', 'CN');