/**
 * 最终测试服务
 */

import { runtimeMode, supabase } from '@/db/supabase';
import { createDemoFinalTest, getDemoFinalTests, submitDemoFinalTestResult } from '@/services/demoMainChainService';
import type { FinalTestRecord } from '@/types/database';

export async function createFinalTestRecord(
  finishedProductSn: string,
  tenantId: string,
  userId: string
): Promise<number> {
  if (runtimeMode === 'demo') {
    return createDemoFinalTest(finishedProductSn);
  }

  const { data, error } = await supabase.rpc('create_final_test', {
    p_finished_product_sn: finishedProductSn,
    p_tenant_id: tenantId,
    p_user_id: userId,
  });

  if (error) throw new Error(`创建最终测试记录失败: ${error.message}`);
  return data as number;
}

export async function submitFinalTestResult(
  testId: number,
  testStatus: string,
  defectDescription: string,
  notes: string,
  tenantId: string,
  userId: string
): Promise<boolean> {
  if (runtimeMode === 'demo') {
    return submitDemoFinalTestResult(testId, testStatus, defectDescription, notes);
  }

  const { data, error } = await supabase.rpc('submit_final_test_result', {
    p_test_id: testId,
    p_test_status: testStatus,
    p_defect_description: defectDescription,
    p_notes: notes,
    p_tenant_id: tenantId,
    p_user_id: userId,
  });

  if (error) throw new Error(`提交测试结果失败: ${error.message}`);
  return data as boolean;
}

export async function getFinalTests(tenantId: string, status?: string): Promise<FinalTestRecord[]> {
  if (runtimeMode === 'demo') {
    return getDemoFinalTests(status);
  }

  let query = supabase
    .from('final_tests')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('test_status', status);
  }

  const { data, error } = await query;
  if (error) throw new Error(`获取最终测试列表失败: ${error.message}`);
  return data || [];
}
