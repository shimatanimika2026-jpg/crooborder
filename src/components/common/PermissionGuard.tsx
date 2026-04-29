import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

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

interface PermissionGuardProps {
  children: ReactNode;
  permission?: Permission;
  role?: UserRole | UserRole[];
  anyRole?: UserRole[];
  fallback?: ReactNode;
  redirectTo?: string;
}

export function PermissionGuard({
  children,
  permission,
  role,
  anyRole,
  fallback,
  redirectTo,
}: PermissionGuardProps) {
  const { hasPermission, hasRole, hasAnyRole } = usePermissions();

  // 检查权限
  if (permission && !hasPermission(permission)) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>权限不足</AlertTitle>
          <AlertDescription>
            您没有访问此功能的权限。请联系管理员。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // 检查角色
  if (role && !hasRole(role)) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>角色权限不足</AlertTitle>
          <AlertDescription>
            此功能仅限特定角色访问。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // 检查任意角色
  if (anyRole && !hasAnyRole(anyRole)) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>角色权限不足</AlertTitle>
          <AlertDescription>
            此功能仅限特定角色访问。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}

// 便捷组件
export function AdminOnly({ children }: { children: ReactNode }) {
  return (
    <PermissionGuard anyRole={['admin', 'system_admin', 'president']}>
      {children}
    </PermissionGuard>
  );
}

export function PresidentOnly({ children }: { children: ReactNode }) {
  return (
    <PermissionGuard role="president">
      {children}
    </PermissionGuard>
  );
}

export function ChinaFactoryOnly({ children }: { children: ReactNode }) {
  return (
    <PermissionGuard role="china_factory">
      {children}
    </PermissionGuard>
  );
}

export function JapanFactoryOnly({ children }: { children: ReactNode }) {
  return (
    <PermissionGuard role="japan_factory">
      {children}
    </PermissionGuard>
  );
}
