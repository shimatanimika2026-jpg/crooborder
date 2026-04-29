import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { designTokens } from '@/styles/design-tokens';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  backButton?: ReactNode;
  className?: string;
}

/**
 * 统一页面标题组件
 * 格式：左侧标题+说明，右侧主按钮
 */
export function PageHeader({ title, description, action, backButton, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="space-y-1 flex-1">
        <div className="flex items-center gap-2">
          {backButton}
          <h1 className={designTokens.typography.pageTitle}>{title}</h1>
        </div>
        {description && (
          <p className={designTokens.typography.pageSubtitle}>{description}</p>
        )}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
