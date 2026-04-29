import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { PermissionsProvider } from '@/contexts/PermissionsContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { AppRoutes } from '@/AppRoutes';
import { setTestMode } from '../setup';

/**
 * 路由落点 mock：提供已登录用户，确保受保护路由可正常渲染
 * 不在全局 setup 注入，仅作用于本文件。
 */
vi.mock('@/contexts/AuthContext', async () => {
  const actual = await vi.importActual('@/contexts/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: { id: 'test-user-id', email: 'test@example.com' },
      profile: {
        id: 'test-user-id',
        username: 'testuser',
        full_name: 'Test User',
        email: 'test@example.com',
        role: 'admin',
        tenant_id: 'CN',
        language_preference: 'zh-CN',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      updateProfile: vi.fn(),
    }),
  };
});

/**
 * 启动入口回归测试
 *
 * 策略：统一使用 MemoryRouter + AppRoutes，通过真实路由栈验证落点页面文案。
 * 每条用例在 beforeEach/afterEach 之外直接调用 setTestMode，
 * afterEach 通过 vi.unstubAllEnvs() 还原环境变量。
 */
describe('Startup Entry Regression', () => {
  /** 挂载完整路由栈，落点由 initialPath 决定 */
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
  });

  it('缺环境变量访问 / 应落到 /login 并显示登录页标题', async () => {
    setTestMode('missing-env');
    renderApp('/');

    await waitFor(
      () => {
        expect(screen.getByText('組立業務Web管理システム')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('访问 /config-error 应显示配置说明正文（配置步骤 + 详细文档入口）', async () => {
    setTestMode('real');
    renderApp('/config-error');

    await waitFor(
      () => {
        expect(screen.getByText('Supabase 配置说明')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(screen.getByText('配置步骤')).toBeInTheDocument();
    // 文档入口标题
    expect(screen.getByText('详细文档')).toBeInTheDocument();
  });

  it('Demo 模式访问 /receiving 应落到收货管理页并显示「收货管理」', async () => {
    // demo 模式：hasSupabaseEnv=true（路由放行），isDemoMode=true（演示标记）
    setTestMode('demo');
    renderApp('/receiving');

    await waitFor(
      () => {
        // 断言页面 <h1> 标题为 "收货管理"（排除侧边栏导航链接同名文本）
        expect(
          screen.getByRole('heading', { name: '收货管理', level: 1 })
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('缺环境变量访问未知路由 /unknown-path 应落到 /login 并显示登录页', async () => {
    setTestMode('missing-env');
    renderApp('/unknown-path-12345');

    await waitFor(
      () => {
        expect(screen.getByText('組立業務Web管理システム')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});
