import { ClipboardCheck, Plus } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, runtimeMode } from '@/db/supabase';
import { createFinalTestRecord, getFinalTests, submitFinalTestResult } from '@/services/finalTestService';
import { checkExistingBlockedException } from '@/services/exceptionService';
import { hasDemoPassedAging } from '@/services/demoMainChainService';
import { useFocusOnLoad } from '@/hooks/useFocusOnLoad';
import type { FinalTestRecord } from '@/types/database';
import { getErrorMessage } from '@/lib/error-utils';

export default function FinalTestManagementPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuth();
  const [tests, setTests] = useState<FinalTestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  
  // 创建测试记录对话框状态
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    finished_product_sn: '',
  });
  
  // 录入测试结果对话框状态
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<FinalTestRecord | null>(null);
  const [resultForm, setResultForm] = useState({
    test_status: 'pass',
    defect_description: '',
    notes: ''
  });

  useEffect(() => {
    fetchTests();
  }, [statusFilter]);

  // 同步 URL 参数到状态
  useEffect(() => {
    const urlStatus = searchParams.get('status');
    if (urlStatus && urlStatus !== statusFilter) {
      setStatusFilter(urlStatus);
    }
  }, [searchParams]);

  // 使用统一聚焦 Hook（支持 test_id 和 sn 两种参数）
  useFocusOnLoad({
    paramName: 'test_id',
    data: tests,
    loading,
    idPrefix: 'test-row-',
    setHighlightedId,
    notFoundMessage: t('finalTest.notFoundMessage'),
  });

  // 兼容 sn 参数聚焦
  useEffect(() => {
    if (loading || tests.length === 0) return;

    const sn = searchParams.get('sn');
    if (!sn) return;

    const matchedTest = tests.find(test => test.finished_product_sn === sn);
    if (matchedTest) {
      setHighlightedId(matchedTest.id);
      setTimeout(() => {
        const element = document.getElementById(`test-row-${matchedTest.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    } else {
      toast.info(t('common.noMatchingRecord'));
    }
  }, [tests, searchParams, loading]);

  const fetchTests = async () => {
    try {
      // Demo 模式：使用演示数据
      if (runtimeMode === 'demo') {
        setTests(await getFinalTests('JP', statusFilter));
        setLoading(false);
        return;
      }

      // Real 模式：加载真实数据
      const data = await getFinalTests('JP', statusFilter);
      setTests(data || []);
    } catch (error) {
      console.error(t('finalTest.fetchError'), error);
      toast.error(t('finalTest.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async () => {
    if (creating) return;

    if (!createForm.finished_product_sn.trim()) {
      toast.error(t('common.pleaseEnterSn'));
      return;
    }

    setCreating(true);
    try {
      const newTestId = await createFinalTestRecord(
        createForm.finished_product_sn,
        'JP',
        profile?.id || ''
      );
      toast.success(t('finalTest.createSuccess'));
      setCreateDialogOpen(false);
      setCreateForm({ finished_product_sn: '' });
      
      // 重置筛选状态，确保新记录可见
      setStatusFilter('all');
      setSearchQuery('');
      
      // 导航到新创建的记录，带上 status=all 确保可见
      navigate(`/final-test?status=all&test_id=${newTestId}`);
      
      // 刷新列表
      fetchTests();
    } catch (error: unknown) {
      console.error(t('finalTest.createError'), error);
      toast.error(getErrorMessage(error, t('finalTest.createError')));
    } finally {
      setCreating(false);
    }
  };

  const handleOpenResultDialog = (test: FinalTestRecord) => {
    setSelectedTest(test);
    setResultForm({
      test_status: 'pass',
      defect_description: '',
      notes: ''
    });
    setResultDialogOpen(true);
  };

  const handleStartTest = async (test: FinalTestRecord) => {
    try {
      // 检查是否可以开始测试(检查老化是否通过)
      if (runtimeMode === 'demo') {
        if (!hasDemoPassedAging(test.finished_product_sn)) {
          toast.error(t('finalTest.agingTestNotPassed'));
          return;
        }
        toast.success(t('common.checkPassed'));
        handleOpenResultDialog(test);
        return;
      }

      const { data: agingTest, error: agingError } = await supabase
        .from('aging_tests')
        .select('status')
        .eq('finished_product_sn', test.finished_product_sn)
        .eq('tenant_id', 'JP')
        .maybeSingle();

      if (agingError) {
        throw new Error(t('common.checkAgingTestFailed'));
      }

      if (!agingTest || agingTest.status !== 'passed') {
        // 统一去重校验：检查是否已存在该最终测试记录的未关闭阻断异常
        const existingExceptionId = await checkExistingBlockedException(
          'final_test',
          test.id,
          ['final_test_blocked']
        );

        if (existingExceptionId) {
          toast.warning(t('common.existingBlockedException'));
          navigate(`/exceptions?focus=${existingExceptionId}`);
          return;
        }

        // 生成阻断异常
        const { data: exceptionId, error: exceptionError } = await supabase.rpc(
          'create_final_test_blocked_exception',
          {
            p_test_id: test.id,
            p_finished_product_sn: test.finished_product_sn,
            p_block_reason: t('finalTest.agingTestNotPassed'),
            p_tenant_id: 'JP',
            p_user_id: profile?.id || ''
          }
        );

        if (exceptionError) {
          console.error(t('finalTest.exceptionGenerationError'), exceptionError);
        }

        toast.error(t('finalTest.agingTestNotPassed'));
        return;
      }

      toast.success(t('common.checkPassed'));
      handleOpenResultDialog(test);
    } catch (error: unknown) {
      console.error(t('finalTest.startTestError'), error);
      toast.error(getErrorMessage(error, t('finalTest.startTestError')));
    }
  };

  const handleSubmitResult = async () => {
    if (!selectedTest) return;

    if (!resultForm.test_status) {
      toast.error(t('common.pleaseSelectTestStatus'));
      return;
    }

    if (resultForm.test_status === 'fail' && !resultForm.defect_description.trim()) {
      toast.error(t('common.defectDescriptionRequired'));
      return;
    }

    try {
      await submitFinalTestResult(
        selectedTest.id,
        resultForm.test_status,
        resultForm.defect_description,
        resultForm.notes,
        'JP',
        profile?.id || ''
      );
      toast.success(t('finalTest.submitSuccess'));
      setResultDialogOpen(false);
      setSelectedTest(null);
      fetchTests();
    } catch (error: unknown) {
      console.error(t('finalTest.submitError'), error);
      toast.error(getErrorMessage(error, t('finalTest.submitError')));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: t('finalTest.statusPending'), variant: 'secondary' },
      planned: { label: t('finalTest.statusPlanned'), variant: 'secondary' },
      pass: { label: t('finalTest.statusPass'), variant: 'outline' },
      fail: { label: t('finalTest.statusFail'), variant: 'destructive' },
      blocked: { label: t('finalTest.statusBlocked'), variant: 'destructive' },
    };
    const config = statusMap[status] || { label: status, variant: 'secondary' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    const nextParams = new URLSearchParams(searchParams);
    if (value === 'all') {
      nextParams.delete('status');
    } else {
      nextParams.set('status', value);
    }
    setSearchParams(nextParams);
  };

  const filteredTests = tests.filter(test =>
    test.finished_product_sn?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 获取高亮的测试ID或SN对应的ID
  const highlightedTestId = searchParams.get('test_id');
  const highlightedSn = searchParams.get('sn');
  const highlightedSnTestId = highlightedSn 
    ? tests.find(test => test.finished_product_sn === highlightedSn)?.id?.toString()
    : null;

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-48 bg-muted" />
        <Skeleton className="h-96 w-full bg-muted" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-normal">{t('finalTest.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('finalTest.subtitle')}
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('finalTest.createTest')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('finalTest.createTest')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>{t('finalTest.finishedProductSn')}</Label>
                <Input
                  value={createForm.finished_product_sn}
                  onChange={(e) => setCreateForm({ ...createForm, finished_product_sn: e.target.value })}
                  placeholder={t('finalTest.searchPlaceholder')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creating}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleCreateTest} disabled={creating || !createForm.finished_product_sn.trim()}>
                {creating ? t('common.creating') : t('common.create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-normal">
              <ClipboardCheck className="h-5 w-5" />
              {t('finalTest.testRecordList')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder={t('common.searchSn')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48"
              />
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={t('common.statusFilterPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="pending">{t('finalTest.statusPending')}</SelectItem>
                  <SelectItem value="pass">{t('finalTest.statusPass')}</SelectItem>
                  <SelectItem value="fail">{t('finalTest.statusFail')}</SelectItem>
                  <SelectItem value="blocked">{t('finalTest.statusBlocked')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardCheck className="mx-auto h-12 w-12 opacity-50 mb-4" />
              <p>{t('finalTest.emptyText')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTests.map((test) => (
                <div 
                  key={test.id} 
                  id={`test-row-${test.id}`}
                  className={`border border-border rounded-md p-4 cursor-pointer hover:bg-muted/30 transition-colors ${
                    (highlightedTestId && test.id.toString() === highlightedTestId) || 
                    (highlightedSnTestId && test.id.toString() === highlightedSnTestId)
                      ? 'bg-primary/10 border-primary'
                      : ''
                  }`}
                  onClick={() => navigate(`/final-test?test_id=${test.id}&sn=${test.finished_product_sn}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-medium">{test.finished_product_sn}</p>
                        {getStatusBadge(test.test_status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div>
                          <span>{t('finalTest.testedAt')}：</span>
                          <span>{test.tested_at ? new Date(test.tested_at).toLocaleString(i18n.language) : t('common.notTested')}</span>
                        </div>
                        {test.defect_description && (
                          <div className="col-span-2">
                            <span>{t('finalTest.defectDescription')}：</span>
                            <span className="text-destructive">{test.defect_description}</span>
                          </div>
                        )}
                        {test.notes && (
                          <div className="col-span-2">
                            <span>{t('finalTest.notes')}：</span>
                            <span>{test.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      {(test.test_status === 'pending' || test.test_status === 'planned') && (
                        <Button
                          size="sm"
                          onClick={() => handleStartTest(test)}
                        >
                          {t('finalTest.startTest')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 录入测试结果对话框 */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('finalTest.submit')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{t('finalTest.finishedProductSn')}</Label>
              <Input value={selectedTest?.finished_product_sn || ''} disabled />
            </div>
            <div>
              <Label>{t('finalTest.testResult')}</Label>
              <Select
                value={resultForm.test_status}
                onValueChange={(value) => setResultForm({ ...resultForm, test_status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('finalTest.selectTestStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">{t('finalTest.testStatusPass')}</SelectItem>
                  <SelectItem value="fail">{t('finalTest.testStatusFail')}</SelectItem>
                  <SelectItem value="blocked">{t('finalTest.testStatusBlocked')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(resultForm.test_status === 'fail' || resultForm.test_status === 'blocked') && (
              <div>
                <Label>{t('finalTest.defectDescription')}</Label>
                <Textarea
                  value={resultForm.defect_description}
                  onChange={(e) => setResultForm({ ...resultForm, defect_description: e.target.value })}
                  placeholder={t('finalTest.enterDefectDescription')}
                  rows={3}
                />
              </div>
            )}
            <div>
              <Label>{t('finalTest.notes')}</Label>
              <Textarea
                value={resultForm.notes}
                onChange={(e) => setResultForm({ ...resultForm, notes: e.target.value })}
                placeholder={t('common.enterNotes')}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmitResult}>
              {t('common.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
