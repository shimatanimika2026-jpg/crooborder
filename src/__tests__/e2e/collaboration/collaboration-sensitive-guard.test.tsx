/**
 * 协同视图敏感数据保护测试
 * 验证：协同页默认脱敏、未授权用户不能展开敏感数据
 */

import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ChinaCollaborationViewPage from '@/pages/ChinaCollaborationViewPage';
import { canViewSensitiveCollaborationData } from '@/lib/auth/permissions';
import type { Profile, UserRole } from '@/types/database';
import i18n from '@/i18n';

// 设置测试语言为中文
beforeAll(async () => {
  await i18n.changeLanguage('zh-CN');
});

// Mock Supabase
vi.mock('@/db/supabase', () => ({
  supabase: null,
  hasSupabaseEnv: false,
}));

// Mock AuthContext
const mockAuthContext = {
  user: { id: 'test-user', email: 'test@example.com' },
  profile: null as Profile | null,
  loading: false,
  signInWithUsername: vi.fn(),
  signUpWithUsername: vi.fn(),
  signOut: vi.fn(),
  refreshProfile: vi.fn(),
        signInAsDemo: vi.fn(),
};

vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthContext,
}));

describe('协同视图敏感数据保护测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('页面应默认不显示敏感数据区域', async () => {
    render(
      <BrowserRouter>
        <ChinaCollaborationViewPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/敏感数据区域/)).not.toBeInTheDocument();
    });
  });

  it('应显示"显示敏感数据"按钮', async () => {
    render(
      <BrowserRouter>
        <ChinaCollaborationViewPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /显示敏感数据/ });
      expect(button).toBeInTheDocument();
    });
  });

  it('未授权用户点击"显示敏感数据"应被阻止', async () => {
    // 设置未授权用户
    mockAuthContext.profile = {
      id: 'test-user',
      email: 'test@example.com',
      role: 'jp_warehouse_staff' as UserRole, // 非授权角色
      tenant_id: 'JP',
      username: 'test',
      full_name: null,
      phone: null,
      language_preference: 'ja-JP',
      organization_id: null,
      status: 'active',
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Profile;

    render(
      <BrowserRouter>
        <ChinaCollaborationViewPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /显示敏感数据/ });
      fireEvent.click(button);
    });

    // 验证敏感数据区域未显示
    await waitFor(() => {
      expect(screen.queryByText(/敏感数据区域/)).not.toBeInTheDocument();
    });
  });

  it('授权用户点击"显示敏感数据"应成功展开', async () => {
    // 设置授权用户
    mockAuthContext.profile = {
      id: 'test-user',
      email: 'admin@example.com',
      role: 'admin' as UserRole, // 授权角色
      tenant_id: 'JP',
      username: 'admin',
      full_name: null,
      phone: null,
      language_preference: 'ja-JP',
      organization_id: null,
      status: 'active',
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Profile;

    render(
      <BrowserRouter>
        <ChinaCollaborationViewPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /显示敏感数据/ });
      fireEvent.click(button);
    });

    // 验证敏感数据区域显示
    await waitFor(() => {
      expect(screen.getByText(/敏感数据区域/)).toBeInTheDocument();
    });
  });

  it('权限函数应正确判断用户权限', () => {
    // 测试未授权角色
    const unauthorizedProfile: Profile = {
      id: 'test-user',
      email: 'test@example.com',
      role: 'jp_warehouse_staff' as UserRole,
      tenant_id: 'JP',
      username: 'test',
      full_name: null,
      phone: null,
      language_preference: 'ja-JP',
      organization_id: null,
      status: 'active',
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(canViewSensitiveCollaborationData(unauthorizedProfile)).toBe(false);

    // 测试授权角色
    const authorizedProfiles = [
      { ...unauthorizedProfile, role: 'admin' as UserRole },
      { ...unauthorizedProfile, role: 'executive' as UserRole },
    ];

    authorizedProfiles.forEach((profile) => {
      expect(canViewSensitiveCollaborationData(profile)).toBe(true);
    });

    // 测试null profile
    expect(canViewSensitiveCollaborationData(null)).toBe(false);
  });

  it('页面标题和描述应支持国际化', async () => {
    render(
      <BrowserRouter>
        <ChinaCollaborationViewPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // 验证页面标题存在（中文或日文）
      const title = screen.getByText(/中国协同视图|中国協同ビュー/);
      expect(title).toBeInTheDocument();
    });
  });

  it('默认应显示汇总数据卡片', async () => {
    render(
      <BrowserRouter>
        <ChinaCollaborationViewPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // 验证汇总卡片存在
      expect(screen.getByText(/中国区生产状态|中国地区生産状況/)).toBeInTheDocument();
      expect(screen.getByText(/日本区组装状态|日本地区組立状況/)).toBeInTheDocument();
      expect(screen.getByText(/跨区域异常|地域横断異常/)).toBeInTheDocument();
      expect(screen.getByText(/物流状态|物流状況/)).toBeInTheDocument();
    });
  });
});
