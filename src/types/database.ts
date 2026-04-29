// 数据库表类型定义
export type UserRole =
  | 'user'
  | 'admin'
  | 'cn_factory_manager'
  | 'cn_production_staff'
  | 'cn_quality_inspector'
  | 'cn_logistics_staff'
  | 'jp_factory_manager'
  | 'jp_warehouse_staff'
  | 'jp_assembly_staff'
  | 'jp_quality_inspector'
  | 'jp_quality_manager'
  | 'executive'
  | 'system_admin';

export type TenantId = 'CN' | 'JP' | 'BOTH';

export type Profile = {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  language_preference: 'zh-CN' | 'ja-JP';
  organization_id: number | null;
  tenant_id: TenantId;
  role: UserRole;
  status: 'active' | 'inactive' | 'locked';
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Organization = {
  id: number;
  org_code: string;
  org_name_zh: string;
  org_name_ja: string;
  org_type: 'factory' | 'department' | 'team';
  parent_id: number | null;
  tenant_id: 'CN' | 'JP';
  manager_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductionPlan = {
  id: number;
  plan_code: string;
  plan_type: 'annual' | 'monthly' | 'weekly';
  plan_period_start: string;
  plan_period_end: string;
  production_quantity: number;
  delivery_date: string;
  product_model_id: number | null;
  factory_id: string | null;
  responsible_person_id: string | null;
  remarks: string | null;
  status:
    | 'draft'
    | 'submitted'
    | 'pending_cn_approval'
    | 'pending_jp_approval'
    | 'approved'
    | 'rejected'
    | 'active'
    | 'executing'
    | 'completed'
    | 'closed'
    | 'cancelled';
  current_version: number;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  activated_by: string | null;
  activated_at: string | null;
  closed_by: string | null;
  closed_at: string | null;
  close_reason: string | null;
  tenant_id: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductionOrder = {
  id: number;
  order_code: string;
  plan_id: number | null;
  part_name: string;
  part_code: string;
  production_quantity: number;
  planned_start_date: string;
  planned_end_date: string;
  actual_start_date: string | null;
  actual_end_date: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  tenant_id: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type QualityInspection = {
  id: number;
  order_id: number;
  inspection_type: 'incoming' | 'in_process' | 'final' | 'sampling';
  inspection_date: string;
  inspector_id: string | null;
  inspected_quantity: number;
  qualified_quantity: number;
  defective_quantity: number;
  qualification_rate: number;
  defect_description: string | null;
  corrective_action: string | null;
  status: 'pending' | 'passed' | 'failed' | 'rework';
  tenant_id: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryRecord = {
  id: number;
  material_code: string;
  material_name: string;
  material_type: 'raw_material' | 'component' | 'semi_finished' | 'finished';
  warehouse_location: string;
  current_quantity: number;
  safety_stock_threshold: number;
  unit: string;
  unit_price: number | null;
  tenant_id: TenantId;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryAlert = {
  id: number;
  inventory_id: number;
  alert_type: 'low_stock' | 'out_of_stock' | 'overstock' | 'expiring';
  alert_level: 'info' | 'warning' | 'critical';
  alert_message: string;
  triggered_at: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  status: 'active' | 'acknowledged' | 'resolved';
  tenant_id: string;
  created_at: string;
};

export type ShippingOrder = {
  id: number;
  shipping_code: string;
  order_code?: string;
  order_id: number;
  shipping_date: string;
  estimated_arrival_date: string;
  actual_arrival_date: string | null;
  actual_ship_date?: string | null;
  actual_delivery_date?: string | null;
  shipping_method: 'sea' | 'air' | 'land' | 'express';
  shipping_company: string | null;
  carrier?: string | null;
  total_packages: number;
  total_weight: number | null;
  tracking_number?: string | null;
  consignee_name?: string | null;
  consignee_contact?: string | null;
  consignee_address?: string | null;
  shipper_name?: string | null;
  shipper_contact?: string | null;
  shipper_address?: string | null;
  has_exception?: boolean;
  exception_description?: string | null;
  status: 'pending' | 'preparing' | 'shipped' | 'in_transit' | 'customs' | 'customs_clearance' | 'delivering' | 'arrived' | 'delivered' | 'exception' | 'cancelled';
  asn_shipment_id?: number | null;
  tenant_id: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type LogisticsTracking = {
  id: number;
  shipping_id: number;
  shipping_order_id?: number;
  tracking_number: string;
  logistics_company: string;
  carrier?: string | null;
  current_location: string | null;
  current_status: string | null;
  estimated_arrival_date: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  last_updated_at: string;
  last_update_time?: string | null;
  tenant_id?: string;
  created_at?: string;
};

export type Notification = {
  id: number;
  user_id: string;
  notification_type: 'system' | 'alert' | 'approval' | 'task';
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'unread' | 'read';
  channels: string[];
  related_module: string | null;
  related_id: number | null;
  created_at: string;
  read_at: string | null;
};

// 视图类型
export type ProductionPlanOverview = {
  plan_id: number;
  plan_code: string;
  plan_type: string;
  production_quantity: number;
  plan_status: string;
  total_orders: number;
  completed_orders: number;
  total_production_quantity: number;
  completed_quantity: number;
  completion_rate: number;
};

export type QualityQualificationRate = {
  order_id: number;
  order_code: string;
  part_name: string;
  total_inspections: number;
  total_qualified: number;
  total_defective: number;
  avg_qualification_rate: number;
  tenant_id: string;
};

export type InventoryStatus = {
  inventory_id: number;
  material_code: string;
  material_name: string;
  material_type: string;
  warehouse_location: string;
  current_quantity: number;
  safety_stock_threshold: number;
  tenant_id: string;
  stock_status: 'normal' | 'low_stock' | 'out_of_stock';
  updated_at: string;
};

export type LogisticsInTransit = {
  shipping_id: number;
  shipping_code: string;
  shipping_date: string;
  tracking_number: string;
  logistics_company: string;
  current_location: string | null;
  current_status: string | null;
  estimated_arrival_date: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  last_updated_at: string;
  delivery_status: 'on_schedule' | 'delayed';
};

// 产品型号
export type ProductModel = {
  id: number;
  model_code: string;
  model_name: string;
  payload_kg: number;
  reach_mm: number;
  bom_version: string;
  active_flag: boolean;
  aging_required_hours: number;
  description?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
};

// 整机追溯
export type FinishedUnitTraceability = {
  id: number;
  finished_product_sn: string;
  product_model_id: number;
  control_box_sn: string;
  teaching_pendant_sn: string;
  main_board_sn?: string;
  motor_sn_j1?: string;
  motor_sn_j2?: string;
  motor_sn_j3?: string;
  motor_sn_j4?: string;
  motor_sn_j5?: string;
  motor_sn_j6?: string;
  firmware_version?: string;
  software_version?: string;
  binding_time: string;
  binding_operator_id?: string;
  assembly_order_id?: number;
  production_order_id?: number;
  assembly_completed_at?: string;
  aging_required: boolean;
  aging_status: 'pending' | 'running' | 'passed' | 'failed' | 'waived';
  aging_passed_at?: string;
  final_test_status: 'pending' | 'in_progress' | 'passed' | 'failed';
  final_test_passed_at?: string;
  qa_release_status: 'pending' | 'approved' | 'rejected' | 'blocked';
  qa_release_at?: string;
  qa_release_by?: string;
  release_block_reason?: string;
  shipment_status: 'pending' | 'ready' | 'shipped' | 'blocked';
  tenant_id: string;
  factory_id: string;
  created_at: string;
  updated_at: string;
};

// 老化试验
export type AgingTest = {
  id: number;
  test_code: string;
  tenant_id: string;
  factory_id: string;
  finished_product_sn: string;
  product_model_id: number;
  control_box_sn: string;
  teaching_pendant_sn: string;
  aging_station_id?: number;
  aging_program_version?: string;
  started_at?: string;
  planned_end_at?: string;
  ended_at?: string;
  required_duration_hours: number;
  actual_duration_hours?: number;
  status: 'planned' | 'running' | 'paused' | 'interrupted' | 'failed' | 'passed' | 'cancelled';
  interruption_count: number;
  last_interruption_reason_code?: string;
  last_interruption_reason?: string;
  last_interruption_at?: string;
  last_resume_at?: string;
  operator_id?: string;
  qa_reviewer_id?: string;
  result?: 'pass' | 'fail' | 'pending';
  temperature_avg?: number;
  humidity_avg?: number;
  remarks?: string;
  created_at: string;
  updated_at: string;
};

// 老化试验日志
export type AgingTestLog = {
  id: number;
  aging_test_id: number;
  log_time: string;
  log_type: 'start' | 'pause' | 'resume' | 'interrupt' | 'alarm' | 'checkpoint' | 'end';
  status_snapshot: string;
  alarm_code?: string;
  alarm_message?: string;
  temperature?: number;
  humidity?: number;
  elapsed_hours?: number;
  note?: string;
  created_by?: string;
  created_at: string;
};

// 质量异常
export type QualityException = {
  id: number;
  exception_code: string;
  exception_type: 'receiving_discrepancy' | 'iqc_failure' | 'assembly_defect' | 'aging_failure' | 'final_test_failure' | 'shipment_block' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  related_object_type: 'production_order' | 'finished_unit' | 'batch' | 'shipment';
  related_object_id: string;
  finished_product_sn?: string;
  product_model_id?: number;
  description: string;
  root_cause?: string;
  temporary_action?: string;
  corrective_action?: string;
  responsible_person_id?: string;
  due_date?: string;
  status: 'open' | 'investigating' | 'action_taken' | 'verified' | 'closed' | 'cancelled';
  closed_at?: string;
  closed_by?: string;
  tenant_id: string;
  factory_id: string;
  created_at: string;
  updated_at: string;
};

// Cobot设备
export type CobotDevice = {
  id: number;
  device_code: string;
  device_name: string;
  finished_product_sn?: string;
  product_model_id?: number;
  current_firmware_version?: string;
  production_line?: string;
  factory_id: string;
  is_active: boolean;
  last_online_at?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
};

// ASN发货单
export type ASNShipment = {
  id: number;
  shipment_no: string;
  tenant_id: string;
  factory_id: string;
  destination_factory_id: string;
  product_model_id?: number;
  shipment_date: string;
  eta_date?: string;
  carrier?: string;
  tracking_no?: string;
  status: 'draft' | 'shipped' | 'in_transit' | 'arrived' | 'received' | 'cancelled';
  total_boxes: number;
  total_pallets: number;
  remarks?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

// ASN发货明细
export type ASNShipmentItem = {
  id: number;
  shipment_id: number;
  line_no: number;
  part_no: string;
  part_name: string;
  part_category?: string;
  batch_no?: string;
  box_no?: string;
  pallet_no?: string;
  shipped_qty: number;
  unit: string;
  remarks?: string;
  created_at: string;
};

// 收货记录主表
// 收货记录主表
export type ReceivingRecord = {
  id: number;
  // 以下字段兼容不同命名规范
  receiving_code?: string;
  receiving_number?: string;
  shipment_id?: number;
  asn_id?: number;
  asn_number?: string;
  receiving_date?: string;
  receiver_id?: string;
  material_code?: string;
  material_name?: string;
  received_quantity?: number;
  iqc_status?: string;
  status: string;
  has_variance?: boolean;
  variance_resolved?: boolean;
  iqc_completed?: boolean;
  remarks?: string;
  tenant_id: string;
  factory_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

// 收货明细
export type ReceivingRecordItem = {
  id: number;
  receiving_id: number;
  shipment_item_id?: number;
  line_no: number;
  part_no: string;
  part_name: string;
  batch_no?: string;
  box_no?: string;
  expected_qty: number;
  received_qty: number;
  variance_qty: number;
  variance_type?: 'matched' | 'shortage' | 'overage' | 'wrong_item' | 'damaged';
  unit: string;
  on_hand_qty: number;
  available_qty: number;
  reserved_qty: number;
  consumed_qty: number;
  blocked_qty: number;
  remarks?: string;
  created_at: string;
};

// IQC检验
export type IQCInspection = {
  id: number;
  inspection_no: string;
  receiving_id?: number;
  receiving_item_id?: number;
  part_no: string;
  part_name: string;
  batch_no?: string;
  inspection_type: 'sampling' | 'full' | 'skip';
  sample_size?: number;
  inspected_qty?: number;
  result: 'OK' | 'HOLD' | 'NG';
  defect_code?: string;
  defect_description?: string;
  inspected_at: string;
  inspected_by?: string;
  remarks?: string;
  created_at: string;
};

// 来料处置
export type IncomingMaterialDisposition = {
  id: number;
  disposition_no: string;
  source_type: 'receiving_variance' | 'iqc_hold' | 'iqc_ng';
  source_id: number;
  receiving_id?: number;
  part_no: string;
  part_name: string;
  batch_no?: string;
  affected_qty: number;
  disposition_type: 'hold' | 'special_acceptance' | 'rework' | 'return' | 'scrap' | 'use_as_is';
  disposition_status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  approve_required: boolean;
  approved_by?: string;
  approved_at?: string;
  block_reason?: string;
  action_plan?: string;
  responsible_party?: string;
  due_date?: string;
  completed_at?: string;
  remarks?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

// P2: 异常中心类型定义
export type ExceptionSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ExceptionStatus = 'open' | 'in_progress' | 'pending_approval' | 'resolved' | 'closed' | 'rejected';
// 统一使用真实业务口径: receiving/iqc/disposition/assembly/aging/final_test/qa/shipment/logistics/production/other
export type ExceptionSourceModule = 'receiving' | 'iqc' | 'disposition' | 'assembly' | 'aging' | 'final_test' | 'qa' | 'shipment' | 'logistics' | 'production' | 'other';

export type OperationException = {
  id: number;
  exception_code: string;
  exception_type: string;
  severity: ExceptionSeverity;
  source_module: ExceptionSourceModule;
  source_record_id: number | null;
  related_sn: string | null;
  related_plan_id: number | null;
  related_shipment_id: number | null;
  related_receiving_id: number | null;
  related_iqc_id: number | null;
  related_disposition_id: number | null;
  related_aging_test_id: number | null;
  related_final_test_id: number | null;
  related_qa_release_id: number | null;
  related_shipment_confirmation_id: number | null;
  current_status: ExceptionStatus;
  owner_id: string | null;
  reported_by: string | null;
  reported_at: string;
  due_date: string | null;
  temporary_action: string | null;
  root_cause: string | null;
  corrective_action: string | null;
  resolution_summary: string | null;
  closed_by: string | null;
  closed_at: string | null;
  remarks: string | null;
  tenant_id: string;
  factory_id: string | null;
  created_at: string;
  updated_at: string;
};

// 供应商表
export type Supplier = {
  id: number;
  supplier_code: string;
  supplier_name: string;
  supplier_type?: 'raw_material' | 'component' | 'service';
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  status: 'active' | 'inactive' | 'blacklisted';
  tenant_id: 'CN' | 'JP' | 'BOTH';
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
};

// 特采申请表
export type SpecialApprovalRequest = {
  id: number;
  request_code: string;
  receiving_inspection_id?: number;
  material_code: string;
  material_name: string;
  batch_code: string;
  quantity: number;
  supplier_id?: number;
  defect_category: 'appearance_defect' | 'dimension_deviation' | 'process_deviation' | 'urgent_demand' | 'other';
  defect_description: string;
  applicant_department: string;
  applicant_id?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'cancelled';
  acceptance_conditions?: string;
  tenant_id: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  // 可选来源字段（由来料处置单或异常单关联时存在）
  source_type?: 'iqc' | 'receiving' | 'exception' | 'other';
  source_no?: string;
  source_id?: number;
};

// 特采审批流程表
export type SpecialApprovalWorkflow = {
  id: number;
  request_id: number;
  approval_stage: 'department_manager' | 'quality_dept' | 'engineering_dept' | 'procurement_dept' | 'executive';
  approver_id?: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  approval_comment?: string;
  approval_time?: string;
  created_at: string;
};

// 特采附件表
export type SpecialApprovalAttachment = {
  id: number;
  request_id: number;
  file_name: string;
  file_url: string;
  file_type?: 'photo' | 'video' | 'document';
  file_hash: string;
  description?: string;
  uploaded_by?: string;
  uploaded_at: string;
};

// 特采物料跟踪表
export type SpecialMaterialTracking = {
  id: number;
  request_id: number;
  material_code: string;
  batch_code: string;
  usage_process?: string;
  usage_quantity: number;
  usage_date: string;
  quality_feedback?: string;
  feedback_status: 'pending' | 'normal' | 'abnormal';
  tenant_id: string;
  created_by?: string;
  created_at: string;
};

// 供应商质量评级表
export type SupplierQualityRating = {
  id: number;
  supplier_id: number;
  rating_period_start: string;
  rating_period_end: string;
  incoming_pass_rate?: number;
  special_approval_rate?: number;
  major_complaint_count: number;
  capa_response_rate?: number;
  capa_effectiveness_rate?: number;
  total_score?: number;
  rating_level?: 'A' | 'B' | 'C' | 'D';
  rating_details?: Record<string, unknown>;
  tenant_id: 'CN' | 'JP';
  created_by?: string;
  created_at: string;
};

// 供应商质量问题表
export type SupplierQualityIssue = {
  id: number;
  issue_code: string;
  supplier_id: number;
  receiving_inspection_id?: number;
  material_code: string;
  batch_code: string;
  issue_type: 'incoming_defect' | 'customer_complaint' | 'production_feedback';
  issue_description: string;
  severity_level?: 'low' | 'medium' | 'high' | 'critical';
  reported_by?: string;
  reported_at: string;
  status: 'reported' | 'investigating' | 'action_required' | 'closed';
  tenant_id: 'CN' | 'JP';
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
};

// 供应商改善措施表
export type SupplierImprovementAction = {
  id: number;
  action_code: string;
  issue_id: number;
  supplier_id: number;
  action_type?: '8d_report' | 'corrective_action' | 'preventive_action';
  root_cause_analysis?: string;
  corrective_measures: string;
  preventive_measures?: string;
  responsible_person?: string;
  planned_completion_date: string;
  actual_completion_date?: string;
  verification_standard?: string;
  verification_result?: 'pending' | 'effective' | 'ineffective';
  status: 'pending' | 'in_progress' | 'pending_verification' | 'closed';
  tenant_id: 'CN' | 'JP';
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
};

// ─── 主链核心类型 ────────────────────────────────────────────

/** QA 放行状态 */
export type QAReleaseStatus = 'pending' | 'approved' | 'rejected' | 'blocked';

/** QA 放行记录（对应 qa_releases 表） */
export type QAReleaseRecord = {
  id: number;
  finished_product_sn: string;
  release_status: QAReleaseStatus;
  released_at: string | null;
  released_by: string | null;
  remarks: string | null;
  block_reason: string | null;
  tenant_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

/** 出货状态 */
export type ShipmentStatus = 'pending' | 'confirmed' | 'shipped' | 'blocked';

/** 出货记录（对应 shipments 表） */
export type ShipmentRecord = {
  id: number;
  shipment_code: string;
  finished_product_sn: string;
  shipment_status: ShipmentStatus;
  shipped_at: string | null;
  shipped_by: string | null;
  remarks: string | null;
  block_reason: string | null;
  tenant_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

/** 异常审计日志动作 */
export type ExceptionAuditAction =
  | 'created' | 'assigned' | 'resolved' | 'closed'
  | 'reopened' | 'escalated' | 'updated';

/** 异常审计日志（对应 exception_audit_logs 表） */
export type ExceptionAuditLog = {
  id: number;
  exception_type: 'operation' | 'quality';
  exception_id: number;
  action: ExceptionAuditAction;
  old_status: string | null;
  new_status: string | null;
  old_severity: string | null;
  new_severity: string | null;
  comment: string | null;
  operator_id: string | null;
  tenant_id: string;
  created_at: string;
};

/** profiles 表摘要（用于用户选择器 / 操作人展示） */
export type ProfileSummary = {
  id: string;
  full_name: string | null;
  username: string;
  email: string | null;
  role?: UserRole;
};

// ─── 物流事件 ────────────────────────────────────────────────────────────────
export type LogisticsEvent = {
  id: number;
  shipping_order_id: number;
  event_type: string;
  event_time: string;
  location: string | null;
  description: string | null;
  operator_id: string | null;
  tenant_id: string;
  created_at: string;
};

// ─── 物流超时/异常订单（RPC 返回结构）───────────────────────────────────────
export type LogisticsTimeoutOrder = {
  id?: number;
  shipping_order_id: number;
  shipping_code: string;
  order_code?: string;
  carrier: string | null;
  timeout_hours: number;
  days_overdue?: number;
  current_status: string;
  consignee_name?: string | null;
};

export type LogisticsExceptionOrder = {
  id?: number;
  shipping_order_id: number;
  shipping_code: string;
  order_code?: string;
  carrier: string | null;
  exception_type: string;
  exception_description: string;
  created_at?: string;
};

// ─── 物流看板统计（RPC 返回结构）────────────────────────────────────────────
export type LogisticsStatusDistributionItem = {
  status: string;
  count: number;
};

export type LogisticsDashboardStats = {
  total_orders: number;
  in_transit_count: number;
  arrived_count: number;
  exception_count: number;
  timeout_count?: number;
  avg_transit_days: number | null;
  avg_transport_hours?: number | null;
  avg_customs_hours?: number | null;
  on_time_rate: number | null;
  status_distribution: LogisticsStatusDistributionItem[];
};

// ─── 承运商绩效统计（RPC 返回结构）──────────────────────────────────────────
export type CarrierPerformanceStat = {
  carrier: string;
  total_orders: number;
  on_time_rate: number;
  avg_transit_days: number;
  exception_rate: number;
};

// ─── 发货明细项（createShippingOrder RPC 入参）──────────────────────────────
export type ShippingOrderItem = {
  part_no: string;
  part_name: string;
  quantity: number;
  unit: string;
  box_count?: number;
  weight?: number;
  remarks?: string;
};

// ─── 最终测试记录 ────────────────────────────────────────────────────────────
export type FinalTestRecord = {
  id: number;
  finished_product_sn: string;
  test_status: 'pending' | 'planned' | 'in_progress' | 'passed' | 'failed' | 'skipped';
  tested_at: string | null;
  tester_id: string | null;
  defect_description: string | null;
  notes: string | null;
  tenant_id: string;
  created_at: string;
  updated_at: string;
};

// ─── 运营看板统计（RPC 返回结构）────────────────────────────────────────────
export type OperationsDashboardStats = {
  production?: {
    active_plans?: number;
    pending_approval?: number;
    on_time_rate?: number;
    output_count?: number;
    completion_rate?: number;
    this_week_plans?: number;
  };
  incoming?: {
    pending_receiving?: number;
    pending_inspection?: number;
    pending_special_approval?: number;
    iqc_pass_rate?: number;
    total_asn?: number;
    hold_materials?: number;
    available_materials?: number;
  };
  assembly?: {
    pending_assembly?: number;
    pending_test?: number;
    pending_qa?: number;
    pending_shipment?: number;
    aging_exception?: number;
    pass_rate?: number;
    in_assembly?: number;
    in_aging?: number;
  };
  exception?: {
    high_critical_exceptions?: number;
    overdue_exceptions?: number;
    open_exceptions?: number;
    resolve_rate?: number;
  };
  logistics?: {
    exception_orders?: number;
    timeout_orders?: number;
    in_transit?: number;
    in_transit_orders?: number;
    on_time_rate?: number;
  };
  inventory?: {
    available?: number;
    reserved?: number;
    consumed?: number;
    blocked?: number;
  };
};

// ─── 老化测试（含关联型号）──────────────────────────────────────────────────
export type AgingTestWithModel = AgingTest & {
  product_models: ProductModel | null;
};

// ─── 整机溯源（含关联型号）──────────────────────────────────────────────────
export type FinishedUnitWithModel = FinishedUnitTraceability & {
  product_models: ProductModel | null;
};
