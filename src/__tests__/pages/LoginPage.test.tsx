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

  it('应该显示必填字段验证错误', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    
    const loginButton = screen.getByRole('button', { name: /登录/i });
    await user.click(loginButton);
    
    // 应该显示验证错误
    await waitFor(() => {
      expect(screen.getByText(/请输入用户名/i)).toBeInTheDocument();
    });
  });

  it('应该处理成功登录', async () => {
    const user = userEvent.setup();
    
    // Mock 成功的登录响应
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user: { id: 'test-user-id', email: 'test@example.com' },
        session: { access_token: 'test-token' },
      },
      error: null,
    });

    render(<LoginPage />);
    
    // 填写表单
    const usernameInput = screen.getByPlaceholderText(/用户名/i);
    const passwordInput = screen.getByPlaceholderText(/密码/i);
    const loginButton = screen.getByRole('button', { name: /登录/i });
    
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.click(loginButton);
    
    // 验证登录成功
    await waitFor(() => {
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'testuser@assembly.local',
        password: 'password123',
      });
    });
  });

  it('应该处理登录失败', async () => {
    const user = userEvent.setup();
    
    // Mock 失败的登录响应
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: '用户名或密码错误' },
    });

    render(<LoginPage />);
    
    // 填写表单
    const usernameInput = screen.getByPlaceholderText(/用户名/i);
    const passwordInput = screen.getByPlaceholderText(/密码/i);
    const loginButton = screen.getByRole('button', { name: /登录/i });
    
    await user.type(usernameInput, 'wronguser');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(loginButton);
    
    // 验证错误提示
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('登录失败');
    });
  });

  it('应该切换密码可见性', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    
    const passwordInput = screen.getByPlaceholderText(/密码/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');
    
    // 点击显示密码按钮
    const toggleButton = screen.getByRole('button', { name: /显示密码/i });
    await user.click(toggleButton);
    
    // 密码应该可见
    await waitFor(() => {
      expect(passwordInput.type).toBe('text');
    });
  });

  it('应该在加载时禁用登录按钮', async () => {
    const user = userEvent.setup();
    
    // Mock 延迟响应
    mockSupabase.auth.signInWithPassword.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<LoginPage />);
    
    const usernameInput = screen.getByPlaceholderText(/用户名/i);
    const passwordInput = screen.getByPlaceholderText(/密码/i);
    const loginButton = screen.getByRole('button', { name: /登录/i });
    
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.click(loginButton);
    
    // 登录按钮应该被禁用
    expect(loginButton).toBeDisabled();
  });

  it('应该显示注册链接', () => {
    render(<LoginPage />);
    
    const registerLink = screen.getByText(/立即注册/i);
    expect(registerLink).toBeInTheDocument();
  });

  it('应该支持键盘导航', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    
    const usernameInput = screen.getByPlaceholderText(/用户名/i);
    const passwordInput = screen.getByPlaceholderText(/密码/i);
    
    // Tab 导航
    await user.tab();
    expect(usernameInput).toHaveFocus();
    
    await user.tab();
    expect(passwordInput).toHaveFocus();
  });
});
