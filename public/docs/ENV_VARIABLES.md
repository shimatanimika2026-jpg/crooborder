# 环境变量配置说明

## 必需环境变量

### Supabase 配置

#### `VITE_SUPABASE_URL`
- **说明**: Supabase 项目 URL
- **格式**: `https://your-project-id.supabase.co`
- **获取方式**: 
  1. 登录 Supabase Dashboard
  2. 选择项目
  3. 进入 Settings > API
  4. 复制 Project URL

#### `VITE_SUPABASE_ANON_KEY`
- **说明**: Supabase 匿名密钥（公开密钥）
- **格式**: 长字符串，以 `eyJ` 开头
- **获取方式**:
  1. 登录 Supabase Dashboard
  2. 选择项目
  3. 进入 Settings > API
  4. 复制 anon public key

## 配置步骤

### 1. 复制示例文件
```bash
cp .env.example .env
```

### 2. 编辑 .env 文件
```bash
# Supabase 配置
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. 验证配置
启动开发服务器：
```bash
pnpm dev
```

如果配置正确，应用会正常启动。如果配置错误或缺失，应用会显示配置说明页。

## Demo 模式

如果未配置 Supabase 环境变量，应用会运行在 Demo 模式：
- 显示配置说明页（`/config-error`）
- 提示缺失的环境变量
- 提供配置指南

## 安全注意事项

### ⚠️ 不要提交 .env 文件
`.env` 文件包含敏感信息，已在 `.gitignore` 中排除。

### ⚠️ 使用 anon key
前端只能使用 `anon` 密钥，不能使用 `service_role` 密钥。

### ⚠️ 配置 RLS
确保 Supabase 数据库启用了 Row Level Security (RLS)，保护数据安全。

## 生产环境

### Vercel
在 Vercel Dashboard 中配置环境变量：
1. 进入项目设置
2. 选择 Environment Variables
3. 添加 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`

### Netlify
在 Netlify Dashboard 中配置环境变量：
1. 进入 Site settings
2. 选择 Build & deploy > Environment
3. 添加环境变量

### 自托管
在服务器上创建 `.env` 文件或通过环境变量注入。

## 故障排查

### 问题：应用显示配置说明页
**原因**: 环境变量未配置或配置错误

**解决方案**:
1. 检查 `.env` 文件是否存在
2. 检查环境变量名称是否正确（必须以 `VITE_` 开头）
3. 检查环境变量值是否正确
4. 重启开发服务器

### 问题：Supabase 连接失败
**原因**: URL 或密钥错误

**解决方案**:
1. 登录 Supabase Dashboard 验证 URL 和密钥
2. 确保复制了完整的密钥（没有截断）
3. 检查网络连接

### 问题：构建后环境变量不生效
**原因**: Vite 在构建时会将环境变量内联到代码中

**解决方案**:
1. 确保环境变量在构建前已配置
2. 重新构建：`pnpm build`
3. 如果使用 CI/CD，确保在构建步骤中配置了环境变量

## 参考资料

- [Vite 环境变量文档](https://vitejs.dev/guide/env-and-mode.html)
- [Supabase 文档](https://supabase.com/docs)
