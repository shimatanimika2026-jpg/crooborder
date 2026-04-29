import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';

type UserRole = 'admin' | 'system_admin' | 'user' | 'china_factory' | 'japan_factory' | 'president' | 'quality' | 'logistics';

type Permission = 
  | 'view_dashboard'
  | 'manage_production'
  | 'manage_quality'
  | 'manage_inventory'
  | 'manage_logistics'
  | 'manage_ota'
  | 'manage_users'
  | 'view_reports'
  | 'manage_andon';

interface PermissionsContextType {
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  userRole: UserRole | null;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

// 角色权限映射
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  president: [
    'view_dashboard',
    'manage_production',
    'manage_quality',
    'manage_inventory',
    'manage_logistics',
    'manage_ota',
    'manage_users',
    'view_reports',
    'manage_andon',
  ],
  system_admin: [
    'view_dashboard',
    'manage_production',
    'manage_quality',
    'manage_inventory',
    'manage_logistics',
    'manage_ota',
    'manage_users',
    'view_reports',
    'manage_andon',
  ],
  admin: [
    'view_dashboard',
    'manage_production',
    'manage_quality',
    'manage_inventory',
    'manage_logistics',
    'manage_ota',
    'view_reports',
    'manage_andon',
  ],
  china_factory: [
    'view_dashboard',
    'manage_production',
    'manage_quality',
    'manage_inventory',
    'view_reports',
    'manage_andon',
  ],
  japan_factory: [
    'view_dashboard',
    'view_reports',
  ],
  quality: [
    'view_dashboard',
    'manage_quality',
    'view_reports',
  ],
  logistics: [
    'view_dashboard',
    'manage_logistics',
    'manage_inventory',
    'view_reports',
  ],
  user: [
    'view_dashboard',
    'view_reports',
  ],
};

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();

  const userRole = profile?.role as UserRole | null;

  const hasPermission = (permission: Permission): boolean => {
    if (!userRole) return false;
    const permissions = ROLE_PERMISSIONS[userRole] || [];
    return permissions.includes(permission);
  };

  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!userRole) return false;
    if (Array.isArray(role)) {
      return role.includes(userRole);
    }
    return userRole === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!userRole) return false;
    return roles.includes(userRole);
  };

  return (
    <PermissionsContext.Provider
      value={{
        hasPermission,
        hasRole,
        hasAnyRole,
        userRole,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}
