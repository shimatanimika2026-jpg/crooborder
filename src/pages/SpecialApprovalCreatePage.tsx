import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { createDemoSpecialApproval } from '@/data/demo/quality-gate';
import { runtimeMode, supabase } from '@/db/supabase';
import { getErrorMessage } from '@/lib/error-utils';

export default function SpecialApprovalCreatePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const isSourceLocked = !!(searchParams.get('source_type') && searchParams.get('source_id'));

  const [formData, setFormData] = useState({
    source_type: 'other',
    source_id: '',
    source_no: '',
    reason: '',
    applicant_name: profile?.full_name || 'Demo User',
    applicant_dept: 'Quality',
  });

  useEffect(() => {
    const sourceType = searchParams.get('source_type');
    const sourceId = searchParams.get('source_id');
    const sourceNo = searchParams.get('source_no');

    if (sourceType) {
      setFormData((prev) => ({
        ...prev,
        source_type: sourceType,
        source_id: sourceId || prev.source_id,
        source_no: sourceNo || prev.source_no,
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (profile?.full_name && formData.applicant_name === 'Demo User') {
      setFormData((prev) => ({
        ...prev,
        applicant_name: profile.full_name || prev.applicant_name,
      }));
    }
  }, [profile, formData.applicant_name]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.source_no || !formData.reason || !formData.applicant_name) {
      toast.error('Please fill source number, reason, and applicant name.');
      return;
    }

    if (formData.source_type !== 'other' && !formData.source_id) {
      toast.error('Source-linked request requires a source id.');
      return;
    }

    setSubmitting(true);
    try {
      if (runtimeMode === 'demo') {
        const request = createDemoSpecialApproval({
          source_type: formData.source_type,
          source_id: formData.source_id ? Number(formData.source_id) : undefined,
          source_no: formData.source_no,
          reason: formData.reason,
          applicant_name: formData.applicant_name,
          applicant_dept: formData.applicant_dept,
        });
        toast.success('Demo special approval request submitted.');
        navigate(`/special-approval/${request.id}`);
        return;
      }

      const { data, error } = await supabase
        .from('special_approval_requests')
        .insert({
          source_type: formData.source_type,
          source_id: formData.source_id || null,
          source_no: formData.source_no,
          defect_description: formData.reason,
          applicant_id: profile?.id,
          applicant_department: formData.applicant_dept,
          material_code: 'MAT-002',
          material_name: 'Controller module',
          batch_code: 'BATCH-2026-B01',
          quantity: 50,
          defect_category: 'other',
          status: 'pending_approval',
          tenant_id: 'JP',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Special approval request submitted.');
      navigate(`/special-approval/${data.id}`);
    } catch (error: unknown) {
      console.error('Submit special approval failed:', error);
      toast.error(`Submit failed: ${getErrorMessage(error, 'Unknown error')}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/special-approval')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-normal">New Special Approval</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSourceLocked
              ? 'This request is linked to a source document and source fields are locked.'
              : 'Create a manual special acceptance request.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-normal">Request Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source_type">Source Type</Label>
                <Select
                  value={formData.source_type}
                  onValueChange={(value) => setFormData({ ...formData, source_type: value })}
                  disabled={isSourceLocked}
                >
                  <SelectTrigger id="source_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iqc">IQC</SelectItem>
                    <SelectItem value="receiving">Receiving</SelectItem>
                    <SelectItem value="exception">Exception</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="source_no">Source No. *</Label>
                <Input
                  id="source_no"
                  value={formData.source_no}
                  onChange={(event) => setFormData({ ...formData, source_no: event.target.value })}
                  placeholder="RCV-2026-002"
                  required
                  disabled={isSourceLocked}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(event) => setFormData({ ...formData, reason: event.target.value })}
                placeholder="Describe why this material needs special acceptance."
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="applicant_name">Applicant *</Label>
                <Input
                  id="applicant_name"
                  value={formData.applicant_name}
                  onChange={(event) => setFormData({ ...formData, applicant_name: event.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="applicant_dept">Department</Label>
                <Input
                  id="applicant_dept"
                  value={formData.applicant_dept}
                  onChange={(event) => setFormData({ ...formData, applicant_dept: event.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/special-approval')}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      </form>
    </div>
  );
}
