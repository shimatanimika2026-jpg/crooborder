import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { QualityInspection } from '@/types/database';
import { useFocusOnLoad } from '@/hooks/useFocusOnLoad';

export default function QualityInspectionsPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    loadInspections();
  }, [profile]);

  // 使用统一聚焦 Hook
  useFocusOnLoad({
    paramName: 'focus',
    data: inspections,
    loading,
    idPrefix: 'inspection-',
    setHighlightedId: setFocusId,
    notFoundMessage: '未找到目标质检记录，已显示全部数据',
  });

  const loadInspections = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quality_inspections')
        .select('*')
        .eq('tenant_id', profile.tenant_id === 'BOTH' ? 'CN' : profile.tenant_id)
        .order('inspection_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setInspections(data || []);
    } catch (error) {
      console.error('加载质量检验失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, 'default' | 'secondary' | 'destructive'> = {
      pending: 'secondary',
      passed: 'default',
      failed: 'destructive',
      rework: 'secondary',
    };
    return colorMap[status] || 'default';
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48 bg-muted" />
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-light tracking-tight">{t('nav.qualityInspection')}</h1>
          <p className="text-muted-foreground">质量检验记录由各检验环节自动创建</p>
        </div>
      </div>

      <div className="grid gap-4">
        {inspections.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">{t('common.noData')}</p>
            </CardContent>
          </Card>
        ) : (
          inspections.map((inspection) => (
            <Card 
              key={inspection.id} 
              id={`inspection-${inspection.id}`}
              className={`hover:shadow-sm transition-shadow ${
                focusId && String(inspection.id) === focusId 
                  ? 'ring-2 ring-primary' 
                  : ''
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-normal">
                      {t(`qualityInspection.${inspection.inspection_type}`)}
                    </CardTitle>
                    <CardDescription>{inspection.inspection_date}</CardDescription>
                  </div>
                  <Badge variant={getStatusColor(inspection.status)}>
                    {t(`qualityInspection.${inspection.status}`)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground">{t('qualityInspection.inspectedQuantity')}</p>
                    <p className="font-normal">{inspection.inspected_quantity}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('qualityInspection.qualifiedQuantity')}</p>
                    <p className="font-normal">{inspection.qualified_quantity}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('qualityInspection.defectiveQuantity')}</p>
                    <p className="font-normal">{inspection.defective_quantity}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('qualityInspection.qualificationRate')}</p>
                    <p className="font-normal">{Math.round(inspection.qualification_rate)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
