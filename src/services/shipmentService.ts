/**
 * 出货服务
 */

import { runtimeMode, supabase } from '@/db/supabase';
import { confirmDemoShipment, createDemoShipment, getDemoShipments } from '@/services/demoMainChainService';
import type { ShipmentRecord } from '@/types/database';

/**
 * 获取或创建 shipment 记录
 * 先查询是否存在该 SN 的 shipment，如果不存在则创建
 */
export async function getOrCreateShipment(
  finishedProductSn: string,
  tenantId: string,
  userId: string
): Promise<number> {
  if (runtimeMode === 'demo') {
    return createDemoShipment(finishedProductSn);
  }

  // 1. 先查询是否已存在该 SN 的 shipment
  const { data: existingShipment, error: queryError } = await supabase
    .from('shipments')
    .select('id')
    .eq('finished_product_sn', finishedProductSn)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (queryError) {
    throw queryError;
  }

  // 2. 如果已存在，直接返回 shipment_id
  if (existingShipment) {
    return existingShipment.id;
  }

  // 3. 如果不存在，创建新的 shipment
  const shipmentCode = `SHP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  
  const { data: newShipment, error: insertError } = await supabase
    .from('shipments')
    .insert({
      shipment_code: shipmentCode,
      finished_product_sn: finishedProductSn,
      shipment_status: 'pending',
      tenant_id: tenantId,
      created_by: userId,
    })
    .select('id')
    .single();

  if (insertError) {
    throw insertError;
  }

  return newShipment.id;
}

export async function createShipmentConfirmation(
  finishedProductSn: string,
  shipmentId: number,
  tenantId: string,
  userId: string
): Promise<number> {
  if (runtimeMode === 'demo') {
    return shipmentId;
  }

  const { data, error } = await supabase.rpc('create_shipment_confirmation', {
    p_finished_product_sn: finishedProductSn,
    p_shipment_id: shipmentId,
    p_tenant_id: tenantId,
    p_user_id: userId,
  });

  if (error) throw error;
  return data as number;
}

export async function confirmShipment(
  confirmationId: number,
  confirmationStatus: string,
  remarks: string,
  blockReason: string,
  tenantId: string,
  userId: string
): Promise<boolean> {
  if (runtimeMode === 'demo') {
    return confirmDemoShipment(confirmationId, confirmationStatus, remarks, blockReason);
  }

  const { data, error } = await supabase.rpc('confirm_shipment', {
    p_confirmation_id: confirmationId,
    p_confirmation_status: confirmationStatus,
    p_remarks: remarks,
    p_block_reason: blockReason,
    p_tenant_id: tenantId,
    p_user_id: userId,
  });

  if (error) throw error;
  return data as boolean;
}

export async function getShipmentConfirmations(tenantId: string, status?: string): Promise<ShipmentRecord[]> {
  if (runtimeMode === 'demo') {
    return getDemoShipments(status);
  }

  let query = supabase
    .from('shipment_confirmations')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('confirmation_status', status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Fetch shipment confirmations failed:', error);
    return [];
  }
  return (data ?? []) as ShipmentRecord[];
}

export async function getShipments(tenantId: string, status?: string): Promise<ShipmentRecord[]> {
  if (runtimeMode === 'demo') {
    return getDemoShipments(status);
  }

  let query = supabase
    .from('shipments')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('shipment_status', status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Fetch shipments failed:', error);
    return [];
  }
  return (data ?? []) as ShipmentRecord[];
}
