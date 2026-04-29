import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { AgingTest, AgingTestLog, ProductModel, FinishedUnitTraceability } from '@/types/database';
import { getErrorMessage } from '@/lib/error-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Clock, Play, Pause, XCircle, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, ja } from 'date-fns/locale';

type AgingTestWithRelations = AgingTest & {
  product_models?: ProductModel;
};

export default function AgingTestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<AgingTestWithRelations | null>(null);
  const [logs, setLogs] = useState<AgingTestLog[]>([]);
  const [unit, setUnit] = useState<FinishedUnitTraceability | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [interruptReason, setInterruptReason] = useState('');
  const [interruptDialogOpen, setInterruptDialogOpen] = useState(false);

  const locale = i18n.language === 'ja-JP' ? ja : zhCN;

  useEffect(() => {
    if (id) {
      loadTestDetail();
      
      // 实时订阅
      const channel = supabase
        .channel(`aging-test-${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'aging_tests', filter: `id=eq.${id}` }, loadTestDetail)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'aging_test_logs', filter: `aging_test_id=eq.${id}` }, loadLogs)
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [id]);

  const loadTestDetail = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // 加载老化试验
      const { data: testData, error: testError } = await supabase
        .from('aging_tests')
        .select(`
          *,
          product_models (*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (testError) throw testError;
      if (!testData) {
        toast.error('老化试验记录不存在');
        navigate('/aging/tests');
        return;
      }
      setTest(testData);

      // 加载整机追溯
      const { data: unitData, error: unitError } = await supabase
        .from('finished_unit_traceability')
        .select('*')
        .eq('finished_product_sn', testData.finished_product_sn)
        .maybeSingle();

      if (unitError) throw unitError;
      if (!unitData) {
        console.warn('未找到整机追溯信息:', testData.finished_product_sn);
      }
      setUnit(unitData);

      // 加载日志
      await loadLogs();
    } catch (error) {
      console.error('加载老化试验详情失败:', error);
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('aging_test_logs')
      .select('*')
      .eq('aging_test_id', id)
      .order('log_time', { ascending: false });

    if (error) {
      console.error('加载日志失败:', error);
    } else {
      setLogs(data || []);
    }
  };

  const handleStart = async () => {
    if (!test || !user) return;

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-aging-test', {
        body: {
          action: 'start',
          test_id: test.id,
          data: {
            operator_id: user.id,
            required_duration_hours: test.required_duration_hours,
            temperature: 25.0,
            humidity: 45.0,
          },
        },
      });

      if (error) throw error;

      toast.success('老化试验已开始');
      await loadTestDetail();
    } catch (error: unknown) {
      console.error('开始老化试验失败:', error);
      toast.error(getErrorMessage(error, '操作失败'));
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    if (!test || !user) return;

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-aging-test', {
        body: {
          action: 'pause',
          test_id: test.id,
          data: {
            operator_id: user.id,
            reason: '手动暂停',
          },
        },
      });

      if (error) throw error;

      toast.success('老化试验已暂停');
      await loadTestDetail();
    } catch (error: unknown) {
      console.error('暂停老化试验失败:', error);
      toast.error(getErrorMessage(error, '操作失败'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!test || !user) return;

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-aging-test', {
        body: {
          action: 'resume',
          test_id: test.id,
          data: {
            operator_id: user.id,
          },
        },
      });

      if (error) throw error;

      toast.success('老化试验已恢复');
      await loadTestDetail();
    } catch (error: unknown) {
      console.error('恢复老化试验失败:', error);
      toast.error(getErrorMessage(error, '操作失败'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleInterrupt = async () => {
    if (!test || !user || !interruptReason.trim()) {
      toast.error('请输入中断原因');
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-aging-test', {
        body: {
          action: 'interrupt',
          test_id: test.id,
          data: {
            operator_id: user.id,
            reason_code: 'MANUAL',
            reason: interruptReason,
            temperature: 25.0,
            humidity: 45.0,
          },
        },
      });

      if (error) throw error;

      toast.success('老化试验已中断');
      setInterruptDialogOpen(false);
      setInterruptReason('');
      await loadTestDetail();
    } catch (error: unknown) {
      console.error('中断老化试验失败:', error);
      toast.error(getErrorMessage(error, '操作失败'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!test || !user) return;

    // 检查是否满足48小时
    if (test.started_at) {
      const elapsed = (Date.now() - new Date(test.started_at).getTime()) / (1000 * 60 * 60);
      if (elapsed < test.required_duration_hours) {
        toast.error(`老化时长不足${test.required_duration_hours}小时，当前仅${elapsed.toFixed(1)}小时`);
        return;
      }
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-aging-test', {
        body: {
          action: 'complete',
          test_id: test.id,
          data: {
            qa_reviewer_id: user.id,
            temperature_avg: 25.5,
            humidity_avg: 45.5,
          },
        },
      });

      if (error) throw error;

      toast.success('老化试验已完成');
      await loadTestDetail();
    } catch (error: unknown) {
      console.error('完成老化试验失败:', error);
      toast.error(getErrorMessage(error, '操作失败'));
    } finally {
      setActionLoading(false);
    }
  };

  const calculateProgress = () => {
    if (!test?.started_at || test.status === 'planned') return 0;
    if (test.status === 'passed' || test.status === 'failed') return 100;

    const now = Date.now();
    const start = new Date(test.started_at).getTime();
    const elapsed = (now - start) / (1000 * 60 * 60);
    return Math.min((elapsed / test.required_duration_hours) * 100, 100);
  };

  const calculateElapsedTime = () => {
    if (!test?.started_at) return '0小时';
    
    const now = Date.now();
    const start = new Date(test.started_at).getTime();
    const elapsed = (now - start) / (1000 * 60 * 60);
    return `${elapsed.toFixed(1)}小时`;
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48 bg-muted" />
        <Skeleton className="h-96 bg-muted" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">老化试验不存在</p>
      </div>
    );
  }

  const canStart = test.status === 'planned';
  const canPause = test.status === 'running';
  const canResume = test.status === 'paused';
  const canInterrupt = test.status === 'running' || test.status === 'paused';
  const canComplete = test.status === 'running';

  return (
    <div className="space-y-6 p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/aging/tests')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-light tracking-tight">{test.test_code}</h1>
            <p className="text-muted-foreground">{test.finished_product_sn}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canStart && (
            <Button onClick={handleStart} disabled={actionLoading}>
              <Play className="mr-2 h-4 w-4" />
              开始老化
            </Button>
          )}
          {canPause && (
            <Button variant="outline" onClick={handlePause} disabled={actionLoading}>
              <Pause className="mr-2 h-4 w-4" />
              暂停
            </Button>
          )}
          {canResume && (
            <Button onClick={handleResume} disabled={actionLoading}>
              <Play className="mr-2 h-4 w-4" />
              恢复
            </Button>
          )}
          {canInterrupt && (
            <Dialog open={interruptDialogOpen} onOpenChange={setInterruptDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <XCircle className="mr-2 h-4 w-4" />
                  中断
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>中断老化试验</DialogTitle>
                  <DialogDescription>
                    请输入中断原因，系统将自动创建异常记录
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="reason">中断原因</Label>
                    <Textarea
                      id="reason"
                      value={interruptReason}
                      onChange={(e) => setInterruptReason(e.target.value)}
                      placeholder="例如：温度异常、设备故障等"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInterruptDialogOpen(false)}>
                    取消
                  </Button>
                  <Button variant="destructive" onClick={handleInterrupt} disabled={actionLoading}>
                    确认中断
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {canComplete && (
            <Button onClick={handleComplete} disabled={actionLoading}>
              <CheckCircle className="mr-2 h-4 w-4" />
              完成老化
            </Button>
          )}
        </div>
      </div>

      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-normal">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">状态</p>
              <Badge variant={test.status === 'passed' ? 'default' : test.status === 'failed' || test.status === 'interrupted' ? 'destructive' : 'secondary'}>
                {t(`aging.${test.status}`)}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">产品型号</p>
              <p className="font-normal">{test.product_models?.model_code || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">控制箱SN</p>
              <p className="font-normal">{test.control_box_sn}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">示教器SN</p>
              <p className="font-normal">{test.teaching_pendant_sn}</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">要求时长</p>
              <p className="font-normal">{test.required_duration_hours}小时</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">已运行时长</p>
              <p className="font-normal">{calculateElapsedTime()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">进度</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${calculateProgress()}%` }}
                  />
                </div>
                <span className="text-sm">{Math.round(calculateProgress())}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">中断次数</p>
              <p className="font-normal">{test.interruption_count}次</p>
            </div>
          </div>

          {test.started_at && (
            <>
              <Separator />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">开始时间</p>
                  <p className="font-normal">{new Date(test.started_at).toLocaleString('zh-CN')}</p>
                </div>
                {test.planned_end_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">计划结束时间</p>
                    <p className="font-normal">{new Date(test.planned_end_at).toLocaleString('zh-CN')}</p>
                  </div>
                )}
                {test.ended_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">实际结束时间</p>
                    <p className="font-normal">{new Date(test.ended_at).toLocaleString('zh-CN')}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {test.last_interruption_reason && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">最后中断原因</p>
                <p className="font-normal text-red-600">{test.last_interruption_reason}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 整机追溯信息 */}
      {unit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-normal">整机追溯信息</CardTitle>
            <CardDescription>关键部件序列号绑定</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">整机序列号</p>
                <p className="font-normal">{unit.finished_product_sn}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">控制箱序列号</p>
                <p className="font-normal">{unit.control_box_sn}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">示教器序列号</p>
                <p className="font-normal">{unit.teaching_pendant_sn}</p>
              </div>
              {unit.firmware_version && (
                <div>
                  <p className="text-sm text-muted-foreground">固件版本</p>
                  <p className="font-normal">{unit.firmware_version}</p>
                </div>
              )}
              {unit.software_version && (
                <div>
                  <p className="text-sm text-muted-foreground">软件版本</p>
                  <p className="font-normal">{unit.software_version}</p>
                </div>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">老化状态</p>
                <Badge variant={unit.aging_status === 'passed' ? 'default' : 'secondary'}>
                  {unit.aging_status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">最终测试状态</p>
                <Badge variant="secondary">{unit.final_test_status}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">QA放行状态</p>
                <Badge variant="secondary">{unit.qa_release_status}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">出货状态</p>
                <Badge variant="secondary">{unit.shipment_status}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 老化日志 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-normal">老化日志</CardTitle>
          <CardDescription>所有操作记录</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">暂无日志记录</p>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-4 pb-4 border-b border-border last:border-0">
                  <div className="flex-shrink-0 w-24 text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(log.log_time), { addSuffix: true, locale })}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{log.log_type}</Badge>
                      <span className="text-sm font-normal">{log.status_snapshot}</span>
                    </div>
                    {log.note && <p className="text-sm text-muted-foreground">{log.note}</p>}
                    {log.alarm_message && (
                      <p className="text-sm text-red-600 mt-1">⚠️ {log.alarm_message}</p>
                    )}
                    {(log.temperature || log.humidity) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        温度: {log.temperature}°C, 湿度: {log.humidity}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
