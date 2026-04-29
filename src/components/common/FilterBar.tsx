import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RotateCcw, Download } from 'lucide-react';
import { designTokens } from '@/styles/design-tokens';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  onReset?: () => void;
  onExport?: () => void;
  className?: string;
}

/**
 * 统一筛选工具栏组件
 * 包含：搜索、筛选器、重置、导出
 */
export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = '搜索...',
  filters,
  onReset,
  onExport,
  className,
}: FilterBarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-4', className)}>
      {/* 搜索框 */}
      {onSearchChange && (
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" strokeWidth={2} />
          <Input
            type="search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 border-2 border-slate-400 text-slate-900 font-medium placeholder:text-slate-500"
          />
        </div>
      )}

      {/* 自定义筛选器 */}
      {filters}

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 ml-auto">
        {onReset && (
          <Button variant="outline" size="sm" onClick={onReset} className="border-2 border-slate-400 font-semibold">
            <RotateCcw className="h-4 w-4 mr-2" strokeWidth={2} />
            重置
          </Button>
        )}
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport} className="border-2 border-slate-400 font-semibold">
            <Download className="h-4 w-4 mr-2" strokeWidth={2} />
            导出
          </Button>
        )}
      </div>
    </div>
  );
}
