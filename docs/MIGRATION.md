# 数据库迁移说明 (MIGRATION.md)

**项目**: 中国协作机器人日本委托组装业务 Web 管理系统  
**版本**: v83  
**更新日期**: 2026-04-19

---

## 迁移概述

### 数据库信息
- **数据库**: PostgreSQL (Supabase)
- **项目**: cobot-assembly-system
- **区域**: bj (北京)
- **迁移文件数**: 62+

### 迁移策略
- **方式**: 增量迁移
- **顺序**: 按文件名顺序执行
- **回滚**: 支持回滚到任意版本

---

## 迁移文件清单

### 基础表（00001-00010）

#### 00001_create_base_types_and_profiles.sql
**功能**: 创建基础类型和用户配置表
- 创建 `profiles` 表
- 创建辅助函数 `has_role()`, `can_access_tenant()`
- 设置 RLS 权限策略

#### 00002_create_production_tables.sql
**功能**: 创建生产相关表
- 创建 `production_plans` 表
- 创建 `production_orders` 表（如果存在）
- 设置权限策略

#### 00003_create_asn_and_receiving_tables.sql
**功能**: 创建 ASN 和收货表
- 创建 `asn_shipments` 表
- 创建 `asn_shipment_items` 表
- 创建 `receiving_records` 表
- 设置权限策略

#### 00004_create_production_and_quality_tables.sql
**功能**: 创建生产订单和质量检验表
- 创建 `production_orders` 表
- 创建 `quality_inspections` 表
- 设置权限策略

#### 00005_create_logistics_tables.sql
**功能**: 创建物流表
- 创建 `logistics_tracking` 表
- 创建 `logistics_events` 表
- 设置权限策略

#### 00006_create_inventory_tables.sql
**功能**: 创建库存表
- 创建 `inventory_records` 表
- 创建 `inventory_transactions` 表
- 设置权限策略

#### 00007_create_notifications_table.sql
**功能**: 创建通知表
- 创建 `notifications` 表
- 设置权限策略

---

### 功能增强（00011-00050）

#### 00060_refresh_inventory_materialized_view.sql
**功能**: 刷新库存物化视图
- 创建 `materialized_view_inventory_status` 物化视图
- 创建刷新函数 `refresh_inventory_status_view()`
- 创建触发器自动刷新

#### 00061_fix_production_order_create_permission.sql
**功能**: 修复生产订单创建权限
- 删除旧的严格权限策略
- 创建新的宽松权限策略
- 允许所有认证用户创建本租户订单

#### 00062_create_exception_center_tables.sql
**功能**: 创建异常中心表
- 创建异常类型枚举
- 创建 `operation_exceptions` 表
- 创建 `exception_logs` 表
- 设置权限策略

---

## 迁移执行

### 方式 1: 使用 Supabase CLI（推荐）

#### 安装 CLI
```bash
# macOS
brew install supabase/tap/supabase

# Linux
curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh

# Windows
scoop install supabase
```

#### 初始化项目
```bash
# 进入项目目录
cd /workspace/app-b10oy6wwe801

# 链接到 Supabase 项目
supabase link --project-ref your-project-ref

# 查看迁移状态
supabase db status
```

#### 执行迁移
```bash
# 执行所有待迁移文件
supabase db push

# 执行特定迁移
supabase db push --file supabase/migrations/00062_create_exception_center_tables.sql
```

#### 验证迁移
```bash
# 查看迁移历史
supabase db history

# 查看数据库状态
supabase db status
```

---

### 方式 2: 手动执行（通过 Dashboard）

#### 步骤
1. **登录 Supabase Dashboard**
   - 访问 https://supabase.com/dashboard
   - 选择项目 `cobot-assembly-system`

2. **打开 SQL Editor**
   - 点击左侧菜单 "SQL Editor"
   - 点击 "New query"

3. **执行迁移文件**
   - 按顺序打开迁移文件
   - 复制 SQL 内容
   - 粘贴到 SQL Editor
   - 点击 "Run" 执行

4. **验证执行结果**
   - 检查执行日志
   - 确认无错误
   - 验证表和策略创建成功

---

### 方式 3: 使用 psql 命令行

#### 连接数据库
```bash
# 获取连接字符串（从 Supabase Dashboard）
psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
```

#### 执行迁移
```bash
# 执行单个文件
\i supabase/migrations/00062_create_exception_center_tables.sql

# 执行所有文件
for file in supabase/migrations/*.sql; do
  psql -f "$file"
done
```

---

## 迁移验证

### 1. 检查表创建
```sql
-- 查询所有表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 预期结果（部分）:
-- asn_shipment_items
-- asn_shipments
-- exception_logs
-- inventory_records
-- logistics_events
-- logistics_tracking
-- notifications
-- operation_exceptions
-- production_orders
-- production_plans
-- profiles
-- quality_inspections
-- receiving_records
```

### 2. 检查权限策略
```sql
-- 查询所有 RLS 策略
SELECT tablename, policyname, cmd 
FROM pg_policies 
ORDER BY tablename, policyname;

-- 检查特定表的策略
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'operation_exceptions';
```

### 3. 检查枚举类型
```sql
-- 查询所有枚举类型
SELECT typname 
FROM pg_type 
WHERE typtype = 'e' 
ORDER BY typname;

-- 预期结果:
-- exception_severity
-- exception_source_module
-- exception_status
-- exception_type
```

### 4. 检查索引
```sql
-- 查询所有索引
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

### 5. 检查触发器
```sql
-- 查询所有触发器
SELECT trigger_name, event_object_table, action_statement 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
ORDER BY event_object_table, trigger_name;
```

---

## 数据迁移

### 初始数据插入

#### 1. 用户数据
```sql
-- 创建管理员用户（通过 Supabase Auth）
-- 然后更新 profiles
UPDATE profiles 
SET role = 'admin', tenant_id = 'BOTH', full_name = '系统管理员'
WHERE email = 'admin@example.com';
```

#### 2. 生产计划数据
```sql
INSERT INTO production_plans (plan_code, plan_type, status, tenant_id)
VALUES 
  ('PLAN-2026-Q2', 'monthly', 'draft', 'CN'),
  ('TEST-PLAN-2026-001', 'monthly', 'draft', 'CN');
```

#### 3. 库存数据
```sql
INSERT INTO inventory_records (
  material_code, material_name, material_spec, 
  available_quantity, reserved_quantity, status, tenant_id
)
VALUES 
  ('PART-001', '机械臂关节', 'Spec-A', 1000, 0, 'normal', 'CN'),
  ('PART-002', '控制器主板', 'Spec-B', 500, 0, 'normal', 'CN'),
  ('PART-003', '传感器模块', 'Spec-C', 800, 0, 'normal', 'CN'),
  ('PART-004', '电机驱动器', 'Spec-D', 600, 0, 'normal', 'CN'),
  ('PART-005', '连接线缆', 'Spec-E', 2000, 0, 'normal', 'CN');
```

#### 4. 异常数据（测试）
```sql
INSERT INTO operation_exceptions (
  exception_code, exception_type, severity, current_status, source_module,
  title, description, reporter_id, tenant_id
)
VALUES
  ('EXC-20260419-001', 'quality', 'high', 'open', 'quality',
   '零件尺寸超差', '收货检验发现零件 PART-001 尺寸超出公差范围',
   (SELECT id FROM profiles LIMIT 1), 'CN'),
  ('EXC-20260419-002', 'material', 'medium', 'in_progress', 'warehouse',
   '物料短缺', '库存物料 PART-002 数量不足，影响生产计划',
   (SELECT id FROM profiles LIMIT 1), 'CN');
```

---

## 迁移回滚

### 回滚策略

#### 1. 删除最新迁移
```sql
-- 删除异常中心表
DROP TABLE IF EXISTS exception_logs CASCADE;
DROP TABLE IF EXISTS operation_exceptions CASCADE;
DROP TYPE IF EXISTS exception_source_module CASCADE;
DROP TYPE IF EXISTS exception_status CASCADE;
DROP TYPE IF EXISTS exception_severity CASCADE;
DROP TYPE IF EXISTS exception_type CASCADE;
```

#### 2. 恢复到特定版本
```bash
# 使用 Supabase CLI
supabase db reset --version 00061

# 或使用备份恢复
# 1. 登录 Supabase Dashboard
# 2. Database > Backups
# 3. 选择备份点
# 4. 点击 "Restore"
```

### 回滚检查清单
- [ ] 备份当前数据库
- [ ] 记录当前迁移版本
- [ ] 执行回滚 SQL
- [ ] 验证表和数据
- [ ] 测试应用功能
- [ ] 更新应用版本

---

## 迁移最佳实践

### 1. 迁移前
- ✅ 备份数据库
- ✅ 在测试环境验证
- ✅ 准备回滚方案
- ✅ 通知相关人员

### 2. 迁移中
- ✅ 按顺序执行
- ✅ 逐个验证
- ✅ 记录执行日志
- ✅ 监控数据库状态

### 3. 迁移后
- ✅ 验证表结构
- ✅ 验证权限策略
- ✅ 测试应用功能
- ✅ 更新文档

---

## 常见问题

### Q: 迁移执行失败
**A**: 
1. 检查错误日志
2. 验证依赖关系
3. 检查权限
4. 回滚并重试

### Q: 权限策略不生效
**A**:
1. 检查 RLS 是否启用
2. 验证策略语法
3. 测试策略条件
4. 检查用户权限

### Q: 枚举类型冲突
**A**:
1. 检查枚举是否已存在
2. 使用 `IF NOT EXISTS`
3. 或先删除再创建

### Q: 外键约束失败
**A**:
1. 检查引用表是否存在
2. 验证数据完整性
3. 调整迁移顺序

---

## 迁移监控

### 1. 执行时间监控
```sql
-- 查询长时间运行的查询
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
AND now() - query_start > interval '1 minute'
ORDER BY duration DESC;
```

### 2. 锁监控
```sql
-- 查询表锁
SELECT 
  t.relname AS table_name,
  l.locktype,
  l.mode,
  l.granted
FROM pg_locks l
JOIN pg_class t ON l.relation = t.oid
WHERE t.relkind = 'r'
ORDER BY t.relname;
```

### 3. 数据库大小监控
```sql
-- 查询数据库大小
SELECT pg_size_pretty(pg_database_size(current_database()));

-- 查询表大小
SELECT 
  table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS size
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC;
```

---

## 迁移记录

### 迁移历史

| 版本 | 日期 | 描述 | 执行人 | 状态 |
|------|------|------|--------|------|
| 00001 | 2026-04-01 | 创建基础表 | 开发团队 | ✅ 完成 |
| 00060 | 2026-04-18 | 刷新库存视图 | 开发团队 | ✅ 完成 |
| 00061 | 2026-04-19 | 修复订单权限 | 开发团队 | ✅ 完成 |
| 00062 | 2026-04-19 | 创建异常中心 | 开发团队 | ✅ 完成 |

---

**文档版本**: v1.0  
**最后更新**: 2026-04-19  
**维护人**: 数据库团队
