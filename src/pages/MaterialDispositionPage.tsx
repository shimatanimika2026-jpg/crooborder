import { AlertTriangle, CheckCircle, Clock, Search, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  getDemoDispositions,
  updateDemoDisposition,
} from '@/data/demo/quality-gate';
import { runtimeMode, supabase } from '@/db/supabase';
import type { IncomingMaterialDisposition } from '@/types/database';

export default function MaterialDispositionPage() {
  const { t } = useTranslation();
  const [dispositions, setDispositions] = useState<IncomingMaterialDisposition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedDisposition, setSelectedDisposition] = useState<IncomingMaterialDisposition | null>(null);
  const [approveAction, setApproveAction] = useState<'approve' | 'reject'>('approve');
  const [approveRemarks, setApproveRemarks] = useState('');

  useEffect(() => {
    fetchDispositions();
  }, []);

  const fetchDispositions = async () => {
    try {
      if (runtimeMode === 'demo') {
        setDispositions(getDemoDispositions());
        return;
      }

      const { data, error } = await supabase
        .from('incoming_material_dispositions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDispositions(data || []);
    } catch (error) {
      console.error(t('disposition.fetchError'), error);
      toast.error(t('disposition.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (disposition: IncomingMaterialDisposition, action: 'approve' | 'reject') => {
    setSelectedDisposition(disposition);
    setApproveAction(action);
    setApproveRemarks('');
    setApproveDialogOpen(true);
  };

  const handleSubmitApprove = async () => {
    if (!selectedDisposition) return;

    try {
      const patch: Partial<IncomingMaterialDisposition> = {
        disposition_status: approveAction === 'approve' ? 'approved' : 'rejected',
        disposition_type:
          approveAction === 'approve' && selectedDisposition.disposition_type === 'hold'
            ? 'special_acceptance'
            : selectedDisposition.disposition_type,
        approved_at: new Date().toISOString(),
        remarks: approveRemarks || selectedDisposition.remarks,
      };

      if (runtimeMode === 'demo') {
        updateDemoDisposition(selectedDisposition.id, patch);
        toast.success(approveAction === 'approve' ? 'Demo disposition approved.' : 'Demo disposition rejected.');
        setApproveDialogOpen(false);
        fetchDispositions();
        return;
      }

      const { error } = await supabase
        .from('incoming_material_dispositions')
        .update(patch)
        .eq('id', selectedDisposition.id);

      if (error) throw error;
      toast.success(approveAction === 'approve' ? 'Disposition approved.' : 'Disposition rejected.');
      setApproveDialogOpen(false);
      fetchDispositions();
    } catch (error) {
      console.error('Disposition approval failed:', error);
      toast.error('Disposition approval failed.');
    }
  };

  const handleMarkCompleted = async (disposition: IncomingMaterialDisposition) => {
    try {
      const patch = {
        disposition_status: 'completed' as const,
        completed_at: new Date().toISOString(),
      };

      if (runtimeMode === 'demo') {
        updateDemoDisposition(disposition.id, patch);
        toast.success('Demo disposition completed.');
        fetchDispositions();
        return;
      }

      const { error } = await supabase
        .from('incoming_material_dispositions')
        .update(patch)
        .eq('id', disposition.id);

      if (error) throw error;
      toast.success('Disposition completed.');
      fetchDispositions();
    } catch (error) {
      console.error('Complete disposition failed:', error);
      toast.error('Complete disposition failed.');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: 'Pending', variant: 'secondary' as const, icon: Clock },
      approved: { label: 'Approved', variant: 'default' as const, icon: CheckCircle },
      rejected: { label: 'Rejected', variant: 'destructive' as const, icon: XCircle },
      completed: { label: 'Completed', variant: 'default' as const, icon: CheckCircle },
      cancelled: { label: 'Cancelled', variant: 'destructive' as const, icon: XCircle },
    };
    const config = statusMap[status as keyof typeof statusMap] || {
      label: status,
      variant: 'secondary' as const,
      icon: AlertTriangle,
    };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const filteredDispositions = dispositions.filter((item) =>
    `${item.disposition_no} ${item.part_no} ${item.part_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Material Disposition</h1>
        <p className="text-muted-foreground mt-1">Review blocked inbound material and release decisions.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search disposition number, part number, or part name..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredDispositions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No disposition records.</p>
              </div>
            ) : (
              filteredDispositions.map((disposition) => (
                <Card key={disposition.id} className="hover:bg-accent/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-lg font-semibold">{disposition.disposition_no}</h3>
                          {getStatusBadge(disposition.disposition_status)}
                          <Badge variant="outline">{disposition.disposition_type}</Badge>
                          <Badge variant="outline">{disposition.source_type}</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Part No.</span>
                            <p className="font-medium">{disposition.part_no}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Part Name</span>
                            <p className="font-medium">{disposition.part_name}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Batch</span>
                            <p className="font-medium">{disposition.batch_no || '-'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Affected Qty</span>
                            <p className="font-medium">{disposition.affected_qty}</p>
                          </div>
                        </div>
                        {disposition.block_reason && (
                          <p className="text-sm text-destructive">{disposition.block_reason}</p>
                        )}
                        {disposition.action_plan && (
                          <p className="text-sm text-muted-foreground">{disposition.action_plan}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {disposition.disposition_status === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => handleApprove(disposition, 'approve')}>
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleApprove(disposition, 'reject')}>
                              Reject
                            </Button>
                          </>
                        )}
                        {disposition.disposition_status === 'approved' && (
                          <Button size="sm" onClick={() => handleMarkCompleted(disposition)}>
                            Mark Completed
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{approveAction === 'approve' ? 'Approve disposition' : 'Reject disposition'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDisposition && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-medium">{selectedDisposition.part_name}</p>
                <p className="text-sm text-muted-foreground">{selectedDisposition.disposition_no}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={approveRemarks}
                onChange={(event) => setApproveRemarks(event.target.value)}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitApprove}>Confirm</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
