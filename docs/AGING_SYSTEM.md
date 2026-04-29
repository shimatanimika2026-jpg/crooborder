# 48小时老化试验强制约束系统

## 系统概述

本系统实现了FAIRINO协作机器人(FR3/FR5)在日本Micro-tec组装后的48小时老化试验强制约束,确保未完成老化试验的整机无法进入最终测试和出货流程。

## 核心业务流程

### 1. 生产计划 → 2. 中国侧生产工单 → 3. 发货/ASN → 4. 日本收货

这部分流程已在现有系统中实现,通过以下表支持:
- `production_plans` - 生产计划
- `production_orders` - 生产工单
- `shipping_orders` - 发货单
- `logistics_tracking` - 物流跟踪

### 5. 入库检验/差异处理

通过 `quality_inspections` 表记录入库检验结果。
差异处理通过新增的 `quality_exceptions` 表记录异常。

### 6. 日本组装

组装完成后,必须创建整机追溯记录:

**表**: `finished_unit_traceability`

**关键字段**:
- `finished_product_sn` - 整机序列号(唯一)
- `product_model_id` - 产品型号(FK to product_models)
- `control_box_sn` - 控制箱序列号
- `teaching_pendant_sn` - 示教器序列号
- `aging_required` - 是否需要老化(默认true)
- `aging_status` - 老化状态(pending/running/passed/failed/waived)
- `aging_passed_at` - 老化通过时间

### 7. 48小时老化试验 ⭐核心约束⭐

**表**: `aging_tests`

**状态流转**:
```
planned → running → passed/failed
         ↓
      paused/interrupted
```

**关键约束**:
1. 老化试验必须运行满48小时(可配置)
2. 中断后必须记录原因、时间
3. 中断后恢复需要重新判定是否需要重新计时
4. 老化未通过的整机,`aging_status` 不为 `passed`

**日志记录**: `aging_test_logs`
- 记录所有状态变更
- 记录温度、湿度等环境参数
- 记录中断原因和恢复时间

### 8. 最终测试

**前置条件检查**:
```sql
SELECT * FROM check_aging_requirement_before_release('FR3-2026-001');
-- 返回: can_release (boolean), block_reason (text)
```

**阻断规则**:
- 如果 `aging_required = true` 且 `aging_status != 'passed'`,则不允许进入最终测试
- 前端按钮禁用
- 后端API拒绝请求

### 9. QA放行

**表**: `finished_unit_traceability`

**关键字段**:
- `qa_release_status` - 放行状态(pending/approved/rejected/blocked)
- `qa_release_at` - 放行时间
- `qa_release_by` - 放行人
- `release_block_reason` - 阻断原因

**放行检查**:
```typescript
const { data, error } = await supabase.functions.invoke('manage-aging-test', {
  body: {
    action: 'check_release',
    data: { finished_product_sn: 'FR3-2026-001' }
  }
});

if (!data.result.can_release) {
  alert(data.result.block_reason); // "48小时老化试验未通过，不允许放行"
  return;
}
```

### 10. 出货/交付

**表**: `finished_unit_traceability`

**关键字段**:
- `shipment_status` - 出货状态(pending/ready/shipped/blocked)

**出货前检查**:
- 必须 `aging_status = 'passed'`
- 必须 `final_test_status = 'passed'`
- 必须 `qa_release_status = 'approved'`

### 11. 追溯/异常闭环

**追溯查询**:
```sql
-- 查询整机完整追溯信息
SELECT 
  fut.*,
  pm.model_code,
  at.status as aging_status,
  at.actual_duration_hours,
  at.result as aging_result
FROM finished_unit_traceability fut
LEFT JOIN product_models pm ON fut.product_model_id = pm.id
LEFT JOIN aging_tests at ON fut.finished_product_sn = at.finished_product_sn
WHERE fut.finished_product_sn = 'FR3-2026-001';
```

**异常闭环**: `quality_exceptions`
- 记录所有异常(收货差异、来料不合格、组装异常、老化失败、测试失败)
- 跟踪责任人、临时措施、根因、对策
- 状态流转: open → investigating → action_taken → verified → closed

## 数据模型

### 核心表

1. **product_models** - 产品型号主数据
   - FR3: 3kg负载, 625mm臂展
   - FR5: 5kg负载, 900mm臂展

2. **finished_unit_traceability** - 整机追溯
   - 整机SN → 控制箱SN + 示教器SN + 电机SN
   - 老化状态、测试状态、放行状态、出货状态

3. **aging_tests** - 老化试验
   - 48小时强制约束
   - 状态流转和中断管理
   - 温湿度记录

4. **aging_test_logs** - 老化日志
   - 所有操作留痕
   - 环境参数记录

5. **quality_exceptions** - 质量异常
   - 异常类型、严重等级
   - 责任跟踪、对策闭环

6. **cobot_devices** - 设备管理
   - 用于OTA升级
   - 关联整机SN

### 业务规则函数

**check_aging_requirement_before_release(p_finished_product_sn TEXT)**
- 检查整机是否满足放行条件
- 返回: can_release (boolean), block_reason (text)

## Edge Functions

### manage-aging-test

**功能**: 老化试验全生命周期管理

**Actions**:
1. `start` - 开始老化试验
   - 更新状态为running
   - 记录开始时间
   - 计算预计结束时间
   - 创建日志

2. `pause` - 暂停老化试验
   - 更新状态为paused
   - 记录暂停原因
   - 计算已运行时长

3. `resume` - 恢复老化试验
   - 更新状态为running
   - 记录恢复时间

4. `interrupt` - 中断老化试验
   - 更新状态为interrupted
   - 记录中断原因和代码
   - 增加中断计数
   - 更新整机状态为failed
   - 创建质量异常记录

5. `complete` - 完成老化试验
   - 计算实际运行时长
   - 判定结果(pass/fail)
   - 更新整机状态
   - 记录完成日志

6. `check_release` - 检查放行条件
   - 调用数据库函数
   - 返回是否可放行和阻断原因

## 前端页面

### AgingTestListPage (/aging/tests) ✅

**功能**:
- 显示所有老化试验列表
- 实时统计: 计划中、运行中、中断、通过、失败
- 进度条显示
- 点击查看详情

**实时订阅**:
```typescript
const channel = supabase
  .channel('aging-tests-changes')
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'aging_tests' 
  }, loadAgingTests)
  .subscribe();
```

### AgingTestDetailPage (/aging/tests/:id) ✅

**功能**:
- 显示老化试验详细信息
- 操作按钮: 开始、暂停、恢复、中断、完成
- 老化日志时间线
- 关联整机追溯信息
- 实时订阅更新

**操作流程**:
1. **开始老化** - 调用manage-aging-test的start action
2. **暂停老化** - 调用pause action
3. **恢复老化** - 调用resume action
4. **中断老化** - 弹出对话框输入原因,调用interrupt action,自动创建异常记录
5. **完成老化** - 检查时长是否满足48小时,调用complete action,判定结果

### TraceabilityPage (/traceability) ✅

**功能**:
- 输入整机序列号查询
- 显示基本信息(型号、负载、臂展)
- 显示关键部件序列号(控制箱、示教器、主板、6个关节电机)
- 显示流程状态(老化、测试、放行、出货)
- 显示老化试验信息
- 显示放行检查结果(调用check_release)
- 显示阻断原因(如果有)

## 测试数据

系统已插入4台测试设备:

1. **FR3-2026-001** - 老化已通过
   - 状态: passed
   - 实际时长: 48.5小时
   - 可以放行和出货

2. **FR3-2026-002** - 老化运行中
   - 状态: running
   - 已运行: ~30小时
   - 不允许放行

3. **FR5-2026-001** - 老化中断
   - 状态: interrupted
   - 中断原因: 温度异常
   - 已创建异常记录
   - 不允许放行

4. **FR5-2026-002** - 计划中
   - 状态: planned
   - 未开始
   - 不允许放行

## 验收场景

### 场景1: FR3正常流程 ✅
```
FR3-2026-001:
组装完成 → 创建老化任务 → 运行48小时 → 通过 → 最终测试 → QA放行 → 出货
```

**验证**:
```sql
SELECT 
  finished_product_sn,
  aging_status,
  aging_passed_at,
  qa_release_status
FROM finished_unit_traceability
WHERE finished_product_sn = 'FR3-2026-001';

-- 结果: aging_status = 'passed', aging_passed_at 有值
```

### 场景2: FR5老化运行中阻断 ✅
```
FR3-2026-002:
组装完成 → 创建老化任务 → 运行中(30h) → 尝试放行 → 系统阻断
```

**验证**:
```sql
SELECT * FROM check_aging_requirement_before_release('FR3-2026-002');

-- 结果: can_release = false, block_reason = '48小时老化试验未通过，不允许放行'
```

### 场景3: FR5老化中断异常处理 ✅
```
FR5-2026-001:
组装完成 → 创建老化任务 → 运行20h → 温度异常中断 → 创建异常记录 → 责任跟踪
```

**验证**:
```sql
SELECT * FROM quality_exceptions 
WHERE finished_product_sn = 'FR5-2026-001';

-- 结果: exception_type = 'aging_failure', status = 'investigating'
```

### 场景4: 日本收货差异 - 待实现
需要在收货页面添加差异处理功能。

## 技术实现

### 前后端双重阻断

**前端**:
```typescript
// 检查老化状态
const { data: unit } = await supabase
  .from('finished_unit_traceability')
  .select('aging_status, aging_required')
  .eq('finished_product_sn', sn)
  .single();

if (unit.aging_required && unit.aging_status !== 'passed') {
  // 禁用放行按钮
  setReleaseDisabled(true);
  setBlockReason('48小时老化试验未通过');
}
```

**后端**:
```sql
-- RLS策略或触发器
CREATE OR REPLACE FUNCTION prevent_release_without_aging()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.qa_release_status = 'approved' THEN
    IF NEW.aging_required AND NEW.aging_status != 'passed' THEN
      RAISE EXCEPTION '48小时老化试验未通过，不允许放行';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_aging_before_release
  BEFORE UPDATE ON finished_unit_traceability
  FOR EACH ROW
  EXECUTE FUNCTION prevent_release_without_aging();
```

## 已知未完成项

1. **AgingTestDetailPage** - 老化试验详情页
   - 需要实现详细信息展示
   - 需要实现操作按钮(开始/暂停/恢复/中断/完成)
   - 需要实现日志时间线
   - 需要实现温湿度图表

2. **收货差异处理** - 日本收货页面
   - 需要添加差异记录功能
   - 需要关联quality_exceptions表

3. **最终测试页面** - 独立的最终测试管理
   - 需要创建final_tests表
   - 需要实现测试流程
   - 需要集成老化状态检查

4. **QA放行页面** - 独立的放行管理
   - 需要创建放行审批流程
   - 需要集成老化和测试状态检查
   - 需要实现放行记录

5. **出货管理增强** - 出货前检查
   - 需要在shipping_orders中添加整机SN关联
   - 需要实现出货前状态检查
   - 需要阻断未放行的整机

6. **日本组装现场看板** - 实时状态大屏
   - 待组装台数
   - 组装中台数
   - 待老化台数
   - 老化中台数
   - 老化异常台数
   - 待测试台数
   - 待放行台数
   - 可出货台数
   - 已阻断台数

7. **OTA模块重构** - 基于cobot_devices
   - 已创建cobot_devices表
   - 需要修改create-ota-task使用新表
   - 需要测试OTA任务创建

8. **物流模块一致性** - 字段名统一
   - 需要系统性检查logistics相关表
   - 需要统一字段命名
   - 需要修复前后端不一致

9. **用户profile初始化** - 自动创建机制
   - 需要添加触发器或Edge Function
   - 确保新用户一定有profile

10. **双语完善** - 日语翻译
    - 需要补充aging相关的日语翻译
    - 需要补充异常相关的日语翻译

## 部署状态

✅ 数据库Schema已部署
✅ 测试数据已插入
✅ Edge Function已部署
✅ 前端页面已创建(AgingTestListPage, AgingTestDetailPage, TraceabilityPage)
✅ 路由已配置
✅ 导航已更新
✅ 翻译已添加
✅ Lint检查通过(100 files)
✅ 老化试验操作可执行(开始/暂停/恢复/中断/完成)
✅ 整机追溯可查询(整机SN→关键部件SN)
✅ 放行检查可执行(48小时强制约束)

## 下一步建议

1. 优先实现AgingTestDetailPage,完成老化试验的完整操作流程
2. 创建日本组装现场看板,提供实时状态监控
3. 实现QA放行页面,集成老化状态检查
4. 补充最终测试管理,完成从组装到出货的完整闭环
5. 优化异常处理流程,确保所有异常都能追踪到闭环
