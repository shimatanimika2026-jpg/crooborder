import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ProductionPlan, ProductionOrder } from '@/types/database';

interface PlanGanttChartProps {
  plan: ProductionPlan;
  orders: ProductionOrder[];
}

export default function PlanGanttChart({ plan, orders }: PlanGanttChartProps) {
  const { t } = useTranslation();

  // 计算时间轴
  const timeline = useMemo(() => {
    const start = new Date(plan.plan_period_start);
    const end = new Date(plan.plan_period_end);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    return { start, end, totalDays };
  }, [plan]);

  // 计算每个订单在时间轴上的位置和宽度
  const getOrderPosition = (order: ProductionOrder) => {
    const orderStart = new Date(order.planned_start_date);
    const orderEnd = new Date(order.planned_end_date);
    
    const startOffset = Math.ceil(
      (orderStart.getTime() - timeline.start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const duration = Math.ceil(
      (orderEnd.getTime() - orderStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const left = (startOffset / timeline.totalDays) * 100;
    const width = (duration / timeline.totalDays) * 100;
    
    return { left: `${left}%`, width: `${width}%` };
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'bg-secondary',
      in_progress: 'bg-primary',
      completed: 'bg-muted',
      cancelled: 'bg-destructive',
    };
    return colorMap[status] || 'bg-secondary';
  };

  // 生成时间刻度
  const timeMarkers = useMemo(() => {
    const markers = [];
    const markerCount = Math.min(timeline.totalDays, 10);
    const interval = timeline.totalDays / markerCount;
    
    for (let i = 0; i <= markerCount; i++) {
      const date = new Date(timeline.start);
      date.setDate(date.getDate() + Math.floor(i * interval));
      markers.push({
        position: (i / markerCount) * 100,
        date: date.toLocaleDateString(),
      });
    }
    
    return markers;
  }, [timeline]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-normal">{t('productionPlan.ganttChart')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* 时间轴 */}
          <div className="relative h-8 border-b border-border">
            {timeMarkers.map((marker, index) => (
              <div
                key={index}
                className="absolute top-0 flex flex-col items-center"
                style={{ left: `${marker.position}%` }}
              >
                <div className="h-2 w-px bg-border" />
                <span className="mt-1 text-xs text-muted-foreground">{marker.date}</span>
              </div>
            ))}
          </div>

          {/* 订单甘特条 */}
          <div className="space-y-3">
            {orders.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                {t('common.noData')}
              </p>
            ) : (
              orders.map((order) => {
                const position = getOrderPosition(order);
                return (
                  <div key={order.id} className="relative">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-normal w-32 truncate">
                        {order.order_code}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {order.part_name}
                      </Badge>
                    </div>
                    <div className="relative h-8 bg-muted rounded-sm">
                      <div
                        className={`absolute h-full rounded-sm ${getStatusColor(order.status)} transition-all`}
                        style={position}
                      >
                        <div className="flex items-center justify-center h-full px-2">
                          <span className="text-xs text-primary-foreground truncate">
                            {order.production_quantity} {t('common.units')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <span>{order.planned_start_date}</span>
                      <span>{order.planned_end_date}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 图例 */}
          <div className="flex items-center gap-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-secondary" />
              <span className="text-xs text-muted-foreground">
                {t('productionOrder.pending')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary" />
              <span className="text-xs text-muted-foreground">
                {t('productionOrder.in_progress')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-muted" />
              <span className="text-xs text-muted-foreground">
                {t('productionOrder.completed')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
