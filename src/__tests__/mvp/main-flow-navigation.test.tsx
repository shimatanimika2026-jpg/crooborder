/**
 * MVP 主链测试组 2：主链关键路由跳转
 *
 * 覆盖范围：
 *   A. 未登录路由守卫（3 条）
 *      - 访问 /commission → 重定向到 /login
 *      - 访问 /production-plans → 重定向到 /login
 *      - 访问 / → 重定向到 /login
 *   B. 公开路由访问（2 条）
 *      - /login 无需登录可直接访问
 *      - /config-error 无需登录可直接访问
 *   C. 缺少环境变量（2 条）
 *      - 缺 env 访问 /commission → 落到 /login（渲染演示登录页 DemoLoginCard）
 *      - 缺 env 访问未知路由 → 落到 /login（渲染演示登录页 DemoLoginCard）
 *
 *   ⚠️ 入口规则：缺少 env 时系统进入演示模式，RouteGuard 将未认证访问一律重定向到 /login；
 *      /config-error 是可手动导航的配置说明页，任何路由守卫都不会自动跳转至此。
 *
 * 总计：7 条
 *
 * 注：使用 MemoryRouter + AppRoutes，AuthContext mock 在本文件内独立定义。
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { PermissionsProvider } from '@/contexts/PermissionsContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { AppRoutes } from '@/AppRoutes';
import { setTestMode } from '../setup';

// ─── 未登录 AuthContext mock ──────────────────────────────────────────────────
vi.mock('@/contexts/AuthContext', async () => {
  const actual = await vi.importActual('@/contexts/AuthContext');
  return {
    ...actual,
    // 默认：未登录（user = null）；各用例按需通过 vi.mocked(useAuth).mockReturnValue(...) 覆盖
    useAuth: vi.fn(() => ({
      user: null,
      profile: null,
      loading: false,
      signInWithUsername: vi.fn(),
      signUpWithUsername: vi.fn(),
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
        signInAsDemo: vi.fn(),
    })),
  };
});

import { useAuth } from '@/contexts/AuthContext';

// ─── 挂载完整路由栈 ────────────────────────────────────────────────────────────
const renderApp = (initialPath: string) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <PermissionsProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </PermissionsProvider>
      </AuthProvider>
    </MemoryRouter>
  );

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════
// A. 未登录路由守卫
// ═══════════════════════════════════════════════════════════════
describe('A. 未登录时受保护路由重定向', () => {
  it('A1: 未登录访问 /commission → 重定向到登录页', async () => {
    setTestMode('real');
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

    renderApp('/commission');

    await waitFor(
      () => {
        // 登录页有"登录"按钮
        const loginBtn = screen.queryByRole('button', { name: /登录|login/i });
        expect(loginBtn).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('A2: 未登录访问 /production-plans → 重定向到登录页', async () => {
    setTestMode('real');
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

    renderApp('/production-plans');

    await waitFor(
      () => {
        const loginBtn = screen.queryByRole('button', { name: /登录|login/i });
        expect(loginBtn).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('A3: 未登录访问根路径 / → 重定向到登录页', async () => {
    setTestMode('real');
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

    renderApp('/');

    await waitFor(
      () => {
        const loginBtn = screen.queryByRole('button', { name: /登录|login/i });
        expect(loginBtn).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// B. 公开路由（无需登录可直接访问）
// ═══════════════════════════════════════════════════════════════
describe('B. 公开路由任何人可访问', () => {
  it('B1: 直接访问 /login → 渲染登录页（有登录按钮）', async () => {
    setTestMode('real');

    renderApp('/login');

    await waitFor(
      () => {
        const loginBtn = screen.queryByRole('button', { name: /登录|login/i });
        expect(loginBtn).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('B2: 直接访问 /config-error → 渲染配置说明页', async () => {
    setTestMode('real');

    renderApp('/config-error');

    await waitFor(
      () => {
        expect(screen.getByText('Supabase 配置说明')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// C. 缺少环境变量 → 落到登录页（演示模式入口）
// ═══════════════════════════════════════════════════════════════
describe('C. 缺少环境变量 → 落到 /login（演示模式）', () => {
  it('C1: 缺 env 访问 /commission → 落到登录页', async () => {
    setTestMode('missing-env');

    renderApp('/commission');

    await waitFor(
      () => {
        expect(screen.getByText('組立業務Web管理システム')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('C2: 缺 env 访问未知路由 /unknown-xyz → 落到登录页', async () => {
    setTestMode('missing-env');

    renderApp('/unknown-xyz');

    await waitFor(
      () => {
        expect(screen.getByText('組立業務Web管理システム')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});
