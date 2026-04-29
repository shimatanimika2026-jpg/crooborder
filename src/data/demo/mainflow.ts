/**
 * Demo 数据 - 主流程（Final Test、QA Release、Shipment）
 */

import type { QAReleaseRecord, ShipmentRecord } from '@/types/database';

// Final Test 记录
export const demoFinalTestData = [
  {
    id: 1,
    test_number: 'FT-2026-001',
    finished_product_sn: 'FP-2026-001-001',
    production_plan_id: 1,
    plan_number: 'PLAN-2026-001',
    test_status: 'pass',
    test_result: '所有测试项通过',
    tester: '测试员A',
    tenant_id: 'JP',
    created_at: '2026-04-17T10:00:00Z',
    updated_at: '2026-04-17T11:00:00Z',
  },
  {
    id: 2,
    test_number: 'FT-2026-002',
    finished_product_sn: 'FP-2026-001-002',
    production_plan_id: 1,
    plan_number: 'PLAN-2026-001',
    test_status: 'fail',
    test_result: '电机性能测试未通过',
    tester: '测试员B',
    tenant_id: 'JP',
    created_at: '2026-04-17T11:00:00Z',
    updated_at: '2026-04-17T12:00:00Z',
  },
  {
    id: 3,
    test_number: 'FT-2026-003',
    finished_product_sn: 'FP-2026-002-001',
    production_plan_id: 2,
    plan_number: 'PLAN-2026-002',
    test_status: 'pass',
    test_result: '所有测试项通过',
    tester: '测试员A',
    tenant_id: 'JP',
    created_at: '2026-04-15T14:00:00Z',
    updated_at: '2026-04-15T15:00:00Z',
  },
];

// QA Release 记录
export const demoQAReleaseData: QAReleaseRecord[] = [
  {
    id: 1,
    finished_product_sn: 'FP-2026-001-001',
    release_status: 'approved',
    released_at: '2026-04-17T13:00:00Z',
    released_by: null,
    remarks: '外观检验合格，功能测试全通过',
    block_reason: null,
    tenant_id: 'JP',
    created_by: null,
    created_at: '2026-04-17T12:00:00Z',
    updated_at: '2026-04-17T13:00:00Z',
  },
  {
    id: 2,
    finished_product_sn: 'FP-2026-002-001',
    release_status: 'pending',
    released_at: null,
    released_by: null,
    remarks: null,
    block_reason: null,
    tenant_id: 'JP',
    created_by: null,
    created_at: '2026-04-15T16:00:00Z',
    updated_at: '2026-04-15T17:00:00Z',
  },
];

// Shipment 记录
export const demoShipmentData: ShipmentRecord[] = [
  {
    id: 1,
    shipment_code: 'SHIP-2026-001',
    finished_product_sn: 'FP-2026-001-001',
    shipment_status: 'shipped',
    shipped_at: '2026-04-16T10:00:00Z',
    shipped_by: null,
    remarks: '海运，预计5天到达',
    block_reason: null,
    tenant_id: 'JP',
    created_by: null,
    created_at: '2026-04-16T08:00:00Z',
    updated_at: '2026-04-16T10:00:00Z',
  },
  {
    id: 2,
    shipment_code: 'SHIP-2026-002',
    finished_product_sn: 'FP-2026-002-001',
    shipment_status: 'pending',
    shipped_at: null,
    shipped_by: null,
    remarks: null,
    block_reason: null,
    tenant_id: 'JP',
    created_by: null,
    created_at: '2026-04-17T14:00:00Z',
    updated_at: '2026-04-17T14:00:00Z',
  },
];
