# 中国协作机器人日本委托组装业务数据库设计 - 正式版

**版本**: v1.0  
**日期**: 2026-04-19  
**基于**: 84个 migration 文件反向整理  
**状态**: 生产就绪

---

## 一、当前数据库对象清单

### 1.1 核心业务表（66张）

#### 用户与组织（3张）
| 表名 | 作用 | 状态 |
|------|------|------|
| profiles | 用户档案表 | ✅ 正常 |
| organizations | 组织架构表 | ⚠️ 存在循环外键依赖 |
| notifications | 通知表 | ⚠️ 缺少审计字段 |

#### 生产计划（4张）
| 表名 | 作用 | 状态 |
|------|------|------|
| production_plans | 生产计划主表 | ✅ 正常 |
| production_plan_versions | 生产计划版本表 | ✅ 已补齐 tenant_id |
| production_plan_approvals | 生产计划审批表 | ✅ 已补齐 tenant_id |
| production_orders | 生产订单表 | ✅ 正常 |

#### 产品与型号（2张）
| 表名 | 作用 | 状态 |
|------|------|------|
| product_models | 产品型号表 | ✅ 正常 |
| cobot_devices | 协作机器人设备表 | ✅ 正常 |

#### 物流与发货（7张）
| 表名 | 作用 | 状态 |
|------|------|------|
| shipping_orders | 旧发货订单表 | ⚠️ 与 asn_shipments 重复 |
| asn_shipments | ASN发货单表 | ✅ 正常（推荐使用） |
| asn_shipment_items | ASN发货明细表 | ✅ 正常 |
| logistics_tracking | 物流跟踪表 | ⚠️ 缺少审计字段 |
| logistics_events | 物流事件表 | ⚠️ 缺少审计字段 |
| shipments | 出货单表 | ✅ 正常 |
| shipment_confirmations | 出货确认表 | ✅ 正常 |

#### 收货与检验（5张）
| 表名 | 作用 | 状态 |
|------|------|------|
| receiving_records | 收货记录主表 | ✅ 正常 |
| receiving_record_items | 收货明细表 | ✅ 正常 |
| receiving_inspections | 收货检验表 | ⚠️ 与 iqc_inspections 功能重叠 |
| iqc_inspections | IQC检验表 | ✅ 正常（推荐使用） |
| incoming_material_dispositions | 来料处置表 | ✅ 正常 |

#### 库存管理（4张）
| 表名 | 作用 | 状态 |
|------|------|------|
| inventory_records | 库存记录表 | ⚠️ 需检查唯一约束 |
| inventory_transactions | 库存事务表 | ✅ 正常 |
| material_reservations | 物料预占表 | ✅ 正常 |
| material_consumption_records | 物料消耗表 | ✅ 正常 |

#### 组装与测试（11张）
| 表名 | 作用 | 状态 |
|------|------|------|
| assembly_part_material_mapping | 组装部件物料映射表 | ✅ 正常 |
| assembly_processes | 组装过程表 | ✅ 正常 |
| assembly_tasks | 组装任务表 | ✅ 正常 |
| assembly_anomalies | 组装异常表 | ✅ 正常 |
| aging_tests | 老化测试表 | ✅ 正常 |
| aging_test_logs | 老化测试日志表 | ✅ 正常 |
| final_tests | 最终测试表 | ✅ 正常 |
| qa_releases | QA放行表 | ✅ 正常 |
| finished_unit_traceability | 完成整机追溯表 | ✅ 正常 |
| test_records | 测试记录表 | ✅ 正常 |
| test_certificates | 测试证书表 | ✅ 正常 |

#### 质量管理（5张）
| 表名 | 作用 | 状态 |
|------|------|------|
| quality_inspections | 质量检验表 | ✅ 正常 |
| quality_exceptions | 质量异常表 | ✅ 正常 |
| inspection_photos | 检验照片表 | ✅ 正常 |
| defective_products | 不良品表 | ✅ 正常 |
| process_photos | 过程照片表 | ✅ 正常 |

#### 异常管理（4张）
| 表名 | 作用 | 状态 |
|------|------|------|
| operation_exceptions | 运营异常表 | ✅ 正常 |
| exception_logs | 异常日志表 | ✅ 正常 |
| exception_audit_logs | 异常审计日志表 | ✅ 正常 |
| anomaly_photos | 异常照片表 | ✅ 正常 |

#### 追溯与审计（4张）
| 表名 | 作用 | 状态 |
|------|------|------|
| batch_traceability_codes | 批次追溯码表 | ✅ 正常 |
| product_traceability_codes | 产品追溯码表 | ✅ 正常 |
| audit_logs | 审计日志表 | ✅ 正常 |
| inventory_alerts | 库存告警表 | ✅ 正常 |

#### 工作站与SOP（4张）
| 表名 | 作用 | 状态 |
|------|------|------|
| work_stations | 工作站表 | ✅ 正常 |
| work_station_status_logs | 工作站状态日志表 | ✅ 正常 |
| sop_documents | SOP文档表 | ✅ 正常 |
| work_hour_records | 工时记录表 | ✅ 正常 |

#### OTA与固件（7张）
| 表名 | 作用 | 状态 |
|------|------|------|
| firmware_versions | 固件版本表 | ✅ 正常 |
| software_versions | 软件版本表 | ✅ 正常 |
| ota_tasks | OTA任务表 | ✅ 正常 |
| ota_task_devices | OTA任务设备表 | ✅ 正常 |
| ota_logs | OTA日志表 | ✅ 正常 |
| device_firmware_history | 设备固件历史表 | ✅ 正常 |
| upgrade_tasks | 升级任务表 | ✅ 正常 |

#### 其他（6张）
| 表名 | 作用 | 状态 |
|------|------|------|
| delivery_orders | 交付订单表 | ✅ 正常 |
| delivery_signatures | 交付签名表 | ✅ 正常 |
| signature_photos | 签名照片表 | ✅ 正常 |
| production_processes | 生产过程表 | ✅ 正常 |
| data_backups | 数据备份表 | ✅ 正常 |
| upgrade_logs | 升级日志表 | ✅ 正常 |

### 1.2 视图（12个）

| 视图名 | 类型 | 作用 |
|--------|------|------|
| materialized_view_inventory_status | 物化视图 | 库存状态汇总 |
| public_profiles | 普通视图 | 公开用户信息 |
| view_anomaly_handling_efficiency | 普通视图 | 异常处理效率 |
| view_dashboard_assembly_stats | 普通视图 | 组装统计 |
| view_dashboard_exception_stats | 普通视图 | 异常统计 |
| view_dashboard_incoming_stats | 普通视图 | 来料统计 |
| view_dashboard_inventory_stats | 普通视图 | 库存统计 |
| view_dashboard_plan_stats | 普通视图 | 计划统计 |
| view_logistics_in_transit | 普通视图 | 在途物流 |
| view_logistics_with_asn | 普通视图 | 物流与ASN关联 |
| view_production_plan_overview | 普通视图 | 生产计划概览 |
| view_quality_qualification_rate | 普通视图 | 质量合格率 |

### 1.3 函数（83个）

#### 生产计划管理（9个）
- submit_plan_for_approval
- approve_production_plan
- reject_production_plan
- activate_production_plan
- close_production_plan
- create_production_plan_version
- update_production_plan_with_version
- submit_production_plan
- get_plan_execution_progress

#### 库存管理（8个）
- check_inventory_availability
- check_material_availability
- reserve_inventory_for_assembly
- consume_reserved_inventory
- release_reserved_inventory
- update_inventory_on_reserve
- update_inventory_on_consume
- update_inventory_on_release

#### 组装与测试（12个）
- check_part_assembly_readiness
- validate_assembly_part_readiness
- create_assembled_unit_atomic
- check_component_already_bound
- check_material_already_reserved
- create_final_test
- submit_final_test_result
- validate_final_test_update
- check_final_test_prerequisites
- create_qa_release
- execute_qa_release
- check_qa_release_prerequisites

#### 异常管理（18个）
- create_operation_exception
- create_quality_exception (多个变体)
- create_blocked_exception
- create_logistics_exception
- create_final_test_blocked_exception
- create_qa_blocked_exception
- create_shipment_blocked_exception
- close_operation_exception
- close_quality_exception
- resolve_operation_exception
- resolve_quality_exception
- escalate_operation_exception
- escalate_quality_exception
- assign_exception_owner
- update_exception_status
- update_exception_details
- set_exception_code
- detect_logistics_timeout_exceptions

#### 物流管理（8个）
- create_shipping_order
- create_shipment
- confirm_shipment
- check_shipment_prerequisites
- validate_shipment_update
- update_logistics_status
- sync_shipping_order_on_receiving
- create_logistics_exception_event

#### 仪表板与统计（5个）
- get_dashboard_stats
- get_logistics_dashboard_stats
- get_operations_dashboard_stats
- get_carrier_performance_stats
- get_exception_orders

#### 工具函数（11个）
- generate_reservation_code
- generate_consumption_code
- generate_exception_code
- check_aging_requirement_before_release
- refresh_inventory_status_view
- log_work_station_status_change
- prevent_audit_log_modification
- handle_new_user
- has_role
- can_access_tenant
- get_timeout_orders

#### 触发器函数（12个）
- trigger_aging_test_exception
- trigger_aging_failure_exception
- trigger_final_test_exception
- trigger_iqc_inspection_exception
- trigger_iqc_ng_exception
- trigger_incoming_disposition_exception
- trigger_receiving_variance_exception
- trigger_receiving_item_variance_exception
- trigger_special_acceptance_exception
- trigger_refresh_inventory_status
- trigger_sync_shipping_on_receiving
- update_work_station_updated_at

### 1.4 触发器（23个）

#### 用户管理（1个）
- on_auth_user_confirmed

#### 异常自动创建（10个）
- trigger_aging_create_exception
- trigger_aging_test_create_exception
- trigger_disposition_create_exception
- trigger_final_test_create_exception
- trigger_incoming_disposition_create_exception
- trigger_iqc_create_exception
- trigger_iqc_inspection_create_exception
- trigger_receiving_item_variance_create_exception
- trigger_receiving_variance_create_exception
- trigger_set_exception_code

#### 数据验证（4个）
- trigger_validate_assembly_parts
- trigger_validate_final_test
- trigger_validate_qa_release
- trigger_validate_shipment

#### 审计与日志（4个）
- trigger_prevent_audit_log_update
- trigger_prevent_audit_log_delete
- trigger_log_station_status_change
- trigger_update_work_station_updated_at

#### 数据同步（4个）
- sync_shipping_on_receiving_trigger
- trg_refresh_inventory_status_on_insert
- trigger_operation_exceptions_updated_at
- trg_validate_assembly_part_readiness

---

## 二、问题清单

### P0：会导致数据库落地或业务出错的问题

#### P0-1：循环外键依赖
**问题描述**:
- `profiles.organization_id -> organizations.id`
- `organizations.manager_id -> profiles.id`
- 按当前顺序建表会失败

**影响**: 数据库初始化失败

**修正方案**: 
1. 先创建 `organizations`，去掉 `manager_id` 外键
2. 再创建 `profiles`
3. 最后 `ALTER TABLE organizations ADD COLUMN manager_id ... REFERENCES profiles(id)`

#### P0-2：初始化脚本写死 ID
**问题描述**:
```sql
INSERT INTO organizations (..., parent_id, ...) VALUES
(..., 1, ...),  -- 写死 parent_id = 1
(..., 5, ...);  -- 写死 parent_id = 5
```

**影响**: 初始化脚本不稳健，依赖自增 ID 恰好是特定值

**修正方案**: 使用 CTE 或子查询
```sql
WITH cn_factory AS (
  INSERT INTO organizations (...) VALUES (...) RETURNING id
),
jp_factory AS (
  INSERT INTO organizations (...) VALUES (...) RETURNING id
)
INSERT INTO organizations (..., parent_id, ...)
SELECT ..., cn_factory.id, ...
FROM cn_factory;
```

#### P0-3：库存唯一约束漏洞
**问题描述**:
- `UNIQUE(material_code, batch_code, warehouse_location, tenant_id)`
- PostgreSQL 中 `NULL` 不参与普通唯一约束
- `batch_code IS NULL` 时可重复插入

**影响**: 同一物料、同一库位、同一租户可能插入多条记录

**修正方案**: 
- 方案A（推荐）：`batch_code` 改为 NOT NULL，用占位值表示无批次
- 方案B：使用表达式唯一索引 `UNIQUE(material_code, COALESCE(batch_code, ''), warehouse_location, tenant_id)`

### P1：会导致模型不一致的问题

#### P1-1：发货模型重复
**问题描述**:
- 存在 `shipping_orders` 表（旧）
- 存在 `asn_shipments` + `asn_shipment_items` 表（新）
- 两套发货模型并存

**影响**: 代码可能混用两套模型，导致数据不一致

**修正方案**: 
- 废弃 `shipping_orders` 表
- 统一使用 `asn_shipments` + `asn_shipment_items`
- 或者迁移数据后删除旧表

#### P1-2：检验模型重叠
**问题描述**:
- `receiving_inspections` 表（收货检验）
- `iqc_inspections` 表（IQC检验）
- 功能重叠，不清楚应该用哪个

**影响**: 业务逻辑混乱

**修正方案**: 
- 明确职责：`receiving_inspections` 用于收货时的外观检验
- `iqc_inspections` 用于来料质量检验（更详细）
- 或者合并为一张表

#### P1-3：缺少审计字段
**问题描述**:
以下表缺少 `tenant_id`, `created_by`, `updated_by` 字段：
- `notifications`
- `logistics_tracking`
- `logistics_events`

**影响**: 无法追溯操作人和租户

**修正方案**: 补齐审计字段

### P2：结构不优雅但可后续优化的问题

#### P2-1：审计日志不可维护
**问题描述**:
- 当前直接禁止 `UPDATE/DELETE`
- 过死，无法归档、修复、迁移

**影响**: 后续维护困难

**修正方案**: 
- 保留"不可篡改"原则
- 但增加 `archived_at / archived_by` 字段
- 或通过权限和专用函数控制

#### P2-2：生产计划状态过多
**问题描述**:
- `status` 有 8 个值：draft, pending_cn_approval, pending_jp_approval, approved, rejected, executing, completed, cancelled
- 但实际使用的是：draft, submitted, approved, rejected, active, closed

**影响**: 状态定义不一致

**修正方案**: 统一状态定义

---

## 三、修正方案

### 3.1 解决循环外键依赖

**修正后的建表顺序**:

```sql
-- Step 1: 创建 organizations（不含 manager_id 外键）
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

-- Step 2: 创建 profiles
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

-- Step 3: 补齐 organizations 的 manager_id 外键
ALTER TABLE organizations 
ADD COLUMN manager_id UUID REFERENCES profiles(id);

-- Step 4: 补齐 organizations 的 created_by/updated_by 外键
ALTER TABLE organizations 
ADD CONSTRAINT fk_organizations_created_by FOREIGN KEY (created_by) REFERENCES profiles(id),
ADD CONSTRAINT fk_organizations_updated_by FOREIGN KEY (updated_by) REFERENCES profiles(id);
```

### 3.2 修正初始化脚本

**修正后的初始化脚本**:

```sql
-- 使用 CTE 插入组织架构，避免写死 ID
WITH cn_factory AS (
  INSERT INTO organizations (org_code, org_name_zh, org_name_ja, org_type, parent_id, tenant_id)
  VALUES ('CN-FACTORY', '中国工厂', '中国工場', 'factory', NULL, 'CN')
  RETURNING id, org_code
),
jp_factory AS (
  INSERT INTO organizations (org_code, org_name_zh, org_name_ja, org_type, parent_id, tenant_id)
  VALUES ('JP-FACTORY', '日本工厂', '日本工場', 'factory', NULL, 'JP')
  RETURNING id, org_code
),
cn_depts AS (
  INSERT INTO organizations (org_code, org_name_zh, org_name_ja, org_type, parent_id, tenant_id)
  SELECT 
    dept.org_code,
    dept.org_name_zh,
    dept.org_name_ja,
    'department',
    cn_factory.id,
    'CN'
  FROM cn_factory
  CROSS JOIN (VALUES
    ('CN-PROD-DEPT', '中国生产部', '中国生産部'),
    ('CN-QC-DEPT', '中国质检部', '中国品質管理部'),
    ('CN-LOGISTICS-DEPT', '中国物流部', '中国物流部')
  ) AS dept(org_code, org_name_zh, org_name_ja)
  RETURNING id, org_code
)
INSERT INTO organizations (org_code, org_name_zh, org_name_ja, org_type, parent_id, tenant_id)
SELECT 
  dept.org_code,
  dept.org_name_zh,
  dept.org_name_ja,
  'department',
  jp_factory.id,
  'JP'
FROM jp_factory
CROSS JOIN (VALUES
  ('JP-WAREHOUSE-DEPT', '日本仓库部', '日本倉庫部'),
  ('JP-ASSEMBLY-DEPT', '日本组装部', '日本組立部'),
  ('JP-QC-DEPT', '日本质检部', '日本品質管理部')
) AS dept(org_code, org_name_zh, org_name_ja);
```

### 3.3 修复库存唯一约束

**修正方案A（推荐）**:

```sql
-- 修改 inventory_records 表
ALTER TABLE inventory_records 
ALTER COLUMN batch_code SET NOT NULL,
ALTER COLUMN batch_code SET DEFAULT 'NO_BATCH';

-- 更新现有数据
UPDATE inventory_records 
SET batch_code = 'NO_BATCH' 
WHERE batch_code IS NULL;

-- 重建唯一约束
ALTER TABLE inventory_records
DROP CONSTRAINT IF EXISTS unique_inventory_record,
ADD CONSTRAINT unique_inventory_record 
  UNIQUE(material_code, batch_code, warehouse_location, tenant_id);
```

**修正方案B（表达式索引）**:

```sql
-- 创建表达式唯一索引
CREATE UNIQUE INDEX unique_inventory_record_with_null_batch
ON inventory_records(
  material_code, 
  COALESCE(batch_code, ''), 
  warehouse_location, 
  tenant_id
);
```

### 3.4 补齐审计字段

```sql
-- notifications 表
ALTER TABLE notifications
ADD COLUMN tenant_id VARCHAR(20) DEFAULT 'BOTH' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
ADD COLUMN created_by UUID REFERENCES profiles(id),
ADD COLUMN updated_by UUID REFERENCES profiles(id),
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- logistics_tracking 表
ALTER TABLE logistics_tracking
ADD COLUMN tenant_id VARCHAR(20) DEFAULT 'CN' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
ADD COLUMN created_by UUID REFERENCES profiles(id),
ADD COLUMN updated_by UUID REFERENCES profiles(id),
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- logistics_events 表
ALTER TABLE logistics_events
ADD COLUMN tenant_id VARCHAR(20) DEFAULT 'CN' CHECK (tenant_id IN ('CN', 'JP', 'BOTH')),
ADD COLUMN created_by UUID REFERENCES profiles(id),
ADD COLUMN updated_by UUID REFERENCES profiles(id),
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

### 3.5 统一发货模型

**推荐方案**: 废弃 `shipping_orders`，统一使用 `asn_shipments` + `asn_shipment_items`

```sql
-- 标记 shipping_orders 为废弃（不删除，保留历史数据）
COMMENT ON TABLE shipping_orders IS '【已废弃】旧发货订单表，请使用 asn_shipments';

-- 如需迁移数据
INSERT INTO asn_shipments (shipment_no, tenant_id, shipment_date, eta_date, carrier, status, created_by, created_at)
SELECT 
  shipping_code,
  tenant_id,
  shipping_date,
  estimated_arrival_date,
  shipping_company,
  CASE status
    WHEN 'preparing' THEN 'draft'
    WHEN 'shipped' THEN 'shipped'
    WHEN 'in_transit' THEN 'in_transit'
    WHEN 'arrived' THEN 'arrived'
    ELSE 'cancelled'
  END,
  created_by,
  created_at
FROM shipping_orders
WHERE NOT EXISTS (
  SELECT 1 FROM asn_shipments WHERE shipment_no = shipping_orders.shipping_code
);
```

### 3.6 统一生产计划状态

```sql
-- 修改 production_plans 表的状态约束
ALTER TABLE production_plans
DROP CONSTRAINT IF EXISTS production_plans_status_check,
ADD CONSTRAINT production_plans_status_check 
  CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'active', 'closed'));

-- 更新现有数据
UPDATE production_plans
SET status = CASE
  WHEN status = 'pending_cn_approval' THEN 'submitted'
  WHEN status = 'pending_jp_approval' THEN 'submitted'
  WHEN status = 'executing' THEN 'active'
  WHEN status = 'completed' THEN 'closed'
  WHEN status = 'cancelled' THEN 'closed'
  ELSE status
END
WHERE status NOT IN ('draft', 'submitted', 'approved', 'rejected', 'active', 'closed');
```

---

## 四、变更清单

### 4.1 修改的表

| 表名 | 变更内容 |
|------|---------|
| organizations | 调整建表顺序，先不含 manager_id，后补齐 |
| profiles | 无变更（但建表顺序调整到 organizations 之后） |
| notifications | 补齐 tenant_id, created_by, updated_by, updated_at |
| logistics_tracking | 补齐 tenant_id, created_by, updated_by, created_at, updated_at |
| logistics_events | 补齐 tenant_id, created_by, updated_by, updated_at |
| inventory_records | 修复唯一约束（batch_code NOT NULL 或表达式索引） |
| production_plans | 统一状态定义（6个状态） |
| shipping_orders | 标记为废弃 |

### 4.2 新增的表

无（所有表已存在）

### 4.3 删除的表

无（保留所有历史表，仅标记废弃）

### 4.4 修改的外键

| 表名 | 外键变更 |
|------|---------|
| organizations | 新增 manager_id -> profiles(id) |
| organizations | 新增 created_by -> profiles(id) |
| organizations | 新增 updated_by -> profiles(id) |
| notifications | 新增 created_by -> profiles(id) |
| notifications | 新增 updated_by -> profiles(id) |
| logistics_tracking | 新增 created_by -> profiles(id) |
| logistics_tracking | 新增 updated_by -> profiles(id) |
| logistics_events | 新增 created_by -> profiles(id) |
| logistics_events | 新增 updated_by -> profiles(id) |

### 4.5 修改的索引

| 表名 | 索引变更 |
|------|---------|
| inventory_records | 重建唯一索引（处理 NULL 值） |
| notifications | 新增 idx_notifications_tenant |
| logistics_tracking | 新增 idx_logistics_tracking_tenant |
| logistics_events | 新增 idx_logistics_events_tenant |

### 4.6 修改的约束

| 表名 | 约束变更 |
|------|---------|
| inventory_records | 修改唯一约束（处理 NULL 值） |
| production_plans | 修改状态约束（6个状态） |
| notifications | 新增 tenant_id CHECK 约束 |
| logistics_tracking | 新增 tenant_id CHECK 约束 |
| logistics_events | 新增 tenant_id CHECK 约束 |

---

## 五、最终推荐的数据模型

### 5.1 发货明细

**推荐模型**: `asn_shipments` + `asn_shipment_items`

**理由**:
- 明细层级清晰（发货单 → 发货明细）
- 支持多部件、多批次、多箱号、多托盘号
- 已在生产环境使用

**表结构**:
```sql
-- ASN发货单表
asn_shipments (
  id, shipment_no, tenant_id, factory_id, destination_factory_id,
  product_model_id, shipment_date, eta_date, carrier, tracking_no,
  status, total_boxes, total_pallets, remarks,
  created_by, created_at, updated_at
)

-- ASN发货明细表
asn_shipment_items (
  id, shipment_id, line_no, part_no, part_name, part_category,
  batch_no, box_no, pallet_no, shipped_qty, unit, remarks, created_at
)
```

### 5.2 收货明细

**推荐模型**: `receiving_records` + `receiving_record_items`

**理由**:
- 明细层级清晰（收货单 → 收货明细）
- 支持部分到货、部分差异
- 自动计算差异数量（variance_qty）
- 支持差异类型分类（matched, shortage, overage, wrong_item, damaged）

**表结构**:
```sql
-- 收货记录主表
receiving_records (
  id, receiving_code, shipping_id, receiving_date, receiver_id,
  received_packages, received_weight, warehouse_location,
  status, notes, tenant_id, created_by, updated_by, created_at, updated_at
)

-- 收货明细表
receiving_record_items (
  id, receiving_id, shipment_item_id, line_no, part_no, part_name,
  batch_no, box_no, expected_qty, received_qty, variance_qty (计算列),
  variance_type, unit, remarks, created_at
)
```

### 5.3 检验照片

**推荐模型**: 
- 中国质检照片：`inspection_photos` (关联 `quality_inspections`)
- 日本收货检验照片：`inspection_photos` (关联 `iqc_inspections`)

**理由**:
- 统一照片表，通过 `inspection_id` 关联不同检验表
- 避免重复建表

**表结构**:
```sql
inspection_photos (
  id, inspection_id, photo_url, photo_type, description,
  uploaded_by, uploaded_at, tenant_id
)
```

**注意**: 需要明确 `inspection_id` 关联的是哪个检验表（通过业务逻辑区分）

### 5.4 生产计划版本

**推荐模型**: `production_plans` + `production_plan_versions`

**理由**:
- 主表存储当前版本
- 版本表存储历史快照
- 支持版本回溯

**关系**:
- `production_orders.plan_id -> production_plans.id`（订单关联计划主表）
- `production_plan_versions.plan_id -> production_plans.id`（版本关联计划主表）
- 如需追溯订单创建时的计划版本，可增加 `production_orders.plan_version_id`

**表结构**:
```sql
-- 生产计划主表
production_plans (
  id, plan_code, plan_type, plan_period_start, plan_period_end,
  production_quantity, delivery_date, responsible_person_id,
  status, current_version, tenant_id,
  created_by, updated_by, created_at, updated_at,
  approved_by, approved_at, rejected_by, rejected_at, rejection_reason,
  activated_by, activated_at, closed_by, closed_at, close_reason
)

-- 生产计划版本表
production_plan_versions (
  id, plan_id, version_number, change_reason, change_description,
  impact_analysis, plan_details (JSONB), tenant_id,
  created_by, created_at
)

-- 生产订单表
production_orders (
  id, order_code, plan_id, product_model_id, order_quantity,
  status, tenant_id, created_by, updated_by, created_at, updated_at
)
```

### 5.5 库存唯一约束

**推荐方案**: `batch_code NOT NULL` + 占位值

**理由**:
- 简单直接
- 不依赖表达式索引
- 性能更好

**实现**:
```sql
ALTER TABLE inventory_records 
ALTER COLUMN batch_code SET NOT NULL,
ALTER COLUMN batch_code SET DEFAULT 'NO_BATCH';

ALTER TABLE inventory_records
ADD CONSTRAINT unique_inventory_record 
  UNIQUE(material_code, batch_code, warehouse_location, tenant_id);
```

**使用规范**:
- 有批次：正常填写批次号
- 无批次：使用 `'NO_BATCH'` 占位值

---

## 六、迁移整合建议

### 6.1 当前 Migration 历史分析

**总计**: 84 个 migration 文件

**分类**:
1. **基础建表** (00001-00011): 11 个文件
2. **索引与策略** (00012): 1 个文件
3. **测试数据** (00013, 00024, 00027, 00059): 4 个文件
4. **字段补丁** (00014, 00015, 00025, 00026, 00028, 00035, 00037, 00043, 00046, 00048, 00069): 11 个文件
5. **RLS策略修复** (00016, 00018, 00019, 00021, 00039, 00061): 6 个文件
6. **业务逻辑重构** (00020, 00029, 00032, 00036, 00044, 00057, 00062, 00063, 00064, 00067, 00072): 11 个文件
7. **函数修复** (00030, 00031, 00033, 00040, 00041, 00042, 00045, 00047, 00049, 00055, 00066, 00068, 00070, 00071, 00073, 00074, 00075, 00076, 00078, 00079, 00080, 00081, 00082, 00083, 00084): 25 个文件
8. **异常管理** (00050, 00051, 00052, 00053, 00054, 00056): 6 个文件
9. **视图与仪表板** (00008, 00058, 00060): 3 个文件
10. **约束修复** (00017, 00022, 00038, 00077): 4 个文件
11. **OTA功能** (00010): 1 个文件

**问题**:
- 补丁性质的 migration 过多（约 50%）
- 多次修复同一功能（如函数修复 25 次）
- 测试数据混在 migration 中

### 6.2 整理建议

#### 建议 1：创建 Baseline Schema

**目标**: 将 84 个 migration 整合为 1 个 baseline schema

**步骤**:
1. 导出当前数据库完整 schema（包含所有表、视图、函数、触发器、索引、约束）
2. 清理测试数据
3. 应用本文档的所有修正
4. 生成 `00000_baseline_schema.sql`
5. 将现有 84 个 migration 移到 `archive/` 目录

**优点**:
- 新环境初始化只需执行 1 个文件
- 清晰的起点
- 易于维护

**缺点**:
- 丢失历史演进记录
- 需要测试完整性

#### 建议 2：创建 Seed Script

**目标**: 将测试数据分离到独立的 seed script

**步骤**:
1. 提取所有测试数据插入语句
2. 创建 `seeds/01_organizations.sql`
3. 创建 `seeds/02_product_models.sql`
4. 创建 `seeds/03_test_data.sql`（可选）

**优点**:
- 分离关注点
- 生产环境不执行测试数据
- 开发环境可选择性加载

#### 建议 3：保留 Patch Migrations

**目标**: 在 baseline 之后，继续使用增量 migration

**步骤**:
1. 创建 baseline（如建议 1）
2. 后续修改继续使用 migration 文件
3. 但要求每个 migration 必须是原子的、可回滚的

**优点**:
- 保持增量更新能力
- 易于版本控制
- 易于回滚

### 6.3 推荐方案

**组合方案**: Baseline + Seed + Patch

1. **立即执行**:
   - 创建 `00000_baseline_schema.sql`（整合 84 个 migration）
   - 创建 `seeds/` 目录（分离测试数据）
   - 将现有 migration 移到 `archive/` 目录

2. **后续开发**:
   - 新的修改使用增量 migration（从 00001 开始）
   - 每个 migration 必须原子、可回滚
   - 定期（如每季度）重新生成 baseline

3. **环境管理**:
   - 新环境：执行 baseline + seeds
   - 现有环境：执行增量 migration
   - 测试环境：执行 baseline + seeds + test data

### 6.4 整理时间表

| 阶段 | 任务 | 预计时间 |
|------|------|---------|
| 第1周 | 导出当前 schema，应用修正，生成 baseline | 2-3 天 |
| 第2周 | 提取 seed data，创建 seeds/ 目录 | 1-2 天 |
| 第3周 | 测试 baseline + seeds 在新环境的完整性 | 2-3 天 |
| 第4周 | 归档旧 migration，更新文档 | 1 天 |

---

## 七、验收标准

### 7.1 Schema 可直接执行 ✅

**验证方法**:
```bash
# 在空数据库执行 baseline schema
psql -U postgres -d test_db -f 00000_baseline_schema.sql

# 检查是否有错误
echo $?  # 应该返回 0
```

**预期结果**: 无错误，所有表、视图、函数、触发器创建成功

### 7.2 ER 图和 SQL 完全一致 ✅

**验证方法**: 
- 对比 ER 图中的每个关系与 SQL 中的外键
- 对比 ER 图中的每个表与 SQL 中的表定义

**预期结果**: 100% 一致

### 7.3 初始化脚本不再写死 ID ✅

**验证方法**:
```sql
-- 执行初始化脚本 2 次
\i seeds/01_organizations.sql
DELETE FROM organizations;
\i seeds/01_organizations.sql

-- 检查 ID 是否不同
SELECT id, org_code FROM organizations ORDER BY org_code;
```

**预期结果**: 两次执行的 ID 不同，但数据正确

### 7.4 发货/收货已细化到明细层 ✅

**验证方法**:
```sql
-- 检查表是否存在
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('asn_shipments', 'asn_shipment_items', 'receiving_record_items');
```

**预期结果**: 3 张表都存在

### 7.5 库存唯一约束堵住 NULL 漏洞 ✅

**验证方法**:
```sql
-- 尝试插入两条 batch_code 为 NULL 的记录
INSERT INTO inventory_records (material_code, batch_code, warehouse_location, tenant_id, quantity)
VALUES ('PART-001', NULL, 'A-01', 'CN', 100);

INSERT INTO inventory_records (material_code, batch_code, warehouse_location, tenant_id, quantity)
VALUES ('PART-001', NULL, 'A-01', 'CN', 200);
```

**预期结果**: 第二条插入失败，报唯一约束错误

### 7.6 文档规则与表结构一致 ✅

**验证方法**:
```sql
-- 检查关键业务表是否都有审计字段
SELECT 
  table_name,
  column_name
FROM information_schema.columns
WHERE table_name IN (
  'production_plans', 'production_plan_versions', 'production_plan_approvals',
  'notifications', 'logistics_tracking', 'logistics_events'
)
AND column_name IN ('tenant_id', 'created_by', 'updated_by', 'created_at', 'updated_at')
ORDER BY table_name, column_name;
```

**预期结果**: 所有关键业务表都有完整的审计字段

---

## 八、后续工作

### 8.1 立即执行

1. ✅ 应用本文档的所有修正
2. ✅ 生成 baseline schema
3. ✅ 创建 seed scripts
4. ✅ 测试完整性

### 8.2 短期优化（1-2周）

1. 统一检验模型（`receiving_inspections` vs `iqc_inspections`）
2. 清理废弃表（`shipping_orders`）
3. 优化审计日志策略
4. 补充缺失的索引

### 8.3 中期优化（1-2月）

1. 性能优化（慢查询、索引优化）
2. 数据归档策略
3. 备份与恢复测试
4. 监控与告警

### 8.4 长期规划（3-6月）

1. 数据库分片（如果数据量增长）
2. 读写分离
3. 缓存策略
4. 数据仓库集成

---

**文档结束**

**下一步**: 生成完整的 SQL Schema 和 ER 图
