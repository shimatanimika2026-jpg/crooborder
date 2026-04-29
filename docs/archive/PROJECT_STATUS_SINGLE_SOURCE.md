# 项目状态单一来源

**版本**: v338
**更新日期**: 2026-04-26
**更新人**: 秒哒 AI 助手

> 本文件为唯一状态来源。如与其他文档矛盾，以本文件为准。

---

## 零、验收范围边界

> **重要：本版本结论为"MVP 主链可验收"，不是"全面可发布"。**

### 本轮已覆盖（可验收）

| 模块 | 验收依据 |
|------|---------|
| 主链流程（收货→生产→最终测试→QA→出货） | Smoke 31 条 + E2E 72 条 状态机闭环 |
| 权限守卫（角色访问控制、未登录重定向） | MVP 权限测试 12 条 |
| 委托单匹配 | 工作区状态机 24 条全路径 |
| 项目工作台（委托单主视图） | 主链路由跳转 7 条 |

### 未纳入本轮验收（后续迭代）

| 模块 | 状态 |
|------|------|
| Data Hub（数据集成） | 功能未完成，不在本轮范围 |
| 模板库 | 功能未完成，不在本轮范围 |
| 系统设置 | 功能未完成，不在本轮范围 |
| 批量导入 | 功能未完成，不在本轮范围 |

---

## 一、发布结论

| 项目 | 结果 |
|------|------|
| **验收状态** | ✅ MVP 主链可验收 |
| **发布门禁** | 7/7 全部通过 |
| **阻塞项** | 无（主链范围内） |

---

## 二、发布门禁检查结果

**执行命令**: `pnpm deliver`（内含 `pnpm pre-release`）  
**执行日期**: 2026-04-26  
**版本**: v332

| # | 检查项 | 命令 / 判据 | 结果 |
|---|--------|------------|------|
| 1 | 类型检查 | `tsc --noEmit --skipLibCheck`（src/ 目录） | ✅ 通过 |
| 2 | Lint 检查 | `biome check`（208 文件，0 错误） | ✅ 通过 |
| 3 | Smoke 测试 | `pnpm test:smoke` | ✅ 31/31 通过 |
| 4 | 关键 E2E 测试 | `pnpm test:e2e`（主流程硬闭环 + 协作权限防护） | ✅ 72/72 通过 |
| 5 | 配置错误页回归 | ConfigErrorPage 包含必要文案 + docs 文件存在 | ✅ 通过 |
| 6 | 导出包污染检查 | 不含 `.git/`、`.env`、`node_modules/`、`dist/` | ✅ 通过 |
| 7 | 交付来源检查 | zip 位于 `/workspace/export/`，文件名符合规范 | ✅ 通过 |

---

## 三、各测试套件详细结果

### 3.1 Smoke 测试（发布门禁）

**命令**: `pnpm test:smoke`  
**执行日期**: 2026-04-26

| 测试文件 | 通过 | 失败 |
|---------|------|------|
| pre-release-smoke.test.tsx | 8 | 0 |
| startup-regression.test.tsx | 4 | 0 |
| LoginPage.smoke.test.tsx | 3 | 0 |
| ReceivingListPage.smoke.test.tsx | 4 | 0 |
| ProductionPlansPage.smoke.test.tsx | 3 | 0 |
| ExceptionCenterPage.smoke.test.tsx | 3 | 0 |
| MainFlowPages.smoke.test.tsx | 6 | 0 |
| **合计** | **31** | **0** |

**是否阻塞发布**: ✅ 否（全部通过）

### 3.2 E2E 测试（发布门禁）

**命令**: `pnpm test:e2e`  
**执行日期**: 2026-04-26

| 测试文件 | 通过 | 失败 |
|---------|------|------|
| mainflow-hard-closure.test.tsx | 8 | 0 |
| p0-hard-closure.test.ts | 8 | 0 |
| p0-hard-closure-integration.test.ts | 5 | 0 |
| blocked-exception-generation.test.ts | 6 | 0 |
| finaltest-to-qa-flow.test.ts | 4 | 0 |
| qa-to-shipment-flow.test.ts | 5 | 0 |
| aging-to-finaltest-block.test.ts | 4 | 0 |
| iqc-disposition-blocking.test.ts | 8 | 0 |
| special-acceptance-unblock.test.ts | 6 | 0 |
| executive-summary-scope.test.ts | 9 | 0 |
| collaboration-sensitive-guard.test.tsx | 9 | 0 |
| **合计** | **72** | **0** |

**是否阻塞发布**: ✅ 否（全部通过）

### 3.3 Lint

**命令**: `npm run lint`  
**执行日期**: 2026-04-26

```
Checked 208 files in 2s. No fixes applied.
```

**是否阻塞发布**: ✅ 否（0 错误）

### 3.4 全量测试套件（含非门禁单元测试）

**命令**: `npx vitest run`  
**执行日期**: 2026-04-26

| 分组 | 通过 | 失败 | 是否门禁 |
|------|------|------|---------|
| Smoke 测试（7 文件） | 31 | 0 | ✅ 门禁 |
| E2E 测试（11 文件） | 72 | 0 | ✅ 门禁 |
| lib/ 单元测试 | 16 | 0 | — |
| pages/ 单元测试（旧式） | 22 | 50 | ❌ 非门禁 |
| contexts/ 单元测试 | 6 | 1 | ❌ 非门禁 |
| **全量合计** | **137** | **50** | — |

> 50 条失败集中在 5 个旧式单元测试文件（pages/ASNListPage、ExceptionCenterPage、LoginPage、ProductionPlansPage、ReceivingListPage）和 contexts/AuthContext，均**不属于发布门禁**。详见 `KNOWN_ISSUES.md`。

**是否阻塞发布**: ✅ 否（门禁测试全部通过；50 条失败均在非门禁范围内）

---

## 四、交付包状态

**命令**: `pnpm export`  
**输出目录**: `/workspace/export/`（项目目录外部，不在 git 跟踪中）  
**文件名格式**: `app-b10oy6wwe801-YYYYMMDD_HHMMSS.zip`

| 污染项 | 结果 |
|--------|------|
| 不含 `.git/` | ✅ |
| 不含 `.env` | ✅ |
| 不含 `node_modules/` | ✅ |
| 不含 `dist/` | ✅ |
| 不含 `export/` | ✅ |
| 不含 `historical_context.txt` | ✅ |
| 不含内部状态文档 | ✅ |

---

## 五、版本历史摘要

| 版本 | 日期 | 关键变更 | Smoke | E2E |
|------|------|---------|-------|-----|
| v332 | 2026-04-26 | 修复平台下载包含 .git/export/ 等污染文件 | 31/31 | 72/72 |
| v331 | 2026-04-26 | 收死 smoke 空壳断言与发布包上传门禁 | 31/31 | 72/72 |
| v330 | 2026-04-25 | 重写 startup-regression 为真实路由落点断言 | 31/31 | 72/72 |
| v329 | 2026-04-25 | 修复协作敏感数据防护测试角色断言 | 31/31 | 72/72 |
| v282 | 2026-04-17 | 主流程断点测试和 P0 测试修复 | 31/31 | 72/72 |
