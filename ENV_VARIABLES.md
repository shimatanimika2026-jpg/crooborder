# 环境变量配置说明

## 运行模式速查

| 模式 | VITE_SUPABASE_URL | VITE_SUPABASE_ANON_KEY | 用途 |
|------|-------------------|-------------------------|------|
| **演示模式** | 不填 | 不填 | 页面预览，仅用于 Demo |
| **UAT 验收模式** | ✅ 真实值 | ✅ 真实值 | MVP 主链验收，唯一合法验收方式 |

> ⚠️ **重要**：演示模式不得作为 MVP 验收依据。验收必须使用真实 Supabase 连接。

---

## 演示模式

**触发条件**：`VITE_SUPABASE_URL` 或 `VITE_SUPABASE_ANON_KEY` 为空。

**行为**：
- 应用启动 → 进入登录页，显示「演示模式」入口
- 点击「进入演示模式」按钮 → 直接进入仪表盘（使用本地模拟数据）
- 顶部显示橙色 Demo 模式提示条

**限制**：数据不持久，无法提交真实业务数据，不可作为验收依据。

---

## UAT 验收模式

**触发条件**：同时配置了真实的 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。

**行为**：
- 应用启动 → 进入登录页（无演示模式提示）
- 使用真实账号登录 → 进入 MVP 主链业务界面

### 配置步骤

#### 第一步：获取 Supabase 凭据

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择或创建项目
3. 进入 **Settings → API**
4. 复制以下两个值：
   - **Project URL** → 作为 `VITE_SUPABASE_URL`
   - **anon / public** Key → 作为 `VITE_SUPABASE_ANON_KEY`

#### 第二步：创建 .env 文件

```bash
cp .env.example .env
```

编辑 `.env`，填入真实值：

```bash
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...
```

#### 第三步：启动应用

```bash
pnpm dev
```

启动后访问 `http://localhost:5173`，应进入**登录页**（非配置说明页）。

---

## 必需环境变量

### `VITE_SUPABASE_URL`
- **说明**: Supabase 项目 URL
- **格式**: `https://your-project-id.supabase.co`
- **获取方式**: Supabase Dashboard → Settings → API → Project URL

### `VITE_SUPABASE_ANON_KEY`
- **说明**: Supabase 匿名密钥（公开密钥，以 `eyJ` 开头）
- **格式**: JWT 格式长字符串
- **获取方式**: Supabase Dashboard → Settings → API → anon public key

---

## 注意事项

- `.env` 文件不能提交到版本控制（已在 `.gitignore` 中排除）
- `VITE_SUPABASE_ANON_KEY` 是公开密钥，可安全用于前端
- **不要**将 `service_role` 密钥用于前端
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
