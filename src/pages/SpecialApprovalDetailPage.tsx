import { AlertCircle, ArrowLeft, CheckCircle2, Clock, FileText, Package, User, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import {
  getDemoSpecialApprovalById,
  getDemoSpecialApprovalRelations,
  updateDemoSpecialApprovalStatus,
} from '@/data/demo/quality-gate';
import { runtimeMode, supabase } from '@/db/supabase';
import type { SpecialApprovalRequest, SpecialApprovalWorkflow, Supplier } from '@/types/database';

type SpecialApprovalWithRelations = SpecialApprovalRequest & {
  supplier?: Supplier;
  workflows?: (SpecialApprovalWorkflow & { approver?: { full_name: string } })[];
  applicant?: { full_name: string };
};

export default function SpecialApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [request, setRequest] = useState<SpecialApprovalWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComment, setApprovalComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRequestDetail();
    }
  }, [id]);

  const fetchRequestDetail = async () => {
    try {
      setLoading(true);

      if (runtimeMode === 'demo') {
        const demoRequest = getDemoSpecialApprovalById(Number(id));
        if (!demoRequest) {
          setRequest(null);
          return;
        }
        setRequest({
          ...demoRequest,
          ...getDemoSpecialApprovalRelations(demoRequest),
        });
        return;
      }

      const { data, error } = await supabase
        .from('special_approval_requests')
        .select(`
          *,
          supplier:suppliers(*),
          applicant:profiles!special_approval_requests_applicant_id_fkey(full_name)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      setRequest(data);
    } catch (error: unknown) {
      console.error('Fetch special approval detail failed:', error);
      toast.error('Fetch special approval detail failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async () => {
    if (!request || !approvalComment.trim()) {
      toast.error('Please fill approval comment.');
      return;
    }

    try {
      setSubmitting(true);
      const newStatus = approvalAction === 'approve' ? 'approved' : 'rejected';

      if (runtimeMode === 'demo') {
        updateDemoSpecialApprovalStatus(request.id, newStatus);
        toast.success(approvalAction === 'approve' ? 'Demo request approved.' : 'Demo request rejected.');
        setApprovalDialogOpen(false);
        setApprovalComment('');
        fetchRequestDetail();
        return;
      }

      const { error } = await supabase
        .from('special_approval_requests')
        .update({
          status: newStatus,
          updated_by: profile?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;
      toast.success(approvalAction === 'approve' ? 'Request approved.' : 'Request rejected.');
      setApprovalDialogOpen(false);
      setApprovalComment('');
      fetchRequestDetail();
    } catch (error: unknown) {
      console.error('Approval action failed:', error);
      toast.error('Approval action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      draft: { label: 'Draft', variant: 'outline' },
      pending_approval: { label: 'Pending', variant: 'secondary' },
      approved: { label: 'Approved', variant: 'default' },
      rejected: { label: 'Rejected', variant: 'destructive' },
      cancelled: { label: 'Cancelled', variant: 'outline' },
    };
    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getDefectCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      appearance_defect: 'Appearance',
      dimension_deviation: 'Dimension',
      process_deviation: 'Process',
      urgent_demand: 'Urgent Demand',
      other: 'Other',
    };
    return labels[category] || category;
  };

  const getApprovalStatusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle2 className="h-5 w-5 text-primary" />;
    if (status === 'rejected') return <XCircle className="h-5 w-5 text-destructive" />;
    return <Clock className="h-5 w-5 text-muted-foreground" />;
  };

  const canApprove = () => request?.status === 'pending_approval';

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64 bg-muted" />
        <Skeleton className="h-96 bg-muted" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Special approval request not found.</h3>
            <Button className="mt-4" onClick={() => navigate('/special-approval')}>
              Back to List
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/special-approval" className="hover:text-foreground">
          Special Approval
        </Link>
        <span>/</span>
        <span className="text-foreground">{request.request_code}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/special-approval')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{request.request_code}</h1>
            <p className="text-muted-foreground mt-1">Special approval request detail</p>
          </div>
          {getStatusBadge(request.status)}
        </div>
        {canApprove() && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setApprovalAction('reject');
                setApprovalDialogOpen(true);
              }}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              onClick={() => {
                setApprovalAction('approve');
                setApprovalDialogOpen(true);
              }}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Request Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {request.source_type && (
                <>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-sm text-muted-foreground">Source Type</div>
                      <div className="font-medium">{request.source_type}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Source No.</div>
                      <div className="font-medium">{request.source_no || '-'}</div>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Applicant
                  </div>
                  <div className="font-medium">{request.applicant?.full_name || 'Demo User'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Department</div>
                  <div className="font-medium">{request.applicant_department}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Created</div>
                  <div className="font-medium">{new Date(request.created_at).toLocaleString('zh-CN')}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Supplier</div>
                  <div className="font-medium">{request.supplier?.supplier_name || '-'}</div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Material
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground">Material Code</div>
                    <div className="font-medium">{request.material_code}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Material Name</div>
                    <div className="font-medium">{request.material_name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Batch</div>
                    <div className="font-medium">{request.batch_code}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Quantity</div>
                    <div className="font-medium">{request.quantity}</div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-4">Reason</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Defect Category</div>
                    <div className="font-medium">{getDefectCategoryLabel(request.defect_category)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Description</div>
                    <div className="text-sm leading-relaxed bg-muted/30 p-4 rounded-md border border-border">
                      {request.defect_description}
                    </div>
                  </div>
                </div>
              </div>

              {request.acceptance_conditions && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-4">Acceptance Conditions</h3>
                    <div className="text-sm leading-relaxed bg-muted/30 p-4 rounded-md border border-border">
                      {request.acceptance_conditions}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approval Flow</CardTitle>
            </CardHeader>
            <CardContent>
              {request.workflows && request.workflows.length > 0 ? (
                <div className="space-y-4">
                  {request.workflows.map((workflow) => (
                    <div key={workflow.id} className="flex gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-border bg-background">
                        {getApprovalStatusIcon(workflow.approval_status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold">{workflow.approval_stage}</div>
                          <Badge variant={workflow.approval_status === 'rejected' ? 'destructive' : 'secondary'}>
                            {workflow.approval_status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Approver: {workflow.approver?.full_name || 'Demo User'}
                        </div>
                        {workflow.approval_comment && (
                          <div className="text-sm bg-muted/30 p-3 rounded-md border border-border mt-2">
                            {workflow.approval_comment}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No approval workflow.</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Request Code</div>
                <div className="font-medium text-sm">{request.request_code}</div>
              </div>
              <Separator />
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div>{getStatusBadge(request.status)}</div>
              </div>
              <Separator />
              <div>
                <div className="text-sm text-muted-foreground">Material</div>
                <div className="font-medium text-sm">{request.material_code}</div>
              </div>
              <Separator />
              <div>
                <div className="text-sm text-muted-foreground">Quantity</div>
                <div className="font-medium text-sm">{request.quantity}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{approvalAction === 'approve' ? 'Approve Request' : 'Reject Request'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approval-comment">Comment *</Label>
              <Textarea
                id="approval-comment"
                placeholder="Enter approval comment..."
                value={approvalComment}
                onChange={(event) => setApprovalComment(event.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApprovalDialogOpen(false);
                setApprovalComment('');
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApproval}
              disabled={submitting || !approvalComment.trim()}
              variant={approvalAction === 'approve' ? 'default' : 'destructive'}
            >
              {submitting ? 'Submitting...' : approvalAction === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
