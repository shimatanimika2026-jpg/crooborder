# 回滚说明 (ROLLBACK.md)

**项目**: 中国协作机器人日本委托组装业务 Web 管理系统  
**版本**: v83  
**更新日期**: 2026-04-19

---

## 回滚概述

### 回滚场景
- 部署后发现严重 bug
- 数据库迁移失败
- 性能严重下降
- 用户无法访问
- 数据丢失或损坏

### 回滚策略
- **前端回滚**: 恢复到上一个稳定版本
- **数据库回滚**: 恢复到迁移前状态
- **完整回滚**: 前端 + 数据库同时回滚

---

## 前端回滚

### Vercel 回滚

#### 方式 1: 通过 Dashboard（推荐）

**步骤**:
1. 登录 Vercel Dashboard
2. 选择项目
3. 点击 "Deployments"
4. 找到上一个稳定版本
5. 点击 "..." 菜单
6. 选择 "Promote to Production"
7. 确认回滚

**时间**: 约 1-2 分钟

#### 方式 2: 通过 CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 查看部署历史
vercel ls

# 回滚到特定部署
vercel rollback [deployment-url]

# 或回滚到上一个部署
vercel rollback
```

**时间**: 约 1-2 分钟

---

### Netlify 回滚

#### 通过 Dashboard

**步骤**:
1. 登录 Netlify Dashboard
2. 选择站点
3. 点击 "Deploys"
4. 找到上一个稳定版本
5. 点击 "Publish deploy"
6. 确认回滚

**时间**: 约 1-2 分钟

---

### 自托管回滚

#### 使用 Git 标签

**步骤**:
```bash
# 1. 查看标签
git tag -l

# 2. 切换到上一个版本
git checkout v82

# 3. 重新构建
npm run build

# 4. 上传到服务器
scp -r dist/* user@server:/var/www/app/

# 5. 重启 Nginx
ssh user@server "sudo systemctl reload nginx"
```

**时间**: 约 5-10 分钟

#### 使用备份目录

**步骤**:
```bash
# 1. SSH 到服务器
ssh user@server

# 2. 备份当前版本
sudo mv /var/www/app /var/www/app-v83-backup

# 3. 恢复上一个版本
sudo cp -r /var/www/app-v82-backup /var/www/app

# 4. 重启 Nginx
sudo systemctl reload nginx
```

**时间**: 约 2-3 分钟

---

## 数据库回滚

### Supabase 数据库回滚

#### 方式 1: 使用自动备份（推荐）

**步骤**:
1. 登录 Supabase Dashboard
2. 选择项目
3. Database > Backups
4. 找到迁移前的备份点
5. 点击 "Restore"
6. 确认恢复
7. 等待恢复完成

**时间**: 约 5-15 分钟（取决于数据库大小）

**注意**:
- 会丢失备份点之后的所有数据
- 建议先创建当前状态的备份
- 恢复后需要验证数据完整性

---

#### 方式 2: 执行回滚 SQL

**场景**: 只回滚特定迁移

##### 回滚异常中心表（00062）
```sql
-- 1. 删除权限策略
DROP POLICY IF EXISTS "认证用户可以创建异常日志" ON exception_logs;
DROP POLICY IF EXISTS "用户可以查看本租户异常的日志" ON exception_logs;
DROP POLICY IF EXISTS "用户可以更新本租户的异常" ON operation_exceptions;
DROP POLICY IF EXISTS "认证用户可以创建本租户的异常" ON operation_exceptions;
DROP POLICY IF EXISTS "用户可以查看本租户的异常" ON operation_exceptions;

-- 2. 删除表
DROP TABLE IF EXISTS exception_logs CASCADE;
DROP TABLE IF EXISTS operation_exceptions CASCADE;

-- 3. 删除枚举类型
DROP TYPE IF EXISTS exception_source_module CASCADE;
DROP TYPE IF EXISTS exception_status CASCADE;
DROP TYPE IF EXISTS exception_severity CASCADE;
DROP TYPE IF EXISTS exception_type CASCADE;
```

##### 回滚生产订单权限修复（00061）
```sql
-- 1. 删除新策略
DROP POLICY IF EXISTS "认证用户可以创建本租户的生产订单" ON production_orders;

-- 2. 恢复旧策略
CREATE POLICY "生产人员可以创建生产订单" ON production_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'cn_factory_manager') OR
    has_role(auth.uid(), 'cn_production_staff')
  );
```

##### 回滚库存视图刷新（00060）
```sql
-- 1. 删除触发器
DROP TRIGGER IF EXISTS trigger_refresh_inventory_status ON inventory_records;

-- 2. 删除函数
DROP FUNCTION IF EXISTS trigger_refresh_inventory_status() CASCADE;
DROP FUNCTION IF EXISTS refresh_inventory_status_view() CASCADE;

-- 3. 删除物化视图
DROP MATERIALIZED VIEW IF EXISTS materialized_view_inventory_status CASCADE;
```

**时间**: 约 1-5 分钟

---

#### 方式 3: 使用 Supabase CLI

```bash
# 1. 查看迁移历史
supabase db history

# 2. 回滚到特定版本
supabase db reset --version 00061

# 3. 验证回滚
supabase db status
```

**时间**: 约 2-5 分钟

---

## 完整回滚流程

### 紧急回滚（严重问题）

#### 步骤 1: 评估影响
```
- 问题严重程度: [严重/中等/轻微]
- 影响用户数: [全部/部分/少数]
- 数据完整性: [正常/异常/损坏]
- 回滚必要性: [必须/建议/可选]
```

#### 步骤 2: 通知相关人员
```
- 技术团队
- 运维团队
- 产品团队
- 用户（如需要）
```

#### 步骤 3: 创建当前备份
```bash
# Supabase Dashboard
# Database > Backups > Create backup
# 备份名称: pre-rollback-v83-[timestamp]
```

#### 步骤 4: 执行前端回滚
```bash
# Vercel
vercel rollback

# 或 Netlify
# Dashboard > Deploys > Publish previous deploy
```

#### 步骤 5: 执行数据库回滚
```bash
# 选择回滚方式
# 1. 使用自动备份（推荐）
# 2. 执行回滚 SQL
# 3. 使用 CLI
```

#### 步骤 6: 验证回滚
```bash
# 1. 访问应用
curl https://your-domain.com

# 2. 测试登录
# 3. 测试主要功能
# 4. 检查数据库连接
# 5. 查看错误日志
```

#### 步骤 7: 监控系统
```bash
# 1. 监控错误率
# 2. 监控响应时间
# 3. 监控用户反馈
# 4. 监控数据库性能
```

#### 步骤 8: 通知完成
```
- 回滚完成时间
- 系统状态
- 后续计划
```

**总时间**: 约 15-30 分钟

---

## 部分回滚

### 只回滚前端

**场景**: 前端 bug，数据库正常

**步骤**:
1. 执行前端回滚（Vercel/Netlify）
2. 验证应用功能
3. 监控系统状态

**时间**: 约 2-5 分钟

---

### 只回滚数据库

**场景**: 数据库迁移失败，前端正常

**步骤**:
1. 创建当前备份
2. 执行数据库回滚
3. 验证数据完整性
4. 测试应用功能

**时间**: 约 5-15 分钟

---

### 只回滚特定迁移

**场景**: 特定迁移有问题，其他正常

**步骤**:
1. 识别问题迁移
2. 编写回滚 SQL
3. 执行回滚 SQL
4. 验证数据库状态
5. 测试相关功能

**时间**: 约 5-10 分钟

---

## 回滚验证

### 前端验证清单
- [ ] 应用可访问
- [ ] 登录功能正常
- [ ] 主要页面正常显示
- [ ] 路由跳转正常
- [ ] 无控制台错误
- [ ] 静态资源加载正常

### 数据库验证清单
- [ ] 数据库连接正常
- [ ] 表结构正确
- [ ] 权限策略正确
- [ ] 数据完整性正常
- [ ] 查询性能正常
- [ ] 无数据丢失

### 功能验证清单
- [ ] 登录/登出
- [ ] 生产计划查看
- [ ] 生产订单创建
- [ ] ASN 管理
- [ ] 收货管理
- [ ] 库存查看
- [ ] 质量检验
- [ ] 异常中心
- [ ] 物流管理
- [ ] 通知系统

---

## 回滚后处理

### 1. 问题分析
```
- 问题原因: [描述]
- 影响范围: [描述]
- 解决方案: [描述]
- 预防措施: [描述]
```

### 2. 修复计划
```
- 修复时间: [预计]
- 修复方案: [描述]
- 测试计划: [描述]
- 部署计划: [描述]
```

### 3. 文档更新
- 更新回滚记录
- 更新已知问题
- 更新部署文档
- 更新测试用例

### 4. 团队复盘
- 问题回顾
- 流程改进
- 经验总结
- 培训计划

---

## 回滚记录

### 回滚历史

| 日期 | 版本 | 原因 | 回滚范围 | 执行人 | 时长 | 状态 |
|------|------|------|----------|--------|------|------|
| - | - | - | - | - | - | - |

### 回滚模板

```markdown
## 回滚记录 #[编号]

**日期**: 2026-04-19  
**版本**: v83 → v82  
**执行人**: [姓名]

### 问题描述
[详细描述问题]

### 回滚原因
[说明为什么需要回滚]

### 回滚范围
- [ ] 前端
- [ ] 数据库
- [ ] 其他

### 回滚步骤
1. [步骤 1]
2. [步骤 2]
3. [步骤 3]

### 验证结果
- [ ] 前端验证通过
- [ ] 数据库验证通过
- [ ] 功能验证通过

### 影响评估
- 影响用户数: [数量]
- 数据丢失: [是/否]
- 服务中断时间: [时长]

### 后续计划
[描述修复和重新部署计划]
```

---

## 预防措施

### 部署前
- ✅ 完整测试
- ✅ 代码审查
- ✅ 性能测试
- ✅ 备份数据库
- ✅ 准备回滚方案

### 部署中
- ✅ 分阶段部署
- ✅ 灰度发布
- ✅ 实时监控
- ✅ 快速响应

### 部署后
- ✅ 功能验证
- ✅ 性能监控
- ✅ 错误监控
- ✅ 用户反馈

---

## 紧急联系

### 技术支持
- **开发团队**: dev@example.com
- **运维团队**: ops@example.com
- **数据库团队**: dba@example.com

### 紧急响应流程
1. 发现问题
2. 评估严重程度
3. 通知相关人员
4. 决定是否回滚
5. 执行回滚
6. 验证结果
7. 通知完成

---

## 常见问题

### Q: 回滚会丢失数据吗？
**A**: 
- 前端回滚：不会丢失数据
- 数据库回滚：会丢失备份点之后的数据
- 建议：回滚前创建当前备份

### Q: 回滚需要多长时间？
**A**:
- 前端回滚：1-5 分钟
- 数据库回滚：5-15 分钟
- 完整回滚：15-30 分钟

### Q: 回滚后如何重新部署？
**A**:
1. 修复问题
2. 完整测试
3. 准备新版本
4. 执行部署
5. 验证功能

### Q: 如何避免频繁回滚？
**A**:
1. 加强测试
2. 代码审查
3. 灰度发布
4. 实时监控
5. 快速响应

---

## 总结

### 回滚原则
- **快速**: 尽快恢复服务
- **安全**: 确保数据完整性
- **完整**: 验证所有功能
- **记录**: 详细记录过程

### 关键步骤
1. 评估影响
2. 创建备份
3. 执行回滚
4. 验证结果
5. 监控系统
6. 问题分析

---

**文档版本**: v1.0  
**最后更新**: 2026-04-19  
**维护人**: 运维团队
