# 部署指南

本文档记录当前 MVP 在 Vercel 上的部署方式。

## 当前生产地址

- 生产站点：https://crooborder.vercel.app
- GitHub 仓库：https://github.com/shimatanimika2026-jpg/crooborder
- 生产分支：`main`

## Vercel 项目设置

从 GitHub 导入仓库时，保持以下参数：

| 项目 | 值 |
| --- | --- |
| Framework Preset | `Vite` |
| Root Directory | `./` |
| Build Command | `pnpm build` |
| Output Directory | `dist` |
| Install Command | `pnpm install` |
| Production Branch | `main` |

根目录不能修改时保持 `./`，当前项目已经适配该结构。

## 环境变量

### 演示模式

不配置 Supabase 变量时，线上站点进入演示模式。

该模式适合：

- 页面预览
- MVP 演示
- 手工验收

### 真实数据模式

正式 UAT 前需要在 Vercel Environment Variables 中配置：

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

变量添加后需要重新部署。

## SPA 子路由

Vercel 需要把所有前端路由重写到根入口。

当前仓库已包含：

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
```

验证子路由：

```bash
Invoke-WebRequest https://crooborder.vercel.app/login
Invoke-WebRequest https://crooborder.vercel.app/production-plans
Invoke-WebRequest https://crooborder.vercel.app/logistics-dashboard
```

预期结果：HTTP 状态码为 200。

## 发布流程

1. 在本地完成修改和验证。
2. 提交到 Git。
3. 合并到 `main`。
4. 推送 `main` 到 GitHub。
5. 等待 Vercel 自动部署。
6. 在 Vercel Dashboard 确认 Production Deployment 状态为 Ready。
7. 打开线上地址做人工验收。

## 验证命令

本地构建：

```bash
pnpm build
```

MVP 测试：

```bash
pnpm test:mvp
```

线上冒烟测试：

```bash
pnpm exec playwright install chromium
pnpm test:prod
```

说明：如果 `pnpm test:prod` 在本机 Playwright Chromium 中访问 Vercel 超时，但 `Invoke-WebRequest` 和浏览器人工访问正常，需要优先判断为本机浏览器网络路径问题。

## 回滚

如线上部署异常，在 Vercel Dashboard 使用 Instant Rollback 回滚到上一个 Ready 部署。

回滚后需要确认：

- 首页可打开
- 演示入口可进入系统
- 主要子路由直接访问返回 200
- GitHub `main` 是否需要追加修复提交
