/**
 * 委托单状态流转规则统一定义
 * 
 * 本文件定义了委托单主链路的状态机规则，
 * 所有相关页面必须遵循此规则，禁止越级流转。
 */

import type { CommissionStatus } from '@/types';

/**
 * 委托单状态流转图
 * 
 * pending_acceptance → accepted → in_production → shipped → completed
 *                   ↓
 *                rejected
 * 
 * 任何状态都可以 → exception
 * exception → (原状态)
 */

/**
 * 动作元数据
 */
export interface ActionMetadata {
  key: string;
  labelKey: string; // i18n key
  allowedStates: CommissionStatus[];
  targetStatus: CommissionStatus | null;
  icon?: string;
  order: number; // 显示顺序
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link'; // 按钮变体
  successMessageKey: string; // 成功消息 i18n key
  errorMessageKey: string; // 失败消息 i18n key
}

/**
 * 所有动作的元数据
 */
export const ACTION_METADATA: Record<string, ActionMetadata> = {
  accept: {
    key: 'accept',
    labelKey: 'commission.actions.accept',
    allowedStates: ['pending_acceptance'],
    targetStatus: 'accepted',
    order: 1,
    variant: 'default',
    successMessageKey: 'commission.messages.acceptSuccess',
    errorMessageKey: 'commission.messages.acceptError',
  },
  reject: {
    key: 'reject',
    labelKey: 'commission.actions.reject',
    allowedStates: ['pending_acceptance'],
    targetStatus: 'rejected',
    order: 2,
    variant: 'destructive',
    successMessageKey: 'commission.messages.rejectSuccess',
    errorMessageKey: 'commission.messages.rejectError',
  },
  register_plan: {
    key: 'register_plan',
    labelKey: 'commission.actions.registerPlan',
    allowedStates: ['accepted'],
    targetStatus: 'in_production',
    order: 3,
    variant: 'default',
    successMessageKey: 'commission.messages.registerPlanSuccess',
    errorMessageKey: 'commission.messages.registerPlanError',
  },
  update_progress: {
    key: 'update_progress',
    labelKey: 'commission.actions.updateProgress',
    allowedStates: ['in_production'],
    targetStatus: null,
    order: 4,
    variant: 'outline',
    successMessageKey: 'commission.messages.updateProgressSuccess',
    errorMessageKey: 'commission.messages.updateProgressError',
  },
  register_shipment: {
    key: 'register_shipment',
    labelKey: 'commission.actions.registerShipment',
    allowedStates: ['in_production'],
    targetStatus: 'shipped',
    order: 5,
    variant: 'default',
    successMessageKey: 'commission.messages.registerShipmentSuccess',
    errorMessageKey: 'commission.messages.registerShipmentError',
  },
  confirm_arrival: {
    key: 'confirm_arrival',
    labelKey: 'commission.actions.confirmArrival',
    allowedStates: ['shipped'],
    targetStatus: 'completed',
    order: 6,
    variant: 'default',
    successMessageKey: 'commission.messages.confirmArrivalSuccess',
    errorMessageKey: 'commission.messages.confirmArrivalError',
  },
  report_exception: {
    key: 'report_exception',
    labelKey: 'commission.actions.reportException',
    allowedStates: ['pending_acceptance', 'accepted', 'in_production', 'shipped'],
    targetStatus: 'exception',
    order: 7,
    variant: 'destructive',
    successMessageKey: 'commission.messages.reportExceptionSuccess',
    errorMessageKey: 'commission.messages.reportExceptionError',
  },
  close_exception: {
    key: 'close_exception',
    labelKey: 'commission.actions.closeException',
    allowedStates: ['exception'],
    targetStatus: null, // 恢复到异常前的状态
    order: 8,
    variant: 'default',
    successMessageKey: 'commission.messages.closeExceptionSuccess',
    errorMessageKey: 'commission.messages.closeExceptionError',
  },
};

/**
 * 允许的状态流转映射
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<CommissionStatus, CommissionStatus[]> = {
  pending_acceptance: ['accepted', 'rejected', 'exception'],
  accepted: ['in_production', 'exception'],
  rejected: [], // 终态，不能再流转
  in_production: ['shipped', 'exception'],
  shipped: ['completed', 'exception'],
  completed: [], // 终态，不能再流转
  exception: ['pending_acceptance', 'accepted', 'in_production', 'shipped'], // 可以恢复到任何非终态
};

/**
 * 操作类型与状态流转的映射
 */
export const OPERATION_TO_STATUS: Record<string, CommissionStatus | null> = {
  accept: 'accepted',
  reject: 'rejected',
  register_plan: 'in_production',
  update_progress: null, // 不改变状态
  register_shipment: 'shipped',
  confirm_arrival: 'completed',
  report_exception: 'exception',
  close_exception: null, // 恢复到异常前的状态，需要从 operation_data 中读取
};

/**
 * 每个操作允许的前置状态
 */
export const OPERATION_ALLOWED_STATES: Record<string, CommissionStatus[]> = {
  accept: ['pending_acceptance'],
  reject: ['pending_acceptance'],
  register_plan: ['accepted'],
  update_progress: ['in_production'],
  register_shipment: ['in_production'],
  confirm_arrival: ['shipped'],
  report_exception: ['pending_acceptance', 'accepted', 'in_production', 'shipped'],
  close_exception: ['exception'],
};

/**
 * 检查操作是否允许
 * 
 * @param currentStatus 当前状态
 * @param operationType 操作类型
 * @returns 是否允许
 */
export function isOperationAllowed(
  currentStatus: CommissionStatus,
  operationType: string
): boolean {
  const allowedStates = OPERATION_ALLOWED_STATES[operationType];
  if (!allowedStates) {
    return false;
  }
  return allowedStates.includes(currentStatus);
}

/**
 * 获取操作不允许的原因（i18n key）
 * 
 * @param currentStatus 当前状态
 * @param operationType 操作类型
 * @returns 不允许的原因 i18n key，如果允许则返回 null
 */
export function getOperationNotAllowedReason(
  currentStatus: CommissionStatus,
  operationType: string
): string | null {
  if (isOperationAllowed(currentStatus, operationType)) {
    return null;
  }

  const reasonKeys: Record<string, Record<CommissionStatus, string>> = {
    accept: {
      accepted: 'commission.disabledReasons.alreadyAccepted',
      rejected: 'commission.disabledReasons.alreadyRejected',
      in_production: 'commission.disabledReasons.alreadyInProduction',
      shipped: 'commission.disabledReasons.alreadyShipped',
      completed: 'commission.disabledReasons.alreadyCompleted',
      exception: 'commission.disabledReasons.inException',
      pending_acceptance: '',
    },
    reject: {
      accepted: 'commission.disabledReasons.cannotRejectAccepted',
      rejected: 'commission.disabledReasons.alreadyRejected',
      in_production: 'commission.disabledReasons.cannotRejectInProduction',
      shipped: 'commission.disabledReasons.cannotRejectShipped',
      completed: 'commission.disabledReasons.cannotRejectCompleted',
      exception: 'commission.disabledReasons.inException',
      pending_acceptance: '',
    },
    register_plan: {
      pending_acceptance: 'commission.disabledReasons.needAcceptFirst',
      rejected: 'commission.disabledReasons.cannotPlanRejected',
      in_production: 'commission.disabledReasons.alreadyPlanned',
      shipped: 'commission.disabledReasons.alreadyShipped',
      completed: 'commission.disabledReasons.alreadyCompleted',
      exception: 'commission.disabledReasons.inException',
      accepted: '',
    },
    update_progress: {
      pending_acceptance: 'commission.disabledReasons.needAcceptAndPlan',
      accepted: 'commission.disabledReasons.needPlanFirst',
      rejected: 'commission.disabledReasons.alreadyRejected',
      shipped: 'commission.disabledReasons.alreadyShipped',
      completed: 'commission.disabledReasons.alreadyCompleted',
      exception: 'commission.disabledReasons.inException',
      in_production: '',
    },
    register_shipment: {
      pending_acceptance: 'commission.disabledReasons.needAcceptAndPlan',
      accepted: 'commission.disabledReasons.needPlanFirst',
      rejected: 'commission.disabledReasons.alreadyRejected',
      shipped: 'commission.disabledReasons.alreadyShipped',
      completed: 'commission.disabledReasons.alreadyCompleted',
      exception: 'commission.disabledReasons.inException',
      in_production: '',
    },
    confirm_arrival: {
      pending_acceptance: 'commission.disabledReasons.needShipFirst',
      accepted: 'commission.disabledReasons.needShipFirst',
      rejected: 'commission.disabledReasons.alreadyRejected',
      in_production: 'commission.disabledReasons.needShipFirst',
      completed: 'commission.disabledReasons.alreadyCompleted',
      exception: 'commission.disabledReasons.inException',
      shipped: '',
    },
    report_exception: {
      rejected: 'commission.disabledReasons.alreadyRejected',
      completed: 'commission.disabledReasons.alreadyCompleted',
      exception: 'commission.disabledReasons.alreadyInException',
      pending_acceptance: '',
      accepted: '',
      in_production: '',
      shipped: '',
    },
    close_exception: {
      pending_acceptance: 'commission.disabledReasons.notInException',
      accepted: 'commission.disabledReasons.notInException',
      rejected: 'commission.disabledReasons.notInException',
      in_production: 'commission.disabledReasons.notInException',
      shipped: 'commission.disabledReasons.notInException',
      completed: 'commission.disabledReasons.notInException',
      exception: '',
    },
  };

  return reasonKeys[operationType]?.[currentStatus] || 'commission.disabledReasons.invalidOperation';
}

/**
 * 获取操作后的目标状态
 * 
 * @param operationType 操作类型
 * @param operationData 操作数据（用于 close_exception）
 * @returns 目标状态，如果不改变状态则返回 null
 */
export function getTargetStatus(
  operationType: string,
  operationData?: Record<string, unknown>
): CommissionStatus | null {
  if (operationType === 'close_exception' && operationData?.previous_status) {
    return operationData.previous_status as CommissionStatus;
  }
  return OPERATION_TO_STATUS[operationType] || null;
}
