import { supabase } from '@/db/supabase';

export type CriticalAction = 'approve_special' | 'qa_release' | 'shipment' | 'inventory_write';

interface ValidationRequest {
  action: CriticalAction;
  data: Record<string, unknown>;
}

interface ValidationResponse {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * 验证关键动作是否允许执行
 * @param action 动作类型
 * @param data 动作数据
 * @returns 验证结果
 */
export async function validateCriticalAction(
  action: CriticalAction,
  data: Record<string, unknown>
): Promise<ValidationResponse> {
  // 演示模式下无 Supabase 客户端，跳过验证直接放行
  if (!supabase) {
    return { success: true };
  }

  try {
    const { data: result, error } = await supabase.functions.invoke(
      'validate-critical-action',
      {
        body: { action, data } as ValidationRequest,
      }
    );

    if (error) {
      const errorMsg = await error?.context?.text();
      console.error('关键动作验证失败:', errorMsg || error?.message);
      return {
        success: false,
        error: errorMsg || error?.message || '验证失败',
      };
    }

    return result || { success: false, error: '未知错误' };
  } catch (error) {
    console.error('调用验证函数失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '验证失败',
    };
  }
}

/**
 * 验证特采审批
 */
export async function validateSpecialApproval(inspectionId: number) {
  return validateCriticalAction('approve_special', { inspection_id: inspectionId });
}

/**
 * 验证QA放行
 */
export async function validateQARelease(finishedProductSn: string) {
  return validateCriticalAction('qa_release', { finished_product_sn: finishedProductSn });
}

/**
 * 验证出货
 */
export async function validateShipment(finishedProductSn: string) {
  return validateCriticalAction('shipment', { finished_product_sn: finishedProductSn });
}

/**
 * 验证库存写操作
 */
export async function validateInventoryWrite(
  operationType: 'consume' | 'reserve' | 'release',
  partNo: string,
  quantity: number
) {
  return validateCriticalAction('inventory_write', {
    operation_type: operationType,
    part_no: partNo,
    quantity,
  });
}
