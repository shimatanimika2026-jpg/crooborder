import { demoIQCData } from '@/data/demo/assembly';
import type { ASNShipment, IQCInspection, ReceivingRecord, ReceivingRecordItem } from '@/types/database';

const RECEIVING_RECORDS_KEY = 'miaoda_demo_receiving_records';
const RECEIVING_ITEMS_KEY = 'miaoda_demo_receiving_items';
const IQC_INSPECTIONS_KEY = 'miaoda_demo_iqc_inspections';

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

export const demoASNData: ASNShipment[] = [
  {
    id: 101,
    shipment_no: 'ASN-2026-001',
    tenant_id: 'CN',
    factory_id: 'CN-SZ',
    destination_factory_id: 'JP-OSK',
    shipment_date: '2026-04-18',
    eta_date: '2026-04-24',
    carrier: 'Yamato Global',
    tracking_no: 'YK-20260418-001',
    status: 'arrived',
    total_boxes: 12,
    total_pallets: 2,
    remarks: 'Demo arrived ASN ready for receiving.',
    created_by: 'demo-user',
    created_at: '2026-04-18T09:00:00Z',
    updated_at: '2026-04-24T08:30:00Z',
  },
  {
    id: 102,
    shipment_no: 'ASN-2026-002',
    tenant_id: 'CN',
    factory_id: 'CN-SZ',
    destination_factory_id: 'JP-OSK',
    shipment_date: '2026-04-20',
    eta_date: '2026-04-27',
    carrier: 'DHL',
    tracking_no: 'DHL-20260420-002',
    status: 'in_transit',
    total_boxes: 8,
    total_pallets: 1,
    remarks: 'Demo in-transit ASN.',
    created_by: 'demo-user',
    created_at: '2026-04-20T10:00:00Z',
    updated_at: '2026-04-22T12:00:00Z',
  },
  {
    id: 103,
    shipment_no: 'ASN-2026-003',
    tenant_id: 'JP',
    factory_id: 'CN-SZ',
    destination_factory_id: 'JP-NGY',
    shipment_date: '2026-04-16',
    eta_date: '2026-04-21',
    carrier: 'Sagawa',
    tracking_no: 'SGW-20260416-003',
    status: 'received',
    total_boxes: 6,
    total_pallets: 1,
    remarks: 'Demo received ASN.',
    created_by: 'demo-user',
    created_at: '2026-04-16T11:00:00Z',
    updated_at: '2026-04-21T15:00:00Z',
  },
];

export const demoReceivingData: ReceivingRecord[] = [
  {
    id: 201,
    receiving_code: 'RCV-2026-001',
    receiving_number: 'RCV-2026-001',
    shipment_id: 103,
    asn_id: 103,
    asn_number: 'ASN-2026-003',
    receiving_date: '2026-04-21',
    receiver_id: 'demo-user',
    material_code: 'MAT-003',
    material_name: 'Sensor kit',
    received_quantity: 200,
    iqc_status: 'OK',
    status: 'completed',
    has_variance: false,
    variance_resolved: true,
    iqc_completed: true,
    remarks: 'Demo completed receiving record.',
    tenant_id: 'JP',
    factory_id: 'JP-NGY',
    created_by: 'demo-user',
    created_at: '2026-04-21T09:00:00Z',
    updated_at: '2026-04-21T14:00:00Z',
  },
  {
    id: 202,
    receiving_code: 'RCV-2026-002',
    receiving_number: 'RCV-2026-002',
    shipment_id: 103,
    asn_id: 103,
    asn_number: 'ASN-2026-003',
    receiving_date: '2026-04-21',
    receiver_id: 'demo-user',
    material_code: 'MAT-002',
    material_name: 'Controller module',
    received_quantity: 50,
    iqc_status: 'HOLD',
    status: 'variance_pending',
    has_variance: true,
    variance_resolved: false,
    iqc_completed: false,
    remarks: 'Demo variance record for IQC/disposition.',
    tenant_id: 'JP',
    factory_id: 'JP-NGY',
    created_by: 'demo-user',
    created_at: '2026-04-21T09:30:00Z',
    updated_at: '2026-04-21T13:00:00Z',
  },
];

export const demoReceivingItems: ReceivingRecordItem[] = [
  {
    id: 301,
    receiving_id: 201,
    shipment_item_id: 401,
    line_no: 1,
    part_no: 'MAT-003',
    part_name: 'Sensor kit',
    batch_no: 'BATCH-2026-C01',
    box_no: 'BOX-C01',
    expected_qty: 200,
    received_qty: 200,
    variance_qty: 0,
    variance_type: 'matched',
    unit: 'pcs',
    on_hand_qty: 200,
    available_qty: 200,
    reserved_qty: 0,
    consumed_qty: 0,
    blocked_qty: 0,
    remarks: 'Matched demo item.',
    created_at: '2026-04-21T09:20:00Z',
  },
  {
    id: 302,
    receiving_id: 202,
    shipment_item_id: 402,
    line_no: 1,
    part_no: 'MAT-002',
    part_name: 'Controller module',
    batch_no: 'BATCH-2026-B01',
    box_no: 'BOX-B01',
    expected_qty: 60,
    received_qty: 50,
    variance_qty: -10,
    variance_type: 'shortage',
    unit: 'pcs',
    on_hand_qty: 50,
    available_qty: 0,
    reserved_qty: 0,
    consumed_qty: 0,
    blocked_qty: 50,
    remarks: 'Shortage item blocked before disposition.',
    created_at: '2026-04-21T09:40:00Z',
  },
];

const buildReceivingFromASN = (asn: ASNShipment): ReceivingRecord => {
  const id = Date.now();
  const receivingNo = `RCV-DEMO-${id}`;

  return {
    id,
    receiving_code: receivingNo,
    receiving_number: receivingNo,
    shipment_id: asn.id,
    asn_id: asn.id,
    asn_number: asn.shipment_no,
    receiving_date: new Date().toISOString().slice(0, 10),
    receiver_id: 'demo-user',
    material_code: 'MAT-001',
    material_name: 'Motor assembly',
    received_quantity: 100,
    iqc_status: 'PENDING',
    status: 'draft',
    has_variance: false,
    variance_resolved: false,
    iqc_completed: false,
    remarks: `Created from ${asn.shipment_no} in Demo mode.`,
    tenant_id: asn.tenant_id,
    factory_id: asn.destination_factory_id,
    created_by: 'demo-user',
    created_at: nowIso(),
    updated_at: nowIso(),
  };
};

const buildItemsForReceiving = (receiving: ReceivingRecord): ReceivingRecordItem[] => [
  {
    id: receiving.id + 1,
    receiving_id: receiving.id,
    shipment_item_id: receiving.shipment_id ? receiving.shipment_id + 1000 : undefined,
    line_no: 1,
    part_no: 'MAT-001',
    part_name: 'Motor assembly',
    batch_no: `BATCH-${receiving.id}`,
    box_no: 'BOX-DEMO-01',
    expected_qty: 100,
    received_qty: 100,
    variance_qty: 0,
    variance_type: 'matched',
    unit: 'pcs',
    on_hand_qty: 100,
    available_qty: 0,
    reserved_qty: 0,
    consumed_qty: 0,
    blocked_qty: 100,
    remarks: 'Demo item waits for IQC release.',
    created_at: nowIso(),
  },
];

export const getDemoASNShipments = () => demoASNData;

export const getDemoReceivingRecords = () => [
  ...readStore<ReceivingRecord>(RECEIVING_RECORDS_KEY),
  ...demoReceivingData,
];

export const getDemoReceivingItems = (receivingId: number) => [
  ...readStore<ReceivingRecordItem>(RECEIVING_ITEMS_KEY),
  ...demoReceivingItems,
].filter((item) => item.receiving_id === receivingId);

export const getDemoReceivingRecordById = (id: number) =>
  getDemoReceivingRecords().find((record) => record.id === id) ?? null;

export const getDemoReceivingItemById = (receivingId: number, itemId: number) =>
  getDemoReceivingItems(receivingId).find((item) => item.id === itemId) ?? null;

export const createDemoReceivingFromASN = (asnId: number) => {
  const asn = demoASNData.find((item) => item.id === asnId);
  if (!asn || asn.status !== 'arrived') return null;

  const records = readStore<ReceivingRecord>(RECEIVING_RECORDS_KEY);
  const existing = [...records, ...demoReceivingData].find((record) => record.shipment_id === asn.id);
  if (existing) return existing;

  const receiving = buildReceivingFromASN(asn);
  const items = buildItemsForReceiving(receiving);
  writeStore(RECEIVING_RECORDS_KEY, [receiving, ...records]);
  writeStore(RECEIVING_ITEMS_KEY, [...items, ...readStore<ReceivingRecordItem>(RECEIVING_ITEMS_KEY)]);
  return receiving;
};

export const getDemoIQCInspections = () => [
  ...readStore<IQCInspection>(IQC_INSPECTIONS_KEY),
  ...(demoIQCData as IQCInspection[]),
];

export const addDemoIQCInspection = (
  receivingId: number,
  receivingItem: ReceivingRecordItem,
  form: {
    inspection_type: IQCInspection['inspection_type'];
    sample_size: number;
    inspected_qty: number;
    result: IQCInspection['result'];
    defect_code?: string;
    defect_description?: string;
    remarks?: string;
  },
) => {
  const stored = readStore<IQCInspection>(IQC_INSPECTIONS_KEY);
  const id = Date.now();
  const inspection: IQCInspection = {
    id,
    inspection_no: `IQC-DEMO-${id}`,
    receiving_id: receivingId,
    receiving_item_id: receivingItem.id,
    part_no: receivingItem.part_no,
    part_name: receivingItem.part_name,
    batch_no: receivingItem.batch_no,
    inspection_type: form.inspection_type,
    sample_size: form.sample_size,
    inspected_qty: form.inspected_qty,
    result: form.result,
    defect_code: form.defect_code,
    defect_description: form.defect_description,
    inspected_at: nowIso(),
    inspected_by: 'demo-user',
    remarks: form.remarks,
    created_at: nowIso(),
  };
  writeStore(IQC_INSPECTIONS_KEY, [inspection, ...stored]);
  return inspection;
};
