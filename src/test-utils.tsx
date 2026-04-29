import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '@/contexts/AuthContext';
import { PermissionsProvider } from '@/contexts/PermissionsContext';
import { AppRoutes } from '@/AppRoutes';
import { Toaster } from 'sonner';

/**
 * mockSupabase — 测试文件中直接操控 Supabase mock 的引用
 *
 * 由于 `@/db/supabase` 在 `src/__tests__/setup.ts` 中被 vi.mock() 全局替换，
 * 任何文件 import 该模块都会得到 mock 对象。
 * 在此重导出 `supabase` 并重命名为 `mockSupabase`，方便页面单元测试调用
 * `.mockResolvedValueOnce()` / `.mockReturnValue()` 等 vi.fn() 方法。
 */
export { supabase as mockSupabase } from '@/db/supabase';

// Mock AuthContext 提供默认的 user 和 profile
vi.mock('@/contexts/AuthContext', async () => {
  const actual = await vi.importActual('@/contexts/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
      },
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
      signInWithUsername: vi.fn(async (username: string, password: string) => {
        const { supabase } = await import('@/db/supabase');
        const { error } = await supabase.auth.signInWithPassword({
          email: `${username}@miaoda.com`,
          password,
        });
        return { error };
      }),
      signUpWithUsername: vi.fn(async (username: string, password: string) => {
        const { supabase } = await import('@/db/supabase');
        const { error } = await supabase.auth.signUp({
          email: `${username}@miaoda.com`,
          password,
        });
        return { error };
      }),
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
      signInAsDemo: vi.fn(),
    }),
  };
});

interface AllTheProvidersProps {
  children: ReactNode;
}

/**
 * 统一测试渲染入口
 * 默认包含：Router、Auth、Permissions、Notification、Toaster
 */
const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PermissionsProvider>
          {children}
          <Toaster />
        </PermissionsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

/**
 * 自定义渲染函数
 * 自动包装所有必要的 Provider
 */
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// 重新导出所有 testing-library 的工具
export * from '@testing-library/react';
export { customRender as render };

/**
 * 工具函数：等待异步操作
 */
export const waitForLoadingToFinish = () => {
  return new Promise((resolve) => setTimeout(resolve, 0));
};

/**
 * 路由落点测试渲染函数
 *
 * 使用 MemoryRouter + AppRoutes 挂载完整路由栈，
 * 适用于启动回归、路由落点等需要验证真实路由导航的测试。
 * 不同于 render()（仅包 BrowserRouter）：此函数会真正运行路由守卫。
 *
 * @param initialPath 初始路由，例如 '/receiving'、'/config-error'
 */
export const renderWithRouting = (
  initialPath: string,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const Wrapper = () => (
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <PermissionsProvider>
          <AppRoutes />
        </PermissionsProvider>
      </AuthProvider>
    </MemoryRouter>
  );
  return render(<Wrapper />, options);
};

/**
 * 工具函数：创建 Mock 用户
 */
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  username: 'testuser',
  ...overrides,
});

/**
 * 工具函数：创建 Mock Profile
 */
export const createMockProfile = (overrides = {}) => ({
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
  ...overrides,
});
