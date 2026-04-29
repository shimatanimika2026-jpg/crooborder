/**
 * 老化测试服务
 */

import { supabase } from '@/db/supabase';
import type { AgingTestWithModel } from '@/types/database';

export async function createAgingTest(
  finishedProductSn: string,
  productModelId: number,
  requiredDurationHours: number,
  tenantId: string,
  userId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('aging_tests')
    .insert({
      finished_product_sn: finishedProductSn,
      product_model_id: productModelId,
      status: 'planned',
      required_duration_hours: requiredDurationHours,
      tenant_id: tenantId,
      created_by: userId,
    })
    .select('id')
    .single();

  if (error) throw new Error(`创建老化测试记录失败: ${error.message}`);
  return data.id;
}

export async function startAgingTest(
  testId: number,
  tenantId: string,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('aging_tests')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
      operator_id: userId,
    })
    .eq('id', testId)
    .eq('tenant_id', tenantId);

  if (error) throw new Error(`启动老化测试失败: ${error.message}`);
  return true;
}

export async function pauseAgingTest(
  testId: number,
  tenantId: string,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('aging_tests')
    .update({
      status: 'interrupted',
      paused_at: new Date().toISOString(),
    })
    .eq('id', testId)
    .eq('tenant_id', tenantId);

  if (error) throw new Error(`暂停老化测试失败: ${error.message}`);
  return true;
}

export async function completeAgingTest(
  testId: number,
  result: 'pass' | 'fail',
  remarks: string,
  tenantId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('complete_aging_test', {
    p_test_id: testId,
    p_result: result,
    p_remarks: remarks,
    p_tenant_id: tenantId,
    p_user_id: userId,
  });

  if (error) throw new Error(`完成老化测试失败: ${error.message}`);
  return data as boolean;
}

export async function getAgingTests(tenantId: string, status?: string): Promise<AgingTestWithModel[]> {
  let query = supabase
    .from('aging_tests')
    .select('*, product_models(*)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw new Error(`获取老化测试列表失败: ${error.message}`);
  return data || [];
}

export async function getAgingTestById(testId: number): Promise<AgingTestWithModel | null> {
  const { data, error } = await supabase
    .from('aging_tests')
    .select('*, product_models(*)')
    .eq('id', testId)
    .maybeSingle();

  if (error) throw new Error(`获取老化测试详情失败: ${error.message}`);
  return data;
}
