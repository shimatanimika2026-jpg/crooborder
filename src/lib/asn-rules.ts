/**
 * ASN 收货规则统一定义
 * 
 * 本文件定义了 ASN→收货→IQC 链路的统一规则，
 * 所有相关页面必须遵循此规则，禁止各自定义。
 */

import type { TFunction } from 'i18next';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * 可收货的 ASN 状态
 * 
 * 规则：只有状态为 'arrived' 的 ASN 才能创建收货记录
 * 
 * 不可收货的状态：
 * - draft: 草稿，还未发货
 * - in_transit: 在途，还未到货
 * - received: 已收货，不能重复收货
 * - cancelled: 已取消，不能收货
 */
export const RECEIVABLE_ASN_STATUS = 'arrived' as const;

/**
 * 检查 ASN 状态是否可收货
 * 
 * @param status ASN 状态
 * @returns 是否可以创建收货记录
 */
export function isReceivableASNStatus(status: string): boolean {
  return status === RECEIVABLE_ASN_STATUS;
}

/**
 * 检查 ASN 是否可以创建收货记录（已废弃，使用 isReceivableASNStatus）
 * @deprecated 使用 isReceivableASNStatus 替代
 */
export function isASNReceivable(status: string): boolean {
  return isReceivableASNStatus(status);
}

/**
 * 获取创建收货阻断原因
 * 
 * @param params 检查参数
 * @param params.status ASN 状态
 * @param params.itemCount ASN 明细数量
 * @param params.hasExistingReceiving 是否已有有效收货记录
 * @param t i18n 翻译函数
 * @returns 阻断原因，如果可以创建则返回 null
 */
export function getCreateReceivingBlockReason(
  params: {
    status: string;
    itemCount: number;
    hasExistingReceiving: boolean;
  },
  t: TFunction
): string | null {
  const { status, itemCount, hasExistingReceiving } = params;

  // 优先级1：检查是否已有有效收货记录
  if (hasExistingReceiving) {
    return t('asnRules.blockReasonDuplicateReceiving');
  }

  // 优先级2：检查是否有明细
  if (itemCount === 0) {
    return t('asnRules.blockReasonNoItems');
  }

  // 优先级3：检查状态是否可收货
  if (!isReceivableASNStatus(status)) {
    const reasonKeys: Record<string, string> = {
      draft: 'asnRules.blockReasonStatusDraft',
      in_transit: 'asnRules.blockReasonStatusInTransit',
      received: 'asnRules.blockReasonStatusReceived',
      cancelled: 'asnRules.blockReasonStatusCancelled',
    };
    return t(reasonKeys[status] || 'asnRules.blockReasonStatusDefault');
  }

  return null;
}

/**
 * 获取 ASN 不可收货的原因（已废弃，使用 getCreateReceivingBlockReason）
 * @deprecated 使用 getCreateReceivingBlockReason 替代
 */
export function getASNNotReceivableReason(status: string, t: TFunction): string | null {
  if (status === RECEIVABLE_ASN_STATUS) {
    return null;
  }

  const reasonKeys: Record<string, string> = {
    draft: 'asnRules.notReceivableReasonDraft',
    in_transit: 'asnRules.notReceivableReasonInTransit',
    received: 'asnRules.notReceivableReasonReceived',
    cancelled: 'asnRules.notReceivableReasonCancelled',
  };

  return t(reasonKeys[status] || 'asnRules.notReceivableReasonDefault');
}

/**
 * 检查是否已存在有效的收货记录
 * 
 * @param supabase Supabase 客户端
 * @param shipmentId ASN ID
 * @returns 是否已存在有效的收货记录
 */
export async function hasExistingReceiving(
  supabase: SupabaseClient,
  shipmentId: number | string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('receiving_records')
      .select('id')
      .eq('shipment_id', shipmentId)
      .neq('status', 'cancelled')
      .maybeSingle();

    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error('检查收货记录失败:', error);
    return false;
  }
}

/**
 * 批量检查多个 ASN 是否已存在有效的收货记录
 * 
 * @param supabase Supabase 客户端
 * @param shipmentIds ASN ID 列表
 * @returns Map<shipmentId, hasExistingReceiving>
 */
export async function batchCheckExistingReceiving(
  supabase: SupabaseClient,
  shipmentIds: (number | string)[]
): Promise<Map<number | string, boolean>> {
  const result = new Map<number | string, boolean>();
  
  if (shipmentIds.length === 0) {
    return result;
  }

  try {
    const { data, error } = await supabase
      .from('receiving_records')
      .select('shipment_id')
      .in('shipment_id', shipmentIds)
      .neq('status', 'cancelled');

    if (error) throw error;

    // 初始化所有 ASN 为 false
    shipmentIds.forEach(id => result.set(id, false));

    // 标记已有收货记录的 ASN
    (data || []).forEach((record: { shipment_id: number | string }) => {
      result.set(record.shipment_id, true);
    });

    return result;
  } catch (error) {
    console.error('批量检查收货记录失败:', error);
    // 出错时返回空 Map
    return result;
  }
}

/**
 * 检查是否有 ASN 明细
 * 
 * @param supabase Supabase 客户端
 * @param shipmentId ASN ID
 * @returns 是否有 ASN 明细
 */
export async function hasASNItems(
  supabase: SupabaseClient,
  shipmentId: number | string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('asn_shipment_items')
      .select('id')
      .eq('shipment_id', shipmentId)
      .limit(1);

    if (error) throw error;
    return !!data && data.length > 0;
  } catch (error) {
    console.error('检查 ASN 明细失败:', error);
    return false;
  }
}

/**
 * 批量检查多个 ASN 的明细数量
 * 
 * @param supabase Supabase 客户端
 * @param shipmentIds ASN ID 列表
 * @returns Map<shipmentId, itemCount>
 */
export async function batchGetASNItemCounts(
  supabase: SupabaseClient,
  shipmentIds: (number | string)[]
): Promise<Map<number | string, number>> {
  const result = new Map<number | string, number>();
  
  if (shipmentIds.length === 0) {
    return result;
  }

  try {
    const { data, error } = await supabase
      .from('asn_shipment_items')
      .select('shipment_id')
      .in('shipment_id', shipmentIds);

    if (error) throw error;

    // 初始化所有 ASN 为 0
    shipmentIds.forEach(id => result.set(id, 0));

    // 统计每个 ASN 的明细数量
    (data || []).forEach((item: { shipment_id: number | string }) => {
      const currentCount = result.get(item.shipment_id) || 0;
      result.set(item.shipment_id, currentCount + 1);
    });

    return result;
  } catch (error) {
    console.error('批量查询 ASN 明细数量失败:', error);
    return result;
  }
}

/**
 * 检查是否可以从 ASN 创建收货记录
 * 
 * @param params 检查参数
 * @param params.status ASN 状态
 * @param params.itemCount ASN 明细数量
 * @param params.hasExistingReceiving 是否已有有效收货记录
 * @returns 是否可以创建收货记录
 */
export function canCreateReceivingFromASN(params: {
  status: string;
  itemCount: number;
  hasExistingReceiving: boolean;
}): boolean {
  const { status, itemCount, hasExistingReceiving } = params;
  
  // 必须同时满足：状态为 arrived、有明细、无有效收货记录
  return (
    status === RECEIVABLE_ASN_STATUS &&
    itemCount > 0 &&
    !hasExistingReceiving
  );
}

/**
 * 获取 ASN 状态标签
 * 
 * @param status ASN 状态
 * @param t i18n 翻译函数
 * @returns 状态标签文本
 */
export function getASNStatusLabel(status: string, t: TFunction): string {
  const statusKeys: Record<string, string> = {
    draft: 'asn.statusDraft',
    shipped: 'asn.statusShipped',
    in_transit: 'asn.statusInTransit',
    arrived: 'asn.statusArrived',
    received: 'asn.statusReceived',
    cancelled: 'asn.statusCancelled',
  };

  return t(statusKeys[status] || status);
}

/**
 * 获取 ASN 状态变更确认消息
 * 
 * @param targetStatus 目标状态
 * @param t i18n 翻译函数
 * @returns 确认消息
 */
export function getASNStatusChangeMessage(targetStatus: string, t: TFunction): string {
  const messageKeys: Record<string, string> = {
    in_transit: 'asnRules.statusChangeMessageInTransit',
    arrived: 'asnRules.statusChangeMessageArrived',
  };

  return t(messageKeys[targetStatus] || '');
}
