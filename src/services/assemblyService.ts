/**
 * 组装服务
 */

import { supabase } from '@/db/supabase';
import type { FinishedUnitWithModel } from '@/types/database';

export interface AssemblyPart {
  part_type: string;
  part_no: string;
  part_sn: string;
  receiving_record_item_id: number;
  reserved_qty: number;
  batch_no: string;
}

export async function createAssemblyUnitWithReservation(
  finishedProductSn: string,
  productModelId: number,
  assemblyDate: string,
  assemblyOperatorId: string,
  parts: AssemblyPart[],
  tenantId: string,
  userId: string
): Promise<{ success: boolean; message?: string; unit_id?: number }> {
  const { data, error } = await supabase.rpc('create_assembly_unit_with_reservation', {
    p_finished_product_sn: finishedProductSn,
    p_product_model_id: productModelId,
    p_assembly_date: assemblyDate,
    p_assembly_operator_id: assemblyOperatorId,
    p_parts: parts,
    p_tenant_id: tenantId,
    p_user_id: userId,
  });

  if (error) throw new Error(`创建组装单元失败: ${error.message}`);
  return data as { success: boolean; message?: string; unit_id?: number };
}

export async function checkPartAssemblyReadiness(
  partNo: string,
  partSn: string,
  tenantId: string
): Promise<{ can_assemble: boolean; reason?: string }> {
  const { data, error } = await supabase.rpc('check_part_assembly_readiness', {
    p_part_no: partNo,
    p_part_sn: partSn,
    p_tenant_id: tenantId,
  });

  if (error) throw new Error(`检查部件上线条件失败: ${error.message}`);
  return data as { can_assemble: boolean; reason?: string };
}

export async function getFinishedUnits(tenantId: string, status?: string): Promise<FinishedUnitWithModel[]> {
  let query = supabase
    .from('finished_unit_traceability')
    .select('*, product_models(*)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('assembly_status', status);
  }

  const { data, error } = await query;
  if (error) throw new Error(`获取整机列表失败: ${error.message}`);
  return data || [];
}

export async function getFinishedUnitBySn(finishedProductSn: string): Promise<FinishedUnitWithModel | null> {
  const { data, error } = await supabase
    .from('finished_unit_traceability')
    .select('*, product_models(*)')
    .eq('finished_product_sn', finishedProductSn)
    .maybeSingle();

  if (error) throw new Error(`获取整机详情失败: ${error.message}`);
  return data;
}
