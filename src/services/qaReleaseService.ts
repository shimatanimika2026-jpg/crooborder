/**
 * QA 放行服务
 */

import { runtimeMode, supabase } from '@/db/supabase';
import { createDemoQARelease, executeDemoQARelease, getDemoQAReleases } from '@/services/demoMainChainService';
import type { QAReleaseRecord } from '@/types/database';

export async function createQAReleaseRecord(
  finishedProductSn: string,
  tenantId: string,
  userId: string
): Promise<number> {
  if (runtimeMode === 'demo') {
    return createDemoQARelease(finishedProductSn);
  }

  const { data, error } = await supabase.rpc('create_qa_release', {
    p_finished_product_sn: finishedProductSn,
    p_tenant_id: tenantId,
    p_user_id: userId,
  });

  if (error) throw new Error(`创建QA放行记录失败: ${error.message}`);
  return data as number;
}

export async function executeQARelease(
  releaseId: number,
  releaseStatus: string,
  remarks: string,
  blockReason: string,
  tenantId: string,
  userId: string
): Promise<boolean> {
  if (runtimeMode === 'demo') {
    return executeDemoQARelease(releaseId, releaseStatus, remarks, blockReason);
  }

  const { data, error } = await supabase.rpc('execute_qa_release', {
    p_release_id: releaseId,
    p_release_status: releaseStatus,
    p_remarks: remarks,
    p_block_reason: blockReason,
    p_tenant_id: tenantId,
    p_user_id: userId,
  });

  if (error) throw new Error(`执行QA放行失败: ${error.message}`);
  return data as boolean;
}

export async function getQAReleases(tenantId: string, status?: string): Promise<QAReleaseRecord[]> {
  if (runtimeMode === 'demo') {
    return getDemoQAReleases(status);
  }

  let query = supabase
    .from('qa_releases')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('release_status', status);
  }

  const { data, error } = await query;
  if (error) throw new Error(`获取QA放行列表失败: ${error.message}`);
  return (data ?? []) as QAReleaseRecord[];
}
