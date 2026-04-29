/**
 * 委托单动作服务
 * 
 * 封装委托单动作相关的业务逻辑和数据库操作
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CommissionStatus } from '@/types';
import { getErrorMessage } from '@/lib/error-utils';

/**
 * 执行委托单动作的参数
 */
export interface ExecuteCommissionActionParams {
  commission_id: number;
  action_type: 'accept' | 'reject' | 'register_plan' | 'update_progress' | 'register_shipment' | 'confirm_arrival' | 'report_exception' | 'close_exception';
  operator_id: string;
  action_data?: Record<string, unknown>;
}

/**
 * 执行委托单动作的返回结果
 */
export interface ExecuteCommissionActionResult {
  success: boolean;
  operation_id?: number;
  previous_status?: CommissionStatus;
  new_status?: CommissionStatus;
  error?: string;
  message?: string;
  current_status?: CommissionStatus;
}

/**
 * 执行委托单动作
 * 
 * @param supabase Supabase 客户端
 * @param params 动作参数
 * @returns 执行结果
 */
export async function executeCommissionAction(
  supabase: SupabaseClient,
  params: ExecuteCommissionActionParams
): Promise<ExecuteCommissionActionResult> {
  try {
    const { data, error } = await supabase.rpc('execute_commission_action', {
      p_commission_id: params.commission_id,
      p_action_type: params.action_type,
      p_operator_id: params.operator_id,
      p_action_data: params.action_data || {},
    });

    if (error) {
      console.error('调用 execute_commission_action RPC 失败:', error);
      return {
        success: false,
        error: 'RPC_ERROR',
        message: error.message,
      };
    }

    return data as ExecuteCommissionActionResult;
  } catch (error: unknown) {
    console.error('执行委托单动作失败:', error);
    return {
      success: false,
      error: 'UNKNOWN_ERROR',
      message: getErrorMessage(error, '执行委托单动作失败'),
    };
  }
}
