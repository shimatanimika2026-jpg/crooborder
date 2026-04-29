import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { designTokens } from '@/styles/design-tokens';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

/**
 * 统一区块卡片组件 - 工业风清晰边界
 * 用于页面内的主要内容区块
 */
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  noPadding = false,
}: SectionCardProps) {
  return (
    <Card className={cn('border-2 border-slate-400 shadow-sm', className)}>
      {(title || description || action) && (
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 border-b-2 border-slate-400">
          <div className="space-y-1">
            {title && <CardTitle className={cn(designTokens.typography.cardTitle)}>{title}</CardTitle>}
            {description && <CardDescription className="text-slate-700 font-medium">{description}</CardDescription>}
          </div>
          {action && <div>{action}</div>}
        </CardHeader>
      )}
      <CardContent className={noPadding ? 'p-0' : undefined}>{children}</CardContent>
    </Card>
  );
}
