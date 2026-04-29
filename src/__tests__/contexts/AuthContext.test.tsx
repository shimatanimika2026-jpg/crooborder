import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase as mockSupabase } from '@/db/supabase';

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  ...overrides,
});

const createMockProfile = (overrides = {}) => ({
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

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该提供初始 auth 状态', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('应该在用户登录后更新状态', async () => {
    const mockUser = createMockUser();
    const mockProfile = createMockProfile();

    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          user: mockUser,
          access_token: 'test-token',
        },
      },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.loading).toBe(false);
    });
  });

  it('应该处理未登录状态', async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.profile).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  it('应该在 profile 不存在时创建新 profile', async () => {
    const mockUser = createMockUser();
    const mockProfile = createMockProfile();

    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          user: mockUser,
          access_token: 'test-token',
        },
      },
      error: null,
    });

    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    });

    mockSupabase.from.mockReturnValueOnce({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.profile).toEqual(mockProfile);
    });
  });

  it('应该监听 auth 状态变化', async () => {
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });

    renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
    });
  });

  it('应该处理 profile 加载错误', async () => {
    const mockUser = createMockUser();

    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          user: mockUser,
          access_token: 'test-token',
        },
      },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { message: '加载失败' },
      }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.profile).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  it('应该提供 refreshProfile 方法', async () => {
    const mockUser = createMockUser();
    const mockProfile = createMockProfile();

    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          user: mockUser,
          access_token: 'test-token',
        },
      },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: mockProfile,
        error: null,
      }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.refreshProfile).toBeDefined();
      expect(result.current.user).toEqual(mockUser);
    });

    await result.current.refreshProfile();

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    });
  });

  it('应该在组件卸载时清理订阅', () => {
    const unsubscribe = vi.fn();
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe,
        },
      },
    });

    const { unmount } = renderHook(() => useAuth(), { wrapper });

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
