# MVP 验收记录

本文档记录当前 MVP 的验收结论和剩余边界。

## 结论

当前版本可以认定为 MVP 演示交付。

依据：

- 本地人工验收通过
- 主要页面无阻断级错误
- 演示模式可进入系统并浏览核心业务页面
- GitHub `main` 已合并 MVP 代码
- Vercel 生产部署已完成，状态为 Ready
- 线上根路径和主要子路由已验证返回 200

## 生产地址

- Vercel：https://crossboder.vercel.app
- GitHub：https://github.com/shimatanimika2026-jpg/crossboder
- 生产分支：`main`

## 已验收范围

### 核心业务

- 仪表盘
- 高层总览看板
- 运营仪表板
- 物流仪表板
- 生产计划
- 生产订单
- 质量检验
- 库存管理
- 物流跟踪

### 物料管理

- ASN 发货单
- 收货管理
- IQC 检验
- 物料处置

### 异常和质量

- 异常中心
- 特殊申请
- 供应商管理

### 生产执行

- 电子看板
- Andon 页面
- OTA 版本页面

## 当前运行模式

当前线上环境未配置真实 Supabase 数据库变量时，默认进入演示模式。

演示模式可验收：

- 页面是否能打开
- 导航是否连贯
- 空状态和演示数据是否正常显示
- 页面是否存在明显乱码、未翻译键名、加载失败提示

演示模式不验收：

- 真实账号权限
- 数据库写入
- 数据持久化
- 审计日志
- 生产级安全策略

## 自动化验证

本地验证命令：

```bash
pnpm build
pnpm test:mvp
pnpm test:smoke
```

线上冒烟测试命令：

```bash
pnpm exec playwright install chromium
pnpm test:prod
```

已知情况：当前机器上 PowerShell HTTP 请求可访问 Vercel，但 Playwright Chromium 曾出现连接超时。该问题需要用浏览器人工验收或 CI 环境复核。

## 进入 UAT 前的剩余事项

1. 配置真实 Supabase 项目。
2. 在 Vercel 添加 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。
3. 创建 UAT 用户和角色数据。
4. 验证真实登录、权限隔离和数据写入。
5. 补充真实数据模式下的回归记录。

## 当前风险

- 当前交付是演示模式 MVP，不是正式生产环境。
- 未配置真实数据库时，页面数据来自内置演示数据。
- 线上自动化测试在本机 Chromium 里可能受网络路径影响，需要人工验收或 CI 复核。
