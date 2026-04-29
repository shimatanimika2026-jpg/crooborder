-- =====================================================
-- 异常中心数据库表创建
-- =====================================================

-- 创建异常类型枚举
CREATE TYPE exception_type AS ENUM (
  'quality',      -- 质量异常
  'material',     -- 物料异常
  'equipment',    -- 设备异常
  'process',      -- 工艺异常
  'logistics',    -- 物流异常
  'system',       -- 系统异常
  'other'         -- 其他异常
);

-- 创建异常严重程度枚举
CREATE TYPE exception_severity AS ENUM (
  'critical',     -- 严重
  'high',         -- 高
  'medium',       -- 中
  'low'           -- 低
);

-- 创建异常状态枚举
CREATE TYPE exception_status AS ENUM (
  'open',         -- 待处理
  'in_progress',  -- 处理中
  'resolved',     -- 已解决
  'closed',       -- 已关闭
  'cancelled'     -- 已取消
);

-- 创建来源模块枚举
CREATE TYPE exception_source_module AS ENUM (
  'production',   -- 生产
  'quality',      -- 质检
  'warehouse',    -- 仓库
  'logistics',    -- 物流
  'assembly',     -- 组装
  'testing',      -- 测试
  'shipping',     -- 发货
  'other'         -- 其他
);

-- 创建操作异常表
CREATE TABLE operation_exceptions (
  id bigserial PRIMARY KEY,
  exception_code text UNIQUE NOT NULL,
  exception_type exception_type NOT NULL,
  severity exception_severity NOT NULL DEFAULT 'medium',
  current_status exception_status NOT NULL DEFAULT 'open',
  source_module exception_source_module NOT NULL,
  
  -- 关联信息
  related_sn text,                    -- 关联序列号
  related_order_id bigint,            -- 关联订单ID
  related_asn_id bigint,              -- 关联ASN ID
  related_receiving_id bigint,        -- 关联收货ID
  related_inspection_id bigint,       -- 关联检验ID
  
  -- 异常描述
  title text NOT NULL,
  description text,
  root_cause text,                    -- 根本原因
  solution text,                      -- 解决方案
  
  -- 责任人和处理人
  reporter_id uuid NOT NULL REFERENCES profiles(id),
  owner_id uuid REFERENCES profiles(id),
  resolver_id uuid REFERENCES profiles(id),
  
  -- 时间信息
  reported_at timestamptz NOT NULL DEFAULT now(),
  assigned_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  
  -- 租户隔离
  tenant_id text NOT NULL,
  
  -- 元数据
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 创建异常日志表
CREATE TABLE exception_logs (
  id bigserial PRIMARY KEY,
  exception_id bigint NOT NULL REFERENCES operation_exceptions(id) ON DELETE CASCADE,
  
  -- 操作信息
  action text NOT NULL,               -- 操作类型：created, assigned, updated, resolved, closed
  old_status exception_status,        -- 旧状态
  new_status exception_status,        -- 新状态
  comment text,                       -- 备注
  
  -- 操作人
  operator_id uuid NOT NULL REFERENCES profiles(id),
  
  -- 时间
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 创建索引
CREATE INDEX idx_operation_exceptions_tenant ON operation_exceptions(tenant_id);
CREATE INDEX idx_operation_exceptions_status ON operation_exceptions(current_status);
CREATE INDEX idx_operation_exceptions_type ON operation_exceptions(exception_type);
CREATE INDEX idx_operation_exceptions_severity ON operation_exceptions(severity);
CREATE INDEX idx_operation_exceptions_reporter ON operation_exceptions(reporter_id);
CREATE INDEX idx_operation_exceptions_owner ON operation_exceptions(owner_id);
CREATE INDEX idx_operation_exceptions_reported_at ON operation_exceptions(reported_at DESC);
CREATE INDEX idx_operation_exceptions_related_sn ON operation_exceptions(related_sn);

CREATE INDEX idx_exception_logs_exception ON exception_logs(exception_id);
CREATE INDEX idx_exception_logs_created_at ON exception_logs(created_at DESC);

-- 启用 RLS
ALTER TABLE operation_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exception_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS 权限策略
-- =====================================================

-- operation_exceptions 表策略

-- 查看权限：用户可以查看本租户的异常
CREATE POLICY "用户可以查看本租户的异常" ON operation_exceptions
  FOR SELECT TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    OR
    (SELECT tenant_id FROM profiles WHERE id = auth.uid()) = 'BOTH'
  );

-- 创建权限：认证用户可以创建本租户的异常
CREATE POLICY "认证用户可以创建本租户的异常" ON operation_exceptions
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    OR
    (SELECT tenant_id FROM profiles WHERE id = auth.uid()) = 'BOTH'
  );

-- 更新权限：用户可以更新本租户的异常
CREATE POLICY "用户可以更新本租户的异常" ON operation_exceptions
  FOR UPDATE TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    OR
    (SELECT tenant_id FROM profiles WHERE id = auth.uid()) = 'BOTH'
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    OR
    (SELECT tenant_id FROM profiles WHERE id = auth.uid()) = 'BOTH'
  );

-- exception_logs 表策略

-- 查看权限：用户可以查看本租户异常的日志
CREATE POLICY "用户可以查看本租户异常的日志" ON exception_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM operation_exceptions
      WHERE id = exception_logs.exception_id
      AND (
        tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        OR
        (SELECT tenant_id FROM profiles WHERE id = auth.uid()) = 'BOTH'
      )
    )
  );

-- 创建权限：认证用户可以创建日志
CREATE POLICY "认证用户可以创建异常日志" ON exception_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM operation_exceptions
      WHERE id = exception_logs.exception_id
      AND (
        tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        OR
        (SELECT tenant_id FROM profiles WHERE id = auth.uid()) = 'BOTH'
      )
    )
  );

-- =====================================================
-- 注释
-- =====================================================

COMMENT ON TABLE operation_exceptions IS '操作异常表';
COMMENT ON TABLE exception_logs IS '异常日志表';

COMMENT ON COLUMN operation_exceptions.exception_code IS '异常编号（唯一）';
COMMENT ON COLUMN operation_exceptions.exception_type IS '异常类型';
COMMENT ON COLUMN operation_exceptions.severity IS '严重程度';
COMMENT ON COLUMN operation_exceptions.current_status IS '当前状态';
COMMENT ON COLUMN operation_exceptions.source_module IS '来源模块';
COMMENT ON COLUMN operation_exceptions.related_sn IS '关联序列号';
COMMENT ON COLUMN operation_exceptions.title IS '异常标题';
COMMENT ON COLUMN operation_exceptions.description IS '异常描述';
COMMENT ON COLUMN operation_exceptions.root_cause IS '根本原因';
COMMENT ON COLUMN operation_exceptions.solution IS '解决方案';
COMMENT ON COLUMN operation_exceptions.reporter_id IS '报告人ID';
COMMENT ON COLUMN operation_exceptions.owner_id IS '负责人ID';
COMMENT ON COLUMN operation_exceptions.resolver_id IS '解决人ID';
COMMENT ON COLUMN operation_exceptions.reported_at IS '报告时间';
COMMENT ON COLUMN operation_exceptions.assigned_at IS '分配时间';
COMMENT ON COLUMN operation_exceptions.resolved_at IS '解决时间';
COMMENT ON COLUMN operation_exceptions.closed_at IS '关闭时间';

COMMENT ON COLUMN exception_logs.action IS '操作类型';
COMMENT ON COLUMN exception_logs.old_status IS '旧状态';
COMMENT ON COLUMN exception_logs.new_status IS '新状态';
COMMENT ON COLUMN exception_logs.comment IS '备注';
COMMENT ON COLUMN exception_logs.operator_id IS '操作人ID';
