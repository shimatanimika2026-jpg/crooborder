-- 创建组织架构表
CREATE TABLE organizations (
    id BIGSERIAL PRIMARY KEY,
    org_code VARCHAR(50) UNIQUE NOT NULL,
    org_name_zh VARCHAR(100) NOT NULL,
    org_name_ja VARCHAR(100) NOT NULL,
    org_type VARCHAR(20) NOT NULL CHECK (org_type IN ('factory', 'department', 'team')),
    parent_id BIGINT REFERENCES organizations(id),
    tenant_id VARCHAR(20) NOT NULL CHECK (tenant_id IN ('CN', 'JP')),
    manager_id UUID REFERENCES profiles(id),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizations_parent ON organizations(parent_id);
CREATE INDEX idx_organizations_tenant ON organizations(tenant_id);

COMMENT ON TABLE organizations IS '组织架构表';

-- 插入初始组织架构数据
INSERT INTO organizations (org_code, org_name_zh, org_name_ja, org_type, parent_id, tenant_id) VALUES
('CN-FACTORY', '中国工厂', '中国工場', 'factory', NULL, 'CN'),
('CN-PROD-DEPT', '中国生产部', '中国生産部', 'department', 1, 'CN'),
('CN-QC-DEPT', '中国质检部', '中国品質管理部', 'department', 1, 'CN'),
('CN-LOGISTICS-DEPT', '中国物流部', '中国物流部', 'department', 1, 'CN'),
('JP-FACTORY', '日本工厂', '日本工場', 'factory', NULL, 'JP'),
('JP-WAREHOUSE-DEPT', '日本仓库部', '日本倉庫部', 'department', 5, 'JP'),
('JP-ASSEMBLY-DEPT', '日本组装部', '日本組立部', 'department', 5, 'JP'),
('JP-QC-DEPT', '日本质检部', '日本品質管理部', 'department', 5, 'JP');

-- 更新profiles表的外键约束
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_organization 
  FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- 创建通知表
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('system', 'alert', 'approval', 'task')),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
    channels JSONB DEFAULT '[]',
    related_module VARCHAR(50),
    related_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

COMMENT ON TABLE notifications IS '通知表';
COMMENT ON COLUMN notifications.channels IS '推送渠道：["line", "wechat", "email", "app"]';

-- 配置organizations表的RLS策略
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有认证用户可以查看组织架构" ON organizations
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "管理员可以管理组织架构" ON organizations
  FOR ALL TO authenticated 
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'system_admin'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'system_admin'));

-- 配置notifications表的RLS策略
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看自己的通知" ON notifications
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "用户可以更新自己的通知状态" ON notifications
  FOR UPDATE TO authenticated 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "系统可以创建通知" ON notifications
  FOR INSERT TO authenticated 
  WITH CHECK (true);