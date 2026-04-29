export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  withCount?: boolean;
}

// 委托管理相关类型
export type CommissionStatus = 
  | 'pending_acceptance'  // 待受理
  | 'accepted'            // 已受理
  | 'rejected'            // 已拒绝
  | 'in_production'       // 生产中
  | 'shipped'             // 已出货
  | 'completed'           // 已完成
  | 'exception';          // 异常中

export type CommissionOperationType =
  | 'create'              // 创建
  | 'accept'              // 受理
  | 'reject'              // 拒绝
  | 'register_plan'       // 登记生产计划
  | 'update_progress'     // 更新进度
  | 'register_shipment'   // 出货登记
  | 'confirm_arrival'     // 到货确认
  | 'report_exception'    // 反馈异常
  | 'close_exception';    // 关闭异常

export type CommissionCountry = 'china' | 'japan';
export type CommissionResponsibleParty = 'china' | 'japan' | 'both';
export type CommissionViewType = 'china' | 'japan';

export interface Commission {
  id: number;
  commission_no: string;
  customer_name: string;
  project_name?: string;
  product_name: string;
  quantity: number;
  target_delivery_date: string;
  assembly_factory: string;
  status: CommissionStatus;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // 新增字段
  country: CommissionCountry;
  responsible_party: CommissionResponsibleParty;
  pending_arrival_confirmation: boolean;
  arrival_confirmation_completed_at?: string;
  // 中方占位字段
  cost_info?: string;
  internal_notes?: string;
  confidential_customer_details?: string;
  supplier_evaluation?: string;
}

export interface CommissionOperation {
  id: number;
  commission_id: number;
  operation_type: CommissionOperationType;
  operation_data?: Record<string, unknown>;
  operator_id?: string;
  operated_at: string;
  previous_status?: CommissionStatus;
  new_status?: CommissionStatus;
}

export interface CommissionProductionPlan {
  id: number;
  commission_id: number;
  planned_start_date: string;
  planned_end_date: string;
  responsible_person: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface CommissionProgressUpdate {
  id: number;
  commission_id: number;
  progress_percentage: number;
  description?: string;
  updated_by?: string;
  updated_at: string;
}

export interface CommissionShipment {
  id: number;
  commission_id: number;
  shipment_date: string;
  tracking_no?: string;
  carrier?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface CommissionArrival {
  id: number;
  commission_id: number;
  arrival_date: string;
  receiver: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface CommissionException {
  id: number;
  commission_id: number;
  exception_type: string;
  description: string;
  responsible_party?: string;
  status: 'open' | 'closed';
  created_by?: string;
  created_at: string;
  closed_at?: string;
  closed_by?: string;
}
