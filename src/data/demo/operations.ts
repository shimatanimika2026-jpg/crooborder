import type { ShippingOrder, Supplier } from '@/types/database';

export type DemoLogisticsWithASN = {
  shipment_id: number;
  shipment_no: string;
  tracking_no: string | null;
  carrier: string | null;
  origin: string | null;
  destination: string | null;
  shipping_date: string;
  estimated_arrival_date: string;
  actual_arrival_date: string | null;
  status: string;
  current_location: string | null;
  current_status: string | null;
  last_update: string;
  tenant_id: string;
  tracking_number: string | null;
  logistics_company: string | null;
  asn_id: number | null;
  asn_no: string | null;
  asn_status: string | null;
  receiving_id: number | null;
  receiving_code: string | null;
  receiving_status: string | null;
};

export type DemoFirmwareVersion = {
  id: number;
  version_code: string;
  version_name: string;
  firmware_type: string;
  file_url: string;
  file_size: number;
  file_hash: string;
  release_notes_zh: string;
  release_notes_ja: string;
  is_stable: boolean;
  is_active: boolean;
  min_compatible_version: string;
  released_at: string;
};

export const demoLogisticsWithAsn: DemoLogisticsWithASN[] = [
  {
    shipment_id: 1,
    shipment_no: 'SHIP-2026-001',
    tracking_no: 'YK-20260418-001',
    carrier: 'Yamato Global',
    origin: '深圳仓',
    destination: '东京组装工厂',
    shipping_date: '2026-04-18',
    estimated_arrival_date: '2026-04-24',
    actual_arrival_date: '2026-04-24',
    status: 'arrived',
    current_location: '东京通关中心',
    current_status: '已到达',
    last_update: '2026-04-24T09:30:00Z',
    tenant_id: 'JP',
    tracking_number: 'YK-20260418-001',
    logistics_company: 'Yamato Global',
    asn_id: 1,
    asn_no: 'ASN-2026-001',
    asn_status: 'arrived',
    receiving_id: 1,
    receiving_code: 'RCV-2026-001',
    receiving_status: 'completed',
  },
  {
    shipment_id: 2,
    shipment_no: 'SHIP-2026-002',
    tracking_no: 'DHL-20260420-002',
    carrier: 'DHL',
    origin: '上海仓',
    destination: '大阪分仓',
    shipping_date: '2026-04-20',
    estimated_arrival_date: '2026-04-27',
    actual_arrival_date: null,
    status: 'in_transit',
    current_location: '大阪港',
    current_status: '在途',
    last_update: '2026-04-26T11:00:00Z',
    tenant_id: 'JP',
    tracking_number: 'DHL-20260420-002',
    logistics_company: 'DHL',
    asn_id: 2,
    asn_no: 'ASN-2026-002',
    asn_status: 'in_transit',
    receiving_id: null,
    receiving_code: null,
    receiving_status: null,
  },
];

export const demoSuppliers: Supplier[] = [
  {
    id: 1,
    supplier_code: 'SUP-CN-001',
    supplier_name: 'Demo Precision Parts',
    supplier_type: 'component',
    contact_person: 'Li Wei',
    contact_phone: '+86-755-1000-1001',
    contact_email: 'quality@example.cn',
    address: '深圳市宝安区演示工业园',
    status: 'active',
    tenant_id: 'CN',
    created_by: 'demo',
    updated_by: 'demo',
    created_at: '2026-04-01T08:00:00Z',
    updated_at: '2026-04-18T08:00:00Z',
  },
  {
    id: 2,
    supplier_code: 'SUP-JP-001',
    supplier_name: 'Tokyo Assembly Service',
    supplier_type: 'service',
    contact_person: 'Sato',
    contact_phone: '+81-3-1000-2001',
    contact_email: 'ops@example.jp',
    address: '東京都品川区デモセンター',
    status: 'active',
    tenant_id: 'JP',
    created_by: 'demo',
    updated_by: 'demo',
    created_at: '2026-04-05T08:00:00Z',
    updated_at: '2026-04-18T08:00:00Z',
  },
];

export const demoShippingOrders: ShippingOrder[] = [
  {
    id: 1,
    shipping_code: 'SHP-2026-001',
    order_code: 'SO-2026-001',
    order_id: 1001,
    shipping_date: '2026-04-18',
    estimated_arrival_date: '2026-04-24',
    actual_arrival_date: '2026-04-24',
    actual_ship_date: '2026-04-18',
    actual_delivery_date: '2026-04-24',
    shipping_method: 'express',
    shipping_company: 'Yamato Global',
    carrier: 'Yamato Global',
    total_packages: 8,
    total_weight: 120,
    tracking_number: 'YK-20260418-001',
    consignee_name: 'Tokyo Assembly Factory',
    consignee_contact: '+81-3-1000-2000',
    consignee_address: 'Tokyo Demo Factory',
    shipper_name: 'Shenzhen Demo Warehouse',
    shipper_contact: '+86-755-1000-1000',
    shipper_address: 'Shenzhen Demo Warehouse',
    has_exception: false,
    exception_description: null,
    status: 'delivered',
    asn_shipment_id: 1,
    tenant_id: 'JP',
    created_by: 'demo',
    updated_by: 'demo',
    created_at: '2026-04-18T08:00:00Z',
    updated_at: '2026-04-24T09:30:00Z',
  },
  {
    id: 2,
    shipping_code: 'SHP-2026-002',
    order_code: 'SO-2026-002',
    order_id: 1002,
    shipping_date: '2026-04-20',
    estimated_arrival_date: '2026-04-27',
    actual_arrival_date: null,
    actual_ship_date: '2026-04-20',
    actual_delivery_date: null,
    shipping_method: 'air',
    shipping_company: 'DHL',
    carrier: 'DHL',
    total_packages: 5,
    total_weight: 86,
    tracking_number: 'DHL-20260420-002',
    consignee_name: 'Osaka Demo Warehouse',
    consignee_contact: '+81-6-1000-3000',
    consignee_address: 'Osaka Demo Warehouse',
    shipper_name: 'Shanghai Demo Warehouse',
    shipper_contact: '+86-21-1000-1000',
    shipper_address: 'Shanghai Demo Warehouse',
    has_exception: false,
    exception_description: null,
    status: 'in_transit',
    asn_shipment_id: 2,
    tenant_id: 'JP',
    created_by: 'demo',
    updated_by: 'demo',
    created_at: '2026-04-20T08:00:00Z',
    updated_at: '2026-04-26T11:00:00Z',
  },
];

export const demoFirmwareVersions: DemoFirmwareVersion[] = [
  {
    id: 1,
    version_code: 'FW-1.0.0',
    version_name: 'Robot Firmware 1.0.0',
    firmware_type: 'robot_firmware',
    file_url: 'https://example.invalid/demo/firmware/fw-1.0.0.bin',
    file_size: 12582912,
    file_hash: 'a4b8d2e7f901c3a9d5e6b7c8f9a0b1c2',
    release_notes_zh: '演示版本：基础运动控制与通信稳定性更新。',
    release_notes_ja: 'デモ版：基本動作制御と通信安定性の更新。',
    is_stable: true,
    is_active: true,
    min_compatible_version: 'FW-0.9.0',
    released_at: '2026-04-18T09:00:00Z',
  },
  {
    id: 2,
    version_code: 'APP-1.2.0',
    version_name: 'App Version 1.2.0',
    firmware_type: 'app',
    file_url: 'https://example.invalid/demo/firmware/app-1.2.0.apk',
    file_size: 52428800,
    file_hash: 'd1c2b3a4f5968776655443322110ffee',
    release_notes_zh: '演示版本：优化设备绑定与状态同步。',
    release_notes_ja: 'デモ版：デバイス紐付けと状態同期を改善。',
    is_stable: true,
    is_active: true,
    min_compatible_version: 'APP-1.1.0',
    released_at: '2026-04-20T09:00:00Z',
  },
];
