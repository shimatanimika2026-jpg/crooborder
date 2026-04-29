# 部署指南

**最后更新**: 2026-04-17
**版本**: v330

---

> **⚠️ 交付包上传硬性要求**
>
> **只允许上传 `export/` 目录下由 `pnpm export（生成至 /workspace/export/，项目目录外部）` 生成的 zip 文件。**
>
> 禁止上传：
> - 项目根目录直接打包的 zip（包含 `.git/`、`.env`、`node_modules/`）
> - 任何不在 `export/` 目录下的压缩包
>
> 合规文件名格式：`app-b10oy6wwe801-YYYYMMDD_HHMMSS.zip`
>
> 生成方式：`pnpm deliver`（完整发布前检查 + 导出），或 `pnpm export（生成至 /workspace/export/，项目目录外部）`（仅导出）

---

## 部署前检查

### 统一交付命令（推荐）
运行完整的发布前检查并导出干净的交付包：
```bash
pnpm deliver
```

此命令会依次执行：
1. 发布前检查（类型检查、Lint、Smoke、关键 E2E、配置回归、导出包污染检查）
2. 导出交付包（自动排除 .git、.env、缓存等）

**硬性要求**: 没有最新 `pnpm deliver` 或 `pnpm pre-release` 结果，不得进入 UAT

### 单独执行发布前检查
```bash
pnpm pre-release
```

检查项目：
- 类型检查（src/ 目录，排除测试文件）
- Lint 检查
- Smoke 测试（关键页面打开且包含关键入口）
- 关键 E2E 测试（协作敏感数据防护、主流程硬闭环）
- 配置错误页回归测试
- 导出包污染检查

### 检查测试结果
- 关键 E2E 测试通过率必须达到 100%
- Smoke 测试失败项必须在 `KNOWN_ISSUES.md` 中记录
- 必须在 `PROJECT_STATUS_SINGLE_SOURCE.md` 中明确标注"是否允许进入 UAT"

### 性能测试（可选）
运行性能测试确保性能指标达标：
```bash
pnpm test:performance
```

**注意**: 
- 性能测试需要先构建应用（`pnpm build`）
- 部分测试需要先启动应用（`pnpm dev`）
- 详细说明请参考 [性能测试文档](./docs/PERFORMANCE_TESTING.md)

---

## 构建生产版本

```bash
pnpm build
```

构建产物位于 `dist/` 目录

---

## 环境变量配置

### Supabase 配置
- `VITE_SUPABASE_URL`: Supabase 项目 URL
- `VITE_SUPABASE_ANON_KEY`: Supabase 匿名密钥

### 示例
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 部署到生产环境

### 1. 上传构建产物
将 `dist/` 目录内容上传到 Web 服务器

### 2. 配置 Web 服务器
- 配置 SPA 路由重定向（所有路由指向 `index.html`）
- 配置 HTTPS
- 配置 CORS（如需要）

### 3. 验证部署
- 访问应用 URL
- 验证登录功能
- 验证关键业务流程

---

## 回滚策略

如发现严重问题：
1. 立即回滚到上一个稳定版本
2. 记录问题到 `KNOWN_ISSUES.md`
3. 修复问题后重新执行 `pnpm deliver` 或 `pnpm pre-release`
4. 确认测试通过后再次部署

---

**最后更新**: 2026-04-17
