/**
 * IQC 检验服务
 * 
 * 封装 IQC 检验相关的业务逻辑和数据库操作
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReceivingRecord, ReceivingRecordItem, IQCInspection } from '@/types/database';
import { getErrorMessage } from '@/lib/error-utils';

/**
 * IQC 预校验结果
 */
export interface IQCPreValidationResult {
  canInspect: boolean;
  blockReason?: string;
  receivingRecord?: ReceivingRecord;
  receivingItem?: ReceivingRecordItem;
  existingInspection?: IQCInspection;
}

/**
 * 提交 IQC 检验的参数
 */
export interface SubmitIQCInspectionParams {
  receiving_id: number;
  receiving_item_id: number;
  inspection_type: 'sampling' | 'full' | 'skip';
  sample_size: number;
  inspected_qty: number;
  result: 'OK' | 'HOLD' | 'NG';
  defect_code?: string;
  defect_description?: string;
  remarks?: string;
  inspector_id?: string;
}

/**
 * 提交 IQC 检验的返回结果
 */
export interface SubmitIQCInspectionResult {
  success: boolean;
  inspection_id?: number;
  inspection_no?: string;
  result?: string;
  all_items_inspected?: boolean;
  error?: string;
  message?: string;
}

/**
 * IQC 预校验
 * 
 * 统一处理 IQC 检验前的业务校验：
 * - 收货记录是否存在
 * - 收货记录是否已取消
 * - 收货明细是否存在
 * - 是否已存在有效 IQC 记录
 * 
 * @param supabase Supabase 客户端
 * @param receivingId 收货记录 ID
 * @param receivingItemId 收货明细 ID
 * @returns 预校验结果
 */
export async function validateIQCInspection(
  supabase: SupabaseClient,
  receivingId: number,
  receivingItemId: number
): Promise<IQCPreValidationResult> {
  try {
    // 1. 检查收货记录是否存在
    const { data: receivingRecord, error: receivingError } = await supabase
      .from('receiving_records')
      .select('*')
      .eq('id', receivingId)
      .maybeSingle();

    if (receivingError) {
      console.error('查询收货记录失败:', receivingError);
      return {
        canInspect: false,
        blockReason: 'iqc.errorQueryReceiving',
      };
    }

    if (!receivingRecord) {
      return {
        canInspect: false,
        blockReason: 'iqc.errorReceivingNotFound',
      };
    }

    // 2. 检查收货记录是否已取消
    if (receivingRecord.status === 'cancelled') {
      return {
        canInspect: false,
        blockReason: 'iqc.errorReceivingCancelled',
        receivingRecord,
      };
    }

    // 3. 检查收货明细是否存在
    const { data: receivingItem, error: itemError } = await supabase
      .from('receiving_record_items')
      .select('*')
      .eq('id', receivingItemId)
      .eq('receiving_id', receivingId)
      .maybeSingle();

    if (itemError) {
      console.error('查询收货明细失败:', itemError);
      return {
        canInspect: false,
        blockReason: 'iqc.errorQueryReceivingItem',
        receivingRecord,
      };
    }

    if (!receivingItem) {
      return {
        canInspect: false,
        blockReason: 'iqc.errorReceivingItemNotFound',
        receivingRecord,
      };
    }

    // 4. 检查是否已存在有效 IQC 记录
    const { data: existingInspection, error: inspectionError } = await supabase
      .from('iqc_inspections')
      .select('*')
      .eq('receiving_item_id', receivingItemId)
      .neq('status', 'cancelled')
      .maybeSingle();

    if (inspectionError) {
      console.error('查询 IQC 记录失败:', inspectionError);
      return {
        canInspect: false,
        blockReason: 'iqc.errorQueryInspection',
        receivingRecord,
        receivingItem,
      };
    }

    if (existingInspection) {
      return {
        canInspect: false,
        blockReason: 'iqc.errorDuplicateInspection',
        receivingRecord,
        receivingItem,
        existingInspection,
      };
    }

    // 5. 所有校验通过
    return {
      canInspect: true,
      receivingRecord,
      receivingItem,
    };
  } catch (error: unknown) {
    console.error('IQC 预校验失败:', error);
    return {
      canInspect: false,
      blockReason: 'iqc.errorValidation',
    };
  }
}

/**
 * 提交 IQC 检验
 * 
 * @param supabase Supabase 客户端
 * @param params 提交参数
 * @returns 提交结果
 */
export async function submitIQCInspection(
  supabase: SupabaseClient,
  params: SubmitIQCInspectionParams
): Promise<SubmitIQCInspectionResult> {
  try {
    const { data, error } = await supabase.rpc('submit_iqc_inspection', {
      p_receiving_id: params.receiving_id,
      p_receiving_item_id: params.receiving_item_id,
      p_inspection_type: params.inspection_type,
      p_sample_size: params.sample_size,
      p_inspected_qty: params.inspected_qty,
      p_result: params.result,
      p_defect_code: params.defect_code || null,
      p_defect_description: params.defect_description || null,
      p_remarks: params.remarks || null,
      p_inspector_id: params.inspector_id || null,
    });

    if (error) {
      console.error('调用 submit_iqc_inspection RPC 失败:', error);
      return {
        success: false,
        error: 'RPC_ERROR',
        message: error.message,
      };
    }

    return data as SubmitIQCInspectionResult;
  } catch (error: unknown) {
    console.error('提交 IQC 检验失败:', error);
    return {
      success: false,
      error: 'UNKNOWN_ERROR',
      message: getErrorMessage(error, '提交 IQC 检验失败'),
    };
  }
}
