import { demoCommissions } from "@/data/demo/commissions";
import type {
  Commission,
  CommissionOperation,
  CommissionOperationType,
  CommissionStatus,
} from "@/types";

const COMMISSIONS_KEY = "miaoda_demo_commissions";
const OPERATIONS_KEY = "miaoda_demo_commission_operations";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getDemoCommissions(): Commission[] {
  const localCommissions = readJson<Commission[]>(COMMISSIONS_KEY, []);
  return [...localCommissions, ...demoCommissions];
}

export function getDemoCommissionById(id: number): Commission | undefined {
  return getDemoCommissions().find((commission) => commission.id === id);
}

export function getDemoCommissionOperations(id: number): CommissionOperation[] {
  const operations = readJson<CommissionOperation[]>(OPERATIONS_KEY, []);
  return operations
    .filter((operation) => operation.commission_id === id)
    .sort(
      (a, b) =>
        new Date(b.operated_at).getTime() - new Date(a.operated_at).getTime(),
    );
}

export function createDemoCommission(
  input: Omit<
    Commission,
    | "id"
    | "commission_no"
    | "status"
    | "pending_arrival_confirmation"
    | "created_at"
    | "updated_at"
  >,
): Commission {
  const now = new Date().toISOString();
  const localCommissions = readJson<Commission[]>(COMMISSIONS_KEY, []);
  const id = Date.now();
  const commission: Commission = {
    ...input,
    id,
    commission_no: `DEMO-${new Date().getFullYear()}-${String(
      localCommissions.length + 1,
    ).padStart(3, "0")}`,
    status: "pending_acceptance",
    pending_arrival_confirmation: false,
    created_at: now,
    updated_at: now,
  };

  writeJson(COMMISSIONS_KEY, [commission, ...localCommissions]);
  appendDemoCommissionOperation(id, "create", {
    action: "created",
    commission_no: commission.commission_no,
  });

  return commission;
}

export function updateDemoCommissionStatus(
  id: number,
  status: CommissionStatus,
): Commission | undefined {
  const localCommissions = readJson<Commission[]>(COMMISSIONS_KEY, []);
  const index = localCommissions.findIndex((commission) => commission.id === id);

  if (index < 0) {
    return getDemoCommissionById(id);
  }

  const updated = {
    ...localCommissions[index],
    status,
    pending_arrival_confirmation:
      status === "shipped"
        ? true
        : status === "completed"
          ? false
          : localCommissions[index].pending_arrival_confirmation,
    arrival_confirmation_completed_at:
      status === "completed"
        ? new Date().toISOString()
        : localCommissions[index].arrival_confirmation_completed_at,
    updated_at: new Date().toISOString(),
  };

  localCommissions[index] = updated;
  writeJson(COMMISSIONS_KEY, localCommissions);
  return updated;
}

export function appendDemoCommissionOperation(
  commissionId: number,
  operationType: CommissionOperationType,
  operationData?: Record<string, unknown>,
  previousStatus?: CommissionStatus,
  newStatus?: CommissionStatus,
): CommissionOperation {
  const operations = readJson<CommissionOperation[]>(OPERATIONS_KEY, []);
  const operation: CommissionOperation = {
    id: Date.now(),
    commission_id: commissionId,
    operation_type: operationType,
    operation_data: operationData,
    operator_id: "demo-user",
    operated_at: new Date().toISOString(),
    previous_status: previousStatus,
    new_status: newStatus,
  };

  writeJson(OPERATIONS_KEY, [operation, ...operations]);
  return operation;
}
