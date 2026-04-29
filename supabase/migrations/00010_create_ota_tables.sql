-- 固件版本表
CREATE TABLE firmware_versions (
  id SERIAL PRIMARY KEY,
  version_code TEXT UNIQUE NOT NULL,
  version_name TEXT NOT NULL,
  firmware_type TEXT NOT NULL CHECK (firmware_type IN ('robot_firmware', 'app', 'controller')),
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_hash TEXT NOT NULL,
  release_notes_zh TEXT,
  release_notes_ja TEXT,
  is_stable BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  min_compatible_version TEXT,
  released_by UUID REFERENCES profiles(id),
  released_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OTA升级任务表
CREATE TABLE ota_tasks (
  id SERIAL PRIMARY KEY,
  task_code TEXT UNIQUE NOT NULL,
  task_name TEXT NOT NULL,
  firmware_version_id INTEGER NOT NULL REFERENCES firmware_versions(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'batch', 'single')),
  target_filter JSONB,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('immediate', 'scheduled')),
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  total_devices INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  rollback_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_rollback_on_failure BOOLEAN NOT NULL DEFAULT true,
  failure_threshold INTEGER NOT NULL DEFAULT 3,
  created_by UUID REFERENCES profiles(id),
  tenant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- 任务设备关联表
CREATE TABLE ota_task_devices (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES ota_tasks(id) ON DELETE CASCADE,
  device_id INTEGER NOT NULL,
  device_code TEXT NOT NULL,
  device_name TEXT NOT NULL,
  current_version TEXT NOT NULL,
  target_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'downloading', 'installing', 'verifying', 'success', 'failed', 'rolled_back')),
  progress INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  download_started_at TIMESTAMPTZ,
  install_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rollback_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OTA升级日志表
CREATE TABLE ota_logs (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES ota_tasks(id) ON DELETE CASCADE,
  device_id INTEGER NOT NULL,
  device_code TEXT NOT NULL,
  log_type TEXT NOT NULL CHECK (log_type IN ('info', 'warning', 'error', 'debug')),
  log_stage TEXT NOT NULL CHECK (log_stage IN ('pre_upgrade', 'downloading', 'installing', 'verifying', 'post_upgrade', 'rollback')),
  message TEXT NOT NULL,
  details JSONB,
  synced_to_japan BOOLEAN NOT NULL DEFAULT false,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 设备固件历史表
CREATE TABLE device_firmware_history (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL,
  device_code TEXT NOT NULL,
  firmware_version_id INTEGER NOT NULL REFERENCES firmware_versions(id),
  version_code TEXT NOT NULL,
  upgrade_type TEXT NOT NULL CHECK (upgrade_type IN ('ota', 'manual', 'rollback')),
  task_id INTEGER REFERENCES ota_tasks(id),
  previous_version TEXT,
  upgrade_duration INTEGER,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  tenant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_firmware_versions_type ON firmware_versions(firmware_type);
CREATE INDEX idx_firmware_versions_active ON firmware_versions(is_active);
CREATE INDEX idx_ota_tasks_status ON ota_tasks(status);
CREATE INDEX idx_ota_tasks_scheduled ON ota_tasks(scheduled_at);
CREATE INDEX idx_ota_task_devices_task ON ota_task_devices(task_id);
CREATE INDEX idx_ota_task_devices_status ON ota_task_devices(status);
CREATE INDEX idx_ota_logs_task ON ota_logs(task_id);
CREATE INDEX idx_ota_logs_synced ON ota_logs(synced_to_japan);
CREATE INDEX idx_device_firmware_history_device ON device_firmware_history(device_id);

-- RLS策略
ALTER TABLE firmware_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_task_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_firmware_history ENABLE ROW LEVEL SECURITY;

-- 管理员全权限
CREATE POLICY "Admins have full access to firmware_versions" ON firmware_versions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins have full access to ota_tasks" ON ota_tasks
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins have full access to ota_task_devices" ON ota_task_devices
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins have full access to ota_logs" ON ota_logs
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins have full access to device_firmware_history" ON device_firmware_history
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 普通用户只读
CREATE POLICY "Users can view firmware_versions" ON firmware_versions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view ota_tasks" ON ota_tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view ota_task_devices" ON ota_task_devices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view ota_logs" ON ota_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view device_firmware_history" ON device_firmware_history
  FOR SELECT TO authenticated USING (true);

-- 插入示例数据
INSERT INTO firmware_versions (version_code, version_name, firmware_type, file_url, file_size, file_hash, release_notes_zh, release_notes_ja, is_stable, tenant_id) VALUES
('v1.0.0', 'V1.0.0 稳定版', 'robot_firmware', 'https://example.com/firmware/v1.0.0.bin', 10485760, 'abc123def456', '初始稳定版本', '初期安定版', true, 'tenant-001'),
('v1.1.0', 'V1.1.0 功能更新', 'robot_firmware', 'https://example.com/firmware/v1.1.0.bin', 11534336, 'def789ghi012', '新增协作模式优化', '協働モード最適化追加', true, 'tenant-001'),
('v1.2.0-beta', 'V1.2.0 测试版', 'robot_firmware', 'https://example.com/firmware/v1.2.0-beta.bin', 12582912, 'ghi345jkl678', '测试新功能', 'テスト新機能', false, 'tenant-001'),
('app-v2.0.0', 'App V2.0.0', 'app', 'https://example.com/app/v2.0.0.apk', 52428800, 'jkl901mno234', 'UI全新设计', 'UI全面リニューアル', true, 'tenant-001');
