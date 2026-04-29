import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/db/supabase';
import type { FinishedUnitTraceability, ProductModel, AgingTest } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Search, Package, Cpu, Gamepad2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/error-utils';

type UnitWithRelations = FinishedUnitTraceability & {
  product_models?: ProductModel;
};

export default function TraceabilityPage() {
  const { t } = useTranslation();
  const [sn, setSn] = useState('');
  const [loading, setLoading] = useState(false);
  const [unit, setUnit] = useState<UnitWithRelations | null>(null);
  const [agingTest, setAgingTest] = useState<AgingTest | null>(null);
  const [canRelease, setCanRelease] = useState<{ can_release: boolean; block_reason: string | null } | null>(null);

  const handleSearch = async () => {
    if (!sn.trim()) {
      toast.error(t('traceability.errorInputSN'));
      return;
    }

    setLoading(true);
    try {
      const { data: unitData, error: unitError } = await supabase
        .from('finished_unit_traceability')
        .select(`
          *,
          product_models (*)
        `)
        .eq('finished_product_sn', sn.trim())
        .maybeSingle();

      if (unitError) throw unitError;

      if (!unitData) {
        toast.error(t('traceability.errorNotFound'));
        setUnit(null);
        setAgingTest(null);
        setCanRelease(null);
        return;
      }

      setUnit(unitData);

      const { data: agingData, error: agingError } = await supabase
        .from('aging_tests')
        .select('*')
        .eq('finished_product_sn', sn.trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (agingError) throw agingError;
      setAgingTest(agingData);

      const { data: releaseData, error: releaseError } = await supabase.functions.invoke('manage-aging-test', {
        body: {
          action: 'check_release',
          data: { finished_product_sn: sn.trim() },
        },
      });

      if (releaseError) {
        const errorMsg = await releaseError?.context?.text();
        console.error(t('traceability.errorCheckRelease'), errorMsg || releaseError?.message);
      } else {
        setCanRelease(releaseData.result);
      }

      toast.success(t('traceability.successSearch'));
    } catch (error: unknown) {
      console.error(t('traceability.errorSearch'), error);
      toast.error(getErrorMessage(error, t('traceability.errorSearch')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-light tracking-tight">{t('traceability.title')}</h1>
        <p className="text-muted-foreground">{t('traceability.description')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-normal">{t('traceability.inputSN')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="sn">{t('traceability.snLabel')}</Label>
              <Input
                id="sn"
                value={sn}
                onChange={(e) => setSn(e.target.value)}
                placeholder={t('traceability.snPlaceholder')}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="mr-2 h-4 w-4" />
                {t('traceability.searchButton')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {unit && (
        <>
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-normal">基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('traceability.snInfo')}</p>
                  <p className="font-normal text-lg">{unit.finished_product_sn}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">产品型号</p>
                  <p className="font-normal">{unit.product_models?.model_code || '-'}</p>
                  <p className="text-xs text-muted-foreground">{unit.product_models?.model_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">负载/臂展</p>
                  <p className="font-normal">
                    {unit.product_models?.payload_kg}kg / {unit.product_models?.reach_mm}mm
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">绑定时间</p>
                  <p className="font-normal">{new Date(unit.binding_time).toLocaleString('zh-CN')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* {t('traceability.keyComponents')} */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-normal flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t('traceability.keyComponents')}
              </CardTitle>
              <CardDescription>{t('traceability.keyComponentsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 border border-border rounded-lg">
                  <Cpu className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-normal">控制箱序列号</p>
                    <p className="text-lg">{unit.control_box_sn}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border border-border rounded-lg">
                  <Gamepad2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-normal">示教器序列号</p>
                    <p className="text-lg">{unit.teaching_pendant_sn}</p>
                  </div>
                </div>
              </div>

              {unit.main_board_sn && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">主板序列号</p>
                    <p className="font-normal">{unit.main_board_sn}</p>
                  </div>
                </>
              )}

              {(unit.motor_sn_j1 || unit.motor_sn_j2 || unit.motor_sn_j3 || unit.motor_sn_j4 || unit.motor_sn_j5 || unit.motor_sn_j6) && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">关节电机序列号</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {unit.motor_sn_j1 && <div className="text-sm"><span className="text-muted-foreground">J1:</span> {unit.motor_sn_j1}</div>}
                      {unit.motor_sn_j2 && <div className="text-sm"><span className="text-muted-foreground">J2:</span> {unit.motor_sn_j2}</div>}
                      {unit.motor_sn_j3 && <div className="text-sm"><span className="text-muted-foreground">J3:</span> {unit.motor_sn_j3}</div>}
                      {unit.motor_sn_j4 && <div className="text-sm"><span className="text-muted-foreground">J4:</span> {unit.motor_sn_j4}</div>}
                      {unit.motor_sn_j5 && <div className="text-sm"><span className="text-muted-foreground">J5:</span> {unit.motor_sn_j5}</div>}
                      {unit.motor_sn_j6 && <div className="text-sm"><span className="text-muted-foreground">J6:</span> {unit.motor_sn_j6}</div>}
                    </div>
                  </div>
                </>
              )}

              {(unit.firmware_version || unit.software_version) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
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
                </>
              )}
            </CardContent>
          </Card>

          {/* 流程状态 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-normal">流程状态</CardTitle>
              <CardDescription>{t('traceability.processStatusDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col items-center p-4 border border-border rounded-lg">
                  {unit.aging_status === 'passed' ? (
                    <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
                  ) : unit.aging_status === 'failed' || unit.aging_status === 'waived' ? (
                    <XCircle className="h-8 w-8 text-red-600 mb-2" />
                  ) : (
                    <Clock className="h-8 w-8 text-yellow-600 mb-2" />
                  )}
                  <p className="text-sm text-muted-foreground">老化试验</p>
                  <Badge variant={unit.aging_status === 'passed' ? 'default' : 'secondary'} className="mt-1">
                    {unit.aging_status}
                  </Badge>
                  {unit.aging_passed_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(unit.aging_passed_at).toLocaleDateString('zh-CN')}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-center p-4 border border-border rounded-lg">
                  {unit.final_test_status === 'passed' ? (
                    <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
                  ) : unit.final_test_status === 'failed' ? (
                    <XCircle className="h-8 w-8 text-red-600 mb-2" />
                  ) : (
                    <Clock className="h-8 w-8 text-yellow-600 mb-2" />
                  )}
                  <p className="text-sm text-muted-foreground">最终测试</p>
                  <Badge variant={unit.final_test_status === 'passed' ? 'default' : 'secondary'} className="mt-1">
                    {unit.final_test_status}
                  </Badge>
                  {unit.final_test_passed_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(unit.final_test_passed_at).toLocaleDateString('zh-CN')}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-center p-4 border border-border rounded-lg">
                  {unit.qa_release_status === 'approved' ? (
                    <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
                  ) : unit.qa_release_status === 'rejected' || unit.qa_release_status === 'blocked' ? (
                    <XCircle className="h-8 w-8 text-red-600 mb-2" />
                  ) : (
                    <Clock className="h-8 w-8 text-yellow-600 mb-2" />
                  )}
                  <p className="text-sm text-muted-foreground">QA放行</p>
                  <Badge variant={unit.qa_release_status === 'approved' ? 'default' : 'secondary'} className="mt-1">
                    {unit.qa_release_status}
                  </Badge>
                  {unit.qa_release_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(unit.qa_release_at).toLocaleDateString('zh-CN')}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-center p-4 border border-border rounded-lg">
                  {unit.shipment_status === 'shipped' ? (
                    <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
                  ) : unit.shipment_status === 'blocked' ? (
                    <XCircle className="h-8 w-8 text-red-600 mb-2" />
                  ) : (
                    <Clock className="h-8 w-8 text-yellow-600 mb-2" />
                  )}
                  <p className="text-sm text-muted-foreground">出货状态</p>
                  <Badge variant={unit.shipment_status === 'shipped' ? 'default' : 'secondary'} className="mt-1">
                    {unit.shipment_status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 老化试验信息 */}
          {agingTest && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-normal">老化试验信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">试验编号</p>
                    <p className="font-normal">{agingTest.test_code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">状态</p>
                    <Badge variant={agingTest.status === 'passed' ? 'default' : 'secondary'}>
                      {agingTest.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">要求时长</p>
                    <p className="font-normal">{agingTest.required_duration_hours}小时</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">实际时长</p>
                    <p className="font-normal">
                      {agingTest.actual_duration_hours ? `${agingTest.actual_duration_hours.toFixed(1)}小时` : '-'}
                    </p>
                  </div>
                </div>
                {agingTest.started_at && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">开始时间</p>
                      <p className="font-normal">{new Date(agingTest.started_at).toLocaleString('zh-CN')}</p>
                    </div>
                    {agingTest.ended_at && (
                      <div>
                        <p className="text-sm text-muted-foreground">结束时间</p>
                        <p className="font-normal">{new Date(agingTest.ended_at).toLocaleString('zh-CN')}</p>
                      </div>
                    )}
                    {agingTest.result && (
                      <div>
                        <p className="text-sm text-muted-foreground">结果</p>
                        <Badge variant={agingTest.result === 'pass' ? 'default' : 'destructive'}>
                          {agingTest.result}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 放行检查结果 */}
          {canRelease && (
            <Card className={canRelease.can_release ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}>
              <CardHeader>
                <CardTitle className="text-lg font-normal flex items-center gap-2">
                  {canRelease.can_release ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  放行检查结果
                </CardTitle>
              </CardHeader>
              <CardContent>
                {canRelease.can_release ? (
                  <p className="text-green-600 font-normal">{t('traceability.canRelease')}</p>
                ) : (
                  <div>
                    <p className="text-red-600 font-normal mb-2">{t('traceability.cannotRelease')}</p>
                    <p className="text-sm text-muted-foreground">{t('traceability.blockReason')}: {canRelease.block_reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 阻断原因 */}
          {unit.release_block_reason && (
            <Card className="border-red-200 bg-red-50/50">
              <CardHeader>
                <CardTitle className="text-lg font-normal text-red-600">⚠️ 放行阻断</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{unit.release_block_reason}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
