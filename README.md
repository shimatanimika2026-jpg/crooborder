# Crooborder

中国协作机器人日本委托组立业务 Web 管理系统。

当前交付状态：MVP 演示版已完成本地验收，并已部署到 Vercel。

- 线上地址：https://crooborder.vercel.app
- GitHub 仓库：https://github.com/shimatanimika2026-jpg/crooborder
- 默认分支：`main`
- 部署平台：Vercel

## 当前范围

本版本用于 MVP 演示和页面流程验收，默认运行在演示模式。

已纳入 MVP 的主要页面：

- 仪表盘、高层总览看板、运营仪表板、物流仪表板
- 生产计划、生产订单、质量检验、库存管理、物流跟踪
- ASN 发货单、收货管理、IQC 检验、物料处置
- 异常中心、特殊申请、供应商管理
- 电子看板、Andon、OTA 版本页面
- 系统设置基础页面

未纳入正式生产范围：

- 真实 Supabase 数据写入验收
- 正式权限矩阵验收
- 生产环境账号、审计、告警和运维流程
- 自定义域名和生产级监控

## 运行模式

### 演示模式

未配置 Supabase 环境变量时，系统使用内置演示数据。

适用场景：

- 页面导航验收
- MVP 流程演示
- UI 文案和布局检查

### 真实数据模式

配置以下变量后，系统连接 Supabase：

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

适用场景：

- UAT 数据验收
- 真实账号登录
- 数据写入和权限校验

## 本地开发

环境要求：

- Node.js 18+
- pnpm 8+

安装依赖：

```bash
pnpm install
```

启动开发服务器：

```bash
pnpm dev
```

构建生产包：

```bash
pnpm build
```

## 验证命令

MVP 本地测试：

```bash
pnpm test:mvp
```

Smoke 测试：

```bash
pnpm test:smoke
```

线上 Playwright 冒烟测试：

```bash
pnpm exec playwright install chromium
pnpm test:prod
```

说明：当前机器上 PowerShell 可访问线上站点，但 Playwright Chromium 访问 Vercel 时曾出现网络超时。该问题属于本机浏览器运行时网络路径问题，不等同于线上不可用。

## Vercel 部署参数

从 GitHub 导入时使用：

- Framework Preset：`Vite`
- Root Directory：`./`
- Build Command：`pnpm build`
- Output Directory：`dist`
- Install Command：`pnpm install`
- Production Branch：`main`

SPA 子路由已通过 `vercel.json` 重写到 `/`，直接访问 `/production-plans`、`/logistics-dashboard` 等页面应返回 200。

## 交付判断

当前可认定为 MVP 演示交付：

- 本地人工验收已通过
- GitHub `main` 已包含 MVP 代码
- Vercel 生产部署状态为 Ready
- 根路径和主要子路由已验证返回 200

进入正式 UAT 前，还需要配置真实 Supabase 环境变量并补充真实账号、权限和数据写入验收。
