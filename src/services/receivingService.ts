/**
 * 收货服务
 * 
 * 封装收货相关的业务逻辑和数据库操作
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getErrorMessage } from '@/lib/error-utils';

/**
 * 收货明细项
 */
export interface ReceivingItemInput {
  shipment_item_id: number;
  received_qty: number;
  batch_no?: string;
  box_no?: string;
  remarks?: string;
}

/**
 * 创建收货记录的参数
 */
export interface CreateReceivingParams {
  shipment_id: number;
  receiving_no: string;
  receiving_date: string;
  receiver_id: string;
  notes?: string;
  items: ReceivingItemInput[];
}

/**
 * 创建收货记录的返回结果
 */
export interface CreateReceivingResult {
  success: boolean;
  receiving_id?: number;
  has_variance?: boolean;
  error?: string;
  message?: string;
  current_status?: string;
}

/**
 * 从 ASN 创建收货记录
 * 
 * @param supabase Supabase 客户端
 * @param params 创建参数
 * @returns 创建结果
 */
export async function createReceivingFromASN(
  supabase: SupabaseClient,
  params: CreateReceivingParams
): Promise<CreateReceivingResult> {
  try {
    const { data, error } = await supabase.rpc('create_receiving_from_asn', {
      p_shipment_id: params.shipment_id,
      p_receiving_no: params.receiving_no,
      p_receiving_date: params.receiving_date,
      p_receiver_id: params.receiver_id,
      p_items: params.items,
      p_notes: params.notes || null,
    });

    if (error) {
      console.error('调用 create_receiving_from_asn RPC 失败:', error);
      return {
        success: false,
        error: 'RPC_ERROR',
        message: error.message,
      };
    }

    return data as CreateReceivingResult;
  } catch (error: unknown) {
    console.error('创建收货记录失败:', error);
    return {
      success: false,
      error: 'UNKNOWN_ERROR',
      message: getErrorMessage(error, '创建收货记录失败'),
    };
  }
}
