import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isDemoMode } from "@/db/supabase";

/**
 * Demo 模式提示条
 * 当应用运行在 Demo 模式时显示，提醒用户当前未连接 Supabase
 */
export function DemoModeBanner() {
  if (!isDemoMode) {
    return null;
  }

  return (
    <Alert className="rounded-none border-x-0 border-t-0 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
      <AlertDescription className="text-amber-800 dark:text-amber-300">
        <span className="font-medium">演示模式</span> — 当前未连接生产数据库，仅供页面预览。
        如需正式验收，请配置{' '}
        <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900 rounded text-xs">VITE_SUPABASE_URL</code>{' '}
        及{' '}
        <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900 rounded text-xs">VITE_SUPABASE_ANON_KEY</code>{' '}
        后重启应用。
      </AlertDescription>
    </Alert>
  );
}
