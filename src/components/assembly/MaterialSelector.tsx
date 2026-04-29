import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { checkMaterialAvailability, type MaterialAvailabilityCheck } from '@/services/inventoryService';

export interface MaterialOption {
  id: number;
  part_no: string;
  part_name: string;
  batch_no: string;
  available_qty: number;
  receiving_no: string;
  serial_number?: string;
}

interface MaterialSelectorProps {
  label: string;
  materials: MaterialOption[];
  selectedMaterial: MaterialOption | null;
  onSelect: (material: MaterialOption | null) => void;
  partType?: string;
  required?: boolean;
  loading?: boolean;
}

export default function MaterialSelector({
  label,
  materials,
  selectedMaterial,
  onSelect,
  partType,
  required = false,
  loading = false,
}: MaterialSelectorProps) {
  const [availabilityChecks, setAvailabilityChecks] = useState<Map<number, MaterialAvailabilityCheck>>(new Map());
  const [checkingMaterials, setCheckingMaterials] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (materials.length > 0) {
      checkAllMaterials();
    } else {
      setAvailabilityChecks(new Map());
    }
  }, [materials, partType]);

  const checkAllMaterials = async () => {
    const checks = new Map<number, MaterialAvailabilityCheck>();

    for (const material of materials) {
      try {
        setCheckingMaterials((prev) => new Set(prev).add(material.id));
        const result = await checkMaterialAvailability(material.id, 1, partType);
        checks.set(material.id, result);
      } catch (error) {
        console.error(`Material availability check failed for ${material.id}`, error);
        checks.set(material.id, {
          available: false,
          reason: 'Availability check failed.',
          error_code: 'CHECK_FAILED',
        });
      } finally {
        setCheckingMaterials((prev) => {
          const next = new Set(prev);
          next.delete(material.id);
          return next;
        });
      }
    }

    setAvailabilityChecks(checks);
  };

  const handleSelectMaterial = (material: MaterialOption) => {
    const check = availabilityChecks.get(material.id);
    if (check && !check.available) return;
    onSelect(selectedMaterial?.id === material.id ? null : material);
  };

  const getIQCStatusBadge = (iqcResult?: string) => {
    switch (iqcResult) {
      case 'OK':
        return (
          <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
            <CheckCircle className="h-3 w-3 mr-1" />
            IQC OK
          </Badge>
        );
      case 'NG':
        return (
          <Badge variant="outline" className="border-red-500 text-red-700 bg-red-50">
            <XCircle className="h-3 w-3 mr-1" />
            IQC NG
          </Badge>
        );
      case 'HOLD':
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50">
            <AlertTriangle className="h-3 w-3 mr-1" />
            IQC HOLD
          </Badge>
        );
      case 'not_inspected':
        return (
          <Badge variant="outline" className="border-muted text-muted-foreground bg-muted">
            <Clock className="h-3 w-3 mr-1" />
            Not Inspected
          </Badge>
        );
      default:
        return null;
    }
  };

  const getDispositionStatusBadge = (dispositionStatus?: string) => {
    switch (dispositionStatus) {
      case 'approved':
        return (
          <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
            <CheckCircle className="h-3 w-3 mr-1" />
            Special Approved
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50">
            <Clock className="h-3 w-3 mr-1" />
            Special Pending
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="border-red-500 text-red-700 bg-red-50">
            <XCircle className="h-3 w-3 mr-1" />
            Special Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="space-y-2">
        <Label>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        <div className="text-sm text-muted-foreground">No available material.</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>

      <div className="space-y-2">
        {materials.map((material) => {
          const check = availabilityChecks.get(material.id);
          const isChecking = checkingMaterials.has(material.id);
          const isSelected = selectedMaterial?.id === material.id;
          const isBlocked = check && !check.available;

          return (
            <Card
              key={material.id}
              className={`cursor-pointer transition-all ${
                isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              } ${isBlocked ? 'opacity-60 cursor-not-allowed bg-muted/30' : ''}`}
              onClick={() => !isBlocked && handleSelectMaterial(material)}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{material.part_name}</span>
                        {isSelected && (
                          <Badge variant="default" className="text-xs">
                            Selected
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>Part No: {material.part_no}</div>
                        <div>Batch: {material.batch_no}</div>
                        {material.serial_number && <div>Serial: {material.serial_number}</div>}
                        <div>Receiving: {material.receiving_no}</div>
                        <div>Available Qty: {material.available_qty}</div>
                      </div>
                    </div>
                  </div>

                  {isChecking ? (
                    <div className="text-xs text-muted-foreground">Checking...</div>
                  ) : check ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {getIQCStatusBadge(check.iqc_result)}
                        {getDispositionStatusBadge(check.disposition_status)}
                      </div>

                      {isBlocked && (
                        <div className="flex items-start gap-2 p-2 rounded bg-red-50 border border-red-200">
                          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-red-700 space-y-1">
                            <div className="font-medium">This material cannot be used.</div>
                            <div>{check.reason}</div>
                            {check.error_code && <div className="text-red-600 font-mono">Code: {check.error_code}</div>}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
