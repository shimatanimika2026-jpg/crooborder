import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import LoginPage from '@/pages/LoginPage';
import { mockSupabase } from '@/test-utils';
import { toast } from 'sonner';

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该渲染登录表单', () => {
    render(<LoginPage />);

    expect(screen.getByText('組立業務Web管理システム')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/用户名/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/密码/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /登录/i })).toBeInTheDocument();
  });

  it('应该使用浏览器必填校验阻止空表单提交', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /登录/i }));

    expect(screen.getByPlaceholderText(/用户名/i)).toBeRequired();
    expect(screen.getByPlaceholderText(/密码/i)).toBeRequired();
    expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('应该处理成功登录', async () => {
    const user = userEvent.setup();
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user: { id: 'test-user-id', email: 'test@example.com' },
        session: { access_token: 'test-token' },
      },
      error: null,
    });

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText(/用户名/i), 'testuser');
    await user.type(screen.getByPlaceholderText(/密码/i), 'password123');
    await user.click(screen.getByRole('button', { name: /登录/i }));

    await waitFor(() => {
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'testuser@miaoda.com',
        password: 'password123',
      });
    });
  });

  it('应该处理登录失败', async () => {
    const user = userEvent.setup();
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: '用户名或密码错误' },
    });

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText(/用户名/i), 'wronguser');
    await user.type(screen.getByPlaceholderText(/密码/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /登录/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('登录失败: 用户名或密码错误');
    });
  });

  it('密码输入框应该默认隐藏内容', () => {
    render(<LoginPage />);

    expect(screen.getByPlaceholderText(/密码/i)).toHaveAttribute('type', 'password');
  });

  it('应该在加载时禁用登录按钮', async () => {
    const user = userEvent.setup();
    mockSupabase.auth.signInWithPassword.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: null, error: null }), 1000)),
    );

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText(/用户名/i), 'testuser');
    await user.type(screen.getByPlaceholderText(/密码/i), 'password123');
    const loginButton = screen.getByRole('button', { name: /登录/i });
    await user.click(loginButton);

    expect(loginButton).toBeDisabled();
  });

  it('应该显示注册链接', () => {
    render(<LoginPage />);

    expect(screen.getByText(/立即注册/i)).toBeInTheDocument();
  });

  it('应该支持键盘导航', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const usernameInput = screen.getByPlaceholderText(/用户名/i);
    const passwordInput = screen.getByPlaceholderText(/密码/i);

    await user.tab();
    expect(usernameInput).toHaveFocus();

    await user.tab();
    expect(passwordInput).toHaveFocus();
  });
});
