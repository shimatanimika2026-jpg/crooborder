import { ReactNode } from 'react';
import { designTokens } from '@/styles/design-tokens';
import { cn } from '@/lib/utils';

interface DetailGridProps {
  items: Array<{
    label: string;
    value: ReactNode;
    span?: 1 | 2 | 3;
  }>;
  columns?: 2 | 3;
  className?: string;
}

/**
 * 统一详情网格组件
 * 用于详情页展示字段信息
 */
export function DetailGrid({ items, columns = 2, className }: DetailGridProps) {
  const gridClass = columns === 2 ? designTokens.layout.grid2 : designTokens.layout.grid3;

  return (
    <div className={cn(gridClass, designTokens.spacing.cardGap, className)}>
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            'space-y-1',
            item.span === 2 && 'md:col-span-2',
            item.span === 3 && 'md:col-span-3'
          )}
        >
          <dt className={cn(designTokens.typography.label)}>{item.label}</dt>
          <dd className={cn(designTokens.typography.body, 'text-slate-900 font-semibold')}>{item.value || '-'}</dd>
        </div>
      ))}
    </div>
  );
}
