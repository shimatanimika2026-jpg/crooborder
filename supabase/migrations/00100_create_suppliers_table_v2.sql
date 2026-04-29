-- 创建供应商表
CREATE TABLE IF NOT EXISTS suppliers (
  id BIGSERIAL PRIMARY KEY,
  supplier_code VARCHAR(50) UNIQUE NOT NULL,
  supplier_name VARCHAR(200) NOT NULL,
  supplier_type VARCHAR(50) CHECK (supplier_type IN ('raw_material', 'component', 'service')),
  contact_person VARCHAR(100),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(100),
  address TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
  tenant_id VARCHAR(20) NOT NULL CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);

COMMENT ON TABLE suppliers IS '供应商表';

-- 启用RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- RLS策略: 所有认证用户可以查看供应商
CREATE POLICY "suppliers_select_policy" ON suppliers
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS策略: 管理员可以创建供应商
CREATE POLICY "suppliers_insert_policy" ON suppliers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'system_admin', 'cn_factory_manager', 'jp_factory_manager', 'jp_quality_manager')
    )
  );

-- RLS策略: 管理员可以更新供应商
CREATE POLICY "suppliers_update_policy" ON suppliers
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'system_admin', 'cn_factory_manager', 'jp_factory_manager', 'jp_quality_manager')
    )
  );