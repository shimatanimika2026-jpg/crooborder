import { ArrowLeft, CheckCircle, XCircle, Clock, Package, Truck, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import {
  appendDemoCommissionOperation,
  getDemoCommissionById,
  getDemoCommissionOperations,
  updateDemoCommissionStatus,
} from '@/data/demo/commission-store';
import { runtimeMode, supabase } from '@/db/supabase';
import { isOperationAllowed, getOperationNotAllowedReason, ACTION_METADATA } from '@/lib/commission-rules';
import { executeCommissionAction } from '@/services/commissionActionService';
import type { Commission, CommissionOperation, CommissionOperationType, CommissionStatus } from '@/types';

export default function CommissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [commission, setCommission] = useState<Commission | null>(null);
  const [operations, setOperations] = useState<CommissionOperation[]>([]);
  const [viewType, setViewType] = useState<'china' | 'japan'>('china');
  
  // Dialog states
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [shipmentDialogOpen, setShipmentDialogOpen] = useState(false);
  const [arrivalDialogOpen, setArrivalDialogOpen] = useState(false);
  const [exceptionDialogOpen, setExceptionDialogOpen] = useState(false);
  const [closeExceptionDialogOpen, setCloseExceptionDialogOpen] = useState(false);

  // Form states
  const [rejectReason, setRejectReason] = useState('');
  const [planData, setPlanData] = useState({
    planned_start_date: '',
    planned_end_date: '',
    responsible_person: '',
    notes: '',
  });
  const [progressData, setProgressData] = useState({
    progress_percentage: 0,
    description: '',
  });
  const [shipmentData, setShipmentData] = useState({
    shipment_date: new Date().toISOString().split('T')[0],
    tracking_no: '',
    carrier: '',
    notes: '',
  });
  const [arrivalData, setArrivalData] = useState({
    arrival_date: new Date().toISOString().split('T')[0],
    receiver: '',
    notes: '',
  });
  const [exceptionData, setExceptionData] = useState({
    exception_type: '',
    description: '',
    responsible_party: '',
  });

  useEffect(() => {
    if (id) {
      fetchCommissionDetail();
    }
  }, [id]);

  const fetchCommissionDetail = async () => {
    try {
      setLoading(true);

      if (runtimeMode === 'demo') {
        const commissionId = Number(id);
        const demoCommission = getDemoCommissionById(commissionId);
        setCommission(demoCommission || null);
        setOperations(getDemoCommissionOperations(commissionId));
        return;
      }

      // Fetch commission
      const { data: commissionData, error: commissionError } = await supabase
        .from('commissions')
        .select('*')
        .eq('id', id)
        .single();

      if (commissionError) throw commissionError;
      setCommission(commissionData);

      // Fetch operations
      const { data: operationsData, error: operationsError } = await supabase
        .from('commission_operations')
        .select('*')
        .eq('commission_id', id)
        .order('operated_at', { ascending: false });

      if (operationsError) throw operationsError;
      setOperations(operationsData || []);
    } catch (error: unknown) {
      console.error('Error fetching commission detail:', error);
      toast.error(t('commission.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * 统一的动作执行函数
   */
  const executeAction = async (
    actionType: 'accept' | 'reject' | 'register_plan' | 'update_progress' | 'register_shipment' | 'confirm_arrival' | 'report_exception' | 'close_exception',
    actionData?: Record<string, unknown>
  ) => {
    if (!commission || !user?.id) return;

    const actionMetadata = ACTION_METADATA[actionType];
    if (!actionMetadata) {
      toast.error(t('commission.messages.invalidAction'));
      return false;
    }

    try {
      if (runtimeMode === 'demo') {
        const previousStatus = commission.status;
        const nextStatus = getDemoNextStatus(actionType, previousStatus);
        const updatedCommission = updateDemoCommissionStatus(commission.id, nextStatus) || {
          ...commission,
          status: nextStatus,
          updated_at: new Date().toISOString(),
        };

        appendDemoCommissionOperation(
          commission.id,
          actionType as CommissionOperationType,
          actionData,
          previousStatus,
          nextStatus,
        );

        setCommission(updatedCommission);
        setOperations(getDemoCommissionOperations(commission.id));
        toast.success(t(actionMetadata.successMessageKey));
        closeActionDialogs();
        return true;
      }

      const result = await executeCommissionAction(supabase, {
        commission_id: Number(id),
        action_type: actionType,
        operator_id: user.id,
        action_data: actionData,
      });

      if (!result.success) {
        toast.error(t(actionMetadata.errorMessageKey));
        console.error(`执行动作 ${actionType} 失败:`, result.error, result.message);
        return false;
      }

      toast.success(t(actionMetadata.successMessageKey));
      
      // 关闭对应的对话框
      closeActionDialogs();
      
      // 刷新数据
      fetchCommissionDetail();
      return true;
    } catch (error: unknown) {
      console.error(`执行动作 ${actionType} 异常:`, error);
      toast.error(t('commission.messages.actionExecuteError'));
      return false;
    }
  };

  const closeActionDialogs = () => {
    setAcceptDialogOpen(false);
    setRejectDialogOpen(false);
    setPlanDialogOpen(false);
    setProgressDialogOpen(false);
    setShipmentDialogOpen(false);
    setArrivalDialogOpen(false);
    setExceptionDialogOpen(false);
    setCloseExceptionDialogOpen(false);
  };

  const getDemoNextStatus = (
    actionType: CommissionOperationType,
    currentStatus: CommissionStatus,
  ): CommissionStatus => {
    const statusMap: Partial<Record<CommissionOperationType, CommissionStatus>> = {
      accept: 'accepted',
      reject: 'rejected',
      register_plan: 'in_production',
      update_progress: 'in_production',
      register_shipment: 'shipped',
      confirm_arrival: 'completed',
      report_exception: 'exception',
      close_exception: 'accepted',
    };

    return statusMap[actionType] || currentStatus;
  };

  const handleAccept = async () => {
    await executeAction('accept');
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error(t('commission.rejectReason') + t('common.required'));
      return;
    }
    await executeAction('reject', { reason: rejectReason });
  };

  const handleRegisterPlan = async () => {
    if (!planData.planned_start_date || !planData.planned_end_date) {
      toast.error(t('common.requiredFields'));
      return;
    }
    await executeAction('register_plan', planData);
  };

  const handleUpdateProgress = async () => {
    await executeAction('update_progress', progressData);
  };

  const handleRegisterShipment = async () => {
    if (!shipmentData.shipment_date || !shipmentData.tracking_no) {
      toast.error(t('common.requiredFields'));
      return;
    }
    await executeAction('register_shipment', shipmentData);
  };

  const handleConfirmArrival = async () => {
    if (!arrivalData.arrival_date) {
      toast.error(t('common.requiredFields'));
      return;
    }
    await executeAction('confirm_arrival', arrivalData);
  };

  const handleReportException = async () => {
    if (!exceptionData.exception_type || !exceptionData.description) {
      toast.error(t('common.requiredFields'));
      return;
    }
    await executeAction('report_exception', exceptionData);
  };

  const handleCloseException = async () => {
    // 不再从页面层推导 previous_status，由 RPC 自动处理
    await executeAction('close_exception', {});
  };

  const getStatusColor = (status: CommissionStatus) => {
    const colors: Record<CommissionStatus, string> = {
      pending_acceptance: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      in_production: 'bg-purple-100 text-purple-800',
      shipped: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      exception: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: CommissionStatus) => {
    const labels: Record<CommissionStatus, string> = {
      pending_acceptance: t('commission.statusPendingAcceptance'),
      accepted: t('commission.statusAccepted'),
      rejected: t('commission.statusRejected'),
      in_production: t('commission.statusInProduction'),
      shipped: t('commission.statusShipped'),
      completed: t('commission.statusCompleted'),
      exception: t('commission.statusException'),
    };
    return labels[status] || status;
  };

  const getOperationIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      accept: <CheckCircle className="h-5 w-5 text-blue-500" />,
      reject: <XCircle className="h-5 w-5 text-red-500" />,
      register_plan: <Clock className="h-5 w-5 text-purple-500" />,
      update_progress: <Package className="h-5 w-5 text-purple-500" />,
      register_shipment: <Truck className="h-5 w-5 text-green-500" />,
      confirm_arrival: <CheckCircle className="h-5 w-5 text-green-500" />,
      report_exception: <AlertTriangle className="h-5 w-5 text-orange-500" />,
      close_exception: <CheckCircle className="h-5 w-5 text-blue-500" />,
    };
    return icons[type] || <Clock className="h-5 w-5 text-gray-500" />;
  };

  const getOperationLabel = (type: string) => {
    const labels: Record<string, string> = {
      create: t('common.create'),
      accept: t('commission.accept'),
      reject: t('commission.reject'),
      register_plan: t('commission.registerPlan'),
      update_progress: t('commission.updateProgress'),
      register_shipment: t('commission.registerShipment'),
      confirm_arrival: t('commission.confirmArrival'),
      report_exception: t('commission.reportException'),
      close_exception: t('commission.closeException'),
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <Skeleton className="h-12 w-full bg-muted" />
          <Skeleton className="h-64 w-full bg-muted" />
          <Skeleton className="h-96 w-full bg-muted" />
        </div>
      </div>
    );
  }

  if (!commission) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center text-muted-foreground">
            {t('commission.emptyText')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/commission')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">{commission.commission_no}</h1>
            <p className="text-sm text-muted-foreground">
              {commission.customer_name} - {commission.product_name}
            </p>
          </div>
          
          {/* View Type Toggle */}
          <div className="flex gap-2">
            <Button
              variant={viewType === 'china' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewType('china')}
            >
              {t('commission.chinaView')}
            </Button>
            <Button
              variant={viewType === 'japan' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewType('japan')}
            >
              {t('commission.japanView')}
            </Button>
          </div>
          
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
              commission.status === 'exception' 
                ? 'bg-red-100 text-red-800 border-2 border-red-500' 
                : getStatusColor(commission.status)
            }`}
          >
            {getStatusLabel(commission.status)}
          </span>
        </div>

        {/* Exception Alert */}
        {commission.status === 'exception' && (
          <Alert className="border-red-500 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">{t('commission.exceptionAlert')}</AlertTitle>
            <AlertDescription className="text-red-700">
              {t('commission.exceptionAlertDesc')}
            </AlertDescription>
          </Alert>
        )}

        {/* Commission Details */}
        <Card>
          <CardHeader>
            <CardTitle>{t('commission.detail')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-muted-foreground">{t('commission.commissionNo')}</Label>
                <p className="mt-1 font-medium">{commission.commission_no}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('commission.customerName')}</Label>
                <p className="mt-1 font-medium">{commission.customer_name}</p>
              </div>
              {commission.project_name && (
                <div>
                  <Label className="text-muted-foreground">{t('commission.projectName')}</Label>
                  <p className="mt-1 font-medium">{commission.project_name}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">{t('commission.productName')}</Label>
                <p className="mt-1 font-medium">{commission.product_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('commission.quantity')}</Label>
                <p className="mt-1 font-medium">{commission.quantity}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('commission.targetDeliveryDate')}</Label>
                <p className="mt-1 font-medium">{commission.target_delivery_date}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('commission.assemblyFactory')}</Label>
                <p className="mt-1 font-medium">{commission.assembly_factory}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('commission.country')}</Label>
                <p className="mt-1 font-medium">{t(`commission.country${commission.country.charAt(0).toUpperCase() + commission.country.slice(1)}`)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('commission.responsibleParty')}</Label>
                <p className="mt-1 font-medium">{t(`commission.responsibleParty${commission.responsible_party.charAt(0).toUpperCase() + commission.responsible_party.slice(1)}`)}</p>
              </div>
              {commission.pending_arrival_confirmation && (
                <div>
                  <Label className="text-muted-foreground">{t('commission.pendingArrivalConfirmation')}</Label>
                  <p className="mt-1 font-medium text-orange-600">{t('common.yes')}</p>
                </div>
              )}
              {commission.arrival_confirmation_completed_at && (
                <div>
                  <Label className="text-muted-foreground">{t('commission.arrivalConfirmationCompletedAt')}</Label>
                  <p className="mt-1 font-medium">
                    {new Date(commission.arrival_confirmation_completed_at).toLocaleString()}
                  </p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">{t('commission.createdAt')}</Label>
                <p className="mt-1 font-medium">
                  {new Date(commission.created_at).toLocaleString()}
                </p>
              </div>
              {commission.notes && (
                <div className="col-span-2">
                  <Label className="text-muted-foreground">{t('commission.notes')}</Label>
                  <p className="mt-1">{commission.notes}</p>
                </div>
              )}
              
              {/* 中方视图专属字段 */}
              <div className="col-span-2">
                <Label className="text-muted-foreground">{t('commission.costInfo')}</Label>
                {viewType === 'china' ? (
                  <p className="mt-1 text-muted-foreground italic">{commission.cost_info || t('common.notSet')}</p>
                ) : (
                  <p className="mt-1 text-muted-foreground italic">{t('commission.chinaOnlyVisible')}</p>
                )}
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground">{t('commission.internalNotes')}</Label>
                {viewType === 'china' ? (
                  <p className="mt-1 text-muted-foreground italic">{commission.internal_notes || t('common.notSet')}</p>
                ) : (
                  <p className="mt-1 text-muted-foreground italic">{t('commission.chinaOnlyVisible')}</p>
                )}
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground">{t('commission.confidentialCustomerDetails')}</Label>
                {viewType === 'china' ? (
                  <p className="mt-1 text-muted-foreground italic">{commission.confidential_customer_details || t('common.notSet')}</p>
                ) : (
                  <p className="mt-1 text-muted-foreground italic">{t('commission.chinaOnlyVisible')}</p>
                )}
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground">{t('commission.supplierEvaluation')}</Label>
                {viewType === 'china' ? (
                  <p className="mt-1 text-muted-foreground italic">{commission.supplier_evaluation || t('common.notSet')}</p>
                ) : (
                  <p className="mt-1 text-muted-foreground italic">{t('commission.chinaOnlyVisible')}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>{t('common.actions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.values(ACTION_METADATA)
                .sort((a, b) => a.order - b.order)
                .map((action) => {
                  const isAllowed = isOperationAllowed(commission.status, action.key);
                  const disabledReason = getOperationNotAllowedReason(commission.status, action.key);
                  
                  const handleClick = () => {
                    switch (action.key) {
                      case 'accept':
                        setAcceptDialogOpen(true);
                        break;
                      case 'reject':
                        setRejectDialogOpen(true);
                        break;
                      case 'register_plan':
                        setPlanDialogOpen(true);
                        break;
                      case 'update_progress':
                        setProgressDialogOpen(true);
                        break;
                      case 'register_shipment':
                        setShipmentDialogOpen(true);
                        break;
                      case 'confirm_arrival':
                        setArrivalDialogOpen(true);
                        break;
                      case 'report_exception':
                        setExceptionDialogOpen(true);
                        break;
                      case 'close_exception':
                        setCloseExceptionDialogOpen(true);
                        break;
                    }
                  };

                  const button = (
                    <Button
                      key={action.key}
                      variant={action.variant}
                      disabled={!isAllowed}
                      onClick={handleClick}
                    >
                      {t(action.labelKey)}
                    </Button>
                  );

                  if (!isAllowed && disabledReason) {
                    return (
                      <TooltipProvider key={action.key}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {button}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t(disabledReason)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  }

                  return button;
                })}
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>{t('commission.timeline')}</CardTitle>
          </CardHeader>
          <CardContent>
            {operations.length === 0 ? (
              <div className="text-center text-muted-foreground">
                {t('commission.emptyText')}
              </div>
            ) : (
              <div className="space-y-4">
                {operations.map((operation, index) => {
                  const isException = operation.operation_type === 'report_exception';
                  return (
                    <div key={operation.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          isException && commission.status === 'exception' 
                            ? 'bg-red-100 border-2 border-red-500' 
                            : 'bg-muted'
                        }`}>
                          {getOperationIcon(operation.operation_type)}
                        </div>
                        {index < operations.length - 1 && (
                          <div className="h-full w-px bg-border" />
                        )}
                      </div>
                      <div className="flex-1 pb-8">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${
                            isException && commission.status === 'exception' ? 'text-red-600' : ''
                          }`}>
                            {getOperationLabel(operation.operation_type)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(operation.operated_at).toLocaleString()}
                          </span>
                        </div>
                        {operation.operation_data && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(operation.operation_data, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialogs */}
        {/* Accept Dialog */}
        <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('commission.accept')}</DialogTitle>
              <DialogDescription>{t('commission.acceptConfirm')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAcceptDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleAccept}>{t('common.confirm')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('commission.reject')}</DialogTitle>
              <DialogDescription>{t('commission.rejectConfirm')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="reject_reason">
                  {t('commission.rejectReason')} <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="reject_reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t('commission.rejectReason')}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                {t('common.confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Register Plan Dialog */}
        <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('commission.registerPlan')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="planned_start_date">
                  {t('commission.plannedStartDate')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="planned_start_date"
                  type="date"
                  value={planData.planned_start_date}
                  onChange={(e) =>
                    setPlanData({ ...planData, planned_start_date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="planned_end_date">
                  {t('commission.plannedEndDate')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="planned_end_date"
                  type="date"
                  value={planData.planned_end_date}
                  onChange={(e) =>
                    setPlanData({ ...planData, planned_end_date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="responsible_person">
                  {t('commission.responsiblePerson')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="responsible_person"
                  value={planData.responsible_person}
                  onChange={(e) =>
                    setPlanData({ ...planData, responsible_person: e.target.value })
                  }
                  placeholder={t('commission.responsiblePerson')}
                />
              </div>
              <div>
                <Label htmlFor="plan_notes">{t('commission.notes')}</Label>
                <Textarea
                  id="plan_notes"
                  value={planData.notes}
                  onChange={(e) => setPlanData({ ...planData, notes: e.target.value })}
                  placeholder={t('commission.notes')}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleRegisterPlan}>{t('common.submit')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Progress Dialog */}
        <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('commission.updateProgress')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="progress_percentage">
                  {t('commission.progressPercentage')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="progress_percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={progressData.progress_percentage}
                  onChange={(e) =>
                    setProgressData({
                      ...progressData,
                      progress_percentage: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="0-100"
                />
              </div>
              <div>
                <Label htmlFor="progress_description">{t('commission.progressDescription')}</Label>
                <Textarea
                  id="progress_description"
                  value={progressData.description}
                  onChange={(e) =>
                    setProgressData({ ...progressData, description: e.target.value })
                  }
                  placeholder={t('commission.progressDescription')}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setProgressDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleUpdateProgress}>{t('common.submit')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Register Shipment Dialog */}
        <Dialog open={shipmentDialogOpen} onOpenChange={setShipmentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('commission.registerShipment')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="shipment_date">
                  {t('commission.shipmentDate')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="shipment_date"
                  type="date"
                  value={shipmentData.shipment_date}
                  onChange={(e) =>
                    setShipmentData({ ...shipmentData, shipment_date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="tracking_no">{t('commission.trackingNo')}</Label>
                <Input
                  id="tracking_no"
                  value={shipmentData.tracking_no}
                  onChange={(e) =>
                    setShipmentData({ ...shipmentData, tracking_no: e.target.value })
                  }
                  placeholder={t('commission.trackingNo')}
                />
              </div>
              <div>
                <Label htmlFor="carrier">{t('commission.carrier')}</Label>
                <Input
                  id="carrier"
                  value={shipmentData.carrier}
                  onChange={(e) =>
                    setShipmentData({ ...shipmentData, carrier: e.target.value })
                  }
                  placeholder={t('commission.carrier')}
                />
              </div>
              <div>
                <Label htmlFor="shipment_notes">{t('commission.notes')}</Label>
                <Textarea
                  id="shipment_notes"
                  value={shipmentData.notes}
                  onChange={(e) =>
                    setShipmentData({ ...shipmentData, notes: e.target.value })
                  }
                  placeholder={t('commission.notes')}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShipmentDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleRegisterShipment}>{t('common.submit')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirm Arrival Dialog */}
        <Dialog open={arrivalDialogOpen} onOpenChange={setArrivalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('commission.confirmArrival')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="arrival_date">
                  {t('commission.arrivalDate')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="arrival_date"
                  type="date"
                  value={arrivalData.arrival_date}
                  onChange={(e) =>
                    setArrivalData({ ...arrivalData, arrival_date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="receiver">
                  {t('commission.receiver')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="receiver"
                  value={arrivalData.receiver}
                  onChange={(e) =>
                    setArrivalData({ ...arrivalData, receiver: e.target.value })
                  }
                  placeholder={t('commission.receiver')}
                />
              </div>
              <div>
                <Label htmlFor="arrival_notes">{t('commission.notes')}</Label>
                <Textarea
                  id="arrival_notes"
                  value={arrivalData.notes}
                  onChange={(e) =>
                    setArrivalData({ ...arrivalData, notes: e.target.value })
                  }
                  placeholder={t('commission.notes')}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setArrivalDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleConfirmArrival}>{t('common.submit')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Report Exception Dialog */}
        <Dialog open={exceptionDialogOpen} onOpenChange={setExceptionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('commission.reportException')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="exception_type">
                  {t('commission.exceptionType')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="exception_type"
                  value={exceptionData.exception_type}
                  onChange={(e) =>
                    setExceptionData({ ...exceptionData, exception_type: e.target.value })
                  }
                  placeholder={t('commission.exceptionType')}
                />
              </div>
              <div>
                <Label htmlFor="exception_description">
                  {t('commission.exceptionDescription')} <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="exception_description"
                  value={exceptionData.description}
                  onChange={(e) =>
                    setExceptionData({ ...exceptionData, description: e.target.value })
                  }
                  placeholder={t('commission.exceptionDescription')}
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="responsible_party">{t('commission.responsibleParty')}</Label>
                <Input
                  id="responsible_party"
                  value={exceptionData.responsible_party}
                  onChange={(e) =>
                    setExceptionData({ ...exceptionData, responsible_party: e.target.value })
                  }
                  placeholder={t('commission.responsibleParty')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExceptionDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleReportException}>{t('common.submit')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Close Exception Dialog */}
        <Dialog open={closeExceptionDialogOpen} onOpenChange={setCloseExceptionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('commission.closeException')}</DialogTitle>
              <DialogDescription>
                {t('commission.closeExceptionConfirm') || '确认关闭所有异常？'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCloseExceptionDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleCloseException}>{t('common.confirm')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
