import { ReactNode } from 'react';
import { FileQuestion } from 'lucide-react';
import { designTokens } from '@/styles/design-tokens';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * 统一空状态组件
 * 用于列表、表格等无数据时的展示
 */
export function EmptyState({
  icon,
  title = '暂无数据',
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="mb-4 text-muted-foreground">
        {icon || <FileQuestion className="h-12 w-12" strokeWidth={1.5} />}
      </div>
      <h3 className={cn(designTokens.typography.body, 'font-medium mb-1')}>{title}</h3>
      {description && <p className={designTokens.typography.caption}>{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
