import { CheckCircle, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { createQAReleaseRecord, executeQARelease, getQAReleases } from '@/services/qaReleaseService';
import { checkExistingBlockedException } from '@/services/exceptionService';
import { hasDemoPassedFinalTest } from '@/services/demoMainChainService';
import { useFocusOnLoad } from '@/hooks/useFocusOnLoad';
import type { QAReleaseRecord } from '@/types/database';

export default function QAReleaseManagementPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuth();
  const [releases, setReleases] = useState<QAReleaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  
  // 创建放行记录对话框状态
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    finished_product_sn: '',
  });
  
  // 执行放行对话框状态
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<QAReleaseRecord | null>(null);
  const [releaseForm, setReleaseForm] = useState({
    release_status: 'approved',
    remarks: '',
    block_reason: ''
  });

  useEffect(() => {
    fetchReleases();
  }, [statusFilter]);

  // 同步 URL 参数到状态
  useEffect(() => {
    const urlStatus = searchParams.get('status');
    if (urlStatus && urlStatus !== statusFilter) {
      setStatusFilter(urlStatus);
    }
  }, [searchParams]);

  // 使用统一聚焦 Hook（支持 release_id 和 sn 两种参数）
  useFocusOnLoad({
    paramName: 'release_id',
    data: releases,
    loading,
    idPrefix: 'release-row-',
    setHighlightedId,
    notFoundMessage: t('qaRelease.notFoundMessage'),
  });

  // 兼容 sn 参数聚焦
  useEffect(() => {
    if (loading || releases.length === 0) return;

    const sn = searchParams.get('sn');
    if (!sn) return;

    const matchedRelease = releases.find(release => release.finished_product_sn === sn);
    if (matchedRelease) {
      setHighlightedId(matchedRelease.id);
      setTimeout(() => {
        const element = document.getElementById(`release-row-${matchedRelease.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    } else {
      toast.info(t('common.noMatchingRecord'));
    }
  }, [releases, searchParams, loading, t]);

  const fetchReleases = async () => {
    try {
      // Demo 模式：使用演示数据
      if (runtimeMode === 'demo') {
        setReleases(await getQAReleases('JP', statusFilter));
        setLoading(false);
        return;
      }

      // Real 模式：加载真实数据
      const data = await getQAReleases('JP', statusFilter);
      setReleases(data || []);
    } catch (error) {
      console.error(t('qaRelease.fetchError'), error);
      toast.error(t('qaRelease.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRelease = async () => {
    if (creating) return;

    if (!createForm.finished_product_sn.trim()) {
      toast.error(t('qaRelease.pleaseInputSn'));
      return;
    }

    setCreating(true);
    try {
      const newReleaseId = await createQAReleaseRecord(
        createForm.finished_product_sn,
        'JP',
        profile?.id || ''
      );
      toast.success(t('qaRelease.createSuccess'));
      setCreateDialogOpen(false);
      setCreateForm({ finished_product_sn: '' });
      
      // 重置筛选状态，确保新记录可见
      setStatusFilter('all');
      setSearchQuery('');
      
      // 导航到新创建的记录，带上 status=all 确保可见
      navigate(`/qa-release?status=all&release_id=${newReleaseId}`);
      
      // 刷新列表
      fetchReleases();
    } catch (error: unknown) {
      console.error(t('qaRelease.createError'), error);
      toast.error(error instanceof Error ? error.message : t('qaRelease.createError'));
    } finally {
      setCreating(false);
    }
  };

  const handleOpenReleaseDialog = async (release: QAReleaseRecord) => {
    // 检查是否可以执行放行(检查最终测试是否通过)
    try {
      if (runtimeMode === 'demo') {
        if (!hasDemoPassedFinalTest(release.finished_product_sn)) {
          toast.error(t('qaRelease.finalTestNotPassedCannotRelease'));
          return;
        }
        setSelectedRelease(release);
        setReleaseForm({
          release_status: 'approved',
          remarks: '',
          block_reason: ''
        });
        setReleaseDialogOpen(true);
        return;
      }

      const { data: finalTest, error: testError } = await supabase
        .from('final_tests')
        .select('test_status')
        .eq('finished_product_sn', release.finished_product_sn)
        .eq('tenant_id', 'JP')
        .maybeSingle();

      if (testError) {
        throw new Error(t('common.checkAgingTestFailed'));
      }

      if (!finalTest || finalTest.test_status !== 'pass') {
        // 统一去重校验：检查是否已存在该QA放行记录的未关闭阻断异常
        const existingExceptionId = await checkExistingBlockedException(
          'qa_release',
          release.id,
          ['qa_blocked']
        );

        if (existingExceptionId) {
          toast.warning(t('qaRelease.existingBlockedExceptionPleaseHandle'));
          navigate(`/exceptions?focus=${existingExceptionId}`);
          return;
        }

        // 生成阻断异常
        const { data: exceptionId, error: exceptionError } = await supabase.rpc(
          'create_qa_blocked_exception',
          {
            p_release_id: release.id,
            p_finished_product_sn: release.finished_product_sn,
            p_block_reason: t('qaRelease.finalTestNotPassedCannotRelease'),
            p_tenant_id: 'JP',
            p_user_id: profile?.id || ''
          }
        );

        if (exceptionError) {
          console.error(t('qaRelease.createError'), exceptionError);
        }

        toast.error(t('qaRelease.finalTestNotPassedCannotRelease'));
        return;
      }

      // 检查通过,打开对话框
      setSelectedRelease(release);
      setReleaseForm({
        release_status: 'approved',
        remarks: '',
        block_reason: ''
      });
      setReleaseDialogOpen(true);
    } catch (error: unknown) {
      console.error(t('qaRelease.checkPreconditionFailed'), error);
      toast.error(error instanceof Error ? error.message : t('qaRelease.checkPreconditionFailed'));
    }
  };

  const handleExecuteRelease = async () => {
    if (!selectedRelease) return;

    if (!releaseForm.release_status) {
      toast.error(t('qaRelease.pleaseSelectReleaseStatus'));
      return;
    }

    if (releaseForm.release_status === 'blocked' && !releaseForm.block_reason.trim()) {
      toast.error(t('qaRelease.blockReasonRequiredWhenBlocked'));
      return;
    }

    try {
      await executeQARelease(
        selectedRelease.id,
        releaseForm.release_status,
        releaseForm.remarks,
        releaseForm.block_reason,
        'JP',
        profile?.id || ''
      );
      toast.success(t('qaRelease.executeSuccess'));
      setReleaseDialogOpen(false);
      setSelectedRelease(null);
      fetchReleases();
    } catch (error: unknown) {
      console.error(t('qaRelease.executeError'), error);
      toast.error(error instanceof Error ? error.message : t('qaRelease.executeError'));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'secondary' | 'outline' | 'destructive' | 'default' }> = {
      pending: { label: t('qaRelease.statusPending'), variant: 'secondary' },
      approved: { label: t('qaRelease.statusApproved'), variant: 'outline' },
      rejected: { label: t('qaRelease.statusRejected'), variant: 'destructive' },
      blocked: { label: t('qaRelease.statusBlocked'), variant: 'destructive' },
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

  const filteredReleases = releases.filter(release =>
    release.finished_product_sn?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 获取高亮的放行ID或SN对应的ID
  const highlightedReleaseId = searchParams.get('release_id');
  const highlightedSn = searchParams.get('sn');
  const highlightedSnReleaseId = highlightedSn 
    ? releases.find(release => release.finished_product_sn === highlightedSn)?.id?.toString()
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
          <h1 className="text-2xl font-normal">{t('qaRelease.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('qaRelease.subtitle')}
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('qaRelease.create')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('qaRelease.createDialogTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>{t('qaRelease.finishedProductSn')}</Label>
                <Input
                  value={createForm.finished_product_sn}
                  onChange={(e) => setCreateForm({ ...createForm, finished_product_sn: e.target.value })}
                  placeholder={t('qaRelease.inputSn')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creating}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleCreateRelease} disabled={creating || !createForm.finished_product_sn.trim()}>
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
              <CheckCircle className="h-5 w-5" />
              {t('qaRelease.releaseRecordList')}
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
                  <SelectItem value="pending">{t('qaRelease.statusPending')}</SelectItem>
                  <SelectItem value="approved">{t('qaRelease.statusApproved')}</SelectItem>
                  <SelectItem value="rejected">{t('qaRelease.statusRejected')}</SelectItem>
                  <SelectItem value="blocked">{t('qaRelease.statusBlocked')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredReleases.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="mx-auto h-12 w-12 opacity-50 mb-4" />
              <p>{t('qaRelease.emptyText')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReleases.map((release) => (
                <div 
                  key={release.id} 
                  id={`release-row-${release.id}`}
                  className={`border border-border rounded-md p-4 cursor-pointer hover:bg-muted/30 transition-colors ${
                    (highlightedReleaseId && release.id.toString() === highlightedReleaseId) || 
                    (highlightedSnReleaseId && release.id.toString() === highlightedSnReleaseId)
                      ? 'bg-primary/10 border-primary'
                      : ''
                  }`}
                  onClick={() => navigate(`/qa-release?release_id=${release.id}&sn=${release.finished_product_sn}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-medium">{release.finished_product_sn}</p>
                        {getStatusBadge(release.release_status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div>
                          <span>{t('qaRelease.releasedAt')}：</span>
                          <span>{release.released_at ? new Date(release.released_at).toLocaleString(i18n.language) : t('qaRelease.notReleased')}</span>
                        </div>
                        {release.block_reason && (
                          <div className="col-span-2">
                            <span>{t('qaRelease.blockReason')}：</span>
                            <span className="text-destructive">{release.block_reason}</span>
                          </div>
                        )}
                        {release.remarks && (
                          <div className="col-span-2">
                            <span>{t('qaRelease.remarks')}：</span>
                            <span>{release.remarks}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      {release.release_status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleOpenReleaseDialog(release)}
                        >
                          {t('qaRelease.execute')}
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

      {/* 执行放行对话框 */}
      <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('qaRelease.executeDialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{t('qaRelease.finishedProductSn')}</Label>
              <Input value={selectedRelease?.finished_product_sn || ''} disabled />
            </div>
            <div>
              <Label>{t('qaRelease.releaseStatus')}</Label>
              <Select
                value={releaseForm.release_status}
                onValueChange={(value) => setReleaseForm({ ...releaseForm, release_status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('qaRelease.selectReleaseStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">{t('qaRelease.approved')}</SelectItem>
                  <SelectItem value="rejected">{t('qaRelease.blocked')}</SelectItem>
                  <SelectItem value="blocked">{t('qaRelease.blocked')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {releaseForm.release_status === 'blocked' && (
              <div>
                <Label>{t('qaRelease.blockReason')}</Label>
                <Textarea
                  value={releaseForm.block_reason}
                  onChange={(e) => setReleaseForm({ ...releaseForm, block_reason: e.target.value })}
                  placeholder={t('qaRelease.blockReasonPlaceholder')}
                  rows={3}
                />
              </div>
            )}
            <div>
              <Label>{t('qaRelease.remarks')}</Label>
              <Textarea
                value={releaseForm.remarks}
                onChange={(e) => setReleaseForm({ ...releaseForm, remarks: e.target.value })}
                placeholder={t('qaRelease.remarksPlaceholder')}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleExecuteRelease}>
              {t('common.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
