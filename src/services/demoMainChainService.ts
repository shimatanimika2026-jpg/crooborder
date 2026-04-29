import { demoAgingTestData } from '@/data/demo/assembly';
import { getDemoFinishedUnits } from '@/data/demo/inventory-assembly';
import { demoFinalTestData, demoQAReleaseData, demoShipmentData } from '@/data/demo/mainflow';
import type { AgingTestWithModel, FinalTestRecord, QAReleaseRecord, ShipmentRecord } from '@/types/database';

const FINAL_TESTS_KEY = 'miaoda_demo_final_tests';
const QA_RELEASES_KEY = 'miaoda_demo_qa_releases';
const SHIPMENTS_KEY = 'miaoda_demo_shipments';
const AGING_TESTS_KEY = 'miaoda_demo_aging_tests';

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

const nowIso = () => new Date().toISOString();

const nextId = (items: Array<{ id: number }>) =>
  Math.max(0, ...items.map((item) => item.id)) + 1;

const uniqueBySn = <T extends { finished_product_sn: string }>(items: T[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.finished_product_sn)) return false;
    seen.add(item.finished_product_sn);
    return true;
  });
};

export function getDemoAgingTests(status = 'all'): AgingTestWithModel[] {
  const base = demoAgingTestData as unknown as AgingTestWithModel[];
  const stored = readStore<AgingTestWithModel>(AGING_TESTS_KEY);
  const fromUnits = getDemoFinishedUnits()
    .filter((unit) => ![...base, ...stored].some((test) => test.finished_product_sn === unit.finished_product_sn))
    .map((unit, index) => ({
      id: 9000 + index,
      test_code: `AGE-DEMO-${unit.finished_product_sn}`,
      finished_product_sn: unit.finished_product_sn,
      product_model_id: unit.product_model_id,
      control_box_sn: unit.control_box_sn,
      teaching_pendant_sn: unit.teaching_pendant_sn,
      required_duration_hours: 48,
      duration_hours: null,
      start_time: null,
      end_time: null,
      status: unit.aging_status === 'passed' ? 'passed' : 'planned',
      tenant_id: 'JP',
      factory_id: unit.factory_id,
      created_at: unit.created_at,
      updated_at: unit.updated_at,
      product_models: unit.product_models,
    })) as unknown as AgingTestWithModel[];
  const all = uniqueBySn([...stored, ...fromUnits, ...base]);
  return status === 'all' ? all : all.filter((test) => test.status === status);
}

export function hasDemoPassedAging(finishedProductSn: string) {
  return getDemoAgingTests().some(
    (test) => test.finished_product_sn === finishedProductSn && test.status === 'passed'
  );
}

export function getDemoFinalTests(status = 'all'): FinalTestRecord[] {
  const base = demoFinalTestData as unknown as FinalTestRecord[];
  const stored = readStore<FinalTestRecord>(FINAL_TESTS_KEY);
  const fromPassedAging = getDemoAgingTests()
    .filter((test) => test.status === 'passed')
    .filter((test) => ![...base, ...stored].some((record) => record.finished_product_sn === test.finished_product_sn))
    .map((test, index) => ({
      id: 9100 + index,
      finished_product_sn: test.finished_product_sn,
      test_status: 'pending',
      tested_at: null,
      tested_by: null,
      defect_description: null,
      notes: null,
      tenant_id: 'JP',
      created_at: nowIso(),
      updated_at: nowIso(),
    })) as unknown as FinalTestRecord[];
  const all = uniqueBySn([...stored, ...fromPassedAging, ...base]);
  return status === 'all' ? all : all.filter((test) => test.test_status === status);
}

export function createDemoFinalTest(finishedProductSn: string): number {
  if (!hasDemoPassedAging(finishedProductSn)) {
    throw new Error('Demo: aging test must pass before final test can be created.');
  }
  const all = getDemoFinalTests();
  const existing = all.find((test) => test.finished_product_sn === finishedProductSn);
  if (existing) return existing.id;

  const stored = readStore<FinalTestRecord>(FINAL_TESTS_KEY);
  const record = {
    id: nextId(all),
    finished_product_sn: finishedProductSn,
    test_status: 'pending',
    tested_at: null,
    tested_by: null,
    defect_description: null,
    notes: null,
    tenant_id: 'JP',
    created_at: nowIso(),
    updated_at: nowIso(),
  } as unknown as FinalTestRecord;
  writeStore(FINAL_TESTS_KEY, [record, ...stored]);
  return record.id;
}

export function submitDemoFinalTestResult(
  testId: number,
  status: string,
  defectDescription: string,
  notes: string
) {
  const all = getDemoFinalTests();
  const target = all.find((test) => test.id === testId);
  if (!target) throw new Error('Demo: final test record not found.');
  const updated = {
    ...target,
    test_status: status,
    tested_at: nowIso(),
    defect_description: defectDescription || null,
    notes: notes || null,
    updated_at: nowIso(),
  } as FinalTestRecord;
  const stored = readStore<FinalTestRecord>(FINAL_TESTS_KEY).filter((test) => test.id !== testId);
  writeStore(FINAL_TESTS_KEY, [updated, ...stored]);
  return true;
}

export function hasDemoPassedFinalTest(finishedProductSn: string) {
  return getDemoFinalTests().some(
    (test) => test.finished_product_sn === finishedProductSn && String(test.test_status) === 'pass'
  );
}

export function getDemoQAReleases(status = 'all'): QAReleaseRecord[] {
  const stored = readStore<QAReleaseRecord>(QA_RELEASES_KEY);
  const fromPassedTests = getDemoFinalTests()
    .filter((test) => String(test.test_status) === 'pass')
    .filter((test) => ![...demoQAReleaseData, ...stored].some((release) => release.finished_product_sn === test.finished_product_sn))
    .map((test, index) => ({
      id: 9200 + index,
      finished_product_sn: test.finished_product_sn,
      release_status: 'pending',
      released_at: null,
      released_by: null,
      remarks: null,
      block_reason: null,
      tenant_id: 'JP',
      created_by: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    })) as QAReleaseRecord[];
  const all = uniqueBySn([...stored, ...fromPassedTests, ...demoQAReleaseData]);
  return status === 'all' ? all : all.filter((release) => release.release_status === status);
}

export function createDemoQARelease(finishedProductSn: string): number {
  if (!hasDemoPassedFinalTest(finishedProductSn)) {
    throw new Error('Demo: final test must pass before QA release can be created.');
  }
  const all = getDemoQAReleases();
  const existing = all.find((release) => release.finished_product_sn === finishedProductSn);
  if (existing) return existing.id;

  const stored = readStore<QAReleaseRecord>(QA_RELEASES_KEY);
  const record: QAReleaseRecord = {
    id: nextId(all),
    finished_product_sn: finishedProductSn,
    release_status: 'pending',
    released_at: null,
    released_by: null,
    remarks: null,
    block_reason: null,
    tenant_id: 'JP',
    created_by: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  writeStore(QA_RELEASES_KEY, [record, ...stored]);
  return record.id;
}

export function executeDemoQARelease(
  releaseId: number,
  status: string,
  remarks: string,
  blockReason: string
) {
  const all = getDemoQAReleases();
  const target = all.find((release) => release.id === releaseId);
  if (!target) throw new Error('Demo: QA release record not found.');
  const updated: QAReleaseRecord = {
    ...target,
    release_status: status as QAReleaseRecord['release_status'],
    released_at: status === 'approved' ? nowIso() : null,
    remarks: remarks || null,
    block_reason: blockReason || null,
    updated_at: nowIso(),
  };
  const stored = readStore<QAReleaseRecord>(QA_RELEASES_KEY).filter((release) => release.id !== releaseId);
  writeStore(QA_RELEASES_KEY, [updated, ...stored]);
  return true;
}

export function hasDemoApprovedQARelease(finishedProductSn: string) {
  return getDemoQAReleases().some(
    (release) => release.finished_product_sn === finishedProductSn && release.release_status === 'approved'
  );
}

export function getDemoShipments(status = 'all'): ShipmentRecord[] {
  const stored = readStore<ShipmentRecord>(SHIPMENTS_KEY);
  const fromApprovedQA = getDemoQAReleases()
    .filter((release) => release.release_status === 'approved')
    .filter((release) => ![...demoShipmentData, ...stored].some((shipment) => shipment.finished_product_sn === release.finished_product_sn))
    .map((release, index) => ({
      id: 9300 + index,
      shipment_code: `SHIP-DEMO-${release.finished_product_sn}`,
      finished_product_sn: release.finished_product_sn,
      shipment_status: 'pending',
      shipped_at: null,
      shipped_by: null,
      remarks: null,
      block_reason: null,
      tenant_id: 'JP',
      created_by: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    })) as ShipmentRecord[];
  const all = uniqueBySn([...stored, ...fromApprovedQA, ...demoShipmentData]);
  return status === 'all' ? all : all.filter((shipment) => shipment.shipment_status === status);
}

export function createDemoShipment(finishedProductSn: string): number {
  if (!hasDemoApprovedQARelease(finishedProductSn)) {
    throw new Error('Demo: QA release must be approved before shipment can be created.');
  }
  const all = getDemoShipments();
  const existing = all.find((shipment) => shipment.finished_product_sn === finishedProductSn);
  if (existing) return existing.id;

  const stored = readStore<ShipmentRecord>(SHIPMENTS_KEY);
  const record: ShipmentRecord = {
    id: nextId(all),
    shipment_code: `SHIP-DEMO-${Date.now()}`,
    finished_product_sn: finishedProductSn,
    shipment_status: 'pending',
    shipped_at: null,
    shipped_by: null,
    remarks: null,
    block_reason: null,
    tenant_id: 'JP',
    created_by: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  writeStore(SHIPMENTS_KEY, [record, ...stored]);
  return record.id;
}

export function confirmDemoShipment(
  shipmentId: number,
  status: string,
  remarks: string,
  blockReason: string
) {
  const all = getDemoShipments();
  const target = all.find((shipment) => shipment.id === shipmentId);
  if (!target) throw new Error('Demo: shipment record not found.');
  const updated: ShipmentRecord = {
    ...target,
    shipment_status: status as ShipmentRecord['shipment_status'],
    shipped_at: status === 'shipped' ? nowIso() : null,
    remarks: remarks || null,
    block_reason: blockReason || null,
    updated_at: nowIso(),
  };
  const stored = readStore<ShipmentRecord>(SHIPMENTS_KEY).filter((shipment) => shipment.id !== shipmentId);
  writeStore(SHIPMENTS_KEY, [updated, ...stored]);
  return true;
}
