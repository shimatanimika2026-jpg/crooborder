/**
 * MVP 主链测试组 1：权限守卫
 *
 * 覆盖范围：
 *   A. ProtectedRoute 组件行为（3 条）
 *      - 未登录用户访问受保护路由 → 重定向到 /login
 *      - loading 状态 → 渲染骨架屏，不渲染子节点
 *      - 已登录用户 → 正常渲染子节点
 *   B. PermissionGuard 组件行为（3 条）
 *      - 无指定权限 → 渲染"权限不足"提示
 *      - 有指定权限 → 渲染子节点
 *      - 指定 redirectTo → 跳转而非显示错误文本
 *   C. 权限工具函数（6 条）
 *      - canViewSensitiveCollaborationData：null / admin / japan_admin / user
 *      - canAccessChinaCollaborationView：china_collab / jp_factory_manager
 *
 * 总计：12 条
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PermissionGuard } from '@/components/common/PermissionGuard';
import {
  canViewSensitiveCollaborationData,
  canAccessChinaCollaborationView,
} from '@/lib/auth/permissions';
import type { Profile, UserRole } from '@/types/database';

// ─── AuthContext mock ──────────────────────────────────────────────────────────
// 用 vi.fn() 使每条用例可独立控制返回值
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ─── PermissionsContext mock ───────────────────────────────────────────────────
// 默认给全部权限，PermissionGuard 测试中会 override
vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: vi.fn(),
  PermissionsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';

// ─── 辅助 ──────────────────────────────────────────────────────────────────────
const makeProfile = (role: UserRole): Profile => ({
  id: 'u1',
  username: 'tester',
  full_name: 'Tester',
  email: 'tester@example.com',
  phone: null,
  role,
  organization_id: null,
  tenant_id: 'JP',
  language_preference: 'zh-CN',
  status: 'active',
  last_login_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════
// A. ProtectedRoute
// ═══════════════════════════════════════════════════════════════
describe('A. ProtectedRoute 权限路由守卫', () => {
  it('A1: 未登录时访问受保护路由 → 渲染 /login 页面', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      profile: null,
      loading: false,
      signInWithUsername: vi.fn(),
      signUpWithUsername: vi.fn(),
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
        signInAsDemo: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>受保护内容</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>登录页</div>} />
        </Routes>
      </MemoryRouter>
    );

    // 应跳转到 /login 而非渲染受保护内容
    expect(screen.getByText('登录页')).toBeInTheDocument();
    expect(screen.queryByText('受保护内容')).not.toBeInTheDocument();
  });

  it('A2: loading 状态 → 渲染骨架屏，不渲染子节点', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      profile: null,
      loading: true,
      signInWithUsername: vi.fn(),
      signUpWithUsername: vi.fn(),
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
        signInAsDemo: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>受保护内容</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    // 不应显示子节点内容（显示 loading 骨架屏）
    expect(screen.queryByText('受保护内容')).not.toBeInTheDocument();
  });

  it('A3: 已登录用户 → 正常渲染子节点', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1', email: 'test@example.com' } as any,
      profile: makeProfile('admin'),
      loading: false,
      signInWithUsername: vi.fn(),
      signUpWithUsername: vi.fn(),
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
        signInAsDemo: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>受保护内容</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('受保护内容')).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════
// B. PermissionGuard
// ═══════════════════════════════════════════════════════════════
describe('B. PermissionGuard 功能权限守卫', () => {
  it('B1: 无指定权限时 → 渲染"权限不足"提示，不渲染子节点', () => {
    vi.mocked(usePermissions).mockReturnValue({
      hasPermission: () => false,
      hasRole: () => false,
      hasAnyRole: () => false,
      userRole: 'user',
    });

    render(
      <MemoryRouter>
        <PermissionGuard permission="manage_users">
          <div>管理员内容</div>
        </PermissionGuard>
      </MemoryRouter>
    );

    expect(screen.getByText('权限不足')).toBeInTheDocument();
    expect(screen.queryByText('管理员内容')).not.toBeInTheDocument();
  });

  it('B2: 有指定权限时 → 正常渲染子节点', () => {
    vi.mocked(usePermissions).mockReturnValue({
      hasPermission: () => true,
      hasRole: () => true,
      hasAnyRole: () => true,
      userRole: 'admin',
    });

    render(
      <MemoryRouter>
        <PermissionGuard permission="manage_users">
          <div>管理员内容</div>
        </PermissionGuard>
      </MemoryRouter>
    );

    expect(screen.getByText('管理员内容')).toBeInTheDocument();
  });

  it('B3: 无权限且指定 redirectTo → 跳转目标页而非显示错误文本', () => {
    vi.mocked(usePermissions).mockReturnValue({
      hasPermission: () => false,
      hasRole: () => false,
      hasAnyRole: () => false,
      userRole: 'user',
    });

    render(
      <MemoryRouter initialEntries={['/sensitive']}>
        <Routes>
          <Route
            path="/sensitive"
            element={
              <PermissionGuard permission="manage_users" redirectTo="/access-denied">
                <div>敏感内容</div>
              </PermissionGuard>
            }
          />
          <Route path="/access-denied" element={<div>禁止访问页</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('禁止访问页')).toBeInTheDocument();
    expect(screen.queryByText('敏感内容')).not.toBeInTheDocument();
    expect(screen.queryByText('权限不足')).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════
// C. 权限工具函数（纯函数，无需渲染）
// ═══════════════════════════════════════════════════════════════
describe('C. 权限工具函数边界验证', () => {
  describe('canViewSensitiveCollaborationData', () => {
    it('C1: null profile → false（未登录）', () => {
      expect(canViewSensitiveCollaborationData(null)).toBe(false);
    });

    it('C2: role = admin → true（管理员有权查看）', () => {
      expect(canViewSensitiveCollaborationData(makeProfile('admin'))).toBe(true);
    });

    it('C3: role = japan_admin → true（日方管理员有权查看）', () => {
      expect(canViewSensitiveCollaborationData(makeProfile('japan_admin' as UserRole))).toBe(true);
    });

    it('C4: role = user → false（普通用户无权）', () => {
      expect(canViewSensitiveCollaborationData(makeProfile('user'))).toBe(false);
    });
  });

  describe('canAccessChinaCollaborationView', () => {
    it('C5: role = china_collab → true（协作用户可访问）', () => {
      expect(canAccessChinaCollaborationView(makeProfile('china_collab' as UserRole))).toBe(true);
    });

    it('C6: role = jp_factory_manager → false（日方工厂经理不可访问）', () => {
      expect(canAccessChinaCollaborationView(makeProfile('jp_factory_manager' as UserRole))).toBe(false);
    });
  });
});
