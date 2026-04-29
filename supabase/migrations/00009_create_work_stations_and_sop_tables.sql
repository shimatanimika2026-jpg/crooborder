-- 工位表
CREATE TABLE IF NOT EXISTS work_stations (
  id SERIAL PRIMARY KEY,
  station_code TEXT UNIQUE NOT NULL,
  station_name_zh TEXT NOT NULL,
  station_name_ja TEXT NOT NULL,
  production_line TEXT NOT NULL,
  station_type TEXT NOT NULL CHECK (station_type IN ('assembly', 'inspection', 'packaging', 'testing')),
  andon_status TEXT NOT NULL DEFAULT 'green' CHECK (andon_status IN ('green', 'yellow', 'red')),
  current_task_id INTEGER REFERENCES assembly_tasks(id),
  operator_id UUID REFERENCES profiles(id),
  qr_code TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  tenant_id TEXT NOT NULL CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SOP文档表
CREATE TABLE IF NOT EXISTS sop_documents (
  id SERIAL PRIMARY KEY,
  sop_code TEXT UNIQUE NOT NULL,
  title_zh TEXT NOT NULL,
  title_ja TEXT NOT NULL,
  station_type TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'image', 'pdf', 'mixed')),
  video_url_zh TEXT,
  video_url_ja TEXT,
  images_zh TEXT[],
  images_ja TEXT[],
  pdf_url_zh TEXT,
  pdf_url_ja TEXT,
  description_zh TEXT,
  description_ja TEXT,
  version TEXT NOT NULL DEFAULT '1.0',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 工位状态变更日志表
CREATE TABLE IF NOT EXISTS work_station_status_logs (
  id SERIAL PRIMARY KEY,
  station_id INTEGER NOT NULL REFERENCES work_stations(id) ON DELETE CASCADE,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  reason TEXT,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_work_stations_tenant ON work_stations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_stations_status ON work_stations(andon_status);
CREATE INDEX IF NOT EXISTS idx_work_stations_line ON work_stations(production_line);
CREATE INDEX IF NOT EXISTS idx_sop_station_type ON sop_documents(station_type);
CREATE INDEX IF NOT EXISTS idx_status_logs_station ON work_station_status_logs(station_id);

-- 插入示例工位数据
INSERT INTO work_stations (station_code, station_name_zh, station_name_ja, production_line, station_type, qr_code, tenant_id) VALUES
('WS-JP-A01', '组装工位A01', '組立ステーションA01', 'LINE-A', 'assembly', 'QR-WS-JP-A01', 'JP'),
('WS-JP-A02', '组装工位A02', '組立ステーションA02', 'LINE-A', 'assembly', 'QR-WS-JP-A02', 'JP'),
('WS-JP-A03', '组装工位A03', '組立ステーションA03', 'LINE-A', 'assembly', 'QR-WS-JP-A03', 'JP'),
('WS-JP-I01', '检验工位I01', '検査ステーションI01', 'LINE-A', 'inspection', 'QR-WS-JP-I01', 'JP'),
('WS-JP-P01', '包装工位P01', '梱包ステーションP01', 'LINE-A', 'packaging', 'QR-WS-JP-P01', 'JP'),
('WS-JP-B01', '组装工位B01', '組立ステーションB01', 'LINE-B', 'assembly', 'QR-WS-JP-B01', 'JP'),
('WS-JP-B02', '组装工位B02', '組立ステーションB02', 'LINE-B', 'assembly', 'QR-WS-JP-B02', 'JP'),
('WS-JP-T01', '测试工位T01', 'テストステーションT01', 'LINE-B', 'testing', 'QR-WS-JP-T01', 'JP');

-- 插入示例SOP文档
INSERT INTO sop_documents (sop_code, title_zh, title_ja, station_type, content_type, description_zh, description_ja) VALUES
('SOP-ASM-001', '协作机器人底座组装标准作业', 'コボットベース組立標準作業', 'assembly', 'mixed', '详细说明底座组装的标准流程和注意事项', 'ベース組立の標準手順と注意事項を詳しく説明'),
('SOP-ASM-002', '机械臂安装标准作业', 'ロボットアーム取付標準作業', 'assembly', 'mixed', '机械臂与底座的连接标准作业指导', 'ロボットアームとベースの接続標準作業指導'),
('SOP-INS-001', '外观检验标准作业', '外観検査標準作業', 'inspection', 'image', '成品外观检验的标准和判定方法', '完成品外観検査の基準と判定方法'),
('SOP-TST-001', '功能测试标准作业', '機能テスト標準作業', 'testing', 'video', '协作机器人功能测试的完整流程', 'コボット機能テストの完全な手順');

-- RLS策略
ALTER TABLE work_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_station_status_logs ENABLE ROW LEVEL SECURITY;

-- 工位访问策略(日方用户可访问JP工位)
CREATE POLICY "jp_users_access_jp_stations" ON work_stations
  FOR ALL TO authenticated
  USING (
    tenant_id = 'JP' AND 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND tenant_id IN ('JP', 'BOTH')
    )
  );

-- SOP文档访问策略(所有认证用户可查看)
CREATE POLICY "authenticated_users_view_sop" ON sop_documents
  FOR SELECT TO authenticated
  USING (is_active = true);

-- 管理员可管理SOP
CREATE POLICY "admins_manage_sop" ON sop_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'system_admin', 'jp_factory_manager')
    )
  );

-- 状态日志访问策略
CREATE POLICY "users_view_station_logs" ON work_station_status_logs
  FOR SELECT TO authenticated
  USING (true);

-- 触发器:自动更新updated_at
CREATE OR REPLACE FUNCTION update_work_station_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_work_station_updated_at
  BEFORE UPDATE ON work_stations
  FOR EACH ROW
  EXECUTE FUNCTION update_work_station_updated_at();

-- 触发器:记录工位状态变更
CREATE OR REPLACE FUNCTION log_work_station_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.andon_status IS DISTINCT FROM NEW.andon_status THEN
    INSERT INTO work_station_status_logs (station_id, previous_status, new_status, changed_by)
    VALUES (NEW.id, OLD.andon_status, NEW.andon_status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_station_status_change
  AFTER UPDATE ON work_stations
  FOR EACH ROW
  EXECUTE FUNCTION log_work_station_status_change();