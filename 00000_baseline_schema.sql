-- =====================================================
-- 中国协作机器人日本委托组装业务数据库 - Baseline Schema
-- 版本: v1.0
-- 日期: 2026-04-19
-- 说明: 基于 84 个 migration 文件整理的正式版 Schema
-- =====================================================

-- =====================================================
-- 第一部分：类型定义
-- =====================================================

-- 用户角色枚举类型
CREATE TYPE public.user_role AS ENUM (
  'user', 
  'admin', 
  'cn_factory_manager', 
  'cn_production_staff', 
  'cn_quality_inspector', 
  'cn_logistics_staff', 
  'jp_factory_manager', 
  'jp_warehouse_staff', 
  'jp_assembly_staff', 
  'jp_quality_inspector', 
  'executive', 
  'system_admin'
);

-- 部件类型枚举
CREATE TYPE public.part_type AS ENUM (
  'robot_body',
  'control_box',
  'teaching_pendant',
  'cable',
  'accessory',
  'packaging'
);

-- =====================================================
-- 第二部分：核心表（解决循环依赖）
-- =====================================================

-- -----------------------------------------------------
-- 2.1 组织架构表（先创建，不含 manager_id 外键）
-- -----------------------------------------------------
CREATE TABLE organizations (
    id BIGSERIAL PRIMARY KEY,
    org_code VARCHAR(50) UNIQUE NOT NULL,
    org_name_zh VARCHAR(100) NOT NULL,
    org_name_ja VARCHAR(100) NOT NULL,
    org_type VARCHAR(20) NOT NULL CHECK (org_type IN ('factory', 'department', 'team')),
    parent_id BIGINT REFERENCES organizations(id),
    tenant_id VARCHAR(20) NOT NULL CHECK (tenant_id IN ('CN', 'JP')),
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizations_parent ON organizations(parent_id);
CREATE INDEX idx_organizations_tenant ON organizations(tenant_id);
CREATE INDEX idx_organizations_org_code ON organizations(org_code);

COMMENT ON TABLE organizations IS '组织架构表';

-- -----------------------------------------------------
-- 2.2 用户档案表
-- -----------------------------------------------------
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    language_preference VARCHAR(10) DEFAULT 'zh-CN' CHECK (language_preference IN ('zh-CN', 'ja-JP')),
    organization_id BIGINT REFERENCES organizations(id),
    tenant_id VARCHAR(20) NOT NULL DEFAULT 'CN' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    role user_role DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'locked')),
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_profiles_organization ON profiles(organization_id);
CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_username ON profiles(username);

COMMENT ON TABLE profiles IS '用户档案表';
COMMENT ON COLUMN profiles.language_preference IS '语言偏好：zh-CN=中文，ja-JP=日语';
COMMENT ON COLUMN profiles.tenant_id IS '租户ID：CN=中方工厂，JP=日方工厂，BOTH=双方共享';

-- -----------------------------------------------------
-- 2.3 补齐 organizations 的 manager_id 外键
-- -----------------------------------------------------
ALTER TABLE organizations 
ADD COLUMN manager_id UUID REFERENCES profiles(id);

ALTER TABLE organizations 
ADD CONSTRAINT fk_organizations_created_by FOREIGN KEY (created_by) REFERENCES profiles(id),
ADD CONSTRAINT fk_organizations_updated_by FOREIGN KEY (updated_by) REFERENCES profiles(id);

CREATE INDEX idx_organizations_manager ON organizations(manager_id);

-- -----------------------------------------------------
-- 2.4 通知表（补齐审计字段）
-- -----------------------------------------------------
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
    tenant_id VARCHAR(20) DEFAULT 'BOTH' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);

COMMENT ON TABLE notifications IS '通知表';
COMMENT ON COLUMN notifications.channels IS '推送渠道：["line", "wechat", "email", "app"]';

-- =====================================================
-- 第三部分：产品与型号
-- =====================================================

-- -----------------------------------------------------
-- 3.1 产品型号表
-- -----------------------------------------------------
CREATE TABLE product_models (
    id BIGSERIAL PRIMARY KEY,
    model_code VARCHAR(50) UNIQUE NOT NULL,
    model_name_zh VARCHAR(100) NOT NULL,
    model_name_ja VARCHAR(100) NOT NULL,
    model_category VARCHAR(50),
    specifications JSONB,
    standard_cycle_time INTEGER,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
    tenant_id VARCHAR(20) DEFAULT 'BOTH' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_models_code ON product_models(model_code);
CREATE INDEX idx_product_models_status ON product_models(status);
CREATE INDEX idx_product_models_tenant ON product_models(tenant_id);

COMMENT ON TABLE product_models IS '产品型号表';
COMMENT ON COLUMN product_models.specifications IS '产品规格JSON';

-- -----------------------------------------------------
-- 3.2 协作机器人设备表
-- -----------------------------------------------------
CREATE TABLE cobot_devices (
    id BIGSERIAL PRIMARY KEY,
    device_code VARCHAR(50) UNIQUE NOT NULL,
    device_name VARCHAR(100) NOT NULL,
    model_id BIGINT REFERENCES product_models(id),
    serial_number VARCHAR(100) UNIQUE,
    mac_address VARCHAR(50),
    firmware_version VARCHAR(50),
    software_version VARCHAR(50),
    status VARCHAR(20) DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'maintenance', 'offline', 'error')),
    location VARCHAR(100),
    tenant_id VARCHAR(20) DEFAULT 'JP' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cobot_devices_code ON cobot_devices(device_code);
CREATE INDEX idx_cobot_devices_serial ON cobot_devices(serial_number);
CREATE INDEX idx_cobot_devices_status ON cobot_devices(status);
CREATE INDEX idx_cobot_devices_tenant ON cobot_devices(tenant_id);

COMMENT ON TABLE cobot_devices IS '协作机器人设备表';

-- =====================================================
-- 第四部分：生产计划
-- =====================================================

-- -----------------------------------------------------
-- 4.1 生产计划主表（修正状态定义）
-- -----------------------------------------------------
CREATE TABLE production_plans (
    id BIGSERIAL PRIMARY KEY,
    plan_code VARCHAR(50) UNIQUE NOT NULL,
    plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('annual', 'monthly', 'weekly')),
    plan_period_start DATE NOT NULL,
    plan_period_end DATE NOT NULL,
    production_quantity INTEGER NOT NULL CHECK (production_quantity > 0),
    delivery_date DATE NOT NULL,
    product_model_id BIGINT REFERENCES product_models(id),
    factory_id VARCHAR(50),
    responsible_person_id UUID REFERENCES profiles(id),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'active', 'closed')),
    current_version INTEGER DEFAULT 1,
    tenant_id VARCHAR(20) DEFAULT 'BOTH' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMP,
    rejected_by UUID REFERENCES profiles(id),
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    activated_by UUID REFERENCES profiles(id),
    activated_at TIMESTAMP,
    closed_by UUID REFERENCES profiles(id),
    closed_at TIMESTAMP,
    close_reason TEXT
);

CREATE INDEX idx_production_plans_status ON production_plans(status);
CREATE INDEX idx_production_plans_period ON production_plans(plan_period_start, plan_period_end);
CREATE INDEX idx_production_plans_code ON production_plans(plan_code);
CREATE INDEX idx_production_plans_tenant ON production_plans(tenant_id);
CREATE INDEX idx_production_plans_model ON production_plans(product_model_id);

COMMENT ON TABLE production_plans IS '生产计划表';

-- -----------------------------------------------------
-- 4.2 生产计划版本表
-- -----------------------------------------------------
CREATE TABLE production_plan_versions (
    id BIGSERIAL PRIMARY KEY,
    plan_id BIGINT NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    change_reason TEXT,
    change_description TEXT,
    impact_analysis TEXT,
    plan_details JSONB NOT NULL,
    tenant_id VARCHAR(20) DEFAULT 'BOTH' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plan_id, version_number)
);

CREATE INDEX idx_plan_versions_plan ON production_plan_versions(plan_id);
CREATE INDEX idx_plan_versions_version ON production_plan_versions(version_number DESC);
CREATE INDEX idx_plan_versions_tenant ON production_plan_versions(tenant_id);

COMMENT ON TABLE production_plan_versions IS '生产计划版本表';
COMMENT ON COLUMN production_plan_versions.plan_details IS '计划详细内容JSON：包含产品型号、数量、工艺要求等';

-- -----------------------------------------------------
-- 4.3 生产计划审批表
-- -----------------------------------------------------
CREATE TABLE production_plan_approvals (
    id BIGSERIAL PRIMARY KEY,
    plan_id BIGINT NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    approval_stage VARCHAR(20) NOT NULL CHECK (approval_stage IN ('cn_approval', 'jp_approval')),
    approver_id UUID REFERENCES profiles(id),
    approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approval_comment TEXT,
    approved_at TIMESTAMP,
    rejected_by UUID REFERENCES profiles(id),
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    tenant_id VARCHAR(20) DEFAULT 'BOTH' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_plan_approvals_plan ON production_plan_approvals(plan_id);
CREATE INDEX idx_plan_approvals_status ON production_plan_approvals(approval_status);
CREATE INDEX idx_plan_approvals_tenant ON production_plan_approvals(tenant_id);

COMMENT ON TABLE production_plan_approvals IS '生产计划审批表';

-- -----------------------------------------------------
-- 4.4 生产订单表
-- -----------------------------------------------------
CREATE TABLE production_orders (
    id BIGSERIAL PRIMARY KEY,
    order_code VARCHAR(50) UNIQUE NOT NULL,
    plan_id BIGINT REFERENCES production_plans(id),
    product_model_id BIGINT NOT NULL REFERENCES product_models(id),
    order_quantity INTEGER NOT NULL CHECK (order_quantity > 0),
    completed_quantity INTEGER DEFAULT 0,
    start_date DATE,
    end_date DATE,
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    tenant_id VARCHAR(20) DEFAULT 'CN' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_production_orders_code ON production_orders(order_code);
CREATE INDEX idx_production_orders_plan ON production_orders(plan_id);
CREATE INDEX idx_production_orders_model ON production_orders(product_model_id);
CREATE INDEX idx_production_orders_status ON production_orders(status);
CREATE INDEX idx_production_orders_tenant ON production_orders(tenant_id);

COMMENT ON TABLE production_orders IS '生产订单表';

-- =====================================================
-- 第五部分：物流与发货（统一使用 ASN 模型）
-- =====================================================

-- -----------------------------------------------------
-- 5.1 ASN发货单表
-- -----------------------------------------------------
CREATE TABLE asn_shipments (
  id BIGSERIAL PRIMARY KEY,
  shipment_no VARCHAR(50) UNIQUE NOT NULL,
  tenant_id VARCHAR(20) NOT NULL DEFAULT 'CN' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
  factory_id VARCHAR(50) NOT NULL DEFAULT 'CN-FAIRINO',
  destination_factory_id VARCHAR(50) NOT NULL DEFAULT 'JP-MICROTEC',
  product_model_id BIGINT REFERENCES product_models(id),
  production_order_id BIGINT REFERENCES production_orders(id),
  shipment_date TIMESTAMPTZ NOT NULL,
  eta_date TIMESTAMPTZ,
  carrier VARCHAR(100),
  tracking_no VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'shipped', 'in_transit', 'arrived', 'received', 'cancelled')),
  total_boxes INTEGER DEFAULT 0,
  total_pallets INTEGER DEFAULT 0,
  remarks TEXT,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_asn_shipments_no ON asn_shipments(shipment_no);
CREATE INDEX idx_asn_shipments_status ON asn_shipments(status);
CREATE INDEX idx_asn_shipments_eta ON asn_shipments(eta_date);
CREATE INDEX idx_asn_shipments_tenant ON asn_shipments(tenant_id);
CREATE INDEX idx_asn_shipments_order ON asn_shipments(production_order_id);

COMMENT ON TABLE asn_shipments IS 'ASN发货单表（推荐使用）';

-- -----------------------------------------------------
-- 5.2 ASN发货明细表
-- -----------------------------------------------------
CREATE TABLE asn_shipment_items (
  id BIGSERIAL PRIMARY KEY,
  shipment_id BIGINT NOT NULL REFERENCES asn_shipments(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  part_no VARCHAR(50) NOT NULL,
  part_name VARCHAR(200) NOT NULL,
  part_category VARCHAR(50),
  part_type part_type,
  batch_no VARCHAR(50),
  box_no VARCHAR(50),
  pallet_no VARCHAR(50),
  shipped_qty DECIMAL(10,2) NOT NULL CHECK (shipped_qty > 0),
  unit VARCHAR(20) DEFAULT 'PCS',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shipment_id, line_no)
);

CREATE INDEX idx_asn_items_shipment ON asn_shipment_items(shipment_id);
CREATE INDEX idx_asn_items_part ON asn_shipment_items(part_no);
CREATE INDEX idx_asn_items_batch ON asn_shipment_items(batch_no);
CREATE INDEX idx_asn_items_type ON asn_shipment_items(part_type);

COMMENT ON TABLE asn_shipment_items IS 'ASN发货明细表';

-- -----------------------------------------------------
-- 5.3 物流跟踪表（补齐审计字段）
-- -----------------------------------------------------
CREATE TABLE logistics_tracking (
    id BIGSERIAL PRIMARY KEY,
    shipping_id BIGINT REFERENCES asn_shipments(id) ON DELETE CASCADE,
    tracking_number VARCHAR(100) UNIQUE NOT NULL,
    logistics_company VARCHAR(100) NOT NULL,
    current_location VARCHAR(200),
    current_status VARCHAR(50),
    estimated_arrival_date DATE,
    gps_latitude DECIMAL(10,7),
    gps_longitude DECIMAL(10,7),
    tenant_id VARCHAR(20) DEFAULT 'CN' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logistics_tracking_shipping ON logistics_tracking(shipping_id);
CREATE INDEX idx_logistics_tracking_number ON logistics_tracking(tracking_number);
CREATE INDEX idx_logistics_tracking_tenant ON logistics_tracking(tenant_id);

COMMENT ON TABLE logistics_tracking IS '物流跟踪表';

-- -----------------------------------------------------
-- 5.4 物流事件表（补齐审计字段）
-- -----------------------------------------------------
CREATE TABLE logistics_events (
    id BIGSERIAL PRIMARY KEY,
    tracking_id BIGINT NOT NULL REFERENCES logistics_tracking(id) ON DELETE CASCADE,
    event_time TIMESTAMP NOT NULL,
    event_location VARCHAR(200),
    event_description TEXT NOT NULL,
    event_type VARCHAR(20) CHECK (event_type IN ('pickup', 'in_transit', 'customs', 'delay', 'arrived', 'exception')),
    tenant_id VARCHAR(20) DEFAULT 'CN' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logistics_events_tracking ON logistics_events(tracking_id);
CREATE INDEX idx_logistics_events_time ON logistics_events(event_time DESC);
CREATE INDEX idx_logistics_events_tenant ON logistics_events(tenant_id);

COMMENT ON TABLE logistics_events IS '物流事件表';

-- -----------------------------------------------------
-- 5.5 旧发货订单表（标记为废弃）
-- -----------------------------------------------------
CREATE TABLE shipping_orders (
    id BIGSERIAL PRIMARY KEY,
    shipping_code VARCHAR(50) UNIQUE NOT NULL,
    order_id BIGINT REFERENCES production_orders(id),
    shipping_date DATE NOT NULL,
    estimated_arrival_date DATE NOT NULL,
    actual_arrival_date DATE,
    shipping_method VARCHAR(20) NOT NULL CHECK (shipping_method IN ('sea', 'air', 'land', 'express')),
    shipping_company VARCHAR(100),
    total_packages INTEGER NOT NULL,
    total_weight DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'preparing' CHECK (status IN ('preparing', 'shipped', 'in_transit', 'customs', 'arrived', 'cancelled')),
    tenant_id VARCHAR(20) DEFAULT 'CN' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shipping_orders_order ON shipping_orders(order_id);
CREATE INDEX idx_shipping_orders_status ON shipping_orders(status);
CREATE INDEX idx_shipping_orders_code ON shipping_orders(shipping_code);

COMMENT ON TABLE shipping_orders IS '【已废弃】旧发货订单表，请使用 asn_shipments + asn_shipment_items';

-- =====================================================
-- 第六部分：收货与检验
-- =====================================================

-- -----------------------------------------------------
-- 6.1 收货记录主表
-- -----------------------------------------------------
CREATE TABLE receiving_records (
    id BIGSERIAL PRIMARY KEY,
    receiving_no VARCHAR(50) UNIQUE NOT NULL,
    receiving_code VARCHAR(50) UNIQUE,
    shipment_id BIGINT REFERENCES asn_shipments(id),
    shipping_id BIGINT REFERENCES shipping_orders(id),
    receiving_date DATE NOT NULL,
    receiver_id UUID REFERENCES profiles(id),
    received_packages INTEGER NOT NULL,
    received_weight DECIMAL(10,2),
    warehouse_location VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'inspecting', 'accepted', 'rejected', 'partial')),
    notes TEXT,
    tenant_id VARCHAR(20) DEFAULT 'JP' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_receiving_records_shipment ON receiving_records(shipment_id);
CREATE INDEX idx_receiving_records_shipping ON receiving_records(shipping_id);
CREATE INDEX idx_receiving_records_status ON receiving_records(status);
CREATE INDEX idx_receiving_records_no ON receiving_records(receiving_no);
CREATE INDEX idx_receiving_records_tenant ON receiving_records(tenant_id);

COMMENT ON TABLE receiving_records IS '收货记录主表';

-- -----------------------------------------------------
-- 6.2 收货明细表
-- -----------------------------------------------------
CREATE TABLE receiving_record_items (
  id BIGSERIAL PRIMARY KEY,
  receiving_id BIGINT NOT NULL REFERENCES receiving_records(id) ON DELETE CASCADE,
  shipment_item_id BIGINT REFERENCES asn_shipment_items(id),
  line_no INTEGER NOT NULL,
  part_no VARCHAR(50) NOT NULL,
  part_name VARCHAR(200) NOT NULL,
  part_type part_type,
  batch_no VARCHAR(50),
  serial_number VARCHAR(100),
  box_no VARCHAR(50),
  expected_qty DECIMAL(10,2) NOT NULL DEFAULT 0,
  received_qty DECIMAL(10,2) NOT NULL,
  variance_qty DECIMAL(10,2) GENERATED ALWAYS AS (received_qty - expected_qty) STORED,
  variance_type VARCHAR(20) CHECK (variance_type IN ('matched', 'shortage', 'overage', 'wrong_item', 'damaged')),
  unit VARCHAR(20) DEFAULT 'PCS',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(receiving_id, line_no)
);

CREATE INDEX idx_receiving_items_receiving ON receiving_record_items(receiving_id);
CREATE INDEX idx_receiving_items_part ON receiving_record_items(part_no);
CREATE INDEX idx_receiving_items_variance ON receiving_record_items(variance_type);
CREATE INDEX idx_receiving_items_serial ON receiving_record_items(serial_number);
CREATE INDEX idx_receiving_items_type ON receiving_record_items(part_type);

COMMENT ON TABLE receiving_record_items IS '收货明细表';

-- -----------------------------------------------------
-- 6.3 IQC检验记录表
-- -----------------------------------------------------
CREATE TABLE iqc_inspections (
  id BIGSERIAL PRIMARY KEY,
  inspection_no VARCHAR(50) UNIQUE NOT NULL,
  receiving_id BIGINT REFERENCES receiving_records(id),
  receiving_item_id BIGINT REFERENCES receiving_record_items(id),
  part_no VARCHAR(50) NOT NULL,
  part_name VARCHAR(200) NOT NULL,
  batch_no VARCHAR(50),
  inspection_type VARCHAR(20) NOT NULL CHECK (inspection_type IN ('sampling', 'full', 'skip')),
  sample_size INTEGER,
  inspected_qty DECIMAL(10,2),
  result VARCHAR(20) NOT NULL CHECK (result IN ('OK', 'HOLD', 'NG')),
  defect_code VARCHAR(50),
  defect_description TEXT,
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inspected_by UUID REFERENCES profiles(id),
  remarks TEXT,
  tenant_id VARCHAR(20) DEFAULT 'JP' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_iqc_no ON iqc_inspections(inspection_no);
CREATE INDEX idx_iqc_receiving ON iqc_inspections(receiving_id);
CREATE INDEX idx_iqc_result ON iqc_inspections(result);
CREATE INDEX idx_iqc_part ON iqc_inspections(part_no);
CREATE INDEX idx_iqc_tenant ON iqc_inspections(tenant_id);

COMMENT ON TABLE iqc_inspections IS 'IQC检验记录表（推荐使用）';

-- -----------------------------------------------------
-- 6.4 来料处置记录表
-- -----------------------------------------------------
CREATE TABLE incoming_material_dispositions (
  id BIGSERIAL PRIMARY KEY,
  disposition_no VARCHAR(50) UNIQUE NOT NULL,
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('receiving_variance', 'iqc_hold', 'iqc_ng')),
  source_id BIGINT NOT NULL,
  receiving_id BIGINT REFERENCES receiving_records(id),
  part_no VARCHAR(50) NOT NULL,
  part_name VARCHAR(200) NOT NULL,
  batch_no VARCHAR(50),
  affected_qty DECIMAL(10,2) NOT NULL,
  disposition_type VARCHAR(30) NOT NULL CHECK (disposition_type IN ('hold', 'special_acceptance', 'rework', 'return', 'scrap', 'use_as_is')),
  disposition_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (disposition_status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  approve_required BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  block_reason TEXT,
  action_plan TEXT,
  responsible_party VARCHAR(50),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  remarks TEXT,
  tenant_id VARCHAR(20) DEFAULT 'JP' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_disposition_no ON incoming_material_dispositions(disposition_no);
CREATE INDEX idx_disposition_source ON incoming_material_dispositions(source_type, source_id);
CREATE INDEX idx_disposition_status ON incoming_material_dispositions(disposition_status);
CREATE INDEX idx_disposition_type ON incoming_material_dispositions(disposition_type);
CREATE INDEX idx_disposition_tenant ON incoming_material_dispositions(tenant_id);

COMMENT ON TABLE incoming_material_dispositions IS '来料处置记录表';

-- -----------------------------------------------------
-- 6.5 旧收货检验表（标记为废弃或明确用途）
-- -----------------------------------------------------
CREATE TABLE receiving_inspections (
    id BIGSERIAL PRIMARY KEY,
    receiving_id BIGINT NOT NULL REFERENCES receiving_records(id) ON DELETE CASCADE,
    batch_code VARCHAR(100),
    inspection_date DATE NOT NULL,
    inspector_id UUID REFERENCES profiles(id),
    inspected_quantity INTEGER NOT NULL,
    qualified_quantity INTEGER NOT NULL,
    defective_quantity INTEGER NOT NULL,
    qualification_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN inspected_quantity > 0 
        THEN (qualified_quantity::DECIMAL / inspected_quantity * 100)
        ELSE 0 END
    ) STORED,
    defect_description TEXT,
    ai_vision_result JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed', 'rework')),
    tenant_id VARCHAR(20) DEFAULT 'JP' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_receiving_inspections_receiving ON receiving_inspections(receiving_id);
CREATE INDEX idx_receiving_inspections_batch ON receiving_inspections(batch_code);
CREATE INDEX idx_receiving_inspections_status ON receiving_inspections(status);

COMMENT ON TABLE receiving_inspections IS '收货检验表（外观检验用，详细检验请使用 iqc_inspections）';

-- =====================================================
-- 第七部分：库存管理（修复唯一约束）
-- =====================================================

-- -----------------------------------------------------
-- 7.1 库存记录表（修复唯一约束漏洞）
-- -----------------------------------------------------
CREATE TABLE inventory_records (
    id BIGSERIAL PRIMARY KEY,
    material_code VARCHAR(50) NOT NULL,
    material_name VARCHAR(200) NOT NULL,
    batch_code VARCHAR(100) NOT NULL DEFAULT 'NO_BATCH',
    warehouse_location VARCHAR(100) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    reserved_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    available_quantity DECIMAL(10,2) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
    unit VARCHAR(20) DEFAULT 'PCS',
    status VARCHAR(20) DEFAULT 'normal' CHECK (status IN ('normal', 'locked', 'expired', 'damaged')),
    tenant_id VARCHAR(20) NOT NULL CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_inventory_record UNIQUE(material_code, batch_code, warehouse_location, tenant_id)
);

CREATE INDEX idx_inventory_records_material ON inventory_records(material_code);
CREATE INDEX idx_inventory_records_batch ON inventory_records(batch_code);
CREATE INDEX idx_inventory_records_location ON inventory_records(warehouse_location);
CREATE INDEX idx_inventory_records_status ON inventory_records(status);
CREATE INDEX idx_inventory_records_tenant ON inventory_records(tenant_id);

COMMENT ON TABLE inventory_records IS '库存记录表';
COMMENT ON COLUMN inventory_records.batch_code IS '批次号（无批次时使用 NO_BATCH）';

-- -----------------------------------------------------
-- 7.2 库存事务表
-- -----------------------------------------------------
CREATE TABLE inventory_transactions (
    id BIGSERIAL PRIMARY KEY,
    transaction_code VARCHAR(50) UNIQUE NOT NULL,
    inventory_id BIGINT REFERENCES inventory_records(id),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('in', 'out', 'transfer', 'adjust', 'reserve', 'release')),
    quantity DECIMAL(10,2) NOT NULL,
    before_quantity DECIMAL(10,2),
    after_quantity DECIMAL(10,2),
    source_type VARCHAR(50),
    source_id BIGINT,
    operator_id UUID REFERENCES profiles(id),
    remarks TEXT,
    tenant_id VARCHAR(20) NOT NULL CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_transactions_inventory ON inventory_transactions(inventory_id);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_transactions_source ON inventory_transactions(source_type, source_id);
CREATE INDEX idx_inventory_transactions_tenant ON inventory_transactions(tenant_id);

COMMENT ON TABLE inventory_transactions IS '库存事务表';

-- -----------------------------------------------------
-- 7.3 物料预占记录表
-- -----------------------------------------------------
CREATE TABLE material_reservations (
  id BIGSERIAL PRIMARY KEY,
  reservation_code TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  receiving_record_item_id BIGINT NOT NULL REFERENCES receiving_record_items(id) ON DELETE RESTRICT,
  reserved_qty DECIMAL(10,2) NOT NULL CHECK (reserved_qty > 0),
  reserved_by UUID NOT NULL REFERENCES profiles(id),
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_type TEXT NOT NULL CHECK (source_type IN ('assembly', 'rework', 'testing', 'other')),
  source_id BIGINT,
  source_reference TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'released', 'expired')),
  consumed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_material_reservations_receiving_item ON material_reservations(receiving_record_item_id);
CREATE INDEX idx_material_reservations_status ON material_reservations(status);
CREATE INDEX idx_material_reservations_source ON material_reservations(source_type, source_id);
CREATE INDEX idx_material_reservations_reserved_by ON material_reservations(reserved_by);
CREATE INDEX idx_material_reservations_tenant ON material_reservations(tenant_id);

COMMENT ON TABLE material_reservations IS '物料预占记录表';

-- -----------------------------------------------------
-- 7.4 物料消耗记录表
-- -----------------------------------------------------
CREATE TABLE material_consumption_records (
  id BIGSERIAL PRIMARY KEY,
  consumption_code TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  receiving_record_item_id BIGINT NOT NULL REFERENCES receiving_record_items(id) ON DELETE RESTRICT,
  reservation_id BIGINT REFERENCES material_reservations(id) ON DELETE SET NULL,
  consumed_qty DECIMAL(10,2) NOT NULL CHECK (consumed_qty > 0),
  consumed_by UUID NOT NULL REFERENCES profiles(id),
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_type TEXT NOT NULL CHECK (source_type IN ('assembly', 'rework', 'testing', 'other')),
  source_id BIGINT,
  source_reference TEXT,
  unit_serial_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_material_consumption_receiving_item ON material_consumption_records(receiving_record_item_id);
CREATE INDEX idx_material_consumption_reservation ON material_consumption_records(reservation_id);
CREATE INDEX idx_material_consumption_source ON material_consumption_records(source_type, source_id);
CREATE INDEX idx_material_consumption_unit_serial ON material_consumption_records(unit_serial_number);
CREATE INDEX idx_material_consumption_tenant ON material_consumption_records(tenant_id);

COMMENT ON TABLE material_consumption_records IS '物料消耗记录表';

-- =====================================================
-- 第八部分：组装与测试
-- =====================================================

-- -----------------------------------------------------
-- 8.1 组装部件物料映射表
-- -----------------------------------------------------
CREATE TABLE assembly_part_material_mapping (
  id BIGSERIAL PRIMARY KEY,
  product_model_id BIGINT NOT NULL REFERENCES product_models(id) ON DELETE CASCADE,
  part_type part_type NOT NULL,
  part_no VARCHAR(50) NOT NULL,
  part_name VARCHAR(200) NOT NULL,
  is_critical BOOLEAN DEFAULT FALSE,
  is_serialized BOOLEAN DEFAULT FALSE,
  quantity_per_unit DECIMAL(10,2) DEFAULT 1,
  remarks TEXT,
  tenant_id VARCHAR(20) DEFAULT 'JP' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_model_id, part_type)
);

CREATE INDEX idx_assembly_mapping_model ON assembly_part_material_mapping(product_model_id);
CREATE INDEX idx_assembly_mapping_part_type ON assembly_part_material_mapping(part_type);
CREATE INDEX idx_assembly_mapping_critical ON assembly_part_material_mapping(is_critical);
CREATE INDEX idx_assembly_mapping_tenant ON assembly_part_material_mapping(tenant_id);

COMMENT ON TABLE assembly_part_material_mapping IS '组装部件物料映射表';

-- -----------------------------------------------------
-- 8.2 组装过程表
-- -----------------------------------------------------
CREATE TABLE assembly_processes (
    id BIGSERIAL PRIMARY KEY,
    process_code VARCHAR(50) UNIQUE NOT NULL,
    production_order_id BIGINT REFERENCES production_orders(id),
    product_model_id BIGINT REFERENCES product_models(id),
    unit_serial_number VARCHAR(100) UNIQUE NOT NULL,
    robot_body_serial VARCHAR(100),
    control_box_serial VARCHAR(100),
    teaching_pendant_serial VARCHAR(100),
    cable_serial VARCHAR(100),
    assembler_id UUID REFERENCES profiles(id),
    assembly_start_time TIMESTAMP,
    assembly_end_time TIMESTAMP,
    assembly_duration INTEGER,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'rework')),
    quality_status VARCHAR(20) DEFAULT 'pending' CHECK (quality_status IN ('pending', 'passed', 'failed')),
    tenant_id VARCHAR(20) DEFAULT 'JP' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assembly_processes_code ON assembly_processes(process_code);
CREATE INDEX idx_assembly_processes_order ON assembly_processes(production_order_id);
CREATE INDEX idx_assembly_processes_serial ON assembly_processes(unit_serial_number);
CREATE INDEX idx_assembly_processes_status ON assembly_processes(status);
CREATE INDEX idx_assembly_processes_tenant ON assembly_processes(tenant_id);

COMMENT ON TABLE assembly_processes IS '组装过程表';

-- -----------------------------------------------------
-- 8.3 老化测试表
-- -----------------------------------------------------
CREATE TABLE aging_tests (
    id BIGSERIAL PRIMARY KEY,
    test_code VARCHAR(50) UNIQUE NOT NULL,
    assembly_id BIGINT REFERENCES assembly_processes(id),
    unit_serial_number VARCHAR(100) NOT NULL,
    test_start_time TIMESTAMP NOT NULL,
    test_end_time TIMESTAMP,
    required_duration INTEGER NOT NULL,
    actual_duration INTEGER,
    accumulated_time INTEGER DEFAULT 0,
    temperature_setting DECIMAL(5,2),
    humidity_setting DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')),
    result VARCHAR(20) CHECK (result IN ('passed', 'failed', 'pending')),
    failure_reason TEXT,
    tenant_id VARCHAR(20) DEFAULT 'JP' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_aging_tests_code ON aging_tests(test_code);
CREATE INDEX idx_aging_tests_assembly ON aging_tests(assembly_id);
CREATE INDEX idx_aging_tests_serial ON aging_tests(unit_serial_number);
CREATE INDEX idx_aging_tests_status ON aging_tests(status);
CREATE INDEX idx_aging_tests_tenant ON aging_tests(tenant_id);

COMMENT ON TABLE aging_tests IS '老化测试表';

-- -----------------------------------------------------
-- 8.4 最终测试表
-- -----------------------------------------------------
CREATE TABLE final_tests (
    id BIGSERIAL PRIMARY KEY,
    test_code VARCHAR(50) UNIQUE NOT NULL,
    aging_test_id BIGINT REFERENCES aging_tests(id),
    unit_serial_number VARCHAR(100) NOT NULL,
    test_date TIMESTAMP NOT NULL,
    tester_id UUID REFERENCES profiles(id),
    test_items JSONB,
    test_result VARCHAR(20) DEFAULT 'pending' CHECK (test_result IN ('pending', 'passed', 'failed')),
    failure_items TEXT,
    remarks TEXT,
    tenant_id VARCHAR(20) DEFAULT 'JP' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_final_tests_code ON final_tests(test_code);
CREATE INDEX idx_final_tests_aging ON final_tests(aging_test_id);
CREATE INDEX idx_final_tests_serial ON final_tests(unit_serial_number);
CREATE INDEX idx_final_tests_result ON final_tests(test_result);
CREATE INDEX idx_final_tests_tenant ON final_tests(tenant_id);

COMMENT ON TABLE final_tests IS '最终测试表';

-- -----------------------------------------------------
-- 8.5 QA放行表
-- -----------------------------------------------------
CREATE TABLE qa_releases (
    id BIGSERIAL PRIMARY KEY,
    release_code VARCHAR(50) UNIQUE NOT NULL,
    final_test_id BIGINT REFERENCES final_tests(id),
    unit_serial_number VARCHAR(100) NOT NULL,
    release_date TIMESTAMP NOT NULL,
    qa_inspector_id UUID REFERENCES profiles(id),
    release_status VARCHAR(20) DEFAULT 'pending' CHECK (release_status IN ('pending', 'released', 'blocked')),
    block_reason TEXT,
    remarks TEXT,
    tenant_id VARCHAR(20) DEFAULT 'JP' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_qa_releases_code ON qa_releases(release_code);
CREATE INDEX idx_qa_releases_test ON qa_releases(final_test_id);
CREATE INDEX idx_qa_releases_serial ON qa_releases(unit_serial_number);
CREATE INDEX idx_qa_releases_status ON qa_releases(release_status);
CREATE INDEX idx_qa_releases_tenant ON qa_releases(tenant_id);

COMMENT ON TABLE qa_releases IS 'QA放行表';

-- -----------------------------------------------------
-- 8.6 完成整机追溯表
-- -----------------------------------------------------
CREATE TABLE finished_unit_traceability (
    id BIGSERIAL PRIMARY KEY,
    unit_serial_number VARCHAR(100) UNIQUE NOT NULL,
    production_order_id BIGINT REFERENCES production_orders(id),
    product_model_id BIGINT REFERENCES product_models(id),
    assembly_id BIGINT REFERENCES assembly_processes(id),
    aging_test_id BIGINT REFERENCES aging_tests(id),
    final_test_id BIGINT REFERENCES final_tests(id),
    qa_release_id BIGINT REFERENCES qa_releases(id),
    final_test_status VARCHAR(20),
    qa_release_status VARCHAR(20),
    completed_at TIMESTAMP,
    tenant_id VARCHAR(20) DEFAULT 'JP' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_finished_unit_serial ON finished_unit_traceability(unit_serial_number);
CREATE INDEX idx_finished_unit_order ON finished_unit_traceability(production_order_id);
CREATE INDEX idx_finished_unit_model ON finished_unit_traceability(product_model_id);
CREATE INDEX idx_finished_unit_tenant ON finished_unit_traceability(tenant_id);

COMMENT ON TABLE finished_unit_traceability IS '完成整机追溯表';

-- =====================================================
-- 第九部分：异常管理
-- =====================================================

-- -----------------------------------------------------
-- 9.1 运营异常表
-- -----------------------------------------------------
CREATE TABLE operation_exceptions (
    id BIGSERIAL PRIMARY KEY,
    exception_code VARCHAR(50) UNIQUE NOT NULL,
    exception_type VARCHAR(30) NOT NULL CHECK (exception_type IN (
      'logistics_timeout', 'receiving_variance', 'iqc_ng', 'assembly_blocked',
      'aging_failure', 'final_test_ng', 'qa_blocked', 'shipment_blocked', 'other'
    )),
    severity VARCHAR(10) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'escalated')),
    source_module VARCHAR(50),
    source_id BIGINT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    root_cause TEXT,
    action_plan TEXT,
    resolution TEXT,
    owner_id UUID REFERENCES profiles(id),
    assigned_to UUID REFERENCES profiles(id),
    reported_by UUID REFERENCES profiles(id),
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    due_date TIMESTAMP,
    tenant_id VARCHAR(20) DEFAULT 'BOTH' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_operation_exceptions_code ON operation_exceptions(exception_code);
CREATE INDEX idx_operation_exceptions_type ON operation_exceptions(exception_type);
CREATE INDEX idx_operation_exceptions_status ON operation_exceptions(status);
CREATE INDEX idx_operation_exceptions_severity ON operation_exceptions(severity);
CREATE INDEX idx_operation_exceptions_source ON operation_exceptions(source_module, source_id);
CREATE INDEX idx_operation_exceptions_tenant ON operation_exceptions(tenant_id);

COMMENT ON TABLE operation_exceptions IS '运营异常表';

-- -----------------------------------------------------
-- 9.2 质量异常表
-- -----------------------------------------------------
CREATE TABLE quality_exceptions (
    id BIGSERIAL PRIMARY KEY,
    exception_code VARCHAR(50) UNIQUE NOT NULL,
    exception_type VARCHAR(30) NOT NULL,
    severity VARCHAR(10) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    source_type VARCHAR(30),
    source_id BIGINT,
    part_no VARCHAR(50),
    batch_no VARCHAR(50),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    root_cause TEXT,
    corrective_action TEXT,
    preventive_action TEXT,
    owner_id UUID REFERENCES profiles(id),
    reported_by UUID REFERENCES profiles(id),
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    tenant_id VARCHAR(20) DEFAULT 'BOTH' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quality_exceptions_code ON quality_exceptions(exception_code);
CREATE INDEX idx_quality_exceptions_type ON quality_exceptions(exception_type);
CREATE INDEX idx_quality_exceptions_status ON quality_exceptions(status);
CREATE INDEX idx_quality_exceptions_source ON quality_exceptions(source_type, source_id);
CREATE INDEX idx_quality_exceptions_part ON quality_exceptions(part_no);
CREATE INDEX idx_quality_exceptions_tenant ON quality_exceptions(tenant_id);

COMMENT ON TABLE quality_exceptions IS '质量异常表';

-- =====================================================
-- 第十部分：审计与追溯
-- =====================================================

-- -----------------------------------------------------
-- 10.1 审计日志表
-- -----------------------------------------------------
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100),
    record_id BIGINT,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    tenant_id VARCHAR(20) CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);

COMMENT ON TABLE audit_logs IS '审计日志表（不可篡改）';

-- -----------------------------------------------------
-- 10.2 批次追溯码表
-- -----------------------------------------------------
CREATE TABLE batch_traceability_codes (
    id BIGSERIAL PRIMARY KEY,
    batch_code VARCHAR(100) UNIQUE NOT NULL,
    product_model_id BIGINT REFERENCES product_models(id),
    production_date DATE NOT NULL,
    expiry_date DATE,
    quantity INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'expired', 'recalled')),
    tenant_id VARCHAR(20) DEFAULT 'CN' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_batch_codes_code ON batch_traceability_codes(batch_code);
CREATE INDEX idx_batch_codes_model ON batch_traceability_codes(product_model_id);
CREATE INDEX idx_batch_codes_status ON batch_traceability_codes(status);
CREATE INDEX idx_batch_codes_tenant ON batch_traceability_codes(tenant_id);

COMMENT ON TABLE batch_traceability_codes IS '批次追溯码表';

-- =====================================================
-- 第十一部分：检验照片
-- =====================================================

-- -----------------------------------------------------
-- 11.1 检验照片表（统一照片表）
-- -----------------------------------------------------
CREATE TABLE inspection_photos (
    id BIGSERIAL PRIMARY KEY,
    inspection_id BIGINT NOT NULL,
    inspection_type VARCHAR(20) NOT NULL CHECK (inspection_type IN ('quality', 'iqc', 'receiving', 'assembly', 'other')),
    photo_url TEXT NOT NULL,
    photo_type VARCHAR(20) CHECK (photo_type IN ('defect', 'normal', 'comparison', 'other')),
    description TEXT,
    uploaded_by UUID REFERENCES profiles(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tenant_id VARCHAR(20) DEFAULT 'BOTH' CHECK (tenant_id IN ('CN', 'JP', 'BOTH'))
);

CREATE INDEX idx_inspection_photos_inspection ON inspection_photos(inspection_id, inspection_type);
CREATE INDEX idx_inspection_photos_type ON inspection_photos(photo_type);
CREATE INDEX idx_inspection_photos_tenant ON inspection_photos(tenant_id);

COMMENT ON TABLE inspection_photos IS '检验照片表（统一照片表，通过 inspection_type 区分不同检验类型）';
COMMENT ON COLUMN inspection_photos.inspection_type IS '检验类型：quality=质量检验, iqc=IQC检验, receiving=收货检验, assembly=组装检验';

-- =====================================================
-- 第十二部分：辅助函数
-- =====================================================

-- -----------------------------------------------------
-- 12.1 用户触发器函数
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
  username_value text;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  -- 从email中提取用户名
  username_value := REPLACE(NEW.email, '@miaoda.com', '');
  
  -- 插入profile记录
  INSERT INTO public.profiles (id, username, email, phone, role, tenant_id)
  VALUES (
    NEW.id,
    username_value,
    NEW.email,
    NEW.phone,
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END,
    CASE WHEN user_count = 0 THEN 'BOTH' ELSE 'CN' END
  );
  RETURN NEW;
END;
$$;

-- 创建触发器
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();

-- -----------------------------------------------------
-- 12.2 权限检查函数
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION has_role(uid uuid, role_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = uid AND p.role::text = role_name
  );
$$;

CREATE OR REPLACE FUNCTION can_access_tenant(uid uuid, target_tenant text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = uid 
    AND (p.tenant_id = target_tenant OR p.tenant_id = 'BOTH' OR p.role IN ('admin', 'executive', 'system_admin'))
  );
$$;

-- -----------------------------------------------------
-- 12.3 审计日志保护函数
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '审计日志不可修改或删除';
  RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_prevent_audit_log_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER trigger_prevent_audit_log_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

-- =====================================================
-- 结束
-- =====================================================

COMMENT ON SCHEMA public IS '中国协作机器人日本委托组装业务数据库 - Baseline Schema v1.0';
