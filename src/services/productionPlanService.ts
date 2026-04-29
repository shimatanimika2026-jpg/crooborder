import { supabase } from '@/db/supabase';

/**
 * 提交生产计划审批
 */
export async function submitPlanForApproval(
  planId: number,
  tenantId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase.rpc('submit_plan_for_approval', {
    p_plan_id: planId,
    p_tenant_id: tenantId,
    p_user_id: userId
  });

  if (error) throw error;
}

/**
 * 审批通过生产计划
 */
export async function approvePlan(
  planId: number,
  tenantId: string,
  approverId: string,
  comments?: string
): Promise<void> {
  const { error } = await supabase.rpc('approve_production_plan', {
    p_plan_id: planId,
    p_tenant_id: tenantId,
    p_approver_id: approverId,
    p_comments: comments || null
  });

  if (error) {
    // 处理权限错误
    if (error.message.includes('权限不足')) {
      throw new Error('权限不足：只有工厂经理可以审批生产计划');
    }
    throw error;
  }
}

/**
 * 审批拒绝生产计划
 */
export async function rejectPlan(
  planId: number,
  tenantId: string,
  rejectorId: string,
  rejectionReason: string
): Promise<void> {
  const { error } = await supabase.rpc('reject_production_plan', {
    p_plan_id: planId,
    p_tenant_id: tenantId,
    p_rejector_id: rejectorId,
    p_rejection_reason: rejectionReason
  });

  if (error) {
    // 处理权限错误
    if (error.message.includes('权限不足')) {
      throw new Error('权限不足：只有工厂经理可以审批生产计划');
    }
    throw error;
  }
}

/**
 * 生效生产计划
 */
export async function activatePlan(
  planId: number,
  tenantId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase.rpc('activate_production_plan', {
    p_plan_id: planId,
    p_tenant_id: tenantId,
    p_user_id: userId
  });

  if (error) {
    // 处理权限错误
    if (error.message.includes('权限不足')) {
      throw new Error('权限不足：只有高管可以生效生产计划');
    }
    throw error;
  }
}

/**
 * 关闭生产计划
 */
export async function closePlan(
  planId: number,
  tenantId: string,
  userId: string,
  closeReason?: string
): Promise<void> {
  const { error } = await supabase.rpc('close_production_plan', {
    p_plan_id: planId,
    p_tenant_id: tenantId,
    p_user_id: userId,
    p_close_reason: closeReason || null
  });

  if (error) {
    // 处理权限错误
    if (error.message.includes('权限不足')) {
      throw new Error('权限不足：只有高管可以关闭生产计划');
    }
    throw error;
  }
}

/**
 * 获取计划执行进度
 */
export async function getPlanExecutionProgress(
  planId: number
): Promise<{
  linked_order_count: number;
  completed_quantity: number;
  completion_rate: number;
}> {
  const { data, error } = await supabase.rpc('get_plan_execution_progress', {
    p_plan_id: planId
  });

  if (error) throw error;
  
  return data[0] || { linked_order_count: 0, completed_quantity: 0, completion_rate: 0 };
}

/**
 * 获取计划版本历史
 */
export async function getPlanVersions(planId: number) {
  const { data, error } = await supabase
    .from('production_plan_versions')
    .select('*')
    .eq('plan_id', planId)
    .order('version_number', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * 获取计划审批记录
 */
export async function getPlanApprovals(planId: number) {
  const { data, error } = await supabase
    .from('production_plan_approvals')
    .select('*')
    .eq('plan_id', planId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
