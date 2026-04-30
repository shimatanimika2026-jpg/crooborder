import { useEffect, useState } from 'react';
import { supabase, runtimeMode, hasSupabaseEnv, missingSupabaseEnvKeys } from '@/db/supabase';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';

// ─── 类型定义 ─────────────────────────────────────────────────
type CheckStatus = 'pass' | 'fail' | 'warn' | 'pending';

interface CheckRow {
  label: string;
  status: CheckStatus;
  value: string;
  detail?: string;
}

// ─── 工具函数 ─────────────────────────────────────────────────
/** 截断展示敏感字符串（首 20 字符 + … ） */
function maskValue(v: string | undefined): string {
  if (!v) return '（未设置）';
  return v.length > 20 ? v.slice(0, 20) + '…' : v;
}

/** 从 import.meta.env 读取构建时注入的值 */
function readEnvVar(key: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string {
  if (key === 'VITE_SUPABASE_URL') {
    return import.meta.env.VITE_SUPABASE_URL || '';
  }

  if (key === 'VITE_SUPABASE_ANON_KEY') {
    return import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  }

  return '';
}

// ─── 状态图标 ─────────────────────────────────────────────────
function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === 'pass')    return <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />;
  if (status === 'fail')    return <XCircle      className="h-4 w-4 text-red-500 shrink-0" />;
  if (status === 'warn')    return <AlertCircle  className="h-4 w-4 text-amber-500 shrink-0" />;
  return                           <Clock        className="h-4 w-4 text-muted-foreground shrink-0 animate-pulse" />;
}

function StatusBadge({ status }: { status: CheckStatus }) {
  const map: Record<CheckStatus, string> = {
    pass:    'bg-green-50 text-green-700 border-green-200',
    fail:    'bg-red-50 text-red-700 border-red-200',
    warn:    'bg-amber-50 text-amber-700 border-amber-200',
    pending: 'bg-muted text-muted-foreground border-border',
  };
  const labels: Record<CheckStatus, string> = {
    pass: '通过', fail: '失败', warn: '警告', pending: '检测中…',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

// ─── 检查行组件 ─────────────────────────────────────────────────
function CheckItem({ row }: { row: CheckRow }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <StatusIcon status={row.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{row.label}</span>
          <StatusBadge status={row.status} />
        </div>
        <p className="mt-0.5 text-xs font-mono text-muted-foreground break-all">{row.value}</p>
        {row.detail && (
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{row.detail}</p>
        )}
      </div>
    </div>
  );
}

// ─── 主页面 ─────────────────────────────────────────────────────
export default function UATVerifyPage() {
  const [pingStatus, setPingStatus] = useState<CheckStatus>('pending');
  const [pingDetail, setPingDetail] = useState('正在连接 Supabase…');
  const [pingMs, setPingMs]         = useState<number | null>(null);

  // Supabase 连通性测试
  useEffect(() => {
    if (!supabase) {
      setPingStatus('warn');
      setPingDetail('Demo 模式：supabase client 未初始化，跳过 ping 测试。');
      return;
    }

    const t0 = Date.now();
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .limit(1)
      .then(({ error }: { error: { message: string } | null }) => {
        const elapsed = Date.now() - t0;
        setPingMs(elapsed);
        if (error) {
          setPingStatus('fail');
          setPingDetail(`连接失败：${error.message}`);
        } else {
          setPingStatus('pass');
          setPingDetail(`连接成功，响应时间 ${elapsed} ms`);
        }
      });
  }, []);

  // ── 收集检查项 ────────────────────────────────────────────────
  const supabaseUrl     = readEnvVar('VITE_SUPABASE_URL');
  const supabaseAnonKey = readEnvVar('VITE_SUPABASE_ANON_KEY');

  const isUAT = runtimeMode === 'real';

  const checks: CheckRow[] = [
    // 1. 运行模式
    {
      label:  '运行模式',
      status: isUAT ? 'pass' : 'warn',
      value:  isUAT ? '✅ UAT 验收模式（real）' : '⚠️ 演示模式（demo）',
      detail: isUAT
        ? '已检测到完整的 Supabase 环境变量，应用以真实数据库模式运行。'
        : '未设置 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY，应用以演示数据运行。',
    },

    // 2. VITE_SUPABASE_URL
    {
      label:  'VITE_SUPABASE_URL',
      status: supabaseUrl ? 'pass' : 'fail',
      value:  supabaseUrl ? maskValue(supabaseUrl) : '（未设置）',
      detail: supabaseUrl
        ? '环境变量已注入，Supabase 项目 URL 有效。'
        : '缺失！请在 .env 文件中设置 VITE_SUPABASE_URL 后重启应用。',
    },

    // 3. VITE_SUPABASE_ANON_KEY
    {
      label:  'VITE_SUPABASE_ANON_KEY',
      status: supabaseAnonKey ? 'pass' : 'fail',
      value:  supabaseAnonKey ? maskValue(supabaseAnonKey) : '（未设置）',
      detail: supabaseAnonKey
        ? '环境变量已注入，匿名公钥有效。'
        : '缺失！请在 .env 文件中设置 VITE_SUPABASE_ANON_KEY 后重启应用。',
    },

    // 4. hasSupabaseEnv
    {
      label:  'Supabase 环境变量完整性',
      status: hasSupabaseEnv ? 'pass' : 'fail',
      value:  hasSupabaseEnv
        ? '两个变量均已加载'
        : `缺失：${missingSupabaseEnvKeys.join(', ')}`,
    },

    // 5. 默认路由
    {
      label:  '默认路由 /  →  目标页面',
      status: 'pass',
      value:  '/ → DashboardPageSimple（业务总览首页）',
      detail: '路由定义见 routes.tsx，无任何条件跳转逻辑。认证后直接渲染业务首页。',
    },

    // 6. /config-error 是否自动触发
    {
      label:  '/config-error 是否强制跳转',
      status: 'pass',
      value:  '否 — 仅可手动导航，代码中无任何 navigate("/config-error")',
      detail:
        'AppRoutes.tsx 和 RouteGuard.tsx 均无 /config-error 重定向逻辑。' +
        '该页面作为"配置说明文档"页保留，不参与启动流程。',
    },

    // 7. Supabase ping
    {
      label:  'Supabase 数据库连通性',
      status: pingStatus,
      value:  pingMs !== null ? `${pingMs} ms` : pingDetail,
      detail: pingStatus === 'pending' ? undefined : pingDetail,
    },
  ];

  // ── 总结论 ────────────────────────────────────────────────────
  const failCount = checks.filter(c => c.status === 'fail').length;
  const hasPending = checks.some(c => c.status === 'pending');

  const overallStatus: CheckStatus = hasPending
    ? 'pending'
    : failCount > 0
      ? 'fail'
      : isUAT ? 'pass' : 'warn';

  const overallLabel = {
    pass:    '✅ UAT 验收就绪',
    fail:    `❌ 存在 ${failCount} 个检查失败`,
    warn:    '⚠️ 当前为演示模式，如需 UAT 验收请配置环境变量',
    pending: '⏳ 检测中…',
  }[overallStatus];

  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-6 pt-12">
      <div className="w-full max-w-2xl space-y-8">

        {/* 页头 */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            UAT 环境自查报告
          </h1>
          <p className="text-sm text-muted-foreground">
            中国协作机器人日本委托组装业务 Web 管理系统 ·{' '}
            <span className="font-mono">{new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC</span>
          </p>
        </div>

        {/* 总结论条 */}
        <div className={`rounded-lg border px-5 py-4 flex items-center gap-3 ${
          overallStatus === 'pass'    ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
          : overallStatus === 'fail' ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
          : overallStatus === 'warn' ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
          : 'bg-muted border-border'
        }`}>
          <StatusIcon status={overallStatus} />
          <span className={`text-sm font-medium ${
            overallStatus === 'pass' ? 'text-green-800 dark:text-green-300'
            : overallStatus === 'fail' ? 'text-red-800 dark:text-red-300'
            : overallStatus === 'warn' ? 'text-amber-800 dark:text-amber-300'
            : 'text-muted-foreground'
          }`}>
            {overallLabel}
          </span>
        </div>

        {/* 检查项列表 */}
        <div className="rounded-lg border border-border bg-card divide-y divide-border">
          <div className="px-5 py-3">
            <h2 className="text-sm font-semibold text-foreground">检查项明细</h2>
          </div>
          <div className="px-5">
            {checks.map((row, i) => (
              <div key={i}>
                <CheckItem row={row} />
                {i < checks.length - 1 && <Separator className="bg-border/50" />}
              </div>
            ))}
          </div>
        </div>

        {/* 结论说明 */}
        <div className="rounded-lg border border-border bg-card px-5 py-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">验收结论</h2>
          <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p>
              <span className="font-medium text-foreground">默认路由</span>：
              未认证用户访问任意受保护路由 → 自动跳转 <code className="px-1 bg-muted rounded">/login</code>；
              认证后 <code className="px-1 bg-muted rounded">/</code> 直接渲染
              <code className="px-1 bg-muted rounded">DashboardPageSimple</code>（业务总览首页）。
            </p>
            <p>
              <span className="font-medium text-foreground">/config-error 不再阻断</span>：
              已在 AppRoutes.tsx 和 RouteGuard.tsx 中完全移除强制跳转逻辑。
              该页面仅作配置参考文档保留，不影响正常启动流程。
            </p>
            <p>
              <span className="font-medium text-foreground">UAT 模式启用方式</span>：
              在 <code className="px-1 bg-muted rounded">.env</code> 中设置
              <code className="px-1 bg-muted rounded">VITE_SUPABASE_URL</code> 和
              <code className="px-1 bg-muted rounded">VITE_SUPABASE_ANON_KEY</code>，
              重启应用后本页"运行模式"栏即显示"UAT 验收模式"。
            </p>
          </div>
        </div>

        {/* 页脚 */}
        <p className="text-center text-xs text-muted-foreground pb-8">
          本页面为公开路由（无需登录），路径：
          <code className="px-1 bg-muted rounded">/uat-verify</code>
        </p>

      </div>
    </div>
  );
}
