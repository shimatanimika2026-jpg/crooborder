/**
 * 异常管理服务
 * 提供异常关闭、解决和升级功能
 */

import { supabase } from '@/db/supabase';
import type { ExceptionAuditLog } from '@/types/database';

/**
 * 关闭运营异常
 * @param exceptionId 异常ID
 * @param userId 用户ID
 * @param closeReason 关闭原因
 * @param tenantId 租户ID
 * @returns 是否成功
 */
export async function closeOperationException(
  exceptionId: number,
  userId: string,
  closeReason: string,
  tenantId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('close_operation_exception', {
    p_exception_id: exceptionId,
    p_user_id: userId,
    p_close_reason: closeReason,
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error('service.exception.errorCloseOps', error);
    throw new Error('service.exception.errorCloseOps');
  }

  return data as boolean;
}

/**
 * 解决运营异常
 * @param exceptionId 异常ID
 * @param userId 用户ID
 * @param solution 解决方案
 * @param tenantId 租户ID
 * @returns 是否成功
 */
export async function resolveOperationException(
  exceptionId: number,
  userId: string,
  solution: string,
  tenantId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('resolve_operation_exception', {
    p_exception_id: exceptionId,
    p_user_id: userId,
    p_solution: solution,
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error('service.exception.errorResolveOps', error);
    throw new Error('service.exception.errorResolveOps');
  }

  return data as boolean;
}

/**
 * 升级运营异常严重程度
 * @param exceptionId 异常ID
 * @param userId 用户ID
 * @param newSeverity 新严重程度
 * @param escalationReason 升级原因
 * @param tenantId 租户ID
 * @returns 是否成功
 */
export async function escalateOperationException(
  exceptionId: number,
  userId: string,
  newSeverity: 'low' | 'medium' | 'high' | 'critical',
  escalationReason: string,
  tenantId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('escalate_operation_exception', {
    p_exception_id: exceptionId,
    p_user_id: userId,
    p_new_severity: newSeverity,
    p_escalation_reason: escalationReason,
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error('service.exception.errorEscalateOps', error);
    throw new Error('service.exception.errorEscalateOps');
  }

  return data as boolean;
}

/**
 * 关闭质量异常
 * @param exceptionId 异常ID
 * @param userId 用户ID
 * @param closeReason 关闭原因
 * @param tenantId 租户ID
 * @returns 是否成功
 */
export async function closeQualityException(
  exceptionId: number,
  userId: string,
  closeReason: string,
  tenantId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('close_quality_exception', {
    p_exception_id: exceptionId,
    p_user_id: userId,
    p_close_reason: closeReason,
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error('service.exception.errorCloseQuality', error);
    throw new Error('service.exception.errorCloseQuality');
  }

  return data as boolean;
}

/**
 * 解决质量异常
 * @param exceptionId 异常ID
 * @param userId 用户ID
 * @param correctiveAction 纠正措施
 * @param tenantId 租户ID
 * @returns 是否成功
 */
export async function resolveQualityException(
  exceptionId: number,
  userId: string,
  correctiveAction: string,
  tenantId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('resolve_quality_exception', {
    p_exception_id: exceptionId,
    p_user_id: userId,
    p_corrective_action: correctiveAction,
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error('service.exception.errorResolveQuality', error);
    throw new Error('service.exception.errorResolveQuality');
  }

  return data as boolean;
}

/**
 * 升级质量异常严重程度
 * @param exceptionId 异常ID
 * @param userId 用户ID
 * @param newSeverity 新严重程度
 * @param escalationReason 升级原因
 * @param tenantId 租户ID
 * @returns 是否成功
 */
export async function escalateQualityException(
  exceptionId: number,
  userId: string,
  newSeverity: 'low' | 'medium' | 'high' | 'critical',
  escalationReason: string,
  tenantId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('escalate_quality_exception', {
    p_exception_id: exceptionId,
    p_user_id: userId,
    p_new_severity: newSeverity,
    p_escalation_reason: escalationReason,
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error('service.exception.errorEscalateQuality', error);
    throw new Error('service.exception.errorEscalateQuality');
  }

  return data as boolean;
}

/**
 * 获取异常审计日志
 * @param exceptionType 异常类型
 * @param exceptionId 异常ID
 * @param tenantId 租户ID
 * @returns 审计日志列表
 */
export async function getExceptionAuditLogs(
  exceptionType: 'operation' | 'quality',
  exceptionId: number,
  tenantId: string
): Promise<ExceptionAuditLog[]> {
  const { data, error } = await supabase
    .from('exception_audit_logs')
    .select('*')
    .eq('exception_type', exceptionType)
    .eq('exception_id', exceptionId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('service.exception.errorAuditLog', error);
    throw new Error('service.exception.errorAuditLog');
  }

  return data || [];
}

/**
 * 检查是否存在未关闭的阻断异常
 * 
 * @param sourceModule 来源模块
 * @param sourceId 来源对象 ID
 * @param exceptionTypes 异常类型数组（如 ['final_test_blocked', 'qa_blocked']）
 * @returns 如果存在未关闭异常，返回异常 ID；否则返回 null
 */
export async function checkExistingBlockedException(
  sourceModule: string,
  sourceId: number,
  exceptionTypes: string[]
): Promise<number | null> {
  const { data, error } = await supabase
    .from('operation_exceptions')
    .select('id')
    .eq('source_module', sourceModule)
    .eq('source_id', sourceId)
    .in('exception_type', exceptionTypes)
    .in('status', ['open', 'in_progress', 'pending_approval'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('service.exception.errorCheckBlocking', error);
    throw new Error('service.exception.errorCheckBlocking');
  }

  return data?.id || null;
}
