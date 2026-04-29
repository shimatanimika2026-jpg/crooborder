import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils';
import LoginPage from '@/pages/LoginPage';

describe('LoginPage Smoke Test', () => {
  it('should render login page with title', () => {
    render(<LoginPage />);
    
    // 验证页面能打开（使用真实中文文案）
    expect(screen.getByText('登录')).toBeInTheDocument();
  });

  it('should have username input field', () => {
    render(<LoginPage />);
    
    // 验证用户名输入框存在（使用真实中文文案）
    const usernameInput = screen.getByPlaceholderText('用户名');
    expect(usernameInput).toBeInTheDocument();
    expect(usernameInput).toHaveAttribute('type', 'text');
  });

  it('should have password input field', () => {
    render(<LoginPage />);
    
    // 验证密码输入框存在（使用真实中文文案）
    const passwordInput = screen.getByPlaceholderText('密码');
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('should have login button', () => {
    render(<LoginPage />);
    
    // 验证登录按钮存在（使用真实中文文案）
    const loginButton = screen.getByRole('button', { name: '登录' });
    expect(loginButton).toBeInTheDocument();
    expect(loginButton).toHaveAttribute('type', 'submit');
  });

  it('should have switch to register link', () => {
    render(<LoginPage />);
    
    // 验证切换到注册的链接存在（使用真实中文文案）
    expect(screen.getByText('还没有账户？')).toBeInTheDocument();
    expect(screen.getByText('立即注册')).toBeInTheDocument();
  });
});
