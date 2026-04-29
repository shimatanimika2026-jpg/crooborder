import { AlertCircle, FileText } from 'lucide-react';
import { missingSupabaseEnvKeys, supabaseConfigErrorMessage } from '@/db/supabase';

/**
 * 配置说明页
 * 提供 Supabase 环境变量配置说明，不再作为首屏阻断页
 */
export default function ConfigErrorPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-8">
        {/* 标题 */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-amber-50 dark:bg-amber-950/20 p-4">
              <AlertCircle className="h-12 w-12 text-amber-600 dark:text-amber-500" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold text-foreground">
            Supabase 配置说明
          </h1>
          <p className="text-muted-foreground text-lg">
            当前应用运行在 Demo 模式，如需使用完整功能，请配置 Supabase 环境变量
          </p>
        </div>

        {/* 缺失的环境变量 */}
        {missingSupabaseEnvKeys.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <div className="space-y-2">
              <h2 className="text-lg font-medium text-foreground">
                缺失的环境变量
              </h2>
              <div className="bg-muted rounded-md p-4">
                <ul className="space-y-2">
                  {missingSupabaseEnvKeys.map((key) => (
                    <li key={key} className="flex items-center gap-2 text-sm font-mono">
                      <span className="text-amber-600 dark:text-amber-500">⚠</span>
                      <span className="text-foreground">{key}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-2 text-sm text-muted-foreground">
              <p>{supabaseConfigErrorMessage}</p>
            </div>
          </div>
        )}

        {/* 解决步骤 */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-6">
          <h2 className="text-lg font-medium text-foreground">
            配置步骤
          </h2>

          <div className="space-y-4">
            {/* 步骤 1 */}
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    复制环境变量模板文件
                  </p>
                  <div className="bg-muted rounded-md p-3 font-mono text-sm">
                    <code className="text-foreground">cp .env.example .env</code>
                  </div>
                </div>
              </div>
            </div>

            {/* 步骤 2 */}
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    编辑 .env 文件，填写真实的 Supabase 配置
                  </p>
                  <div className="bg-muted rounded-md p-3 space-y-1">
                    <div className="font-mono text-sm">
                      <span className="text-muted-foreground"># 从 Supabase Dashboard 获取</span>
                    </div>
                    <div className="font-mono text-sm text-foreground">
                      VITE_SUPABASE_URL=https://your-project.supabase.co
                    </div>
                    <div className="font-mono text-sm text-foreground">
                      VITE_SUPABASE_ANON_KEY=your-anon-key
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 步骤 3 */}
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    重新启动开发服务器
                  </p>
                  <div className="bg-muted rounded-md p-3 font-mono text-sm">
                    <code className="text-foreground">pnpm dev</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 文档链接 */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-medium text-foreground mb-4">
            详细文档
          </h2>
          <div className="space-y-3">
            <a
              href="/docs/ENV_VARIABLES.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-sm text-primary hover:underline"
            >
              <FileText className="h-4 w-4" />
              <span>ENV_VARIABLES.md - 环境变量配置说明</span>
            </a>
            <a
              href="/docs/README.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-sm text-primary hover:underline"
            >
              <FileText className="h-4 w-4" />
              <span>README.md - 项目说明文档</span>
            </a>
            <a
              href="/docs/BUILD.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-sm text-primary hover:underline"
            >
              <FileText className="h-4 w-4" />
              <span>BUILD.md - 构建说明文档</span>
            </a>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            ⚠️ 注意：.env 文件不应提交到版本控制系统
          </p>
          <p className="mt-1">
            请确保 .env 文件已添加到 .gitignore
          </p>
        </div>
      </div>
    </div>
  );
}
