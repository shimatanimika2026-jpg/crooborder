-- P2: 创建统一异常中心表

-- 1. 创建异常主表
CREATE TABLE IF NOT EXISTS operation_exceptions (
  id BIGSERIAL PRIMARY KEY,
  exception_code VARCHAR(50) UNIQUE NOT NULL,
  exception_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  source_module VARCHAR(50) NOT NULL,
  source_record_id BIGINT,
  related_sn VARCHAR(100),
  related_plan_id BIGINT REFERENCES production_plans(id),
  related_shipment_id BIGINT,
  related_receiving_id BIGINT REFERENCES receiving_records(id),
  related_aging_test_id BIGINT REFERENCES aging_tests(id),
  related_final_test_id BIGINT,
  current_status VARCHAR(30) NOT NULL DEFAULT 'open' CHECK (current_status IN ('open', 'in_progress', 'pending_approval', 'resolved', 'closed', 'rejected')),
  owner_id UUID REFERENCES profiles(id),
  reported_by UUID REFERENCES profiles(id),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date DATE,
  temporary_action TEXT,
  root_cause TEXT,
  corrective_action TEXT,
  resolution_summary TEXT,
  closed_by UUID REFERENCES profiles(id),
  closed_at TIMESTAMPTZ,
  remarks TEXT,
  tenant_id VARCHAR(10) NOT NULL,
  factory_id VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 创建索引
CREATE INDEX idx_operation_exceptions_exception_type ON operation_exceptions(exception_type);
CREATE INDEX idx_operation_exceptions_severity ON operation_exceptions(severity);
CREATE INDEX idx_operation_exceptions_source_module ON operation_exceptions(source_module);
CREATE INDEX idx_operation_exceptions_current_status ON operation_exceptions(current_status);
CREATE INDEX idx_operation_exceptions_owner_id ON operation_exceptions(owner_id);
CREATE INDEX idx_operation_exceptions_reported_at ON operation_exceptions(reported_at DESC);
CREATE INDEX idx_operation_exceptions_tenant_id ON operation_exceptions(tenant_id);
CREATE INDEX idx_operation_exceptions_related_sn ON operation_exceptions(related_sn);

-- 3. 创建异常编号生成函数
CREATE OR REPLACE FUNCTION generate_exception_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_date TEXT;
  v_seq TEXT;
BEGIN
  v_date := TO_CHAR(NOW(), 'YYYYMMDD');
  v_seq := LPAD(NEXTVAL('operation_exceptions_id_seq')::TEXT, 6, '0');
  RETURN 'EXC-' || v_date || '-' || v_seq;
END;
$$;

-- 4. 创建自动生成异常编号的触发器
CREATE OR REPLACE FUNCTION set_exception_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.exception_code IS NULL OR NEW.exception_code = '' THEN
    NEW.exception_code := generate_exception_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_exception_code
BEFORE INSERT ON operation_exceptions
FOR EACH ROW
EXECUTE FUNCTION set_exception_code();

-- 5. 创建更新时间触发器
CREATE TRIGGER trigger_operation_exceptions_updated_at
BEFORE UPDATE ON operation_exceptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 6. 创建 RLS 策略
ALTER TABLE operation_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operation_exceptions_select_policy" ON operation_exceptions
FOR SELECT TO authenticated
USING (
  tenant_id IN (
    SELECT CASE 
      WHEN tenant_id = 'BOTH' THEN unnest(ARRAY['CN', 'JP', 'BOTH'])
      ELSE tenant_id
    END
    FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "operation_exceptions_insert_policy" ON operation_exceptions
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT CASE 
      WHEN tenant_id = 'BOTH' THEN unnest(ARRAY['CN', 'JP', 'BOTH'])
      ELSE tenant_id
    END
    FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "operation_exceptions_update_policy" ON operation_exceptions
FOR UPDATE TO authenticated
USING (
  tenant_id IN (
    SELECT CASE 
      WHEN tenant_id = 'BOTH' THEN unnest(ARRAY['CN', 'JP', 'BOTH'])
      ELSE tenant_id
    END
    FROM profiles WHERE id = auth.uid()
  )
);

COMMENT ON TABLE operation_exceptions IS 'P2: 统一异常中心主表';
COMMENT ON COLUMN operation_exceptions.exception_code IS '异常编号';
COMMENT ON COLUMN operation_exceptions.exception_type IS '异常类型：shortage/overage/wrong_item/damaged/incoming_ng/hold/special_acceptance_pending/aging_interrupted/aging_failed/final_test_failed/shipment_blocked等';
COMMENT ON COLUMN operation_exceptions.severity IS '严重等级：low/medium/high/critical';
COMMENT ON COLUMN operation_exceptions.source_module IS '来源模块：receiving/iqc/assembly/aging/final_test/qa/shipment';
COMMENT ON COLUMN operation_exceptions.source_record_id IS '来源记录ID';
COMMENT ON COLUMN operation_exceptions.current_status IS '当前状态：open/in_progress/pending_approval/resolved/closed/rejected';
