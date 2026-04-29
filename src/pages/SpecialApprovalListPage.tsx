import { AlertCircle, FileText, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  demoSuppliers,
  getDemoSpecialApprovals,
} from '@/data/demo/quality-gate';
import { runtimeMode, supabase } from '@/db/supabase';
import type { SpecialApprovalRequest, Supplier } from '@/types/database';

type SpecialApprovalWithSupplier = SpecialApprovalRequest & {
  supplier?: Supplier;
};

export default function SpecialApprovalListPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<SpecialApprovalWithSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchRequests();
  }, []);

  const withSupplier = (request: SpecialApprovalRequest): SpecialApprovalWithSupplier => ({
    ...request,
    supplier: demoSuppliers.find((supplier) => supplier.id === request.supplier_id),
  });

  const fetchRequests = async () => {
    try {
      setLoading(true);

      if (runtimeMode === 'demo') {
        setRequests(getDemoSpecialApprovals().map(withSupplier));
        return;
      }

      const { data, error } = await supabase
        .from('special_approval_requests')
        .select(`
          *,
          supplier:suppliers(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: unknown) {
      console.error('Fetch special approvals failed:', error);
      toast.error('Fetch special approvals failed.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter((request) => {
    const keyword = `${request.request_code} ${request.material_name} ${request.batch_code}`.toLowerCase();
    const matchesSearch = keyword.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesSourceType = sourceTypeFilter === 'all' || request.source_type === sourceTypeFilter;
    return matchesSearch && matchesStatus && matchesSourceType;
  });

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Special Approval</h1>
          <p className="text-muted-foreground mt-1">Manage special acceptance requests for nonconforming material.</p>
        </div>
        <Button onClick={() => navigate('/special-approval/new?source_type=other')}>
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search request code, material, or batch..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending_approval">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceTypeFilter} onValueChange={setSourceTypeFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="iqc">IQC</SelectItem>
                  <SelectItem value="receiving">Receiving</SelectItem>
                  <SelectItem value="exception">Exception</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, index) => (
                <Skeleton key={index} className="h-16 bg-muted" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No special approval requests.</h3>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Defect</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.request_code}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{request.material_name}</div>
                        <div className="text-sm text-muted-foreground">{request.material_code}</div>
                      </div>
                    </TableCell>
                    <TableCell>{request.batch_code}</TableCell>
                    <TableCell>{request.quantity}</TableCell>
                    <TableCell>{request.supplier?.supplier_name || '-'}</TableCell>
                    <TableCell>{getDefectCategoryLabel(request.defect_category)}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{new Date(request.created_at).toLocaleDateString('zh-CN')}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/special-approval/${request.id}`)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
