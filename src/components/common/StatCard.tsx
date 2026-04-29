import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { designTokens } from '@/styles/design-tokens';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  trend?: ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * 统一统计卡片组件 - 工业 KPI 卡
 * 用于展示关键指标
 */
export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor = 'text-blue-700',
  iconBgColor = 'bg-blue-50',
  trend,
  className,
  onClick,
}: StatCardProps) {
  return (
    <Card 
      className={cn(
        'border-2 border-slate-400 shadow-sm hover:shadow-md transition-shadow',
        onClick && 'cursor-pointer hover:bg-accent/50',
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs font-bold text-slate-900">{title}</CardDescription>
          {Icon && (
            <div className={cn('p-2 rounded-md border-2 border-slate-400', iconBgColor)}>
              <Icon className={cn('h-4 w-4', iconColor)} strokeWidth={2.5} />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn(designTokens.typography.stat)}>{value}</div>
        {(description || trend) && (
          <div className="mt-2 flex items-center justify-between">
            {description && <p className={cn(designTokens.typography.caption, 'text-slate-700 font-medium')}>{description}</p>}
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
