-- 为 operation_exceptions 表添加关闭原因和升级相关字段
ALTER TABLE operation_exceptions 
  ADD COLUMN IF NOT EXISTS close_reason TEXT,
  ADD COLUMN IF NOT EXISTS escalated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_reason TEXT,
  ADD COLUMN IF NOT EXISTS previous_severity TEXT;

-- 为 quality_exceptions 表添加关闭原因和升级相关字段
ALTER TABLE quality_exceptions 
  ADD COLUMN IF NOT EXISTS close_reason TEXT,
  ADD COLUMN IF NOT EXISTS escalated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_reason TEXT,
  ADD COLUMN IF NOT EXISTS previous_severity TEXT;

-- 创建异常审计日志表（如果不存在）
CREATE TABLE IF NOT EXISTS exception_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  exception_type TEXT NOT NULL CHECK (exception_type IN ('operation', 'quality')),
  exception_id BIGINT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'assigned', 'resolved', 'closed', 'reopened', 'escalated', 'updated')),
  old_status TEXT,
  new_status TEXT,
  old_severity TEXT,
  new_severity TEXT,
  comment TEXT,
  operator_id UUID REFERENCES auth.users(id),
  tenant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exception_audit_logs_exception ON exception_audit_logs(exception_type, exception_id);
CREATE INDEX IF NOT EXISTS idx_exception_audit_logs_tenant ON exception_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exception_audit_logs_created_at ON exception_audit_logs(created_at);

-- 设置 RLS 策略
ALTER TABLE exception_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "租户隔离 - exception_audit_logs" ON exception_audit_logs FOR ALL TO authenticated USING (tenant_id = current_setting('app.current_tenant', true));