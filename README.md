# 欢迎使用你的秒哒应用代码包
秒哒应用链接
    URL:https://www.miaoda.cn/projects/app-b10oy6wwe801

# 中国協作ロボット日本委託組立業務Web管理システム

中国协作机器人日本委托组装业务 Web 管理系统

---

> **⚠️ 交付包上传硬性要求**
>
> **只允许上传由 `pnpm deliver` 生成的 zip 文件，路径为 `/workspace/export/`（项目目录外部）。**
>
> | 来源 | 允许上传 | 包含的污染文件 |
> |------|----------|--------------|
> | `/workspace/export/app-b10oy6wwe801-*.zip`（`pnpm deliver` 输出） | ✅ **唯一合规** | 无（已通过 7/7 门禁验证） |
> | 平台"下载代码"按钮生成的 zip | ❌ **严禁** | `.git/` `.env` `performance-reports/` |
> | 工作区根目录手动打包的 zip | ❌ **严禁** | `.git/` `.env` `node_modules/` 等 |
>
> **生成方式**：`pnpm deliver`（完整 7 项门禁检查 + 导出），或 `pnpm export`（仅导出）

---

## 当前版本状态

**版本**: v375 | **日期**: 2026-04-17 | **状态**: ✅ MVP 主链可验收

> ⚠️ **范围声明**：当前仅证明 MVP 主链可验收，不代表全站可发布。

### v343 → v375 真实变化说明

| 版本区间 | 主要变化 |
|---------|---------|
| v343 → v359 | 引入多语言（i18n）、优化 Andon 看板、完善 QA 放行工作流、修复 IQC 处置状态机 |
| v359 → v361 | Smoke 测试全覆盖（8 文件 41 条）、修复 PermissionsProvider 上下文嵌套 bug |
| v361 → v363 | E2E 测试完整覆盖（11 文件 72 条）、加固委托单状态机、DemoLoginCard 演示入口修复 |
| v363 → v364 | Demo 模式全链路演示数据接入（生产计划、收货、Andon、异常、QA、出货） |
| v364 → v365 | 交付包污染项防护加固（`pnpm deliver` 7/7 全绿门禁体系建立） |
| v365 → v366 | 建立 MVP 外测试债务清单（50 条旧测试逐条分类，0 条真实缺陷） |
| v366 → v367 | 新建 `MVP_ACCEPTANCE_EVIDENCE.md`（7 步主链逐步验收证据） |
| v367 → v368 | CommissionListPage 演示数据接入（修复演示模式委托列表为空）；`pnpm deliver` 7/7 全绿；any 剩余清单文档化 |
| v368 → v369 | TypeScript 类型系统加固：`database.ts` 补全 `ShippingOrder.status` 枚举、`FinishedUnitWithModel` 类型、4 个统计字段 |
| v369 → v370 | 全量测试套件梳理：pages/contexts 50 条旧式单元测试逐条分类，确认 0 条真实主链缺陷 |
| v370 → v371 | `MVP_ACCEPTANCE_EVIDENCE.md` 全链路实际结果补全（演示/UAT 模式分列记录，"设计限制"与"缺陷"明确区分） |
| v371 → v372 | `KNOWN_ISSUES.md` 全面硬化：新增 🔌 UAT债务第五标签，10 条搜索/筛选测试剥离归类，为 27 条废弃测试补充"新覆盖位置"列 |
| v372 → v373 | MVP 交付收口（5 项门禁）：`.gitattributes` 补全、TypeScript `any` 生产代码减至 40 处、门禁文档实跑数据写实、`pnpm deliver` 7/7 全绿 |
| v373 → v374 | 交付包 `.git` 污染彻底修复：导出脚本升级至 v3（第四层 zip 内容直接验证、`.git/` 精确匹配），`pnpm deliver` 重验 7/7 全绿 |
| v374 → **v375** | ✅ 四份对外文档版本号统一（`README.md` / `KNOWN_ISSUES.md` / `RELEASE_GATE_VERIFICATION.md` / `MVP_ACCEPTANCE_EVIDENCE.md` 全部对齐 v375 / 2026-04-17）

### 本轮 MVP 验收范围

| 模块 | 状态 | 说明 |
|------|------|------|
| 主链流程（收货→生产→最终测试→QA→出货） | ✅ 已覆盖 | Smoke 41 条 + E2E 72 条覆盖核心状态机 |
| 权限守卫（角色访问控制） | ✅ 已覆盖 | MVP 测试 12 条覆盖未登录/角色重定向 |
| 委托单匹配 | ✅ 已覆盖 | 委托单工作区状态机 24 条全路径覆盖 |
| 项目工作台（委托单主视图） | ✅ 已覆盖 | 主链路由跳转 7 条覆盖关键页面渲染 |

### 未纳入本轮发布范围

| 模块 | 原因 |
|------|------|
| Data Hub（数据集成） | 功能未完成，后续迭代 |
| 模板库 | 功能未完成，后续迭代 |
| 系统设置 | 功能未完成，后续迭代 |
| 批量导入 | 功能未完成，后续迭代 |

### 门禁检查结果

| 检查项 | 结果 | 命令 |
|--------|------|------|
| MVP 主链测试（3 组） | ✅ 43/43 通过 | `pnpm test:mvp` |
| 发布门禁（4 项质量检查） | ✅ 通过 | `pnpm verify:release` |
| 发布门禁（7 项完整检查） | ✅ 7/7 通过 | `pnpm pre-release` |
| Smoke 测试 | ✅ 41/41 通过 | `pnpm test:smoke` |
| E2E 测试 | ✅ 72/72 通过 | `pnpm test:e2e` |
| Lint | ✅ 215 文件，0 错误 | `pnpm run lint` |
| 交付包污染检查 | ✅ 全部干净 | `pnpm deliver` |

> ⚠️ 全量测试套件（`npx vitest run`）中有 50 条旧式单元测试失败（pages/、contexts/ 目录），这些**不在发布门禁范围内**，不阻塞主链验收。详见 `KNOWN_ISSUES.md`。

---

## 快速启动

### 环境要求
- Node.js 18+
- pnpm 8+

### 安装依赖
```bash
pnpm install
```

### 配置环境变量
复制环境变量示例文件：
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置 Supabase 连接信息。详见 [ENV_VARIABLES.md](./ENV_VARIABLES.md)

### 启动开发服务器
```bash
pnpm dev
```

访问 http://localhost:5173

### 构建生产版本
```bash
pnpm build
```

构建产物位于 `dist/` 目录。

## 测试

### MVP 主链测试（最小测试底座）

运行覆盖核心业务逻辑的 3 组 43 条 MVP 测试：

```bash
pnpm test:mvp
```

| 测试组 | 文件 | 条数 | 覆盖范围 |
|--------|------|------|----------|
| 权限守卫 | `src/__tests__/mvp/permission-guard.test.tsx` | 12 | `ProtectedRoute` 未登录/loading/已登录；`PermissionGuard` 无权限/有权限/redirectTo；权限工具函数边界 |
| 主链路由跳转 | `src/__tests__/mvp/main-flow-navigation.test.tsx` | 7 | 未登录访问受保护路由→重定向到 /login；公开路由直接访问；缺环境变量→演示登录页（/login DemoLoginCard） |
| 委托单工作区 | `src/__tests__/mvp/commission-workspace.test.ts` | 24 | 委托单状态机全路径覆盖（合法/非法转换）；终态不可操作；i18n key 返回验证 |
| **合计** | | **43** | **0 失败** |

**预期输出**：
```
Test Files  3 passed (3)
     Tests  43 passed (43)
```

### 运行 Smoke 测试（发布门禁）
```bash
pnpm test:smoke
# 预期: 41/41 通过
```

### 运行 E2E 测试（发布门禁）
```bash
pnpm test:e2e
# 预期: 72/72 通过
```

### 运行全量测试套件
```bash
pnpm test
# 注意: 全量套件中 pages/ 和 contexts/ 有 50 条已知旧式单元测试失败
# 这些不属于发布门禁，不阻塞发布。详见 KNOWN_ISSUES.md
```

### 发布前完整检查
```bash
pnpm pre-release
# = 类型检查 + Lint + Smoke + E2E + 配置回归 + 导出包检查 + 交付来源检查（共 7 项）
```

## 发布前验证（任何人可复跑）

拿到项目的任何人都可以用以下一条命令验证代码是否满足发布标准：

```bash
pnpm verify:release
```

该命令按顺序执行四项检查，任一失败立即退出：

| 步骤 | 内容 | 命令 |
|------|------|------|
| 1 | 依赖安装（精确锁文件） | `pnpm install --frozen-lockfile` |
| 2 | Lint 检查 | `pnpm run lint` |
| 3 | TypeScript 类型检查 | `tsgo -p tsconfig.check.json` |
| 4 | 生产构建 | `tsc + vite build` |

**预期输出（全部通过）：**
```
╔══════════════════════════════════════════════╗
║  ✅  verify:release  全部通过                ║
╚══════════════════════════════════════════════╝
  结论    : ✅ 代码质量门禁通过，可执行完整发布流程
```

> 无需数据库连接，任何干净环境均可执行。  
> 如需同时跑 Smoke/E2E 测试，请继续执行 `pnpm deliver`（7 项完整门禁 + 导出交付包）。

## 发布

### ⚠️ 关于平台下载按钮

**平台"下载代码"按钮打包的是原始开发工作区**，会包含 `.git/`、`.sync/`、`historical_context.txt`、`node_modules/` 等开发产物，**不是干净的交付包**。

### 交付包获取方式（三级可信度）

| 方式 | 路径 | 是否干净 | 说明 |
|------|------|---------|------|
| ✅ **推荐** `pnpm export` | `/workspace/export/*.zip` | **干净** | git archive + 三层污染过滤，每次提交后自动刷新 |
| ✅ **推荐** `pnpm deliver` | `/workspace/export/*.zip` | **干净** | 7 项门禁 + export，完整交付流程 |
| ⚠️ `git archive HEAD` | — | **较干净** | 受 `.gitattributes export-ignore` 保护，天然无 `.git/`，但需手动执行 |
| ❌ **禁用** 平台"下载代码" | 开发工作区原始 zip | **脏** | 含 `.git/`、`.sync/`、`node_modules/` 等，**不可用于交付** |

### 自动导出机制

**每次 `git commit` 后，后台自动触发 `pnpm export`**，确保 `/workspace/export/` 下始终有最新的干净 zip：

```
git commit → post-commit hook → pnpm export（后台）→ /workspace/export/<版本>.zip
```

查看最新导出日志：
```bash
cat /tmp/auto-export.log
```

查看当前导出包：
```bash
ls -lh /workspace/export/
```

### 统一交付命令（推荐）

```bash
pnpm deliver
```

依次执行：7 项发布门禁（类型检查、Lint、Smoke 31 条、关键 E2E 72 条等）→ 导出干净交付包。

### 单独导出

```bash
pnpm export
```

**交付包排除清单**：`.git/` · `.env` · `.sync/` · `history/` · `historical_context.txt` · `node_modules/` · `dist/` · `scripts/performance/` · `scripts/verify-release.sh` · `src/__tests__/` · `KNOWN_ISSUES.md` · `RELEASE_GATE_VERIFICATION.md` · `docs/archive/`

## 文档

### 操作参考

- [构建说明](./BUILD.md) - 构建与本地开发说明
- [环境变量](./ENV_VARIABLES.md) - 环境变量配置说明
- [部署指南](./DEPLOYMENT.md) - 生产环境部署指南
- [已知问题](./KNOWN_ISSUES.md) - 已知问题与限制清单

### 技术规范

- [数据库设计](./docs/DATABASE_DESIGN_FORMAL.md) - 数据库设计文档
- [ER 图](./docs/DATABASE_ER_DIAGRAM.md) - 数据库 ER 图
- [迁移说明](./docs/MIGRATION.md) - 数据库迁移说明
- [回滚说明](./docs/ROLLBACK.md) - 回滚操作说明
- [产品需求](./docs/prd.md) - 产品需求文档

### 业务系统说明（`docs/`）

- [老化测试系统](./docs/AGING_SYSTEM.md)
- [安灯系统](./docs/ANDON_SYSTEM.md)
- [物流追踪](./docs/LOGISTICS_TRACKING.md)
- [OTA 系统](./docs/OTA_SYSTEM.md)
- [生产计划 API](./docs/PRODUCTION_PLAN_API.md)

### 历史存档（`docs/archive/`）

历史报告、阶段性记录和已废弃结论见 [docs/archive/](./docs/archive/)。

## 技术栈

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Supabase
- React Router
- i18next

## 许可证

专有软件 - 未经授权不得使用、复制或分发
