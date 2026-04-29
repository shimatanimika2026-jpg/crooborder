import { STATUS_COLORS, STATUS_BADGE_STYLES } from '@/styles/design-tokens';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  label: string;
  className?: string;
}

/**
 * 统一状态标签组件 - 工业风高对比度
 * 根据状态自动应用对应颜色
 */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const variant = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'default';
  const badgeStyle = STATUS_BADGE_STYLES[variant as keyof typeof STATUS_BADGE_STYLES];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium',
        badgeStyle,
        className
      )}
    >
      {label}
    </span>
  );
}
