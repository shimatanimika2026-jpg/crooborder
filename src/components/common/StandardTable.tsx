import { ReactNode } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { designTokens } from '@/styles/design-tokens';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  title: string;
  width?: string;
  render?: (value: unknown, record: T, index: number) => ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface StandardTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyText?: string;
  rowKey?: keyof T | ((record: T) => string);
  onRowClick?: (record: T) => void;
  className?: string;
  rowClassName?: string | ((record: T) => string);
  rowProps?: (record: T) => Record<string, unknown>;
}

/**
 * 统一标准表格组件 - 工业风高对比度
 * 统一表头高度、行高、内边距、空状态
 */
export function StandardTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyText = '暂无数据',
  rowKey = 'id' as keyof T,
  onRowClick,
  className,
  rowClassName,
  rowProps,
}: StandardTableProps<T>) {
  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return String(record[rowKey] ?? index);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full bg-muted" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 border-2 border-slate-400 rounded-md bg-slate-100">
        <p className={cn(designTokens.typography.caption, 'text-slate-700 font-medium')}>
          {emptyText}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-md border-2 border-slate-400 overflow-hidden', className)}>
      <Table>
        <TableHeader className={designTokens.table.headerBg}>
          <TableRow className={cn(designTokens.table.headerHeight, 'border-b-2 border-slate-400')}>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                style={{ width: column.width }}
                className={cn(
                  designTokens.table.headerText,
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right'
                )}
              >
                {column.title}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((record, index) => (
            <TableRow
              key={getRowKey(record, index)}
              className={cn(
                designTokens.table.rowHeight,
                designTokens.table.rowBorder,
                designTokens.table.rowHover,
                onRowClick && 'cursor-pointer',
                typeof rowClassName === 'function' ? rowClassName(record) : rowClassName
              )}
              onClick={() => onRowClick?.(record)}
              {...(rowProps?.(record) || {})}
            >
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={cn(
                    'text-slate-900 font-medium', // 加深+加粗
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                >
                  {column.render
                    ? column.render(record[column.key], record, index)
                    : String(record[column.key] ?? '-')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
