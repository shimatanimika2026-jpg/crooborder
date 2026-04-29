import type {
  IncomingMaterialDisposition,
  SpecialApprovalRequest,
  SpecialApprovalWorkflow,
  Supplier,
} from '@/types/database';

const APPROVAL_KEY = 'miaoda_demo_special_approvals';
const DISPOSITION_KEY = 'miaoda_demo_material_dispositions';

const nowIso = () => new Date().toISOString();

const readStore = <T>(key: string): T[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
};

const writeStore = <T>(key: string, value: T[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const demoSuppliers: Supplier[] = [
  {
    id: 1,
    supplier_code: 'SUP-001',
    supplier_name: 'Demo Precision Parts',
    supplier_type: 'component',
    contact_person: 'Demo Buyer',
    status: 'active',
    tenant_id: 'JP',
    created_at: '2026-04-20T09:00:00Z',
    updated_at: '2026-04-20T09:00:00Z',
  },
];

export const demoDispositions: IncomingMaterialDisposition[] = [
  {
    id: 501,
    disposition_no: 'DSP-2026-001',
    source_type: 'receiving_variance',
    source_id: 202,
    receiving_id: 202,
    part_no: 'MAT-002',
    part_name: 'Controller module',
    batch_no: 'BATCH-2026-B01',
    affected_qty: 50,
    disposition_type: 'hold',
    disposition_status: 'pending',
    approve_required: true,
    block_reason: 'Receiving shortage and IQC hold. Stock remains blocked before approval.',
    action_plan: 'Review shortage reason, approve special acceptance if production demand is urgent.',
    responsible_party: 'Quality',
    due_date: '2026-04-30',
    remarks: 'Demo disposition linked to receiving variance.',
    created_by: 'demo-user',
    created_at: '2026-04-21T10:00:00Z',
    updated_at: '2026-04-21T10:00:00Z',
  },
];

export const demoSpecialApprovals: SpecialApprovalRequest[] = [
  {
    id: 601,
    request_code: 'SAR-2026-001',
    receiving_inspection_id: 2,
    material_code: 'MAT-002',
    material_name: 'Controller module',
    batch_code: 'BATCH-2026-B01',
    quantity: 50,
    supplier_id: 1,
    defect_category: 'appearance_defect',
    defect_description: 'Minor surface scratch. Electrical function is not affected.',
    applicant_department: 'Quality',
    applicant_id: 'demo-user',
    status: 'pending_approval',
    acceptance_conditions: 'Use only after production manager and quality manager approval.',
    tenant_id: 'JP',
    created_by: 'demo-user',
    updated_by: 'demo-user',
    created_at: '2026-04-21T11:00:00Z',
    updated_at: '2026-04-21T11:00:00Z',
    source_type: 'receiving',
    source_no: 'RCV-2026-002',
    source_id: 202,
  },
];

export const getDemoDispositions = () => [
  ...readStore<IncomingMaterialDisposition>(DISPOSITION_KEY),
  ...demoDispositions,
];

export const updateDemoDisposition = (
  id: number,
  patch: Partial<IncomingMaterialDisposition>,
) => {
  const all = getDemoDispositions();
  const updated = all.map((item) =>
    item.id === id ? { ...item, ...patch, updated_at: nowIso() } : item,
  );
  const baseIds = new Set(demoDispositions.map((item) => item.id));
  writeStore(
    DISPOSITION_KEY,
    updated.filter((item) => !baseIds.has(item.id) || item.id === id),
  );
  return updated.find((item) => item.id === id) ?? null;
};

export const getDemoSpecialApprovals = () => [
  ...readStore<SpecialApprovalRequest>(APPROVAL_KEY),
  ...demoSpecialApprovals,
];

export const getDemoSpecialApprovalById = (id: number) =>
  getDemoSpecialApprovals().find((request) => request.id === id) ?? null;

export const createDemoSpecialApproval = (input: {
  source_type: string;
  source_id?: number;
  source_no: string;
  reason: string;
  applicant_name: string;
  applicant_dept: string;
}) => {
  const stored = readStore<SpecialApprovalRequest>(APPROVAL_KEY);
  const id = Date.now();
  const request: SpecialApprovalRequest = {
    id,
    request_code: `SAR-DEMO-${id}`,
    material_code: 'MAT-002',
    material_name: 'Controller module',
    batch_code: 'BATCH-2026-B01',
    quantity: 50,
    supplier_id: 1,
    defect_category: 'other',
    defect_description: input.reason,
    applicant_department: input.applicant_dept || 'Quality',
    applicant_id: 'demo-user',
    status: 'pending_approval',
    acceptance_conditions: 'Demo approval condition: limited release after approval.',
    tenant_id: 'JP',
    created_by: 'demo-user',
    updated_by: 'demo-user',
    created_at: nowIso(),
    updated_at: nowIso(),
    source_type: input.source_type as SpecialApprovalRequest['source_type'],
    source_id: input.source_id,
    source_no: input.source_no,
  };
  writeStore(APPROVAL_KEY, [request, ...stored]);
  return request;
};

export const updateDemoSpecialApprovalStatus = (
  id: number,
  status: SpecialApprovalRequest['status'],
) => {
  const all = getDemoSpecialApprovals();
  const updated = all.map((request) =>
    request.id === id ? { ...request, status, updated_at: nowIso() } : request,
  );
  const baseIds = new Set(demoSpecialApprovals.map((request) => request.id));
  writeStore(
    APPROVAL_KEY,
    updated.filter((request) => !baseIds.has(request.id) || request.id === id),
  );
  return updated.find((request) => request.id === id) ?? null;
};

export const getDemoSpecialApprovalRelations = (request: SpecialApprovalRequest) => ({
  supplier: demoSuppliers.find((supplier) => supplier.id === request.supplier_id),
  workflows: [
    {
      id: request.id * 10 + 1,
      request_id: request.id,
      approval_stage: 'quality_dept',
      approver_id: 'demo-user',
      approval_status:
        request.status === 'approved'
          ? 'approved'
          : request.status === 'rejected'
            ? 'rejected'
            : 'pending',
      approval_comment:
        request.status === 'approved'
          ? 'Approved in Demo mode.'
          : request.status === 'rejected'
            ? 'Rejected in Demo mode.'
            : undefined,
      approval_time: request.status === 'pending_approval' ? undefined : nowIso(),
      created_at: request.created_at,
    } satisfies SpecialApprovalWorkflow,
  ],
  applicant: { full_name: 'Demo User' },
});
