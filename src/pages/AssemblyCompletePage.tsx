import { AlertTriangle, CheckCircle, Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import MaterialSelector, { type MaterialOption } from '@/components/assembly/MaterialSelector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import {
  createDemoFinishedUnit,
  demoProductModels,
  getDemoAssemblyMaterials,
  getDemoFinishedUnits,
} from '@/data/demo/inventory-assembly';
import { runtimeMode, supabase } from '@/db/supabase';
import { getErrorMessage } from '@/lib/error-utils';
import type { FinishedUnitTraceability, ProductModel } from '@/types/database';

type UnitWithModel = FinishedUnitTraceability & {
  product_models?: ProductModel | null;
};

const emptyForm = {
  finished_product_sn: '',
  product_model_id: '',
  firmware_version: '',
  software_version: '',
};

export default function AssemblyCompletePage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<UnitWithModel[]>([]);
  const [productModels, setProductModels] = useState<ProductModel[]>([]);
  const [highlightedSn, setHighlightedSn] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [availableControlBoxes, setAvailableControlBoxes] = useState<MaterialOption[]>([]);
  const [availableTeachingPendants, setAvailableTeachingPendants] = useState<MaterialOption[]>([]);
  const [availableMainBoards, setAvailableMainBoards] = useState<MaterialOption[]>([]);
  const [selectedControlBox, setSelectedControlBox] = useState<MaterialOption | null>(null);
  const [selectedTeachingPendant, setSelectedTeachingPendant] = useState<MaterialOption | null>(null);
  const [selectedMainBoard, setSelectedMainBoard] = useState<MaterialOption | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (loading || units.length === 0) return;

    const snParam = searchParams.get('sn');
    const unitIdParam = searchParams.get('unit_id');
    const matchedBySn = snParam ? units.find((unit) => unit.finished_product_sn === snParam) : null;
    const matchedById = unitIdParam ? units.find((unit) => unit.id === Number(unitIdParam)) : null;
    const targetSn = matchedBySn?.finished_product_sn || matchedById?.finished_product_sn || null;

    setHighlightedSn(targetSn);

    if (targetSn) {
      setTimeout(() => {
        document.getElementById(`unit-${targetSn}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [searchParams, units, loading]);

  const loadData = async () => {
    await Promise.all([loadUnits(), loadProductModels()]);
  };

  const loadUnits = async () => {
    setLoading(true);
    try {
      if (runtimeMode === 'demo') {
        setUnits(getDemoFinishedUnits());
        return;
      }

      const { data, error } = await supabase
        .from('finished_unit_traceability')
        .select('*, product_models(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error('Load assembly units failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProductModels = async () => {
    try {
      if (runtimeMode === 'demo') {
        setProductModels(demoProductModels);
        return;
      }

      const { data, error } = await supabase.from('product_models').select('*').order('model_code');
      if (error) throw error;
      setProductModels(data || []);
    } catch (error) {
      console.error('Load product models failed:', error);
    }
  };

  const loadAvailableMaterials = async (modelId: string) => {
    if (!modelId) return;

    setLoadingMaterials(true);
    try {
      if (runtimeMode === 'demo') {
        setAvailableControlBoxes(getDemoAssemblyMaterials('control_box'));
        setAvailableTeachingPendants(getDemoAssemblyMaterials('teaching_pendant'));
        setAvailableMainBoards(getDemoAssemblyMaterials('main_board'));
        return;
      }

      const selectedModel = productModels.find((model) => model.id === Number(modelId));
      const modelCode = selectedModel?.model_code?.includes('FR5') ? 'FR5' : 'FR3';
      const [controlBox, teachingPendant, mainBoard] = await Promise.all([
        supabase.functions.invoke('get-available-materials', { body: { part_type: 'control_box', model_code: modelCode } }),
        supabase.functions.invoke('get-available-materials', { body: { part_type: 'teaching_pendant', model_code: modelCode } }),
        supabase.functions.invoke('get-available-materials', { body: { part_type: 'main_board', model_code: modelCode } }),
      ]);

      if (controlBox.error) throw controlBox.error;
      if (teachingPendant.error) throw teachingPendant.error;
      if (mainBoard.error) throw mainBoard.error;

      setAvailableControlBoxes(controlBox.data?.data || []);
      setAvailableTeachingPendants(teachingPendant.data?.data || []);
      setAvailableMainBoards(mainBoard.data?.data || []);
    } catch (error) {
      console.error('Load available materials failed:', error);
      toast.error('Load available materials failed.');
    } finally {
      setLoadingMaterials(false);
    }
  };

  const resetCreateForm = () => {
    setFormData(emptyForm);
    setSelectedControlBox(null);
    setSelectedTeachingPendant(null);
    setSelectedMainBoard(null);
  };

  const validateCreateForm = () => {
    if (!formData.finished_product_sn || !formData.product_model_id) {
      toast.error('Please fill finished product SN and product model.');
      return false;
    }
    if (!selectedControlBox || !selectedTeachingPendant) {
      toast.error('Please select available control box and teaching pendant materials.');
      return false;
    }
    if (!selectedControlBox.serial_number || !selectedTeachingPendant.serial_number) {
      toast.error('Selected critical materials must have serial numbers.');
      return false;
    }
    if (selectedMainBoard && !selectedMainBoard.serial_number) {
      toast.error('Selected main board must have a serial number.');
      return false;
    }
    return true;
  };

  const handleCreateUnit = async () => {
    if (!user && runtimeMode !== 'demo') return;
    if (!validateCreateForm() || !selectedControlBox || !selectedTeachingPendant) return;

    setActionLoading(true);
    try {
      if (runtimeMode === 'demo') {
        createDemoFinishedUnit({
          finished_product_sn: formData.finished_product_sn,
          product_model_id: Number(formData.product_model_id),
          control_box_sn: selectedControlBox.serial_number || '',
          teaching_pendant_sn: selectedTeachingPendant.serial_number || '',
          main_board_sn: selectedMainBoard?.serial_number,
          firmware_version: formData.firmware_version,
          software_version: formData.software_version,
        });
        toast.success('Demo assembly record created. Blocked materials remain unavailable.');
        setCreateDialogOpen(false);
        resetCreateForm();
        await loadUnits();
        return;
      }

      const parts = [
        {
          part_type: 'control_box',
          part_no: selectedControlBox.part_no,
          part_sn: selectedControlBox.serial_number || '',
          receiving_record_item_id: selectedControlBox.id,
          reserved_qty: 1,
          batch_no: selectedControlBox.batch_no,
        },
        {
          part_type: 'teaching_pendant',
          part_no: selectedTeachingPendant.part_no,
          part_sn: selectedTeachingPendant.serial_number || '',
          receiving_record_item_id: selectedTeachingPendant.id,
          reserved_qty: 1,
          batch_no: selectedTeachingPendant.batch_no,
        },
      ];

      if (selectedMainBoard?.serial_number) {
        parts.push({
          part_type: 'main_board',
          part_no: selectedMainBoard.part_no,
          part_sn: selectedMainBoard.serial_number,
          receiving_record_item_id: selectedMainBoard.id,
          reserved_qty: 1,
          batch_no: selectedMainBoard.batch_no,
        });
      }

      const { data, error } = await supabase.rpc('create_assembly_unit_with_reservation', {
        p_finished_product_sn: formData.finished_product_sn,
        p_product_model_id: Number(formData.product_model_id),
        p_assembly_date: new Date().toISOString().slice(0, 10),
        p_assembly_operator_id: user?.id,
        p_parts: parts,
        p_tenant_id: 'JP',
        p_user_id: user?.id,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Create assembly failed.');

      toast.success('Assembly record created and inventory consumed.');
      setCreateDialogOpen(false);
      resetCreateForm();
      await loadUnits();
    } catch (error: unknown) {
      console.error('Create assembly failed:', error);
      toast.error(getErrorMessage(error, 'Create assembly failed.'));
    } finally {
      setActionLoading(false);
    }
  };

  const canCreateAgingTask = (unit: UnitWithModel) => unit.assembly_completed_at && unit.aging_status === 'pending';

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48 bg-muted" />
        <Skeleton className="h-96 bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Assembly Completion</h1>
          <p className="text-muted-foreground">Create finished units from available inbound materials only.</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Package className="mr-2 h-4 w-4" />
              New Assembly Record
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Assembly Record</DialogTitle>
              <DialogDescription>
                Select real material lots. Blocked or HOLD material cannot be used until released.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="finished_product_sn">Finished Product SN *</Label>
                  <Input
                    id="finished_product_sn"
                    value={formData.finished_product_sn}
                    onChange={(event) => setFormData({ ...formData, finished_product_sn: event.target.value })}
                    placeholder="FR3-DEMO-0002"
                  />
                </div>
                <div>
                  <Label htmlFor="product_model_id">Product Model *</Label>
                  <Select
                    value={formData.product_model_id}
                    onValueChange={(value) => {
                      setFormData({ ...formData, product_model_id: value });
                      loadAvailableMaterials(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {productModels.map((model) => (
                        <SelectItem key={model.id} value={model.id.toString()}>
                          {model.model_code} - {model.model_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.product_model_id && (
                <div className="space-y-6 border-t pt-6">
                  <div>
                    <h3 className="text-base font-medium">Select Inbound Materials</h3>
                    <p className="text-sm text-muted-foreground">
                      The selector checks available quantity, IQC result, and special approval status.
                    </p>
                  </div>

                  <MaterialSelector
                    label="Control Box"
                    materials={availableControlBoxes}
                    selectedMaterial={selectedControlBox}
                    onSelect={setSelectedControlBox}
                    partType="control_box"
                    required
                    loading={loadingMaterials}
                  />

                  <MaterialSelector
                    label="Teaching Pendant"
                    materials={availableTeachingPendants}
                    selectedMaterial={selectedTeachingPendant}
                    onSelect={setSelectedTeachingPendant}
                    partType="teaching_pendant"
                    required
                    loading={loadingMaterials}
                  />

                  {availableMainBoards.length > 0 && (
                    <MaterialSelector
                      label="Main Board"
                      materials={availableMainBoards}
                      selectedMaterial={selectedMainBoard}
                      onSelect={setSelectedMainBoard}
                      partType="main_board"
                      loading={loadingMaterials}
                    />
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firmware_version">Firmware Version</Label>
                  <Input
                    id="firmware_version"
                    value={formData.firmware_version}
                    onChange={(event) => setFormData({ ...formData, firmware_version: event.target.value })}
                    placeholder="FW-1.2.0"
                  />
                </div>
                <div>
                  <Label htmlFor="software_version">Software Version</Label>
                  <Input
                    id="software_version"
                    value={formData.software_version}
                    onChange={(event) => setFormData({ ...formData, software_version: event.target.value })}
                    placeholder="SW-2.1.0"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateUnit} disabled={actionLoading}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-normal">Finished Units</CardTitle>
          <CardDescription>Assembly records created from released material lots.</CardDescription>
        </CardHeader>
        <CardContent>
          {units.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No assembly records.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Finished SN</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Control Box SN</TableHead>
                  <TableHead>Teaching Pendant SN</TableHead>
                  <TableHead>Completed At</TableHead>
                  <TableHead>Aging</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit) => (
                  <TableRow
                    key={unit.id}
                    id={`unit-${unit.finished_product_sn}`}
                    className={highlightedSn === unit.finished_product_sn ? 'bg-primary/10' : ''}
                  >
                    <TableCell className="font-normal">{unit.finished_product_sn}</TableCell>
                    <TableCell>{unit.product_models?.model_code || '-'}</TableCell>
                    <TableCell>{unit.control_box_sn}</TableCell>
                    <TableCell>{unit.teaching_pendant_sn}</TableCell>
                    <TableCell>
                      {unit.assembly_completed_at ? new Date(unit.assembly_completed_at).toLocaleString('zh-CN') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          unit.aging_status === 'passed'
                            ? 'default'
                            : unit.aging_status === 'failed'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {unit.aging_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canCreateAgingTask(unit) ? (
                        <Button size="sm" variant="outline" disabled>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Aging Ready
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">No action</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-yellow-200 bg-yellow-50/50">
        <CardHeader>
          <CardTitle className="text-lg font-normal flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Assembly Gate
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>Only material with available quantity can be selected.</p>
          <p>HOLD, blocked, or insufficient material is visible but cannot be consumed.</p>
          <p>After assembly, the finished unit enters the aging-ready stage.</p>
        </CardContent>
      </Card>
    </div>
  );
}
