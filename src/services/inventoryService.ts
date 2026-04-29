/**
 * 库存预占服务
 * 提供库存预占、消耗、释放功能
 * 确保账、料、机三者一致
 */

import { checkDemoMaterialAvailability } from '@/data/demo/inventory-assembly';
import { runtimeMode, supabase } from '@/db/supabase';

/**
 * 库存可用性检查结果
 */
export interface InventoryAvailability {
  available: boolean;
  on_hand: number;
  reserved: number;
  available_qty: number;
}

/**
 * 物料预占检查结果
 */
export interface MaterialReservationCheck {
  is_reserved: boolean;
  reserved_for_sn: string;
  reserved_qty: number;
}

/**
 * 关键件绑定检查结果
 */
export interface ComponentBindingCheck {
  is_bound: boolean;
  bound_to_sn: string;
}

/**
 * 物料可用性检查结果（包含 IQC 和特采状态）
 */
export interface MaterialAvailabilityCheck {
  available: boolean;
  reason?: string;
  error_code?: string;
  available_qty?: number;
  required_qty?: number;
  iqc_result?: 'OK' | 'NG' | 'HOLD' | 'not_inspected';
  disposition_status?: 'none' | 'pending' | 'approved' | 'rejected';
}

/**
 * 检查库存可用性
 * @param materialCode 物料编码
 * @param requiredQty 需要数量
 * @param tenantId 租户ID
 * @returns 库存可用性信息
 */
export async function checkInventoryAvailability(
  materialCode: string,
  requiredQty: number,
  tenantId: string
): Promise<InventoryAvailability | null> {
  const { data, error } = await supabase.rpc('check_inventory_availability', {
    p_material_code: materialCode,
    p_required_qty: requiredQty,
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error('service.inventory.errorCheckAvailability', error);
    throw new Error('service.inventory.errorCheckAvailability');
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0] as InventoryAvailability;
}

/**
 * 预占库存
 * @param materialCode 物料编码
 * @param qty 预占数量
 * @param reservedForSn 预占给哪个整机序列号
 * @param tenantId 租户ID
 * @param userId 用户ID（可选）
 * @returns 预占记录ID
 */
export async function reserveInventory(
  materialCode: string,
  qty: number,
  reservedForSn: string,
  tenantId: string,
  userId?: string
): Promise<number> {
  const { data, error } = await supabase.rpc('reserve_inventory_for_assembly', {
    p_material_code: materialCode,
    p_qty: qty,
    p_reserved_for_sn: reservedForSn,
    p_tenant_id: tenantId,
    p_user_id: userId || null,
  });

  if (error) {
    console.error('service.inventory.errorReserve', error);
    throw new Error('service.inventory.errorReserve');
  }

  return data as number;
}

/**
 * 消耗预占库存
 * @param reservationId 预占记录ID
 * @param tenantId 租户ID
 * @param userId 用户ID（可选）
 * @returns 是否成功
 */
export async function consumeInventory(
  reservationId: number,
  tenantId: string,
  userId?: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('consume_reserved_inventory', {
    p_reservation_id: reservationId,
    p_tenant_id: tenantId,
    p_user_id: userId || null,
  });

  if (error) {
    console.error('service.inventory.errorConsume', error);
    throw new Error('service.inventory.errorConsume');
  }

  return data as boolean;
}

/**
 * 释放预占库存
 * @param reservationId 预占记录ID
 * @param tenantId 租户ID
 * @param userId 用户ID（可选）
 * @param remarks 备注（可选）
 * @returns 是否成功
 */
export async function releaseInventory(
  reservationId: number,
  tenantId: string,
  userId?: string,
  remarks?: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('release_reserved_inventory', {
    p_reservation_id: reservationId,
    p_tenant_id: tenantId,
    p_user_id: userId || null,
    p_remarks: remarks || null,
  });

  if (error) {
    console.error('service.inventory.errorRelease', error);
    throw new Error('service.inventory.errorRelease');
  }

  return data as boolean;
}

/**
 * 检查物料是否已被其他整机预占
 * @param materialCode 物料编码
 * @param tenantId 租户ID
 * @param excludeSn 排除的整机序列号（可选）
 * @returns 预占检查结果，如果未被预占则返回 null
 */
export async function checkMaterialAlreadyReserved(
  materialCode: string,
  tenantId: string,
  excludeSn?: string
): Promise<MaterialReservationCheck | null> {
  const { data, error } = await supabase.rpc('check_material_already_reserved', {
    p_material_code: materialCode,
    p_tenant_id: tenantId,
    p_exclude_sn: excludeSn || null,
  });

  if (error) {
    console.error('service.inventory.errorCheckReservation', error);
    throw new Error('service.inventory.errorCheckReservation');
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0] as MaterialReservationCheck;
}

/**
 * 检查关键件是否已被绑定到其他整机
 * @param componentSn 关键件序列号
 * @param tenantId 租户ID
 * @returns 绑定检查结果，如果未被绑定则返回 null
 */
export async function checkComponentAlreadyBound(
  componentSn: string,
  tenantId: string
): Promise<ComponentBindingCheck | null> {
  const { data, error } = await supabase.rpc('check_component_already_bound', {
    p_component_sn: componentSn,
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error('service.inventory.errorCheckBinding', error);
    throw new Error('service.inventory.errorCheckBinding');
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0] as ComponentBindingCheck;
}

/**
 * 检查物料可用性（包含 IQC 结果和特采状态）
 * @param receivingItemId 收货明细ID
 * @param requiredQty 需要数量
 * @param partType 部件类型（可选）
 * @returns 物料可用性检查结果
 */
export async function checkMaterialAvailability(
  receivingItemId: number,
  requiredQty: number,
  partType?: string
): Promise<MaterialAvailabilityCheck> {
  if (runtimeMode === 'demo') {
    return checkDemoMaterialAvailability(receivingItemId, requiredQty) as MaterialAvailabilityCheck;
  }

  const { data, error } = await supabase.rpc('check_material_availability', {
    p_receiving_item_id: receivingItemId,
    p_required_qty: requiredQty,
    p_part_type: partType || null,
  });

  if (error) {
    console.error('service.inventory.errorCheckMaterial', error);
    throw new Error('service.inventory.errorCheckMaterial');
  }

  return data as MaterialAvailabilityCheck;
}

/**
 * 批量预占库存
 * @param materials 物料列表 [{materialCode, qty}]
 * @param reservedForSn 预占给哪个整机序列号
 * @param tenantId 租户ID
 * @param userId 用户ID（可选）
 * @returns 预占记录ID列表
 */
export async function batchReserveInventory(
  materials: Array<{ materialCode: string; qty: number }>,
  reservedForSn: string,
  tenantId: string,
  userId?: string
): Promise<number[]> {
  const reservationIds: number[] = [];

  for (const material of materials) {
    try {
      const reservationId = await reserveInventory(
        material.materialCode,
        material.qty,
        reservedForSn,
        tenantId,
        userId
      );
      reservationIds.push(reservationId);
    } catch (error) {
      // 如果预占失败，释放已预占的库存
      for (const id of reservationIds) {
        try {
          await releaseInventory(id, tenantId, userId, '批量预占失败，自动释放');
        } catch (releaseError) {
          console.error('释放库存失败:', releaseError);
        }
      }
      throw error;
    }
  }

  return reservationIds;
}

/**
 * 批量消耗库存
 * @param reservationIds 预占记录ID列表
 * @param tenantId 租户ID
 * @param userId 用户ID（可选）
 * @returns 是否全部成功
 */
export async function batchConsumeInventory(
  reservationIds: number[],
  tenantId: string,
  userId?: string
): Promise<boolean> {
  for (const reservationId of reservationIds) {
    await consumeInventory(reservationId, tenantId, userId);
  }
  return true;
}

/**
 * 批量释放库存
 * @param reservationIds 预占记录ID列表
 * @param tenantId 租户ID
 * @param userId 用户ID（可选）
 * @param remarks 备注（可选）
 * @returns 是否全部成功
 */
export async function batchReleaseInventory(
  reservationIds: number[],
  tenantId: string,
  userId?: string,
  remarks?: string
): Promise<boolean> {
  for (const reservationId of reservationIds) {
    await releaseInventory(reservationId, tenantId, userId, remarks);
  }
  return true;
}
