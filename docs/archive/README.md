# 欢迎使用你的秒哒应用代码包
秒哒应用链接
    URL:https://www.miaoda.cn/projects/app-b10oy6wwe801

# docs/archive — 历史文档存档

本目录存放已归档的阶段性记录、历史报告和已废弃结论。  
**这些文件不代表当前项目状态**，仅供历史追溯参考。

## 文件说明

| 文件 | 原始位置 | 归档原因 |
|------|----------|----------|
| `PROJECT_STATUS_SINGLE_SOURCE.md` | 根目录 | 状态已整合至 `README.md`（当前版本状态表）|
| `SMOKE_TEST_FIX_REPORT.md` | 根目录 | v328 阶段性修复报告，已过时 |
| `TEST_RESULTS.md` | 根目录 | v328 测试结果，已由 `RELEASE_GATE_VERIFICATION.md` 取代 |
| `UAT_TEST_SCRIPT.md` | 根目录 | v283 UAT 测试脚本，已过时 |
| `PERFORMANCE_IMPLEMENTATION_REPORT.md` | `docs/` | 内部性能实现报告，不属于交付物 |
| `PERFORMANCE_SYSTEM_SUMMARY.md` | `docs/` | 内部性能系统摘要，不属于交付物 |
| `PERFORMANCE_TESTING.md` | `docs/` | 内部性能测试说明，不属于交付物 |

## 当前有效文档

请以根目录和 `docs/` 下的文档为准：

```
根目录（权威入口）
  README.md                    项目说明 + 当前版本状态
  KNOWN_ISSUES.md              已知问题清单
  RELEASE_GATE_VERIFICATION.md 发布门禁验证报告
  ENV_VARIABLES.md             环境变量配置说明
  BUILD.md                     构建说明
  DEPLOYMENT.md                部署指南

docs/（技术规范与操作参考）
  prd.md                       产品需求文档
  DATABASE_DESIGN_FORMAL.md    数据库设计文档
  DATABASE_ER_DIAGRAM.md       数据库 ER 图
  MIGRATION.md                 数据库迁移说明
  ROLLBACK.md                  回滚说明
  AGING_SYSTEM.md              老化测试系统说明
  ANDON_SYSTEM.md              安灯系统说明
  LOGISTICS_TRACKING.md        物流追踪说明
  OTA_SYSTEM.md                OTA 系统说明
  PRODUCTION_PLAN_API.md       生产计划 API 说明
```
