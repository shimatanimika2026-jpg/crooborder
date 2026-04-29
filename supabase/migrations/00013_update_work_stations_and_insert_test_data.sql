-- 修复work_stations类型，添加aging
ALTER TABLE work_stations DROP CONSTRAINT IF EXISTS work_stations_station_type_check;
ALTER TABLE work_stations ADD CONSTRAINT work_stations_station_type_check 
  CHECK (station_type IN ('assembly', 'inspection', 'testing', 'aging', 'packaging', 'receiving', 'iqc', 'rework'));

-- 插入老化工位
INSERT INTO work_stations (station_code, station_name_zh, station_name_ja, station_type, production_line, tenant_id) VALUES
('AGING-01', '老化工位1', '老化ステーション1', 'aging', 'JP-LINE-A', 'JP'),
('AGING-02', '老化工位2', '老化ステーション2', 'aging', 'JP-LINE-A', 'JP'),
('AGING-03', '老化工位3', '老化ステーション3', 'aging', 'JP-LINE-B', 'JP')
ON CONFLICT (station_code) DO NOTHING;

-- 插入整机追溯数据
INSERT INTO finished_unit_traceability (
  finished_product_sn, product_model_id, control_box_sn, teaching_pendant_sn,
  firmware_version, software_version, tenant_id, factory_id
) VALUES
('FR3-2026-001', 1, 'CB-FR3-001', 'TP-FR3-001', 'FW-1.2.0', 'SW-2.1.0', 'JP', 'JP-FACTORY'),
('FR3-2026-002', 1, 'CB-FR3-002', 'TP-FR3-002', 'FW-1.2.0', 'SW-2.1.0', 'JP', 'JP-FACTORY'),
('FR5-2026-001', 2, 'CB-FR5-001', 'TP-FR5-001', 'FW-1.2.0', 'SW-2.1.0', 'JP', 'JP-FACTORY'),
('FR5-2026-002', 2, 'CB-FR5-002', 'TP-FR5-002', 'FW-1.2.0', 'SW-2.1.0', 'JP', 'JP-FACTORY')
ON CONFLICT (finished_product_sn) DO NOTHING;

-- 插入老化试验数据
INSERT INTO aging_tests (
  test_code, tenant_id, factory_id, finished_product_sn, product_model_id,
  control_box_sn, teaching_pendant_sn, aging_station_id, status,
  started_at, planned_end_at, required_duration_hours, actual_duration_hours, result
) VALUES
('AGING-FR3-001', 'JP', 'JP-FACTORY', 'FR3-2026-001', 1, 'CB-FR3-001', 'TP-FR3-001', 
 (SELECT id FROM work_stations WHERE station_code = 'AGING-01' LIMIT 1), 
 'passed', NOW() - INTERVAL '50 hours', NOW() - INTERVAL '2 hours', 48, 48.5, 'pass'),
('AGING-FR3-002', 'JP', 'JP-FACTORY', 'FR3-2026-002', 1, 'CB-FR3-002', 'TP-FR3-002',
 (SELECT id FROM work_stations WHERE station_code = 'AGING-02' LIMIT 1),
 'running', NOW() - INTERVAL '30 hours', NOW() + INTERVAL '18 hours', 48, NULL, 'pending'),
('AGING-FR5-001', 'JP', 'JP-FACTORY', 'FR5-2026-001', 2, 'CB-FR5-001', 'TP-FR5-001',
 (SELECT id FROM work_stations WHERE station_code = 'AGING-01' LIMIT 1),
 'interrupted', NOW() - INTERVAL '20 hours', NOW() + INTERVAL '28 hours', 48, 20.0, 'pending'),
('AGING-FR5-002', 'JP', 'JP-FACTORY', 'FR5-2026-002', 2, 'CB-FR5-002', 'TP-FR5-002',
 (SELECT id FROM work_stations WHERE station_code = 'AGING-03' LIMIT 1),
 'planned', NULL, NULL, 48, NULL, 'pending')
ON CONFLICT (test_code) DO NOTHING;

-- 更新老化通过的整机状态
UPDATE finished_unit_traceability 
SET aging_status = 'passed', aging_passed_at = NOW() - INTERVAL '2 hours'
WHERE finished_product_sn = 'FR3-2026-001';

UPDATE finished_unit_traceability 
SET aging_status = 'running'
WHERE finished_product_sn = 'FR3-2026-002';

UPDATE finished_unit_traceability 
SET aging_status = 'failed'
WHERE finished_product_sn = 'FR5-2026-001';

-- 插入老化日志
INSERT INTO aging_test_logs (aging_test_id, log_type, status_snapshot, temperature, humidity, elapsed_hours, note) VALUES
((SELECT id FROM aging_tests WHERE test_code = 'AGING-FR3-001'), 'start', 'running', 25.5, 45.0, 0, '开始48小时老化试验'),
((SELECT id FROM aging_tests WHERE test_code = 'AGING-FR3-001'), 'checkpoint', 'running', 26.0, 46.0, 24, '24小时检查点，运行正常'),
((SELECT id FROM aging_tests WHERE test_code = 'AGING-FR3-001'), 'end', 'passed', 25.8, 45.5, 48, '48小时老化完成，测试通过'),
((SELECT id FROM aging_tests WHERE test_code = 'AGING-FR5-001'), 'start', 'running', 25.0, 44.0, 0, '开始48小时老化试验'),
((SELECT id FROM aging_tests WHERE test_code = 'AGING-FR5-001'), 'interrupt', 'interrupted', 28.5, 50.0, 20, '温度异常，老化中断')
ON CONFLICT DO NOTHING;

-- 插入异常记录
INSERT INTO quality_exceptions (
  exception_code, exception_type, severity, related_object_type, related_object_id,
  finished_product_sn, product_model_id, description, status, tenant_id, factory_id
) VALUES
('EXC-2026-001', 'aging_failure', 'high', 'finished_unit', 'FR5-2026-001', 
 'FR5-2026-001', 2, '老化过程中温度超标，导致老化中断', 'investigating', 'JP', 'JP-FACTORY')
ON CONFLICT (exception_code) DO NOTHING;

-- 插入cobot_devices数据
INSERT INTO cobot_devices (device_code, device_name, finished_product_sn, product_model_id, current_firmware_version, factory_id, tenant_id) VALUES
('COBOT-FR3-001', 'FR3协作机器人-001', 'FR3-2026-001', 1, 'FW-1.2.0', 'JP-FACTORY', 'JP'),
('COBOT-FR3-002', 'FR3协作机器人-002', 'FR3-2026-002', 1, 'FW-1.2.0', 'JP-FACTORY', 'JP'),
('COBOT-FR5-001', 'FR5协作机器人-001', 'FR5-2026-001', 2, 'FW-1.2.0', 'JP-FACTORY', 'JP'),
('COBOT-FR5-002', 'FR5协作机器人-002', 'FR5-2026-002', 2, 'FW-1.2.0', 'JP-FACTORY', 'JP')
ON CONFLICT (device_code) DO NOTHING;
