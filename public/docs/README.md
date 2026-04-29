# 欢迎使用你的秒哒应用代码包
秒哒应用链接
    URL:https://www.miaoda.cn/projects/app-b10oy6wwe801

# 中国協作ロボット日本委託組立業務Web管理システム

中国协作机器人日本委托组装业务 Web 管理系统

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

### 运行所有测试
```bash
pnpm test
```

### 运行 Smoke 测试
```bash
pnpm test:smoke
```

### 运行 E2E 测试
```bash
pnpm test:e2e
```

### 发布前测试
```bash
pnpm test:pre-release
```

## 发布

### 发布前检查
运行完整的发布前检查（类型检查、Lint、Smoke、E2E、配置回归）：
```bash
pnpm pre-release
```

### 导出交付包
生成干净的交付包（自动排除 .git、.env、缓存等）：
```bash
pnpm export
```

交付包将生成在 `export/` 目录。

## 文档

- [构建说明](./BUILD.md) - 详细的构建和部署说明
- [环境变量](./ENV_VARIABLES.md) - 环境变量配置说明
- [部署指南](./DEPLOYMENT.md) - 生产环境部署指南
- [数据库设计](./DATABASE_DESIGN_FORMAL.md) - 数据库设计文档
- [ER 图](./DATABASE_ER_DIAGRAM.md) - 数据库 ER 图

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
