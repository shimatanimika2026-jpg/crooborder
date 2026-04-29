/**
 * 权限控制函数
 * 用于判断用户是否有权限执行特定操作
 */

import type { Profile } from '@/types/database';

/**
 * 判断用户是否可以查看协同视图的敏感数据
 * @param profile 用户档案
 * @returns 是否有权限
 */
export function canViewSensitiveCollaborationData(profile: Profile | null): boolean {
  if (!profile) {
    return false;
  }

  // 只有特定角色可以查看敏感数据
  // 1. 日本管理员（japan_admin）
  // 2. 高层用户（executive）
  const allowedRoles = ['japan_admin', 'executive', 'admin'];
  
  return allowedRoles.includes(profile.role || '');
}

/**
 * 判断用户是否可以访问高层看板
 * @param profile 用户档案
 * @returns 是否有权限
 */
export function canAccessExecutiveDashboard(profile: Profile | null): boolean {
  if (!profile) {
    return false;
  }

  // 高层看板对所有已登录用户开放（只读汇总数据）
  // 但不暴露敏感明细
  return true;
}

/**
 * 判断用户是否可以访问中国协同视图
 * @param profile 用户档案
 * @returns 是否有权限
 */
export function canAccessChinaCollaborationView(profile: Profile | null): boolean {
  if (!profile) {
    return false;
  }

  // 中国协同视图对以下角色开放：
  // 1. 中国协同用户（china_collab）
  // 2. 日本管理员（japan_admin）
  // 3. 高层用户（executive）
  const allowedRoles = ['china_collab', 'japan_admin', 'executive', 'admin'];
  
  return allowedRoles.includes(profile.role || '');
}
