# 数据库 ER 图 - 核心业务流程

## 完整 ER 图（Mermaid 格式）

```mermaid
erDiagram
    %% =====================================================
    %% 用户与组织
    %% =====================================================
    
    profiles ||--o{ organizations : "manages"
    organizations ||--o{ organizations : "parent_of"
    profiles }o--|| organizations : "belongs_to"
    
    profiles {
        uuid id PK
        varchar username UK
        varchar full_name
        varchar email
        varchar phone
        varchar language_preference
        bigint organization_id FK
        varchar tenant_id
        user_role role
        varchar status
        timestamp last_login_at
        timestamp created_at
        timestamp updated_at
    }
    
    organizations {
        bigserial id PK
        varchar org_code UK
        varchar org_name_zh
        varchar org_name_ja
        varchar org_type
        bigint parent_id FK
        varchar tenant_id
        uuid manager_id FK
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    %% =====================================================
    %% 产品与型号
    %% =====================================================
    
    product_models ||--o{ production_plans : "planned_for"
    product_models ||--o{ production_orders : "ordered_for"
    product_models ||--o{ asn_shipments : "shipped_as"
    product_models ||--o{ assembly_part_material_mapping : "requires"
    product_models ||--o{ cobot_devices : "instantiated_as"
    
    product_models {
        bigserial id PK
        varchar model_code UK
        varchar model_name_zh
        varchar model_name_ja
        varchar model_category
        jsonb specifications
        integer standard_cycle_time
        varchar status
        varchar tenant_id
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    cobot_devices {
        bigserial id PK
        varchar device_code UK
        varchar device_name
        bigint model_id FK
        varchar serial_number UK
        varchar mac_address
        varchar firmware_version
        varchar software_version
        varchar status
        varchar location
        varchar tenant_id
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    %% =====================================================
    %% 生产计划
    %% =====================================================
    
    production_plans ||--o{ production_plan_versions : "has_versions"
    production_plans ||--o{ production_plan_approvals : "requires_approval"
    production_plans ||--o{ production_orders : "generates"
    profiles ||--o{ production_plans : "responsible_for"
    
    production_plans {
        bigserial id PK
        varchar plan_code UK
        varchar plan_type
        date plan_period_start
        date plan_period_end
        integer production_quantity
        date delivery_date
        bigint product_model_id FK
        varchar factory_id
        uuid responsible_person_id FK
        varchar status
        integer current_version
        varchar tenant_id
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
        uuid approved_by FK
        timestamp approved_at
        uuid rejected_by FK
        timestamp rejected_at
        text rejection_reason
        uuid activated_by FK
        timestamp activated_at
        uuid closed_by FK
        timestamp closed_at
        text close_reason
    }
    
    production_plan_versions {
        bigserial id PK
        bigint plan_id FK
        integer version_number
        text change_reason
        text change_description
        text impact_analysis
        jsonb plan_details
        varchar tenant_id
        uuid created_by FK
        timestamp created_at
    }
    
    production_plan_approvals {
        bigserial id PK
        bigint plan_id FK
        integer version_number
        varchar approval_stage
        uuid approver_id FK
        varchar approval_status
        text approval_comment
        timestamp approved_at
        uuid rejected_by FK
        timestamp rejected_at
        text rejection_reason
        varchar tenant_id
        timestamp created_at
    }
    
    production_orders {
        bigserial id PK
        varchar order_code UK
        bigint plan_id FK
        bigint product_model_id FK
        integer order_quantity
        integer completed_quantity
        date start_date
        date end_date
        varchar priority
        varchar status
        varchar tenant_id
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    %% =====================================================
    %% 物流与发货
    %% =====================================================
    
    production_orders ||--o{ asn_shipments : "shipped_via"
    asn_shipments ||--o{ asn_shipment_items : "contains"
    asn_shipments ||--o{ logistics_tracking : "tracked_by"
    logistics_tracking ||--o{ logistics_events : "has_events"
    asn_shipments ||--o{ receiving_records : "received_as"
    
    asn_shipments {
        bigserial id PK
        varchar shipment_no UK
        varchar tenant_id
        varchar factory_id
        varchar destination_factory_id
        bigint product_model_id FK
        bigint production_order_id FK
        timestamptz shipment_date
        timestamptz eta_date
        varchar carrier
        varchar tracking_no
        varchar status
        integer total_boxes
        integer total_pallets
        text remarks
        uuid created_by FK
        uuid updated_by FK
        timestamptz created_at
        timestamptz updated_at
    }
    
    asn_shipment_items {
        bigserial id PK
        bigint shipment_id FK
        integer line_no
        varchar part_no
        varchar part_name
        varchar part_category
        part_type part_type
        varchar batch_no
        varchar box_no
        varchar pallet_no
        decimal shipped_qty
        varchar unit
        text remarks
        timestamptz created_at
    }
    
    logistics_tracking {
        bigserial id PK
        bigint shipping_id FK
        varchar tracking_number UK
        varchar logistics_company
        varchar current_location
        varchar current_status
        date estimated_arrival_date
        decimal gps_latitude
        decimal gps_longitude
        varchar tenant_id
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
        timestamp last_updated_at
    }
    
    logistics_events {
        bigserial id PK
        bigint tracking_id FK
        timestamp event_time
        varchar event_location
        text event_description
        varchar event_type
        varchar tenant_id
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    %% =====================================================
    %% 收货与检验
    %% =====================================================
    
    receiving_records ||--o{ receiving_record_items : "contains"
    receiving_record_items ||--o{ iqc_inspections : "inspected_via"
    receiving_record_items ||--o{ material_reservations : "reserved_from"
    receiving_record_items ||--o{ material_consumption_records : "consumed_from"
    asn_shipment_items ||--o{ receiving_record_items : "received_as"
    receiving_records ||--o{ incoming_material_dispositions : "requires_disposition"
    iqc_inspections ||--o{ incoming_material_dispositions : "triggers_disposition"
    
    receiving_records {
        bigserial id PK
        varchar receiving_no UK
        varchar receiving_code UK
        bigint shipment_id FK
        bigint shipping_id FK
        date receiving_date
        uuid receiver_id FK
        integer received_packages
        decimal received_weight
        varchar warehouse_location
        varchar status
        text notes
        varchar tenant_id
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    receiving_record_items {
        bigserial id PK
        bigint receiving_id FK
        bigint shipment_item_id FK
        integer line_no
        varchar part_no
        varchar part_name
        part_type part_type
        varchar batch_no
        varchar serial_number
        varchar box_no
        decimal expected_qty
        decimal received_qty
        decimal variance_qty
        varchar variance_type
        varchar unit
        text remarks
        timestamptz created_at
    }
    
    iqc_inspections {
        bigserial id PK
        varchar inspection_no UK
        bigint receiving_id FK
        bigint receiving_item_id FK
        varchar part_no
        varchar part_name
        varchar batch_no
        varchar inspection_type
        integer sample_size
        decimal inspected_qty
        varchar result
        varchar defect_code
        text defect_description
        timestamptz inspected_at
        uuid inspected_by FK
        text remarks
        varchar tenant_id
        uuid created_by FK
        uuid updated_by FK
        timestamptz created_at
        timestamptz updated_at
    }
    
    incoming_material_dispositions {
        bigserial id PK
        varchar disposition_no UK
        varchar source_type
        bigint source_id
        bigint receiving_id FK
        varchar part_no
        varchar part_name
        varchar batch_no
        decimal affected_qty
        varchar disposition_type
        varchar disposition_status
        boolean approve_required
        uuid approved_by FK
        timestamptz approved_at
        text block_reason
        text action_plan
        varchar responsible_party
        timestamptz due_date
        timestamptz completed_at
        text remarks
        varchar tenant_id
        uuid created_by FK
        uuid updated_by FK
        timestamptz created_at
        timestamptz updated_at
    }
    
    %% =====================================================
    %% 库存管理
    %% =====================================================
    
    inventory_records ||--o{ inventory_transactions : "has_transactions"
    
    material_reservations {
        bigserial id PK
        text reservation_code UK
        text tenant_id
        bigint receiving_record_item_id FK
        decimal reserved_qty
        uuid reserved_by FK
        timestamptz reserved_at
        text source_type
        bigint source_id
        text source_reference
        text status
        timestamptz consumed_at
        timestamptz released_at
        timestamptz expired_at
        text notes
        timestamptz created_at
        timestamptz updated_at
    }
    
    material_consumption_records {
        bigserial id PK
        text consumption_code UK
        text tenant_id
        bigint receiving_record_item_id FK
        bigint reservation_id FK
        decimal consumed_qty
        uuid consumed_by FK
        timestamptz consumed_at
        text source_type
        bigint source_id
        text source_reference
        text unit_serial_number
        text notes
        timestamptz created_at
    }
    
    inventory_records {
        bigserial id PK
        varchar material_code
        varchar material_name
        varchar batch_code
        varchar warehouse_location
        decimal quantity
        decimal reserved_quantity
        decimal available_quantity
        varchar unit
        varchar status
        varchar tenant_id
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    inventory_transactions {
        bigserial id PK
        varchar transaction_code UK
        bigint inventory_id FK
        varchar transaction_type
        decimal quantity
        decimal before_quantity
        decimal after_quantity
        varchar source_type
        bigint source_id
        uuid operator_id FK
        text remarks
        varchar tenant_id
        timestamp created_at
    }
    
    %% =====================================================
    %% 组装与测试
    %% =====================================================
    
    assembly_part_material_mapping ||--o{ assembly_processes : "guides"
    production_orders ||--o{ assembly_processes : "assembled_via"
    assembly_processes ||--o{ aging_tests : "tested_via"
    aging_tests ||--o{ final_tests : "followed_by"
    final_tests ||--o{ qa_releases : "released_via"
    assembly_processes ||--o{ finished_unit_traceability : "traced_as"
    aging_tests ||--o{ finished_unit_traceability : "traced_via"
    final_tests ||--o{ finished_unit_traceability : "traced_through"
    qa_releases ||--o{ finished_unit_traceability : "traced_by"
    
    assembly_part_material_mapping {
        bigserial id PK
        bigint product_model_id FK
        part_type part_type
        varchar part_no
        varchar part_name
        boolean is_critical
        boolean is_serialized
        decimal quantity_per_unit
        text remarks
        varchar tenant_id
        uuid created_by FK
        uuid updated_by FK
        timestamptz created_at
        timestamptz updated_at
    }
    
    assembly_processes {
        bigserial id PK
        varchar process_code UK
        bigint production_order_id FK
        bigint product_model_id FK
        varchar unit_serial_number UK
        varchar robot_body_serial
        varchar control_box_serial
        varchar teaching_pendant_serial
        varchar cable_serial
        uuid assembler_id FK
        timestamp assembly_start_time
        timestamp assembly_end_time
        integer assembly_duration
        varchar status
        varchar quality_status
        varchar tenant_id
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    aging_tests {
        bigserial id PK
        varchar test_code UK
        bigint assembly_id FK
        varchar unit_serial_number
        timestamp test_start_time
        timestamp test_end_time
        integer required_duration
        integer actual_duration
        integer accumulated_time
        decimal temperature_setting
        decimal humidity_setting
        varchar status
        varchar result
        text failure_reason
        varchar tenant_id
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    final_tests {
        bigserial id PK
        varchar test_code UK
        bigint aging_test_id FK
        varchar unit_serial_number
        timestamp test_date
        uuid tester_id FK
        jsonb test_items
        varchar test_result
        text failure_items
        text remarks
        varchar tenant_id
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    qa_releases {
        bigserial id PK
        varchar release_code UK
        bigint final_test_id FK
        varchar unit_serial_number
        timestamp release_date
        uuid qa_inspector_id FK
        varchar release_status
        text block_reason
        text remarks
        varchar tenant_id
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    finished_unit_traceability {
        bigserial id PK
        varchar unit_serial_number UK
        bigint production_order_id FK
        bigint product_model_id FK
        bigint assembly_id FK
        bigint aging_test_id FK
        bigint final_test_id FK
        bigint qa_release_id FK
        varchar final_test_status
        varchar qa_release_status
        timestamp completed_at
        varchar tenant_id
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    %% =====================================================
    %% 异常管理
    %% =====================================================
    
    operation_exceptions ||--o{ notifications : "triggers"
    quality_exceptions ||--o{ notifications : "triggers"
    
    operation_exceptions {
        bigserial id PK
        varchar exception_code UK
        varchar exception_type
        varchar severity
        varchar status
        varchar source_module
        bigint source_id
        varchar title
        text description
        text root_cause
        text action_plan
        text resolution
        uuid owner_id FK
        uuid assigned_to FK
        uuid reported_by FK
        timestamp reported_at
        timestamp resolved_at
        timestamp closed_at
        timestamp due_date
        varchar tenant_id
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    quality_exceptions {
        bigserial id PK
        varchar exception_code UK
        varchar exception_type
        varchar severity
        varchar status
        varchar source_type
        bigint source_id
        varchar part_no
        varchar batch_no
        varchar title
        text description
        text root_cause
        text corrective_action
        text preventive_action
        uuid owner_id FK
        uuid reported_by FK
        timestamp reported_at
        timestamp resolved_at
        timestamp closed_at
        varchar tenant_id
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    %% =====================================================
    %% 通知与审计
    %% =====================================================
    
    profiles ||--o{ notifications : "receives"
    profiles ||--o{ audit_logs : "performs"
    
    notifications {
        bigserial id PK
        uuid user_id FK
        varchar notification_type
        varchar title
        text content
        varchar priority
        varchar status
        jsonb channels
        varchar related_module
        bigint related_id
        varchar tenant_id
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp read_at
        timestamp updated_at
    }
    
    audit_logs {
        bigserial id PK
        uuid user_id FK
        varchar action
        varchar table_name
        bigint record_id
        jsonb old_values
        jsonb new_values
        varchar ip_address
        text user_agent
        varchar tenant_id
        timestamp created_at
    }
    
    %% =====================================================
    %% 检验照片
    %% =====================================================
    
    iqc_inspections ||--o{ inspection_photos : "documented_by"
    
    inspection_photos {
        bigserial id PK
        bigint inspection_id
        varchar inspection_type
        text photo_url
        varchar photo_type
        text description
        uuid uploaded_by FK
        timestamp uploaded_at
        varchar tenant_id
    }
```

## 核心业务流程说明

### 1. 生产计划流程
```
production_plans → production_plan_versions (版本管理)
                 → production_plan_approvals (审批流程)
                 → production_orders (生成订单)
```

### 2. 发货流程
```
production_orders → asn_shipments → asn_shipment_items (发货明细)
                                  → logistics_tracking → logistics_events (物流跟踪)
```

### 3. 收货流程
```
asn_shipments → receiving_records → receiving_record_items (收货明细)
                                  → iqc_inspections (IQC检验)
                                  → incoming_material_dispositions (来料处置)
```

### 4. 库存流程
```
receiving_record_items → material_reservations (预占)
                       → material_consumption_records (消耗)
                       → inventory_records (库存记录)
                       → inventory_transactions (库存事务)
```

### 5. 组装流程
```
production_orders → assembly_processes (组装)
                  → aging_tests (老化测试)
                  → final_tests (最终测试)
                  → qa_releases (QA放行)
                  → finished_unit_traceability (完成整机追溯)
```

### 6. 异常流程
```
各业务环节 → operation_exceptions (运营异常)
          → quality_exceptions (质量异常)
          → notifications (通知)
```

## 关键设计决策

### 1. 循环外键依赖解决
- `organizations` 先创建（不含 `manager_id`）
- `profiles` 后创建
- 最后补齐 `organizations.manager_id` 外键

### 2. 发货模型统一
- 推荐使用：`asn_shipments` + `asn_shipment_items`
- 废弃：`shipping_orders`（保留历史数据）

### 3. 检验模型明确
- 收货外观检验：`receiving_inspections`
- 来料质量检验：`iqc_inspections`（推荐）
- 检验照片：`inspection_photos`（统一照片表）

### 4. 库存唯一约束修复
- `batch_code NOT NULL DEFAULT 'NO_BATCH'`
- `UNIQUE(material_code, batch_code, warehouse_location, tenant_id)`

### 5. 审计字段统一
- 所有关键业务表包含：`tenant_id`, `created_by`, `updated_by`, `created_at`, `updated_at`
