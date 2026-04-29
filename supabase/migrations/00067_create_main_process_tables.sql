-- 创建最终测试记录表
CREATE TABLE IF NOT EXISTS final_tests (
  id BIGSERIAL PRIMARY KEY,
  finished_product_sn TEXT NOT NULL,
  test_status TEXT NOT NULL DEFAULT 'pending' CHECK (test_status IN ('planned', 'pending', 'in_progress', 'pass', 'fail', 'blocked')),
  tested_at TIMESTAMPTZ,
  tester_id UUID REFERENCES auth.users(id),
  defect_description TEXT,
  notes TEXT,
  remarks TEXT,
  tenant_id TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_final_tests_sn ON final_tests(finished_product_sn);
CREATE INDEX IF NOT EXISTS idx_final_tests_status ON final_tests(test_status);
CREATE INDEX IF NOT EXISTS idx_final_tests_tenant ON final_tests(tenant_id);

-- 创建 QA 放行记录表
CREATE TABLE IF NOT EXISTS qa_releases (
  id BIGSERIAL PRIMARY KEY,
  finished_product_sn TEXT NOT NULL,
  release_status TEXT NOT NULL DEFAULT 'pending' CHECK (release_status IN ('pending', 'approved', 'rejected', 'blocked')),
  released_at TIMESTAMPTZ,
  released_by UUID REFERENCES auth.users(id),
  remarks TEXT,
  block_reason TEXT,
  tenant_id TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qa_releases_sn ON qa_releases(finished_product_sn);
CREATE INDEX IF NOT EXISTS idx_qa_releases_status ON qa_releases(release_status);
CREATE INDEX IF NOT EXISTS idx_qa_releases_tenant ON qa_releases(tenant_id);

-- 创建出货记录表
CREATE TABLE IF NOT EXISTS shipments (
  id BIGSERIAL PRIMARY KEY,
  shipment_code TEXT UNIQUE NOT NULL,
  finished_product_sn TEXT NOT NULL,
  shipment_status TEXT NOT NULL DEFAULT 'pending' CHECK (shipment_status IN ('pending', 'confirmed', 'shipped', 'blocked')),
  shipped_at TIMESTAMPTZ,
  shipped_by UUID REFERENCES auth.users(id),
  remarks TEXT,
  block_reason TEXT,
  tenant_id TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_sn ON shipments(finished_product_sn);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(shipment_status);
CREATE INDEX IF NOT EXISTS idx_shipments_tenant ON shipments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shipments_code ON shipments(shipment_code);

-- 创建出货确认记录表
CREATE TABLE IF NOT EXISTS shipment_confirmations (
  id BIGSERIAL PRIMARY KEY,
  shipment_id BIGINT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_by UUID REFERENCES auth.users(id),
  confirmation_notes TEXT,
  tenant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipment_confirmations_shipment ON shipment_confirmations(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_confirmations_tenant ON shipment_confirmations(tenant_id);

-- 设置 RLS 策略
ALTER TABLE final_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "租户隔离 - final_tests" ON final_tests FOR ALL TO authenticated USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE qa_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "租户隔离 - qa_releases" ON qa_releases FOR ALL TO authenticated USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "租户隔离 - shipments" ON shipments FOR ALL TO authenticated USING (tenant_id = current_setting('app.current_tenant', true));

ALTER TABLE shipment_confirmations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "租户隔离 - shipment_confirmations" ON shipment_confirmations FOR ALL TO authenticated USING (tenant_id = current_setting('app.current_tenant', true));