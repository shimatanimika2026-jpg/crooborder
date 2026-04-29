import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, AlertCircle, BookOpen, Camera, Video, FileText } from 'lucide-react';
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
  qr_code: string | null;
}

interface SOPDocument {
  id: number;
  sop_code: string;
  title_zh: string;
  title_ja: string;
  content_type: string;
  video_url_zh: string | null;
  video_url_ja: string | null;
  images_zh: string[] | null;
  images_ja: string[] | null;
  description_zh: string | null;
  description_ja: string | null;
}

export default function WorkStationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const [station, setStation] = useState<WorkStation | null>(null);
  const [sops, setSops] = useState<SOPDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  
  // 异常上报表单
  const [anomalyType, setAnomalyType] = useState('');
  const [anomalyDescription, setAnomalyDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadStationDetail();
      subscribeToStationChanges();
    }
  }, [id]);

  const loadStationDetail = async () => {
    if (!id) return;

    setLoading(true);
    try {
      // 加载工位详情
      const { data: stationData, error: stationError } = await supabase
        .from('work_stations')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (stationError) throw stationError;
      setStation(stationData);

      // 加载相关SOP
      if (stationData) {
        const { data: sopData, error: sopError } = await supabase
          .from('sop_documents')
          .select('*')
          .eq('station_type', stationData.station_type)
          .eq('is_active', true);

        if (sopError) throw sopError;
        setSops(sopData || []);
      }
    } catch (error) {
      console.error(t('workStation.errorLoad'), error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const subscribeToStationChanges = () => {
    if (!id) return;

    const channel = supabase
      .channel(`station-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'work_stations',
          filter: `id=eq.${id}`,
        },
        (payload: { new: unknown }) => {
          setStation(payload.new as WorkStation);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const handleStatusChange = async (newStatus: 'green' | 'yellow' | 'red') => {
    if (!station) return;

    try {
      const { error } = await supabase
        .from('work_stations')
        .update({ andon_status: newStatus })
        .eq('id', station.id);

      if (error) throw error;

      toast.success(t('workStation.successUpdateStatus'));
    } catch (error) {
      console.error(t('workStation.errorUpdateStatus'), error);
      toast.error(t('common.error'));
    }
  };

  const handleReportAnomaly = async () => {
    if (!station || !anomalyType || !anomalyDescription) {
      toast.error(t('workStation.errorFillRequired'));
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('assembly_anomalies').insert({
        task_id: station.current_task_id,
        anomaly_type: anomalyType,
        description: anomalyDescription,
        severity: 'high',
        status: 'reported',
        reported_by: (await supabase.auth.getUser()).data.user?.id,
      });

      if (error) throw error;

      await handleStatusChange('red');

      toast.success(t('workStation.successReportException'));
      
      setReportDialogOpen(false);
      setAnomalyType('');
      setAnomalyDescription('');
    } catch (error) {
      console.error(t('workStation.errorReportException'), error);
      toast.error(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const getAndonColor = (status: string) => {
    const colorMap: Record<string, string> = {
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500',
    };
    return colorMap[status] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!station) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">{t('common.noData')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/assembly/andon')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-light tracking-tight">
              {i18n.language === 'ja-JP' ? station.station_name_ja : station.station_name_zh}
            </h1>
            <p className="text-muted-foreground">{station.station_code}</p>
          </div>
        </div>

        {/* 异常上报按钮 */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <AlertCircle className="mr-2 h-4 w-4" />
              {i18n.language === 'ja-JP' ? '異常報告' : '异常上报'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {i18n.language === 'ja-JP' ? '異常報告' : '异常上报'}
              </DialogTitle>
              <DialogDescription>
                {t('workStation.exceptionDetailPlaceholder')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{i18n.language === 'ja-JP' ? '異常タイプ' : '异常类型'}</Label>
                <Select value={anomalyType} onValueChange={setAnomalyType}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t('workStation.selectPlaceholder')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equipment_failure">
                      {i18n.language === 'ja-JP' ? '設備故障' : '设备故障'}
                    </SelectItem>
                    <SelectItem value="quality_issue">
                      {i18n.language === 'ja-JP' ? '品質問題' : '质量问题'}
                    </SelectItem>
                    <SelectItem value="material_shortage">
                      {i18n.language === 'ja-JP' ? '材料不足' : '物料短缺'}
                    </SelectItem>
                    <SelectItem value="safety_concern">
                      {i18n.language === 'ja-JP' ? '安全問題' : '安全隐患'}
                    </SelectItem>
                    <SelectItem value="other">
                      {i18n.language === 'ja-JP' ? 'その他' : '其他'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{i18n.language === 'ja-JP' ? '詳細説明' : '详细说明'}</Label>
                <Textarea
                  value={anomalyDescription}
                  onChange={(e) => setAnomalyDescription(e.target.value)}
                  placeholder={t('workStation.exceptionDescPlaceholder')}
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setReportDialogOpen(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleReportAnomaly}
                  disabled={submitting}
                >
                  {submitting ? t('common.loading') : t('common.submit')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 工位状态卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-normal">
            {i18n.language === 'ja-JP' ? 'ステーション情報' : '工位信息'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {i18n.language === 'ja-JP' ? 'ライン' : '产线'}
              </p>
              <p className="font-normal">{station.production_line}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {i18n.language === 'ja-JP' ? 'タイプ' : '类型'}
              </p>
              <p className="font-normal">{t(`assembly.${station.station_type}`)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {i18n.language === 'ja-JP' ? 'QRコード' : '二维码'}
              </p>
              <p className="font-normal">{station.qr_code || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {i18n.language === 'ja-JP' ? 'ステータス' : '状态'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className={`h-4 w-4 rounded-full ${getAndonColor(station.andon_status)}`}
                />
                <Badge variant="secondary">
                  {i18n.language === 'ja-JP'
                    ? station.andon_status === 'green'
                      ? '正常'
                      : station.andon_status === 'yellow'
                        ? '注意'
                        : '停止'
                    : station.andon_status === 'green'
                      ? '正常'
                      : station.andon_status === 'yellow'
                        ? '注意'
                        : '停止'}
                </Badge>
              </div>
            </div>
          </div>

          {/* 状态控制按钮 */}
          <div className="flex gap-2 mt-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleStatusChange('green')}
            >
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                {i18n.language === 'ja-JP' ? '正常' : '正常'}
              </div>
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleStatusChange('yellow')}
            >
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                {i18n.language === 'ja-JP' ? '注意' : '注意'}
              </div>
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleStatusChange('red')}
            >
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                {i18n.language === 'ja-JP' ? '停止' : '停止'}
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SOP标准作业指导书 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-normal">
            <BookOpen className="inline-block mr-2 h-5 w-5" />
            {i18n.language === 'ja-JP' ? '標準作業指導書 (SOP)' : '标准作业指导书 (SOP)'}
          </CardTitle>
          <CardDescription>
            {i18n.language === 'ja-JP'
              ? 'この工程の標準作業手順'
              : '该工位的标准作业流程'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sops.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t('common.noData')}</p>
          ) : (
            <div className="space-y-4">
              {sops.map((sop) => (
                <Card key={sop.id} className="border-border">
                  <CardHeader>
                    <CardTitle className="text-base font-normal">
                      {i18n.language === 'ja-JP' ? sop.title_ja : sop.title_zh}
                    </CardTitle>
                    <CardDescription>
                      {i18n.language === 'ja-JP' ? sop.description_ja : sop.description_zh}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {sop.content_type.includes('video') && (
                        <Badge variant="secondary">
                          <Video className="mr-1 h-3 w-3" />
                          {i18n.language === 'ja-JP' ? 'ビデオ' : '视频'}
                        </Badge>
                      )}
                      {sop.content_type.includes('image') && (
                        <Badge variant="secondary">
                          <Camera className="mr-1 h-3 w-3" />
                          {i18n.language === 'ja-JP' ? '画像' : '图片'}
                        </Badge>
                      )}
                      {sop.content_type.includes('pdf') && (
                        <Badge variant="secondary">
                          <FileText className="mr-1 h-3 w-3" />
                          PDF
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
