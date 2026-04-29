import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Edit, History, CheckCircle, XCircle, Send, Play, StopCircle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import PlanGanttChart from '@/components/production/PlanGanttChart';
import { getFactoryDisplayName } from '@/lib/factory-display';
import { 
  submitPlanForApproval, 
  approvePlan, 
  rejectPlan, 
  activatePlan, 
  closePlan,
  getPlanExecutionProgress,
  getPlanVersions,
  getPlanApprovals
} from '@/services/productionPlanService';
import type { ProductionPlan, ProductionOrder, ProductModel } from '@/types/database';

// 版本历史接口
interface PlanVersion {
  id: number;
  plan_id: number;
  version_number: number;
  plan_details: Record<string, unknown>;
  change_reason: string | null;
  change_description: string | null;
  created_by: string | null;
  created_at: string;
  tenant_id: string;
}

// 审批记录接口
interface PlanApproval {
  id: number;
  plan_id: number;
  version_number: number;
  approval_stage: string;
  approver_id: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  approval_comment: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  tenant_id: string;
  created_at: string;
}

// 执行进度接口
interface ExecutionProgress {
  linked_order_count: number;
  completed_quantity: number;
  completion_rate: number;
}

// 用户信息接口
interface UserProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
}

export default function ProductionPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { canApprove, canActivate, canClose } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<ProductionPlan | null>(null);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [versions, setVersions] = useState<PlanVersion[]>([]);
  const [approvals, setApprovals] = useState<PlanApproval[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  
  // 关联信息
  const [productModel, setProductModel] = useState<ProductModel | null>(null);
  const [executionProgress, setExecutionProgress] = useState<ExecutionProgress | null>(null);
  const [usersMap, setUsersMap] = useState<Map<string, UserProfile>>(new Map());
  
  // 审批对话框状态
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [closeReason, setCloseReason] = useState('');

  useEffect(() => {
    if (id) {
      loadPlanDetail();
      subscribeToChanges();
    }
  }, [id]);

  const loadPlanDetail = async () => {
    if (!id) return;

    setLoading(true);
    try {
      // 加载计划详情
      const { data: planData, error: planError } = await supabase
        .from('production_plans')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (planError) throw planError;
      setPlan(planData);

      // 加载产品型号信息
      if (planData?.product_model_id) {
        const { data: modelData } = await supabase
          .from('product_models')
          .select('*')
          .eq('id', planData.product_model_id)
          .maybeSingle();
        setProductModel(modelData);
      }

      // 加载关联订单
      const { data: ordersData, error: ordersError } = await supabase
        .from('production_orders')
        .select('*')
        .eq('plan_id', id)
        .order('planned_start_date', { ascending: true });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      // 加载执行进度（使用新的服务层函数）
      try {
        const progress = await getPlanExecutionProgress(parseInt(id));
        setExecutionProgress(progress);
      } catch (error) {
        console.error('加载执行进度失败:', error);
        setExecutionProgress({ linked_order_count: 0, completed_quantity: 0, completion_rate: 0 });
      }

      // 加载版本历史（使用新的服务层函数）
      try {
        const versionsData = await getPlanVersions(parseInt(id));
        setVersions(versionsData);
      } catch (error) {
        console.error('加载版本历史失败:', error);
        setVersions([]);
      }

      // 加载审批记录（使用新的服务层函数）
      try {
        const approvalsData = await getPlanApprovals(parseInt(id));
        setApprovals(approvalsData);
      } catch (error) {
        console.error('加载审批记录失败:', error);
        setApprovals([]);
      }

      // 加载所有相关用户信息
      await loadUsersInfo(planData);
    } catch (error) {
      console.error('加载计划详情失败:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  // 加载用户信息
  const loadUsersInfo = async (planData: ProductionPlan | null) => {
    const userIds = new Set<string>();
    
    // 收集所有需要查询的用户 ID
    if (planData?.responsible_person_id) {
      userIds.add(planData.responsible_person_id);
    }
    if (planData?.created_by) {
      userIds.add(planData.created_by);
    }
    if (planData?.approved_by) {
      userIds.add(planData.approved_by);
    }
    if (planData?.rejected_by) {
      userIds.add(planData.rejected_by);
    }
    if (planData?.activated_by) {
      userIds.add(planData.activated_by);
    }
    if (planData?.closed_by) {
      userIds.add(planData.closed_by);
    }

    versions.forEach(v => {
      if (v.created_by) userIds.add(v.created_by);
    });
    approvals.forEach(a => {
      if (a.approver_id) userIds.add(a.approver_id);
      if (a.rejected_by) userIds.add(a.rejected_by);
    });

    if (userIds.size === 0) return;

    // 批量查询用户信息
    try {
      const { data: usersData, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, email')
        .in('id', Array.from(userIds));

      if (error) throw error;

      const map = new Map<string, UserProfile>();
      usersData?.forEach((user: UserProfile) => {
        map.set(user.id, user);
      });
      setUsersMap(map);
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  };

  // 获取用户显示名称
  const getUserDisplayName = (userId: string | null): string => {
    if (!userId) return '-';
    const user = usersMap.get(userId);
    if (!user) return userId.substring(0, 8) + '...';
    return user.full_name || user.username || user.email || userId.substring(0, 8) + '...';
  };

  const subscribeToChanges = () => {
    if (!id) return;

    // 订阅计划变更
    const planChannel = supabase
      .channel(`plan-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'production_plans',
          filter: `id=eq.${id}`,
        },
        (payload: { eventType: string; new: unknown }) => {
          if (payload.eventType === 'UPDATE') {
            setPlan(payload.new as ProductionPlan);
            toast.info(t('productionPlan.planUpdated'));
          }
        }
      )
      .subscribe();

    return () => {
      planChannel.unsubscribe();
    };
  };

  // 提交审批
  const handleSubmitForApproval = async () => {
    if (!plan || !profile) return;
    
    setActionLoading(true);
    try {
      await submitPlanForApproval(plan.id, profile.tenant_id, profile.id);
      toast.success('生产计划已提交审批');
      await loadPlanDetail();
    } catch (error: unknown) {
      console.error('提交审批失败:', error);
      toast.error(error instanceof Error ? error.message : '提交审批失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 审批通过
  const handleApproveWithComment = async () => {
    if (!plan || !profile) return;
    
    setActionLoading(true);
    try {
      await approvePlan(plan.id, profile.tenant_id, profile.id, approvalComment);
      toast.success('审批通过');
      setApproveDialogOpen(false);
      setApprovalComment('');
      await loadPlanDetail();
    } catch (error: unknown) {
      console.error('审批失败:', error);
      toast.error(error instanceof Error ? error.message : '审批失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 审批拒绝
  const handleRejectWithReason = async () => {
    if (!plan || !profile || !rejectionReason.trim()) {
      toast.error('请输入拒绝原因');
      return;
    }
    
    setActionLoading(true);
    try {
      await rejectPlan(plan.id, profile.tenant_id, profile.id, rejectionReason);
      toast.success('已拒绝');
      setRejectDialogOpen(false);
      setRejectionReason('');
      await loadPlanDetail();
    } catch (error: unknown) {
      console.error('拒绝失败:', error);
      toast.error(error instanceof Error ? error.message : '拒绝失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 生效
  const handleActivate = async () => {
    if (!plan || !profile) return;
    
    setActionLoading(true);
    try {
      await activatePlan(plan.id, profile.tenant_id, profile.id);
      toast.success('计划已生效');
      await loadPlanDetail();
    } catch (error: unknown) {
      console.error('生效失败:', error);
      toast.error(error instanceof Error ? error.message : '生效失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 关闭
  const handleCloseWithReason = async () => {
    if (!plan || !profile) return;
    
    setActionLoading(true);
    try {
      await closePlan(plan.id, profile.tenant_id, profile.id, closeReason);
      toast.success('计划已关闭');
      setCloseDialogOpen(false);
      setCloseReason('');
      await loadPlanDetail();
    } catch (error: unknown) {
      console.error('关闭失败:', error);
      toast.error(error instanceof Error ? error.message : '关闭失败');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, 'default' | 'secondary' | 'destructive'> = {
      draft: 'secondary',
      submitted: 'secondary',
      pending_cn_approval: 'secondary',
      pending_jp_approval: 'secondary',
      approved: 'default',
      active: 'default',
      executing: 'default',
      completed: 'default',
      closed: 'default',
      rejected: 'destructive',
      cancelled: 'destructive',
    };
    return colorMap[status] || 'default';
  };

  const getApprovalStatusColor = (status: string) => {
    const colorMap: Record<string, 'default' | 'secondary' | 'destructive'> = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
    };
    return colorMap[status] || 'default';
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48 bg-muted" />
        <Skeleton className="h-64 bg-muted" />
      </div>
    );
  }

  if (!plan) {
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/production-plans')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-light tracking-tight">{plan.plan_code}</h1>
              <Badge variant={getStatusColor(plan.status)}>
                {t(`productionPlan.${plan.status}`)}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {t(`productionPlan.${plan.plan_type}`)} | v{plan.current_version}
            </p>
          </div>
        </div>
        
        {/* P1 新增：状态流转操作按钮 */}
        <div className="flex items-center gap-2">
          {plan.status === 'draft' && (
            <>
              <Button variant="outline" onClick={() => navigate(`/production-plans/${plan.id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" />
                编辑
              </Button>
              <Button onClick={handleSubmitForApproval} disabled={actionLoading}>
                <Send className="mr-2 h-4 w-4" />
                提交审批
              </Button>
            </>
          )}
          
          {(plan.status === 'submitted' || plan.status === 'pending_cn_approval' || plan.status === 'pending_jp_approval') && canApprove() && (
            <>
              <Button variant="outline" onClick={() => setRejectDialogOpen(true)} disabled={actionLoading}>
                <XCircle className="mr-2 h-4 w-4" />
                拒绝
              </Button>
              <Button onClick={() => setApproveDialogOpen(true)} disabled={actionLoading}>
                <CheckCircle className="mr-2 h-4 w-4" />
                审批通过
              </Button>
            </>
          )}
          
          {plan.status === 'approved' && canActivate() && (
            <Button onClick={handleActivate} disabled={actionLoading}>
              <Play className="mr-2 h-4 w-4" />
              生效
            </Button>
          )}
          
          {(plan.status === 'active' || plan.status === 'executing') && canClose() && (
            <Button variant="outline" onClick={() => setCloseDialogOpen(true)} disabled={actionLoading}>
              <StopCircle className="mr-2 h-4 w-4" />
              关闭
            </Button>
          )}
          
          {plan.status === 'rejected' && (
            <Button variant="outline" onClick={() => navigate(`/production-plans/${plan.id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              重新编辑
            </Button>
          )}
          
          {/* 权限提示 */}
          {(plan.status === 'submitted' || plan.status === 'pending_cn_approval' || plan.status === 'pending_jp_approval') && !canApprove() && (
            <div className="text-xs text-muted-foreground">
              提示：只有工厂经理可以审批计划
            </div>
          )}
          {plan.status === 'approved' && !canActivate() && (
            <div className="text-xs text-muted-foreground">
              提示：只有高管可以生效计划
            </div>
          )}
          {(plan.status === 'active' || plan.status === 'executing') && !canClose() && (
            <div className="text-xs text-muted-foreground">
              提示：只有高管可以关闭计划
            </div>
          )}
        </div>
      </div>

      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-normal">{t('productionPlan.basicInfo')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('productionPlan.planPeriod')}</p>
              <p className="font-normal">
                {plan.plan_period_start} ~ {plan.plan_period_end}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t('productionPlan.productionQuantity')}
              </p>
              <p className="font-normal">{plan.production_quantity}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('productionPlan.deliveryDate')}</p>
              <p className="font-normal">{plan.delivery_date}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('common.tenant')}</p>
              <p className="font-normal">{plan.tenant_id}</p>
            </div>
          </div>
          
          {/* P1 修复：补充字段展示（显示可读信息） */}
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 mt-6 pt-6 border-t">
            <div>
              <p className="text-sm text-muted-foreground">产品型号</p>
              <p className="font-normal">
                {productModel ? `${productModel.model_code} - ${productModel.model_name}` : (plan.product_model_id || '-')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">工厂</p>
              <p className="font-normal">{getFactoryDisplayName(plan.factory_id)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">责任人</p>
              <p className="font-normal">{getUserDisplayName(plan.responsible_person_id)}</p>
            </div>
          </div>
          
          {plan.remarks && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground mb-2">备注</p>
              <p className="text-sm">{plan.remarks}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 标签页 */}
      <Tabs defaultValue="gantt" className="space-y-6">
        <TabsList>
          <TabsTrigger value="gantt">{t('productionPlan.ganttChart')}</TabsTrigger>
          <TabsTrigger value="orders">{t('productionPlan.orders')}</TabsTrigger>
          <TabsTrigger value="versions">
            <History className="mr-2 h-4 w-4" />
            {t('productionPlan.versionHistory')}
          </TabsTrigger>
          <TabsTrigger value="approvals">{t('productionPlan.approvals')}</TabsTrigger>
        </TabsList>

        <TabsContent value="gantt">
          <PlanGanttChart plan={plan} orders={orders} />
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-normal">
                {t('productionPlan.relatedOrders')}
              </CardTitle>
              <CardDescription>
                {t('common.total')}: {orders.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* 执行进度 */}
              {executionProgress && (
                <div className="mb-6 p-6 bg-muted/30 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium">执行进度</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">已关联订单数</p>
                      <p className="text-2xl font-light">{executionProgress.linked_order_count}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">已完成数量</p>
                      <p className="text-2xl font-light">{executionProgress.completed_quantity}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">完成率</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-light">{executionProgress.completion_rate}%</p>
                        {plan && (
                          <p className="text-xs text-muted-foreground">
                            ({executionProgress.completed_quantity} / {plan.production_quantity})
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 border border-border rounded-md"
                  >
                    <div className="space-y-1">
                      <p className="font-normal">{order.order_code}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.part_name} ({order.part_code})
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {t('productionOrder.productionQuantity')}
                        </p>
                        <p className="font-normal">{order.production_quantity}</p>
                      </div>
                      <Badge variant={getStatusColor(order.status)}>
                        {t(`productionOrder.${order.status}`)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-normal">
                {t('productionPlan.versionHistory')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-start gap-4 p-4 border border-border rounded-md"
                  >
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">V{version.version_number}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(version.created_at).toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          · 修改人: {getUserDisplayName(version.created_by)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {version.change_reason && (
                          <p className="text-sm text-muted-foreground">{version.change_reason}</p>
                        )}
                        {version.change_description && (
                          <p className="text-xs text-muted-foreground">{version.change_description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-normal">{t('productionPlan.approvals')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {approvals.map((approval) => (
                  <div
                    key={approval.id}
                    className="flex items-center justify-between p-4 border border-border rounded-md"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-muted-foreground">
                          审批人: {getUserDisplayName(approval.approver_id || approval.rejected_by)}
                        </span>
                        {/* 时间显示 */}
                        {approval.approval_status === 'pending' ? (
                          <span className="text-xs text-muted-foreground">
                            · 提交时间: {new Date(approval.created_at).toLocaleString()}
                          </span>
                        ) : approval.approved_at ? (
                          <span className="text-xs text-muted-foreground">
                            · 处理时间: {new Date(approval.approved_at).toLocaleString()}
                          </span>
                        ) : approval.rejected_at && (
                          <span className="text-xs text-muted-foreground">
                            · 处理时间: {new Date(approval.rejected_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {approval.approval_comment && (
                        <p className="text-sm text-muted-foreground">{approval.approval_comment}</p>
                      )}
                      {approval.rejection_reason && (
                        <p className="text-sm text-destructive">{approval.rejection_reason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getApprovalStatusColor(approval.approval_status)}>
                        {approval.approval_status === 'approved' ? '已通过' :
                         approval.approval_status === 'rejected' ? '已拒绝' :
                         '待审批'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* P1 新增：审批通过对话框 */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>审批通过</DialogTitle>
            <DialogDescription>确认审批通过该生产计划？</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="approval_comment">审批意见（可选）</Label>
              <Textarea
                id="approval_comment"
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder="填写审批意见..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleApproveWithComment} disabled={actionLoading}>
              确认通过
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* P1 新增：审批拒绝对话框 */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>审批拒绝</DialogTitle>
            <DialogDescription>请填写拒绝原因</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection_reason">
                拒绝原因 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rejection_reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="填写拒绝原因..."
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleRejectWithReason} disabled={actionLoading}>
              确认拒绝
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* P1 新增：关闭计划对话框 */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>关闭生产计划</DialogTitle>
            <DialogDescription>确认关闭该生产计划？</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="close_reason">关闭原因（可选）</Label>
              <Textarea
                id="close_reason"
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder="填写关闭原因..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCloseWithReason} disabled={actionLoading}>
              确认关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
