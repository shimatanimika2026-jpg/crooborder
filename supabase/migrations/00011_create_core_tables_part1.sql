-- 1. 产品型号主数据表
CREATE TABLE IF NOT EXISTS product_models (
  id SERIAL PRIMARY KEY,
  model_code TEXT UNIQUE NOT NULL,
  model_name TEXT NOT NULL,
  payload_kg DECIMAL(10,2) NOT NULL,
  reach_mm INTEGER NOT NULL,
  bom_version TEXT NOT NULL,
  active_flag BOOLEAN NOT NULL DEFAULT true,
  aging_required_hours INTEGER NOT NULL DEFAULT 48,
  description TEXT,
  tenant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO product_models (model_code, model_name, payload_kg, reach_mm, bom_version, tenant_id) VALUES
('FR3', 'FAIRINO FR3 协作机器人', 3.00, 625, 'V1.0', 'BOTH'),
('FR5', 'FAIRINO FR5 协作机器人', 5.00, 900, 'V1.0', 'BOTH')
ON CONFLICT (model_code) DO NOTHING;

-- 2. 整机追溯表
CREATE TABLE IF NOT EXISTS finished_unit_traceability (
  id SERIAL PRIMARY KEY,
  finished_product_sn TEXT UNIQUE NOT NULL,
  product_model_id INTEGER NOT NULL REFERENCES product_models(id),
  control_box_sn TEXT NOT NULL,
  teaching_pendant_sn TEXT NOT NULL,
  main_board_sn TEXT,
  motor_sn_j1 TEXT,
  motor_sn_j2 TEXT,
  motor_sn_j3 TEXT,
  motor_sn_j4 TEXT,
  motor_sn_j5 TEXT,
  motor_sn_j6 TEXT,
  firmware_version TEXT,
  software_version TEXT,
  binding_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  binding_operator_id UUID REFERENCES profiles(id),
  assembly_order_id INTEGER,
  production_order_id INTEGER REFERENCES production_orders(id),
  aging_required BOOLEAN NOT NULL DEFAULT true,
  aging_status TEXT DEFAULT 'pending' CHECK (aging_status IN ('pending', 'running', 'passed', 'failed', 'waived')),
  aging_passed_at TIMESTAMPTZ,
  final_test_status TEXT DEFAULT 'pending' CHECK (final_test_status IN ('pending', 'in_progress', 'passed', 'failed')),
  final_test_passed_at TIMESTAMPTZ,
  qa_release_status TEXT DEFAULT 'pending' CHECK (qa_release_status IN ('pending', 'approved', 'rejected', 'blocked')),
  qa_release_at TIMESTAMPTZ,
  qa_release_by UUID REFERENCES profiles(id),
  release_block_reason TEXT,
  shipment_status TEXT DEFAULT 'pending' CHECK (shipment_status IN ('pending', 'ready', 'shipped', 'blocked')),
  tenant_id TEXT NOT NULL CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
  factory_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 老化试验表
CREATE TABLE IF NOT EXISTS aging_tests (
  id SERIAL PRIMARY KEY,
  test_code TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
  factory_id TEXT NOT NULL,
  finished_product_sn TEXT NOT NULL REFERENCES finished_unit_traceability(finished_product_sn),
  product_model_id INTEGER NOT NULL REFERENCES product_models(id),
  control_box_sn TEXT NOT NULL,
  teaching_pendant_sn TEXT NOT NULL,
  aging_station_id INTEGER REFERENCES work_stations(id),
  aging_program_version TEXT,
  started_at TIMESTAMPTZ,
  planned_end_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  required_duration_hours INTEGER NOT NULL DEFAULT 48,
  actual_duration_hours DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'running', 'paused', 'interrupted', 'failed', 'passed', 'cancelled')),
  interruption_count INTEGER NOT NULL DEFAULT 0,
  last_interruption_reason_code TEXT,
  last_interruption_reason TEXT,
  last_interruption_at TIMESTAMPTZ,
  last_resume_at TIMESTAMPTZ,
  operator_id UUID REFERENCES profiles(id),
  qa_reviewer_id UUID REFERENCES profiles(id),
  result TEXT CHECK (result IN ('pass', 'fail', 'pending')),
  temperature_avg DECIMAL(5,2),
  humidity_avg DECIMAL(5,2),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. 老化试验日志表
CREATE TABLE IF NOT EXISTS aging_test_logs (
  id SERIAL PRIMARY KEY,
  aging_test_id INTEGER NOT NULL REFERENCES aging_tests(id) ON DELETE CASCADE,
  log_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  log_type TEXT NOT NULL CHECK (log_type IN ('start', 'pause', 'resume', 'interrupt', 'alarm', 'checkpoint', 'end')),
  status_snapshot TEXT NOT NULL,
  alarm_code TEXT,
  alarm_message TEXT,
  temperature DECIMAL(5,2),
  humidity DECIMAL(5,2),
  elapsed_hours DECIMAL(10,2),
  note TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. 异常记录表
CREATE TABLE IF NOT EXISTS quality_exceptions (
  id SERIAL PRIMARY KEY,
  exception_code TEXT UNIQUE NOT NULL,
  exception_type TEXT NOT NULL CHECK (exception_type IN ('receiving_discrepancy', 'iqc_failure', 'assembly_defect', 'aging_failure', 'final_test_failure', 'shipment_block', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  related_object_type TEXT NOT NULL CHECK (related_object_type IN ('production_order', 'finished_unit', 'batch', 'shipment')),
  related_object_id TEXT NOT NULL,
  finished_product_sn TEXT,
  product_model_id INTEGER REFERENCES product_models(id),
  description TEXT NOT NULL,
  root_cause TEXT,
  temporary_action TEXT,
  corrective_action TEXT,
  responsible_person_id UUID REFERENCES profiles(id),
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'action_taken', 'verified', 'closed', 'cancelled')),
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES profiles(id),
  tenant_id TEXT NOT NULL CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
  factory_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. cobot_devices表
CREATE TABLE IF NOT EXISTS cobot_devices (
  id SERIAL PRIMARY KEY,
  device_code TEXT UNIQUE NOT NULL,
  device_name TEXT NOT NULL,
  finished_product_sn TEXT REFERENCES finished_unit_traceability(finished_product_sn),
  product_model_id INTEGER REFERENCES product_models(id),
  current_firmware_version TEXT,
  production_line TEXT,
  factory_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_online_at TIMESTAMPTZ,
  tenant_id TEXT NOT NULL CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
