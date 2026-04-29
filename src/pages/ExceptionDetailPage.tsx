import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Edit, CheckCircle, XCircle, User, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { OperationException, ExceptionAuditLog, ExceptionSeverity, ProfileSummary } from '@/types/database';
import {
  closeOperationException,
  resolveOperationException,
  escalateOperationException,
  getExceptionAuditLogs,
} from '@/services/exceptionService';

export default function ExceptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [exception, setException] = useState<OperationException | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [usersMap, setUsersMap] = useState<Map<string, ProfileSummary>>(new Map());
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; display_name: string }>>([]);
  const [auditLogs, setAuditLogs] = useState<ExceptionAuditLog[]>([]);
  
  // 对话框状态
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  
  // 表单状态
  const [newStatus, setNewStatus] = useState('');
  const [newOwnerId, setNewOwnerId] = useState('');
  const [temporaryAction, setTemporaryAction] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [solution, setSolution] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [newSeverity, setNewSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [escalationReason, setEscalationReason] = useState('');

  useEffect(() => {
    if (id) {
      loadException();
      loadAllUsers();
    }
  }, [id]);

  // 获取用户显示名称
  const getUserDisplayName = (userId: string | null): string => {
    if (!userId) return '未指派';
    const user = usersMap.get(userId);
    if (!user) return userId.substring(0, 8) + '...';
    return user.full_name || user.username || user.email || userId.substring(0, 8) + '...';
  };

  // 加载所有用户（用于选择器）
  const loadAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, email, role')
        .order('full_name');

      if (error) throw error;
      
      const newUsersMap = new Map();
      const users: Array<{ id: string; display_name: string }> = [];
      
      data?.forEach((user: ProfileSummary) => {
        const displayName = user.full_name || user.username || user.email || user.id.substring(0, 8);
        newUsersMap.set(user.id, {
          id: user.id,
          full_name: user.full_name,
          username: user.username,
          email: user.email,
        });
        users.push({ id: user.id, display_name: displayName });
      });
      
      setUsersMap(newUsersMap);
      setAvailableUsers(users);
    } catch (error) {
      console.error('加载用户列表失败:', error);
    }
  };

  // 加载用户信息
  const loadUserInfo = async (userIds: string[]) => {
    if (userIds.length === 0) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, email')
        .in('id', userIds);

      if (error) throw error;
      
      const newUsersMap = new Map(usersMap);
      data?.forEach((user: ProfileSummary) => {
        newUsersMap.set(user.id, {
          id: user.id,
          full_name: user.full_name,
          username: user.username,
          email: user.email,
        });
      });
      setUsersMap(newUsersMap);
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  };

  const loadException = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('operation_exceptions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error('异常不存在');
        navigate('/exceptions');
        return;
      }
      
      setException(data);
      setTemporaryAction(data.temporary_action || '');
      setRootCause(data.root_cause || '');
      setCorrectiveAction(data.corrective_action || '');
      setResolutionSummary(data.resolution_summary || '');
      
      // 加载相关用户信息
      const userIds = [data.owner_id, data.reported_by, data.closed_by].filter(Boolean) as string[];
      if (userIds.length > 0) {
        await loadUserInfo(userIds);
      }
      
      // 加载审计日志
      try {
        const logs = await getExceptionAuditLogs('operation', parseInt(id), 'JP');
        setAuditLogs(logs);
      } catch (error) {
        console.error('加载审计日志失败:', error);
      }
    } catch (error) {
      console.error('加载异常详情失败:', error);
      toast.error('加载异常详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!exception || !newStatus) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('update_exception_status', {
        p_exception_id: exception.id,
        p_new_status: newStatus,
        p_updated_by: profile?.id,
      });

      if (error) throw error;
      
      toast.success('状态更新成功');
      setStatusDialogOpen(false);
      loadException();
    } catch (error) {
      console.error('更新状态失败:', error);
      toast.error('更新状态失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignOwner = async () => {
    if (!exception || !newOwnerId) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('assign_exception_owner', {
        p_exception_id: exception.id,
        p_owner_id: newOwnerId,
        p_assigned_by: profile?.id,
      });

      if (error) throw error;
      
      toast.success('负责人指派成功');
      setAssignDialogOpen(false);
      loadException();
    } catch (error) {
      console.error('指派负责人失败:', error);
      toast.error('指派负责人失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateDetails = async () => {
    if (!exception) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('update_exception_details', {
        p_exception_id: exception.id,
        p_temporary_action: temporaryAction || null,
        p_root_cause: rootCause || null,
        p_corrective_action: correctiveAction || null,
        p_resolution_summary: resolutionSummary || null,
        p_updated_by: profile?.id,
      });

      if (error) throw error;
      
      toast.success('处理信息更新成功');
      setDetailsDialogOpen(false);
      loadException();
    } catch (error) {
      console.error('更新处理信息失败:', error);
      toast.error('更新处理信息失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 解决异常
  const handleResolve = async () => {
    if (!exception || !profile) return;
    
    if (!solution.trim()) {
      toast.error('请填写解决方案');
      return;
    }
    
    setActionLoading(true);
    try {
      await resolveOperationException(exception.id, profile.id, solution, 'JP');
      toast.success('异常已解决');
      setResolveDialogOpen(false);
      setSolution('');
      loadException();
    } catch (error: unknown) {
      console.error('解决异常失败:', error);
      toast.error(error instanceof Error ? error.message : '解决异常失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 关闭异常
  const handleClose = async () => {
    if (!exception || !profile) return;
    
    if (!closeReason.trim()) {
      toast.error('请填写关闭原因');
      return;
    }
    
    setActionLoading(true);
    try {
      await closeOperationException(exception.id, profile.id, closeReason, 'JP');
      toast.success('异常已关闭');
      setCloseDialogOpen(false);
      setCloseReason('');
      loadException();
    } catch (error: unknown) {
      console.error('关闭异常失败:', error);
      toast.error(error instanceof Error ? error.message : '关闭异常失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 升级异常
  const handleEscalate = async () => {
    if (!exception || !profile) return;
    
    if (!escalationReason.trim()) {
      toast.error('请填写升级原因');
      return;
    }
    
    setActionLoading(true);
    try {
      await escalateOperationException(exception.id, profile.id, newSeverity, escalationReason, 'JP');
      toast.success('异常严重程度已升级');
      setEscalateDialogOpen(false);
      setEscalationReason('');
      loadException();
    } catch (error: unknown) {
      console.error('升级异常失败:', error);
      toast.error(error instanceof Error ? error.message : '升级异常失败');
    } finally {
      setActionLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'in_progress': return 'secondary';
      case 'pending_approval': return 'secondary';
      case 'resolved': return 'default';
      case 'closed': return 'outline';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getExceptionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      shortage: '收货短少',
      overage: '收货超量',
      wrong_item: '收货错料',
      damaged: '收货破损',
      incoming_ng: '来料不良',
      hold: '来料待处理',
      special_acceptance_pending: '特采待审批',
      aging_interrupted: '老化中断',
      aging_failed: '老化失败',
      aging_timeout: '老化超时',
      final_test_failed: '最终测试失败',
      final_test_blocked: '最终测试阻断',
      qa_blocked: 'QA阻断',
      shipment_blocked: '出货阻断',
    };
    return labels[type] || type;
  };

  const getModuleLabel = (module: string) => {
    const labels: Record<string, string> = {
      receiving: '收货',
      iqc: 'IQC',
      disposition: '物料处置',
      assembly: '组装',
      aging: '老化',
      final_test: '最终测试',
      qa: 'QA',
      shipment: '出货',
    };
    return labels[module] || module;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: '待处理',
      in_progress: '处理中',
      pending_approval: '待审批',
      resolved: '已解决',
      closed: '已关闭',
      rejected: '已拒绝',
    };
    return labels[status] || status;
  };

  const getSourceLink = () => {
    if (!exception) return null;
    
    switch (exception.source_module) {
      // 收货模块 - 统一使用 receiving
      case 'receiving':
        return exception.related_receiving_id 
          ? `/receiving/${exception.related_receiving_id}` 
          : null;
      case 'iqc':
        return exception.related_iqc_id 
          ? `/iqc?inspection_id=${exception.related_iqc_id}` 
          : null;
      case 'disposition':
        return exception.related_disposition_id 
          ? `/disposition?disposition_id=${exception.related_disposition_id}` 
          : null;
      case 'qa':
        return exception.related_qa_release_id 
          ? `/qa-release?release_id=${exception.related_qa_release_id}` 
          : (exception.related_sn ? `/qa-release?sn=${exception.related_sn}` : null);
      case 'final_test':
        return exception.related_final_test_id 
          ? `/final-test?test_id=${exception.related_final_test_id}` 
          : (exception.related_sn ? `/final-test?sn=${exception.related_sn}` : null);
      case 'aging':
        return exception.related_aging_test_id 
          ? `/aging/tests/${exception.related_aging_test_id}` 
          : null;
      case 'shipment':
        return exception.related_shipment_confirmation_id 
          ? `/shipment?confirmation_id=${exception.related_shipment_confirmation_id}` 
          : (exception.related_sn ? `/shipment?sn=${exception.related_sn}` : null);
      case 'assembly':
        return exception.related_sn 
          ? `/assembly/complete?sn=${exception.related_sn}` 
          : null;
      case 'logistics':
        return exception.related_shipment_id 
          ? `/logistics/${exception.related_shipment_id}` 
          : null;
      case 'production':
        return exception.related_plan_id 
          ? `/production-plans/${exception.related_plan_id}` 
          : null;
      case 'other':
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-48 bg-muted" />
        <Skeleton className="h-96 w-full bg-muted" />
      </div>
    );
  }

  if (!exception) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">异常不存在</p>
      </div>
    );
  }

  const sourceLink = getSourceLink();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/exceptions')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回列表
          </Button>
          <div>
            <h1 className="text-2xl font-normal">{exception.exception_code}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {getExceptionTypeLabel(exception.exception_type)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/special-approval/new?source_type=exception&source_id=${exception.id}&source_no=${exception.exception_code}`)}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            发起特采申请
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNewStatus(exception.current_status);
              setStatusDialogOpen(true);
            }}
          >
            <Edit className="mr-2 h-4 w-4" />
            更新状态
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNewOwnerId(exception.owner_id || '');
              setAssignDialogOpen(true);
            }}
          >
            <User className="mr-2 h-4 w-4" />
            指派负责人
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDetailsDialogOpen(true)}
          >
            <Edit className="mr-2 h-4 w-4" />
            更新处理信息
          </Button>
          {exception.current_status === 'open' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResolveDialogOpen(true)}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              解决异常
            </Button>
          )}
          {(exception.current_status === 'open' || exception.current_status === 'resolved') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCloseDialogOpen(true)}
            >
              <XCircle className="mr-2 h-4 w-4" />
              关闭异常
            </Button>
          )}
          {(exception.severity === 'low' || exception.severity === 'medium') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewSeverity(exception.severity === 'low' ? 'medium' : 'high');
                setEscalateDialogOpen(true);
              }}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              升级严重程度
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-normal">基本信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">异常编号</p>
                <p className="font-medium">{exception.exception_code}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">异常类型</p>
                <p className="font-medium">{getExceptionTypeLabel(exception.exception_type)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">严重等级</p>
                <Badge variant={getSeverityColor(exception.severity)}>
                  {exception.severity === 'critical' ? '严重' :
                   exception.severity === 'high' ? '高' :
                   exception.severity === 'medium' ? '中' : '低'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">当前状态</p>
                <Badge variant={getStatusColor(exception.current_status)}>
                  {getStatusLabel(exception.current_status)}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">来源模块</p>
                <Badge variant="outline">
                  {getModuleLabel(exception.source_module)}
                </Badge>
              </div>
              {exception.related_sn && (
                <div>
                  <p className="text-sm text-muted-foreground">关联SN</p>
                  <p className="font-medium">{exception.related_sn}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">上报时间</p>
                <p className="font-medium">{new Date(exception.reported_at).toLocaleString()}</p>
              </div>
              {exception.due_date && (
                <div>
                  <p className="text-sm text-muted-foreground">截止日期</p>
                  <p className="font-medium">{exception.due_date}</p>
                </div>
              )}
            </div>

            {sourceLink && (
              <div className="mt-6 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => navigate(sourceLink)}
                >
                  查看来源记录
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-normal">处理信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">负责人</p>
              <p className="font-medium">{getUserDisplayName(exception.owner_id)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">上报人</p>
              <p className="font-medium">{getUserDisplayName(exception.reported_by)}</p>
            </div>
            {exception.closed_by && (
              <>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">关闭人</p>
                  <p className="font-medium">{getUserDisplayName(exception.closed_by)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">关闭时间</p>
                  <p className="font-medium">
                    {exception.closed_at ? new Date(exception.closed_at).toLocaleString() : '-'}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-normal">处理详情</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {exception.temporary_action && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">临时措施</p>
              <p className="text-sm whitespace-pre-wrap">{exception.temporary_action}</p>
            </div>
          )}
          {exception.root_cause && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">根因分析</p>
              <p className="text-sm whitespace-pre-wrap">{exception.root_cause}</p>
            </div>
          )}
          {exception.corrective_action && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">纠正措施</p>
              <p className="text-sm whitespace-pre-wrap">{exception.corrective_action}</p>
            </div>
          )}
          {exception.resolution_summary && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">解决总结</p>
              <p className="text-sm whitespace-pre-wrap">{exception.resolution_summary}</p>
            </div>
          )}
          {exception.remarks && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">备注</p>
              <p className="text-sm whitespace-pre-wrap">{exception.remarks}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 更新状态对话框 */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>更新异常状态</DialogTitle>
            <DialogDescription>选择新的异常状态</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>新状态</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">待处理</SelectItem>
                  <SelectItem value="in_progress">处理中</SelectItem>
                  <SelectItem value="pending_approval">待审批</SelectItem>
                  <SelectItem value="resolved">已解决</SelectItem>
                  <SelectItem value="closed">已关闭</SelectItem>
                  <SelectItem value="rejected">已拒绝</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateStatus} disabled={actionLoading}>
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 指派负责人对话框 */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>指派负责人</DialogTitle>
            <DialogDescription>选择异常处理负责人</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>负责人</Label>
              <Select value={newOwnerId} onValueChange={setNewOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择负责人" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAssignOwner} disabled={actionLoading || !newOwnerId}>
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 更新处理信息对话框 */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>更新处理信息</DialogTitle>
            <DialogDescription>填写异常处理详情</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div>
              <Label>临时措施</Label>
              <Textarea
                value={temporaryAction}
                onChange={(e) => setTemporaryAction(e.target.value)}
                placeholder="描述临时应对措施..."
                rows={3}
              />
            </div>
            <div>
              <Label>根因分析</Label>
              <Textarea
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                placeholder="分析异常根本原因..."
                rows={3}
              />
            </div>
            <div>
              <Label>纠正措施</Label>
              <Textarea
                value={correctiveAction}
                onChange={(e) => setCorrectiveAction(e.target.value)}
                placeholder="描述纠正和预防措施..."
                rows={3}
              />
            </div>
            <div>
              <Label>解决总结</Label>
              <Textarea
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
                placeholder="总结异常处理结果..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateDetails} disabled={actionLoading}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 解决异常对话框 */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>解决异常</DialogTitle>
            <DialogDescription>
              请填写解决方案，异常状态将变更为"已解决"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>解决方案 *</Label>
              <Textarea
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                placeholder="描述如何解决该异常..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleResolve} disabled={actionLoading}>
              确认解决
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 关闭异常对话框 */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>关闭异常</DialogTitle>
            <DialogDescription>
              请填写关闭原因，异常状态将变更为"已关闭"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>关闭原因 *</Label>
              <Textarea
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder="说明关闭该异常的原因..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleClose} disabled={actionLoading}>
              确认关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 升级异常对话框 */}
      <Dialog open={escalateDialogOpen} onOpenChange={setEscalateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>升级异常严重程度</DialogTitle>
            <DialogDescription>
              当前严重程度：{exception?.severity === 'low' ? '低' : exception?.severity === 'medium' ? '中' : exception?.severity === 'high' ? '高' : '严重'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>新严重程度 *</Label>
              <Select value={newSeverity} onValueChange={(value: ExceptionSeverity) => setNewSeverity(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {exception?.severity === 'low' && (
                    <>
                      <SelectItem value="medium">中</SelectItem>
                      <SelectItem value="high">高</SelectItem>
                      <SelectItem value="critical">严重</SelectItem>
                    </>
                  )}
                  {exception?.severity === 'medium' && (
                    <>
                      <SelectItem value="high">高</SelectItem>
                      <SelectItem value="critical">严重</SelectItem>
                    </>
                  )}
                  {exception?.severity === 'high' && (
                    <SelectItem value="critical">严重</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>升级原因 *</Label>
              <Textarea
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                placeholder="说明升级严重程度的原因..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEscalate} disabled={actionLoading}>
              确认升级
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
