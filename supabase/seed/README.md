# 欢迎使用你的秒哒应用代码包
秒哒应用链接
    URL:https://www.miaoda.cn/projects/app-b10oy6wwe801

# 全系统 Demo 数据包

## 概述

本 Demo 数据包覆盖组装业务Web管理系统的所有核心模块，提供完整的演示数据，用于演示、测试、UAT。

## 数据覆盖范围

### 1. 基础数据
- ✅ 产品型号（FR3、FR5）
- ✅ 工厂/租户（CN-FACTORY-01、JP-MICROTEC）
- ✅ 用户/角色（已在系统初始化时创建）

### 2. 计划模块
- ✅ 生产计划（5 条，覆盖 draft / submitted / approved / active / closed）
- ✅ 生产计划版本（6 条，包含 V1 / V2 版本）

### 3. 中国侧执行
- ✅ 生产订单（4 条，覆盖 pending / in_progress / completed）
- ✅ 中国质检记录（3 条，覆盖 pass / fail）

### 4. 发货/ASN
- ✅ ASN/发货单（3 条，覆盖 shipped / received）
- ✅ ASN 明细（9 条，FR3 和 FR5 关键件）

### 5. 日本收货
- ✅ 收货记录（2 条，覆盖正常收货和破损场景）
- ✅ 收货明细（115 条，含序列号，覆盖 available / blocked）

### 6. IQC
- ✅ IQC 检验（2 条，覆盖 OK / HOLD）

### 7. Disposition/特采/异常
- ✅ 异常记录（1 条，damaged）
- ✅ Disposition 记录（1 条，special_acceptance approved）

### 8. 库存/来料映射/组装
- ✅ receiving_record_items（115 条，含完整库存状态）
- ✅ assembly_part_material_mapping（24 条，已映射已消耗）
- ✅ 整机组装记录（8 台，FR3 5 台 + FR5 3 台）

### 9. 老化
- ✅ aging_tests（8 条，覆盖 pending / running / passed）
- ✅ aging_test_logs（16 条，覆盖运行中和已完成）

### 10. 最终测试
- ✅ final_tests（4 条，覆盖 pass / pending）

### 11. QA 放行
- ✅ qa_releases（2 条，approved）

### 12. 出货
- ✅ shipments（2 条，覆盖 ready / shipped）

### 13. P0 库存准确性
- ✅ material_reservations（24 条，consumed）
- ✅ material_consumption_records（24 条，已消耗）

## 演示场景

### 场景1：FR3 正常全链路 ✅
- 计划：PLAN-DEMO-FR3-202604-W1（approved）
- 生产订单：PO-DEMO-FR3-001（completed）
- 质检：pass
- ASN：ASN-DEMO-FR3-20260406-01（received）
- 收货：RCV-DEMO-JP-20260408-01（completed，正常收货）
- IQC：IQC-DEMO-FR3-CB-001（OK）
- 组装：FR3-DEMO-001 ~ FR3-DEMO-005（5 台）
- 老化：AGING-DEMO-FR3-DEMO-001 ~ AGING-DEMO-FR3-DEMO-005
- 最终测试：FT-DEMO-FR3-DEMO-001 ~ FT-DEMO-FR3-DEMO-003（passed）
- QA 放行：QA-DEMO-FR3-DEMO-001 ~ QA-DEMO-FR3-DEMO-002（approved）
- 出货：SHP-DEMO-FR3-DEMO-001 ~ SHP-DEMO-FR3-DEMO-002（shipped / ready）

### 场景2：FR5 正常全链路 ✅
- 计划：PLAN-DEMO-FR5-202604-W2（active）
- 生产订单：PO-DEMO-FR5-001（completed）
- 质检：pass
- ASN：ASN-DEMO-FR5-20260413-01（received）
- 收货：RCV-DEMO-JP-20260415-01（completed）
- 组装：FR5-DEMO-001 ~ FR5-DEMO-003（3 台）
- 老化：AGING-DEMO-FR5-DEMO-001 ~ AGING-DEMO-FR5-DEMO-003
- 最终测试：FT-DEMO-FR5-DEMO-001（passed）
- QA 放行：pending
- 出货：pending

### 场景3：收货破损场景 ✅
- 收货：RCV-DEMO-JP-20260415-01
- 破损件：CB-FR5-DEMO-001（1 件控制箱破损）
- 异常：EXC-DEMO-FR5-CB-001（damaged）
- IQC：IQC-DEMO-FR5-CB-001（HOLD）
- Disposition：DISP-DEMO-FR5-CB-001（special_acceptance approved）
- 结果：特采通过，状态从 blocked 变为 available

### 场景4：老化运行中场景 ✅
- 整机：FR3-DEMO-004
- 老化：AGING-DEMO-FR3-DEMO-004（running，已运行 24 小时）
- 日志：每 6 小时记录一次

### 场景5：已预占已消耗场景 ✅
- 所有已组装整机的关键件都有：
  - material_reservations（status = consumed）
  - material_consumption_records
  - receiving_record_items（available_qty = 0, consumed_qty = 1）

## 页面可见性

导入完成后，以下页面打开可直接看到 Demo 数据：

- ✅ DashboardPage（仪表盘）
- ✅ ProductionPlansPage（生产计划列表）
- ✅ ProductionPlanDetailPage（生产计划详情）
- ✅ ASNListPage（ASN 列表）
- ✅ ASNDetailPage（ASN 详情）
- ✅ ReceivingListPage（收货列表）
- ✅ ReceivingDetailPage（收货详情）
- ✅ IQCInspectionPage（IQC 检验）
- ✅ MaterialDispositionPage（物料处置）
- ✅ AssemblyCompletePage（组装完成）
- ✅ AgingTestListPage（老化测试列表）
- ✅ AgingTestDetailPage（老化测试详情）
- ✅ FinalTestManagementPage（最终测试管理）
- ✅ QAReleaseManagementPage（QA 放行管理）
- ✅ ShipmentConfirmationPage（出货确认）

## 数据质量

### 1. 数据互相关联 ✅
- 生产计划 → 生产订单 → ASN → 收货 → IQC → 组装 → 老化 → 测试 → 放行 → 出货
- 所有数据通过外键关联，可追溯完整链路

### 2. 编码规则清晰 ✅
- 计划：PLAN-DEMO-{MODEL}-{YYYYMM}-{WEEK}
- 生产订单：PO-DEMO-{MODEL}-{SEQ}
- ASN：ASN-DEMO-{MODEL}-{YYYYMMDD}-{SEQ}
- 收货：RCV-DEMO-JP-{YYYYMMDD}-{SEQ}
- IQC：IQC-DEMO-{MODEL}-{PART}-{SEQ}
- 整机：{MODEL}-DEMO-{SEQ}
- 老化：AGING-DEMO-{UNIT_SN}
- 测试：FT-DEMO-{UNIT_SN}
- 放行：QA-DEMO-{UNIT_SN}
- 出货：SHP-DEMO-{UNIT_SN}
- 异常：EXC-DEMO-{MODEL}-{PART}-{SEQ}
- Disposition：DISP-DEMO-{MODEL}-{PART}-{SEQ}
- 预占：DEMO-RSV-{UNIT_SN}-{PART}
- 消耗：DEMO-CSM-{UNIT_SN}-{PART}

### 3. 中日文可读 ✅
- 所有描述字段使用中文
- 便于演示和 UAT

### 4. 时间顺序合理 ✅
- 按业务流程时间顺序生成
- 符合真实业务场景

### 5. 状态流转合理 ✅
- 覆盖所有关键状态
- 状态流转符合业务规则

### 6. 能用于 UAT ✅
- 数据完整、真实、可追溯
- 可直接用于用户验收测试

## 导入方式

### 方式1：使用一键导入脚本（推荐）

```bash
# 在项目根目录下执行
./scripts/import-demo-data.sh
```

### 方式2：使用 Supabase CLI

```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录
supabase login

# 执行 SQL
supabase db execute -f supabase/seed/demo_seed_full.sql
```

### 方式3：使用 psql

```bash
# 如果有直接数据库访问权限
psql -h <host> -U <user> -d <database> -f supabase/seed/demo_seed_full.sql
```

### 方式4：使用 Supabase Dashboard

1. 登录 Supabase Dashboard
2. 进入 SQL Editor
3. 复制 `supabase/seed/demo_seed_full.sql` 内容
4. 执行 SQL

## 清理 Demo 数据

如需清理 Demo 数据，可以执行以下 SQL：

```sql
-- 清理 Demo 数据（谨慎使用）
DELETE FROM material_consumption_records WHERE consumption_code LIKE 'DEMO-%';
DELETE FROM material_reservations WHERE reservation_code LIKE 'DEMO-%';
DELETE FROM shipments WHERE shipment_no LIKE 'SHP-DEMO-%';
DELETE FROM qa_releases WHERE release_no LIKE 'QA-DEMO-%';
DELETE FROM final_tests WHERE test_no LIKE 'FT-DEMO-%';
DELETE FROM aging_test_logs WHERE test_id IN (SELECT id FROM aging_tests WHERE test_no LIKE 'AGING-DEMO-%');
DELETE FROM aging_tests WHERE test_no LIKE 'AGING-DEMO-%';
DELETE FROM finished_unit_traceability WHERE finished_product_sn LIKE 'FR%-DEMO-%';
DELETE FROM assembly_part_material_mapping WHERE robot_sn LIKE 'FR%-DEMO-%';
DELETE FROM incoming_material_dispositions WHERE disposition_no LIKE 'DISP-DEMO-%';
DELETE FROM quality_exceptions WHERE exception_no LIKE 'EXC-DEMO-%';
DELETE FROM iqc_inspections WHERE inspection_no LIKE 'IQC-DEMO-%';
DELETE FROM receiving_record_items WHERE receiving_record_id IN (SELECT id FROM receiving_records WHERE receiving_no LIKE 'RCV-DEMO-%');
DELETE FROM receiving_records WHERE receiving_no LIKE 'RCV-DEMO-%';
DELETE FROM asn_shipment_items WHERE asn_id IN (SELECT id FROM asn_shipments WHERE asn_no LIKE 'ASN-DEMO-%');
DELETE FROM asn_shipments WHERE asn_no LIKE 'ASN-DEMO-%';
DELETE FROM cn_quality_inspection_records WHERE production_order_id IN (SELECT id FROM production_orders WHERE order_no LIKE 'PO-DEMO-%');
DELETE FROM production_orders WHERE order_no LIKE 'PO-DEMO-%';
DELETE FROM production_plan_versions WHERE plan_id IN (SELECT id FROM production_plans WHERE plan_no LIKE 'PLAN-DEMO-%');
DELETE FROM production_plans WHERE plan_no LIKE 'PLAN-DEMO-%';
```

## 数据统计

| 模块 | 表名 | 记录数 |
|------|------|--------|
| 计划模块 | production_plans | 5 |
| 计划模块 | production_plan_versions | 6 |
| 中国侧执行 | production_orders | 4 |
| 中国侧执行 | cn_quality_inspection_records | 3 |
| 发货/ASN | asn_shipments | 3 |
| 发货/ASN | asn_shipment_items | 9 |
| 日本收货 | receiving_records | 2 |
| 日本收货 | receiving_record_items | 115 |
| IQC | iqc_inspections | 2 |
| Disposition/异常 | quality_exceptions | 1 |
| Disposition/异常 | incoming_material_dispositions | 1 |
| 组装 | finished_unit_traceability | 8 |
| 组装 | assembly_part_material_mapping | 24 |
| 老化 | aging_tests | 8 |
| 老化 | aging_test_logs | 16 |
| 最终测试 | final_tests | 4 |
| QA 放行 | qa_releases | 2 |
| 出货 | shipments | 2 |
| P0 库存 | material_reservations | 24 |
| P0 库存 | material_consumption_records | 24 |
| **总计** | | **263** |

## 已知未覆盖项

### P0 后期功能（可延后）
- ⏳ 预占超时自动释放
- ⏳ 库存预警功能
- ⏳ 库存调整功能（盘点、报废、退货等）

### P1 生产计划模块（下一阶段）
- ⏳ 生产计划审批流程
- ⏳ 生产计划与执行链关联

### P2 异常中心（下一阶段）
- ⏳ 异常统一收口
- ⏳ 异常处理流程

### P3 物流模块（下一阶段）
- ⏳ 发货、在途、到货联动

### P4 运营看板（下一阶段）
- ⏳ 基础可运营看板

## 验收标准

### ✅ 1. 是否每个核心模块都有 Demo 数据
- ✅ 是的，覆盖所有核心模块

### ✅ 2. 是否每个核心页面打开都有数据
- ✅ 是的，所有核心页面都有数据

### ✅ 3. 是否数据彼此关联可串流程
- ✅ 是的，数据通过外键关联，可追溯完整链路

### ✅ 4. 是否覆盖正常/异常/阻断/特采等关键状态
- ✅ 是的，覆盖所有关键状态

### ✅ 5. 是否能直接导入，不需要手工二次整理
- ✅ 是的，提供一键导入脚本

### ✅ 6. 是否可直接用于演示、测试、UAT
- ✅ 是的，数据完整、真实、可追溯

## 联系方式

如有问题，请联系开发团队。
