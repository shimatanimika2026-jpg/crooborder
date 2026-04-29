import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/database';

/**
 * 权限检查 Hook
 * 用于检查当前用户是否有特定操作的权限
 */
export function usePermissions() {
  const { profile } = useAuth();

  /**
   * 检查是否有审批权限
   * 只有 cn_factory_manager 或 jp_factory_manager 可以审批
   */
  const canApprove = (): boolean => {
    if (!profile) return false;
    return ['cn_factory_manager', 'jp_factory_manager'].includes(profile.role);
  };

  /**
   * 检查是否有生效权限
   * 只有 executive 可以生效
   */
  const canActivate = (): boolean => {
    if (!profile) return false;
    return profile.role === 'executive';
  };

  /**
   * 检查是否有关闭权限
   * 只有 executive 可以关闭
   */
  const canClose = (): boolean => {
    if (!profile) return false;
    return profile.role === 'executive';
  };

  /**
   * 检查是否有特定角色
   */
  const hasRole = (role: UserRole): boolean => {
    if (!profile) return false;
    return profile.role === role;
  };

  /**
   * 检查是否有任意一个角色
   */
  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!profile) return false;
    return roles.includes(profile.role);
  };

  /**
   * 获取当前用户角色
   */
  const getCurrentRole = (): UserRole | null => {
    return profile?.role || null;
  };

  return {
    canApprove,
    canActivate,
    canClose,
    hasRole,
    hasAnyRole,
    getCurrentRole,
  };
}
