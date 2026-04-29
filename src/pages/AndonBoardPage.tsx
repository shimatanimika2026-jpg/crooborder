import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase, runtimeMode } from '@/db/supabase';
import { demoWorkStationsData } from '@/data/demo/assembly';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, AlertTriangle, Users, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface WorkStation {
  id: number;
  station_code: string;
  station_name_zh: string;
  station_name_ja: string;
  production_line: string;
  station_type: string;
  andon_status: 'green' | 'yellow' | 'red';
  current_task_id: number | null;
  operator_id: string | null;
  is_active: boolean;
  updated_at: string;
}

export default function AndonBoardPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [stations, setStations] = useState<WorkStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLine, setSelectedLine] = useState<string>('ALL');

  useEffect(() => {
    loadStations();
    subscribeToStationChanges();
  }, []);

  const loadStations = async () => {
    setLoading(true);
    try {
      if (runtimeMode === 'demo') {
        setStations(demoWorkStationsData);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('work_stations')
        .select('*')
        .eq('is_active', true)
        .order('station_code', { ascending: true });

      if (error) throw error;
      setStations(data || []);
    } catch (error) {
      console.error('加载工位失败:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const subscribeToStationChanges = () => {
    if (!supabase) return () => {};
    const channel = supabase
      .channel('work-stations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_stations',
        },
        (payload: { eventType: string; new: unknown }) => {
          if (payload.eventType === 'UPDATE') {
            const newStation = payload.new as WorkStation;
            setStations((prev) =>
              prev.map((station) =>
                station.id === newStation.id ? newStation : station
              )
            );
            
            // 红灯告警
            if (newStation.andon_status === 'red') {
              toast.error(
                `${newStation.station_name_zh} 异常停线!`,
                { duration: 10000 }
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const getAndonColor = (status: string) => {
    const colorMap: Record<string, string> = {
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500',
    };
    return colorMap[status] || 'bg-gray-500';
  };

  const getAndonIcon = (status: string) => {
    switch (status) {
      case 'green':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'yellow':
        return <AlertTriangle className="h-8 w-8 text-yellow-500" />;
      case 'red':
        return <AlertCircle className="h-8 w-8 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    const textMap: Record<string, string> = {
      green: i18n.language === 'ja-JP' ? '正常' : '正常',
      yellow: i18n.language === 'ja-JP' ? '注意' : '注意',
      red: i18n.language === 'ja-JP' ? '停止' : '停止',
    };
    return textMap[status] || '';
  };

  const productionLines = ['ALL', ...Array.from(new Set(stations.map((s) => s.production_line)))];

  const filteredStations =
    selectedLine === 'ALL'
      ? stations
      : stations.filter((s) => s.production_line === selectedLine);

  const statusCounts = {
    green: filteredStations.filter((s) => s.andon_status === 'green').length,
    yellow: filteredStations.filter((s) => s.andon_status === 'yellow').length,
    red: filteredStations.filter((s) => s.andon_status === 'red').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* 头部 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-light tracking-tight">
              {i18n.language === 'ja-JP' ? '生産ライン電子看板' : '生产线电子看板'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {i18n.language === 'ja-JP' ? 'リアルタイム工程監視システム' : '实时工位监控系统'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleString(i18n.language)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {i18n.language === 'ja-JP' ? '自動更新中' : '自动更新中'}
            </p>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {i18n.language === 'ja-JP' ? '総工程数' : '总工位数'}
                  </p>
                  <p className="text-3xl font-light">{filteredStations.length}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">
                    {i18n.language === 'ja-JP' ? '正常稼働' : '正常运行'}
                  </p>
                  <p className="text-3xl font-light text-green-600">{statusCounts.green}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">
                    {i18n.language === 'ja-JP' ? '注意必要' : '需要注意'}
                  </p>
                  <p className="text-3xl font-light text-yellow-600">{statusCounts.yellow}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">
                    {i18n.language === 'ja-JP' ? 'ライン停止' : '停线异常'}
                  </p>
                  <p className="text-3xl font-light text-red-600">{statusCounts.red}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 产线筛选 */}
      <div className="flex gap-2 mb-6">
        {productionLines.map((line) => (
          <Button
            key={line}
            variant={selectedLine === line ? 'default' : 'outline'}
            onClick={() => setSelectedLine(line)}
          >
            {line}
          </Button>
        ))}
      </div>

      {/* 工位网格 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredStations.map((station) => (
          <Card
            key={station.id}
            className="cursor-pointer transition-all hover:shadow-lg"
            onClick={() => navigate(`/assembly/stations/${station.id}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-normal">
                    {i18n.language === 'ja-JP'
                      ? station.station_name_ja
                      : station.station_name_zh}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{station.station_code}</p>
                </div>
                {getAndonIcon(station.andon_status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Andon灯 */}
                <div className="flex items-center gap-3">
                  <div
                    className={`h-12 w-12 rounded-full ${getAndonColor(station.andon_status)} animate-pulse`}
                  />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {i18n.language === 'ja-JP' ? 'ステータス' : '状态'}
                    </p>
                    <p className="font-normal">{getStatusText(station.andon_status)}</p>
                  </div>
                </div>

                {/* 产线信息 */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {i18n.language === 'ja-JP' ? 'ライン' : '产线'}
                  </span>
                  <Badge variant="secondary">{station.production_line}</Badge>
                </div>

                {/* 工位类型 */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {i18n.language === 'ja-JP' ? 'タイプ' : '类型'}
                  </span>
                  <span>{t(`assembly.${station.station_type}`)}</span>
                </div>

                {/* 更新时间 */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(station.updated_at).toLocaleTimeString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
