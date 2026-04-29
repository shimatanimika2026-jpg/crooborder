/**
 * 发货订单管理服务
 * 提供发货订单创建、确认发货、状态查询等功能
 */

import { supabase } from '@/db/supabase';
import type { ShippingOrder, ShippingOrderItem } from '@/types/database';

/**
 * 创建发货订单
 */
export async function createShippingOrder(
  asnShipmentId: number | null,
  shipperName: string,
  shipperContact: string,
  shipperAddress: string,
  consigneeName: string,
  consigneeContact: string,
  consigneeAddress: string,
  carrier: string,
  estimatedShipDate: string,
  items: ShippingOrderItem[],
  tenantId: string,
  userId: string
): Promise<number> {
  const { data, error } = await supabase.rpc('create_shipping_order', {
    p_asn_shipment_id: asnShipmentId,
    p_shipper_name: shipperName,
    p_shipper_contact: shipperContact,
    p_shipper_address: shipperAddress,
    p_consignee_name: consigneeName,
    p_consignee_contact: consigneeContact,
    p_consignee_address: consigneeAddress,
    p_carrier: carrier,
    p_estimated_ship_date: estimatedShipDate,
    p_items: items,
    p_tenant_id: tenantId,
    p_user_id: userId,
  });

  if (error) {
    console.error('service.shipping.errorCreate', error);
    throw new Error('service.shipping.errorCreate');
  }

  return data as number;
}

/**
 * 确认发货
 */
export async function confirmShipment(
  orderId: number,
  trackingNumber: string,
  actualShipDate: string,
  tenantId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('confirm_shipment', {
    p_order_id: orderId,
    p_tracking_number: trackingNumber,
    p_actual_ship_date: actualShipDate,
    p_tenant_id: tenantId,
    p_user_id: userId,
  });

  if (error) {
    console.error('service.shipping.errorConfirm', error);
    throw new Error('service.shipping.errorConfirm');
  }

  return data as boolean;
}

/**
 * 获取发货订单列表
 */
export async function getShippingOrders(
  tenantId: string,
  status?: string
): Promise<ShippingOrder[]> {
  let query = supabase
    .from('shipping_orders')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('service.shipping.errorList', error);
    throw new Error('service.shipping.errorList');
  }

  return data || [];
}

/**
 * 获取发货订单详情
 */
export async function getShippingOrderDetail(
  orderId: number,
  tenantId: string
): Promise<ShippingOrder | null> {
  const { data, error } = await supabase
    .from('shipping_orders')
    .select('*')
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    console.error('service.shipping.errorDetail', error);
    throw new Error('service.shipping.errorDetail');
  }

  return data;
}

/**
 * 取消发货订单
 */
export async function cancelShippingOrder(
  orderId: number,
  tenantId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('shipping_orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('service.shipping.errorCancel', error);
    throw new Error('service.shipping.errorCancel');
  }

  return true;
}
