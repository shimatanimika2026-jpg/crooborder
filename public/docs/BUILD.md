# 构建说明

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

## 发布流程

### 1. 发布前检查
运行完整的发布前检查：
```bash
pnpm pre-release
```

检查项目：
- 类型检查
- Lint 检查
- Smoke 测试
- E2E 测试
- 配置错误页回归测试

**任一检查失败都会阻止发布。**

### 2. 导出交付包
生成干净的交付包：
```bash
pnpm export
```

导出脚本会：
- 复制必要的源代码和配置文件
- 排除 `.git/`、`.env`、`node_modules/`、`dist/`、缓存目录
- 检查污染项
- 打包为 zip 文件

交付包位于 `export/` 目录。

### 3. 验证交付包
解压交付包并验证：
```bash
cd export/app-b10oy6wwe801-YYYYMMDD_HHMMSS
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
