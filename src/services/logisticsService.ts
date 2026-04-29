/**
 * 物流管理服务
 * 提供物流轨迹查询、状态更新、异常处理等功能
 */

import { supabase } from '@/db/supabase';
import type { LogisticsTracking, LogisticsEvent, LogisticsTimeoutOrder } from '@/types/database';

/**
 * 更新物流状态
 */
export async function updateLogisticsStatus(
  trackingId: number,
  newStatus: string,
  location: string,
  description: string,
  tenantId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_logistics_status', {
    p_tracking_id: trackingId,
    p_new_status: newStatus,
    p_location: location,
    p_description: description,
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error('更新物流状态失败:', error);
    throw new Error(`更新物流状态失败: ${error.message}`);
  }

  return data as boolean;
}

/**
 * 创建物流异常事件
 */
export async function createLogisticsExceptionEvent(
  trackingId: number,
  eventType: string,
  description: string,
  location: string,
  tenantId: string,
  userId: string
): Promise<number> {
  const { data, error } = await supabase.rpc('create_logistics_exception_event', {
    p_tracking_id: trackingId,
    p_event_type: eventType,
    p_description: description,
    p_location: location,
    p_tenant_id: tenantId,
    p_user_id: userId,
  });

  if (error) {
    console.error('创建物流异常事件失败:', error);
    throw new Error(`创建物流异常事件失败: ${error.message}`);
  }

  return data as number;
}

/**
 * 获取物流轨迹
 */
export async function getLogisticsTracking(
  shippingOrderId: number,
  tenantId: string
): Promise<LogisticsTracking | null> {
  const { data, error } = await supabase
    .from('logistics_tracking')
    .select('*')
    .eq('shipping_order_id', shippingOrderId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    console.error('获取物流轨迹失败:', error);
    throw new Error(`获取物流轨迹失败: ${error.message}`);
  }

  return data;
}

/**
 * 获取物流事件列表
 */
export async function getLogisticsEvents(
  shippingOrderId: number,
  tenantId: string
): Promise<LogisticsEvent[]> {
  const { data, error } = await supabase
    .from('logistics_events')
    .select('*')
    .eq('shipping_order_id', shippingOrderId)
    .eq('tenant_id', tenantId)
    .order('event_time', { ascending: false });

  if (error) {
    console.error('获取物流事件失败:', error);
    throw new Error(`获取物流事件失败: ${error.message}`);
  }

  return data || [];
}

/**
 * 检测物流超时异常
 */
export async function detectLogisticsTimeoutExceptions(
  hoursThreshold: number = 48,
  tenantId: string
): Promise<LogisticsEvent[]> {
  const { data, error } = await supabase.rpc('detect_logistics_timeout_exceptions', {
    p_hours_threshold: hoursThreshold,
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error('检测物流超时异常失败:', error);
    throw new Error(`检测物流超时异常失败: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
}
