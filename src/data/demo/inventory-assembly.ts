import type { FinishedUnitTraceability, InventoryStatus, ProductModel } from '@/types/database';

const DEMO_UNITS_KEY = 'miaoda_demo_finished_units';

export type DemoInventoryStatus = InventoryStatus & {
  available_qty: number;
  reserved_qty: number;
  consumed_qty: number;
  blocked_qty: number;
};

export type DemoMaterialOption = {
  id: number;
  part_no: string;
  part_name: string;
  batch_no: string;
  available_qty: number;
  blocked_qty?: number;
  receiving_no: string;
  serial_number?: string;
  iqc_result?: 'OK' | 'NG' | 'HOLD' | 'not_inspected';
  disposition_status?: 'none' | 'pending' | 'approved' | 'rejected';
  part_type?: string;
};

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

export const demoInventoryStatus: DemoInventoryStatus[] = [
  {
    inventory_id: 801,
    material_code: 'MAT-001',
    material_name: 'Motor assembly',
    material_type: 'component',
    warehouse_location: 'JP-WH-A01',
    current_quantity: 100,
    safety_stock_threshold: 20,
    tenant_id: 'JP',
    stock_status: 'normal',
    updated_at: '2026-04-24T09:00:00Z',
    available_qty: 100,
    reserved_qty: 0,
    consumed_qty: 0,
    blocked_qty: 0,
  },
  {
    inventory_id: 802,
    material_code: 'MAT-002',
    material_name: 'Controller module',
    material_type: 'component',
    warehouse_location: 'JP-WH-B02',
    current_quantity: 50,
    safety_stock_threshold: 20,
    tenant_id: 'JP',
    stock_status: 'low_stock',
    updated_at: '2026-04-24T09:10:00Z',
    available_qty: 0,
    reserved_qty: 0,
    consumed_qty: 0,
    blocked_qty: 50,
  },
  {
    inventory_id: 803,
    material_code: 'MAT-003',
    material_name: 'Sensor kit',
    material_type: 'component',
    warehouse_location: 'JP-WH-C01',
    current_quantity: 200,
    safety_stock_threshold: 30,
    tenant_id: 'JP',
    stock_status: 'normal',
    updated_at: '2026-04-24T09:20:00Z',
    available_qty: 180,
    reserved_qty: 10,
    consumed_qty: 10,
    blocked_qty: 0,
  },
];

export const demoProductModels: ProductModel[] = [
  {
    id: 901,
    model_code: 'FR3-DEMO',
    model_name: 'FR3 Demo Robot',
    payload_kg: 3,
    reach_mm: 620,
    bom_version: 'BOM-DEMO-1',
    active_flag: true,
    aging_required_hours: 48,
    tenant_id: 'JP',
    created_at: '2026-04-20T09:00:00Z',
    updated_at: '2026-04-20T09:00:00Z',
  },
];

export const demoAssemblyMaterials: DemoMaterialOption[] = [
  {
    id: 1001,
    part_no: 'CTRL-FR3-001',
    part_name: 'FR3 Control Box',
    batch_no: 'BATCH-CTRL-OK',
    available_qty: 3,
    blocked_qty: 0,
    receiving_no: 'RCV-2026-001',
    serial_number: 'CB-DEMO-001',
    iqc_result: 'OK',
    disposition_status: 'none',
    part_type: 'control_box',
  },
  {
    id: 1002,
    part_no: 'CTRL-FR3-002',
    part_name: 'FR3 Control Box - blocked',
    batch_no: 'BATCH-CTRL-HOLD',
    available_qty: 0,
    blocked_qty: 5,
    receiving_no: 'RCV-2026-002',
    serial_number: 'CB-DEMO-002',
    iqc_result: 'HOLD',
    disposition_status: 'pending',
    part_type: 'control_box',
  },
  {
    id: 1003,
    part_no: 'TP-FR3-001',
    part_name: 'FR3 Teaching Pendant',
    batch_no: 'BATCH-TP-OK',
    available_qty: 4,
    blocked_qty: 0,
    receiving_no: 'RCV-2026-001',
    serial_number: 'TP-DEMO-001',
    iqc_result: 'OK',
    disposition_status: 'none',
    part_type: 'teaching_pendant',
  },
  {
    id: 1004,
    part_no: 'MB-FR3-001',
    part_name: 'FR3 Main Board',
    batch_no: 'BATCH-MB-SA',
    available_qty: 2,
    blocked_qty: 0,
    receiving_no: 'RCV-2026-002',
    serial_number: 'MB-DEMO-001',
    iqc_result: 'HOLD',
    disposition_status: 'approved',
    part_type: 'main_board',
  },
];

const baseUnits: FinishedUnitTraceability[] = [
  {
    id: 1101,
    finished_product_sn: 'FR3-DEMO-0001',
    product_model_id: 901,
    control_box_sn: 'CB-DEMO-BASE',
    teaching_pendant_sn: 'TP-DEMO-BASE',
    main_board_sn: 'MB-DEMO-BASE',
    firmware_version: 'FW-1.0.0',
    software_version: 'SW-1.0.0',
    binding_time: '2026-04-24T10:00:00Z',
    binding_operator_id: 'demo-user',
    assembly_completed_at: '2026-04-24T10:00:00Z',
    aging_required: true,
    aging_status: 'pending',
    final_test_status: 'pending',
    qa_release_status: 'pending',
    shipment_status: 'pending',
    tenant_id: 'JP',
    factory_id: 'JP-DEMO',
    created_at: '2026-04-24T10:00:00Z',
    updated_at: '2026-04-24T10:00:00Z',
  },
];

export const getDemoInventoryStatus = () => demoInventoryStatus;

export const getDemoAssemblyMaterials = (partType?: string) =>
  demoAssemblyMaterials.filter((material) => !partType || material.part_type === partType);

export const checkDemoMaterialAvailability = (receivingItemId: number, requiredQty: number) => {
  const material = demoAssemblyMaterials.find((item) => item.id === receivingItemId);
  if (!material) {
    return {
      available: false,
      reason: 'Material does not exist in Demo inventory.',
      error_code: 'DEMO_NOT_FOUND',
    };
  }
  if ((material.available_qty || 0) < requiredQty) {
    return {
      available: false,
      reason: `Material is blocked or insufficient. Available ${material.available_qty}, blocked ${material.blocked_qty || 0}.`,
      error_code: 'DEMO_BLOCKED_OR_INSUFFICIENT',
      available_qty: material.available_qty,
      required_qty: requiredQty,
      iqc_result: material.iqc_result,
      disposition_status: material.disposition_status,
    };
  }
  return {
    available: true,
    reason: 'Material is available for assembly.',
    available_qty: material.available_qty,
    required_qty: requiredQty,
    iqc_result: material.iqc_result,
    disposition_status: material.disposition_status,
  };
};

export const getDemoFinishedUnits = () =>
  [...readStore<FinishedUnitTraceability>(DEMO_UNITS_KEY), ...baseUnits].map((unit) => ({
    ...unit,
    product_models: demoProductModels.find((model) => model.id === unit.product_model_id) ?? null,
  }));

export const createDemoFinishedUnit = (input: {
  finished_product_sn: string;
  product_model_id: number;
  control_box_sn: string;
  teaching_pendant_sn: string;
  main_board_sn?: string;
  firmware_version?: string;
  software_version?: string;
}) => {
  const stored = readStore<FinishedUnitTraceability>(DEMO_UNITS_KEY);
  const exists = [...stored, ...baseUnits].some((unit) => unit.finished_product_sn === input.finished_product_sn);
  if (exists) {
    throw new Error('Finished product SN already exists in Demo mode.');
  }

  const id = Date.now();
  const unit: FinishedUnitTraceability = {
    id,
    finished_product_sn: input.finished_product_sn,
    product_model_id: input.product_model_id,
    control_box_sn: input.control_box_sn,
    teaching_pendant_sn: input.teaching_pendant_sn,
    main_board_sn: input.main_board_sn,
    firmware_version: input.firmware_version,
    software_version: input.software_version,
    binding_time: nowIso(),
    binding_operator_id: 'demo-user',
    assembly_completed_at: nowIso(),
    aging_required: true,
    aging_status: 'pending',
    final_test_status: 'pending',
    qa_release_status: 'pending',
    shipment_status: 'pending',
    tenant_id: 'JP',
    factory_id: 'JP-DEMO',
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  writeStore(DEMO_UNITS_KEY, [unit, ...stored]);
  return unit;
};
