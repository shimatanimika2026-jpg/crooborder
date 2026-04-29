import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { designTokens } from '@/styles/design-tokens';
import { cn } from '@/lib/utils';

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * 统一表单区块组件
 * 用于表单页面的分段展示
 */
export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-1">
        <h3 className={designTokens.typography.sectionTitle}>{title}</h3>
        {description && <p className={designTokens.typography.caption}>{description}</p>}
      </div>
      <Separator />
      <div className={designTokens.spacing.form}>{children}</div>
    </div>
  );
}
