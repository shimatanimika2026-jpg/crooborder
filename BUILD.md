# 构建说明

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

## 开发环境

### 环境要求
- Node.js 18+
- pnpm 8+
- Git

### 安装依赖
```bash
pnpm install
```

### 配置环境变量
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下环境变量：
- `VITE_SUPABASE_URL` - Supabase 项目 URL
- `VITE_SUPABASE_ANON_KEY` - Supabase 匿名密钥

详见 [ENV_VARIABLES.md](./ENV_VARIABLES.md)

### 启动开发服务器
```bash
pnpm dev
```

访问 http://localhost:5173

## 生产构建

### 构建命令
```bash
pnpm build
```

构建产物位于 `dist/` 目录。

### 构建检查
构建前会自动运行：
- TypeScript 类型检查
- Biome Lint 检查
- 规则检查
- Tailwind CSS 语法检查
- 测试构建

## 测试

### Smoke 测试
快速验证核心功能：
```bash
pnpm test:smoke
```

### E2E 测试
端到端测试：
```bash
pnpm test:e2e
```

### 发布前测试
运行所有关键测试：
```bash
pnpm test:pre-release
```

### 性能测试
运行性能测试与质量门禁：
```bash
pnpm test:performance
```

**注意**: 
- 性能测试需要先构建应用（`pnpm build`）
- 部分测试需要先启动应用（`pnpm dev`）
- 详细说明请参考 [性能测试文档](./docs/PERFORMANCE_TESTING.md)

## 发布流程

### 统一交付命令（推荐）
运行完整的发布前检查并导出干净的交付包：
```bash
pnpm deliver
```

此命令会依次执行：
1. 发布前检查（类型检查、Lint、Smoke、关键 E2E、配置回归、导出包污染检查）
2. 导出交付包（自动排除 .git、.env、缓存等）

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

**任一检查失败都会阻止发布。**

### 单独导出交付包
```bash
pnpm export（生成至 /workspace/export/，项目目录外部）
```

导出脚本会：
- 复制必要的源代码和配置文件
- 排除 `.git/`、`.env`、`.env.local`、`node_modules/`、`dist/`、缓存目录（.vite、.turbo）、`coverage/`
- 检查污染项（发现污染项会直接失败）
- 打包为 zip 文件

交付包位于 `export/` 目录，文件名格式：`app-b10oy6wwe801-YYYYMMDD_HHMMSS.zip`

**注意**：以后默认上传 `export/` 下导出的 zip，不允许直接打包原始项目目录上传。

### 验证交付包
解压交付包并验证：
```bash
cd export/
unzip app-b10oy6wwe801-YYYYMMDD_HHMMSS.zip
cd app-b10oy6wwe801-YYYYMMDD_HHMMSS
pnpm install
pnpm build
pnpm test:pre-release
```

## 部署

详见 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 故障排查

### 构建失败
1. 检查 Node.js 版本：`node -v`（需要 18+）
2. 清理依赖：`rm -rf node_modules pnpm-lock.yaml && pnpm install`
3. 检查环境变量：确保 `.env` 文件存在且配置正确

### 测试失败
1. 检查 Supabase 连接：确保环境变量配置正确
2. 查看测试日志：`pnpm test:smoke --reporter=verbose`
3. 检查数据库状态：确保数据库 schema 是最新的

### 导出失败
1. 检查磁盘空间：`df -h`
2. 检查文件权限：`ls -la scripts/`
3. 手动运行脚本：`bash scripts/export-clean-package.sh`
