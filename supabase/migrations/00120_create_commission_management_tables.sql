-- 创建委托管理相关表

-- 1. 委托单表
CREATE TABLE IF NOT EXISTS commissions (
  id BIGSERIAL PRIMARY KEY,
  commission_no VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(200) NOT NULL,
  project_name VARCHAR(200),
  product_name VARCHAR(200) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  target_delivery_date DATE NOT NULL,
  assembly_factory VARCHAR(200) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending_acceptance' CHECK (status IN ('pending_acceptance', 'accepted', 'rejected', 'in_production', 'shipped', 'completed', 'exception')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 委托操作记录表
CREATE TABLE IF NOT EXISTS commission_operations (
  id BIGSERIAL PRIMARY KEY,
  commission_id BIGINT NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
  operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('accept', 'reject', 'register_plan', 'update_progress', 'register_shipment', 'confirm_arrival', 'report_exception', 'close_exception')),
  operation_data JSONB,
  operator_id UUID REFERENCES auth.users(id),
  operated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 生产计划表
CREATE TABLE IF NOT EXISTS commission_production_plans (
  id BIGSERIAL PRIMARY KEY,
  commission_id BIGINT NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
  planned_start_date DATE NOT NULL,
  planned_end_date DATE NOT NULL,
  responsible_person VARCHAR(200) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. 进度更新表
CREATE TABLE IF NOT EXISTS commission_progress_updates (
  id BIGSERIAL PRIMARY KEY,
  commission_id BIGINT NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
  progress_percentage INTEGER NOT NULL CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. 出货记录表
CREATE TABLE IF NOT EXISTS commission_shipments (
  id BIGSERIAL PRIMARY KEY,
  commission_id BIGINT NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
  shipment_date DATE NOT NULL,
  tracking_no VARCHAR(100),
  carrier VARCHAR(200),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. 到货确认表
CREATE TABLE IF NOT EXISTS commission_arrivals (
  id BIGSERIAL PRIMARY KEY,
  commission_id BIGINT NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
  arrival_date DATE NOT NULL,
  receiver VARCHAR(200) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. 异常记录表
CREATE TABLE IF NOT EXISTS commission_exceptions (
  id BIGSERIAL PRIMARY KEY,
  commission_id BIGINT NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
  exception_type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  responsible_party VARCHAR(200),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_created_at ON commissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commission_operations_commission_id ON commission_operations(commission_id);
CREATE INDEX IF NOT EXISTS idx_commission_operations_operated_at ON commission_operations(operated_at DESC);
CREATE INDEX IF NOT EXISTS idx_commission_progress_updates_commission_id ON commission_progress_updates(commission_id);
CREATE INDEX IF NOT EXISTS idx_commission_exceptions_commission_id ON commission_exceptions(commission_id);
CREATE INDEX IF NOT EXISTS idx_commission_exceptions_status ON commission_exceptions(status);

-- 创建RLS策略
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_production_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_progress_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_arrivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_exceptions ENABLE ROW LEVEL SECURITY;

-- 所有认证用户可以查看和创建委托
CREATE POLICY "Authenticated users can view commissions" ON commissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create commissions" ON commissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update commissions" ON commissions FOR UPDATE TO authenticated USING (true);

-- 所有认证用户可以查看和创建操作记录
CREATE POLICY "Authenticated users can view operations" ON commission_operations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create operations" ON commission_operations FOR INSERT TO authenticated WITH CHECK (true);

-- 所有认证用户可以查看和创建生产计划
CREATE POLICY "Authenticated users can view plans" ON commission_production_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create plans" ON commission_production_plans FOR INSERT TO authenticated WITH CHECK (true);

-- 所有认证用户可以查看和创建进度更新
CREATE POLICY "Authenticated users can view progress" ON commission_progress_updates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create progress" ON commission_progress_updates FOR INSERT TO authenticated WITH CHECK (true);

-- 所有认证用户可以查看和创建出货记录
CREATE POLICY "Authenticated users can view shipments" ON commission_shipments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create shipments" ON commission_shipments FOR INSERT TO authenticated WITH CHECK (true);

-- 所有认证用户可以查看和创建到货确认
CREATE POLICY "Authenticated users can view arrivals" ON commission_arrivals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create arrivals" ON commission_arrivals FOR INSERT TO authenticated WITH CHECK (true);

-- 所有认证用户可以查看和创建异常记录
CREATE POLICY "Authenticated users can view exceptions" ON commission_exceptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create exceptions" ON commission_exceptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update exceptions" ON commission_exceptions FOR UPDATE TO authenticated USING (true);

-- 创建自动生成委托单号的函数
CREATE OR REPLACE FUNCTION generate_commission_no()
RETURNS TEXT AS $$
DECLARE
  new_no TEXT;
  counter INTEGER;
BEGIN
  -- 生成格式: COM-YYYYMMDD-XXXX
  SELECT COUNT(*) + 1 INTO counter
  FROM commissions
  WHERE DATE(created_at) = CURRENT_DATE;
  
  new_no := 'COM-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
  
  RETURN new_no;
END;
$$ LANGUAGE plpgsql;

-- 创建自动更新updated_at的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为commissions表创建触发器
CREATE TRIGGER update_commissions_updated_at
BEFORE UPDATE ON commissions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();