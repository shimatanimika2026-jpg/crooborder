import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';

/**
 * 入口 + 主链冒烟测试
 *
 * 验收目标（对应 KNOWN_ISSUES.md 第零节条件 1）：
 *   访问 `/` → 出现登录页，而非配置说明页
 *   进入演示模式后 → 委托/生产/收货/异常四条主链均可打开
 *
 * 注意：test-utils 已全局 mock useAuth（返回已登录管理员用户），
 * 因此各业务页面可直接渲染，无需登录流程。
 */

// ─────────────────────────────────────────────────────────────
// 1. 入口：访问根路径 → 登录页（非配置说明页）
// ─────────────────────────────────────────────────────────────
describe('入口：访问 / → 登录页', () => {
  it('LoginPage 渲染后显示系统标题，不出现 Supabase 配置说明文字', async () => {
    const LoginPage = (await import('@/pages/LoginPage')).default;

    render(<LoginPage />);

    // 系统标题必须存在
    await waitFor(() => {
      expect(screen.getByText('組立業務Web管理システム')).toBeInTheDocument();
    });

    // 不能出现 Supabase env var 提示（修复前会出现这些字样）
    expect(screen.queryByText(/VITE_SUPABASE_URL/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/VITE_SUPABASE_ANON_KEY/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/配置说明/i)).not.toBeInTheDocument();
  });

  it('LoginPage 包含可操作的入口按钮（登录 或 进入系统）', async () => {
    const LoginPage = (await import('@/pages/LoginPage')).default;

    render(<LoginPage />);

    await waitFor(() => {
      const buttons = screen.queryAllByRole('button');
      // 至少存在一个 button，确保入口没有被配置页阻断
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// 2. 主链：委托管理
// ─────────────────────────────────────────────────────────────
describe('主链：委托管理', () => {
  it('CommissionListPage 渲染并显示「委托列表」标题', async () => {
    const CommissionListPage = (await import('@/pages/CommissionListPage')).default;

    render(<CommissionListPage />);

    await waitFor(() => {
      expect(screen.getByText('委托列表')).toBeInTheDocument();
    });
  });

  it('CommissionListPage 包含可操作按钮', async () => {
    const CommissionListPage = (await import('@/pages/CommissionListPage')).default;

    render(<CommissionListPage />);

    await waitFor(() => {
      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// 3. 主链：生产计划
// ─────────────────────────────────────────────────────────────
describe('主链：生产计划', () => {
  it('ProductionPlansPage 渲染并显示「生产计划」文字', async () => {
    const ProductionPlansPage = (await import('@/pages/ProductionPlansPage')).default;

    render(<ProductionPlansPage />);

    await waitFor(() => {
      const matches = screen.queryAllByText(/生产计划/i);
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  it('ProductionPlansPage 包含可操作按钮', async () => {
    const ProductionPlansPage = (await import('@/pages/ProductionPlansPage')).default;

    render(<ProductionPlansPage />);

    await waitFor(() => {
      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// 4. 主链：收货管理
// ─────────────────────────────────────────────────────────────
describe('主链：收货管理', () => {
  it('ReceivingListPage 渲染并显示「收货管理」标题', async () => {
    const ReceivingListPage = (await import('@/pages/ReceivingListPage')).default;

    render(<ReceivingListPage />);

    await waitFor(() => {
      const matches = screen.queryAllByText(/收货管理/i);
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  it('ReceivingListPage 包含可操作按钮', async () => {
    const ReceivingListPage = (await import('@/pages/ReceivingListPage')).default;

    render(<ReceivingListPage />);

    await waitFor(() => {
      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// 5. 主链：异常中心
// ─────────────────────────────────────────────────────────────
describe('主链：异常中心', () => {
  it('ExceptionCenterPage 渲染并显示「异常中心」标题', async () => {
    const ExceptionCenterPage = (await import('@/pages/ExceptionCenterPage')).default;

    render(<ExceptionCenterPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: '异常中心', level: 1 })
      ).toBeInTheDocument();
    });
  });

  it('ExceptionCenterPage 包含可操作按钮', async () => {
    const ExceptionCenterPage = (await import('@/pages/ExceptionCenterPage')).default;

    render(<ExceptionCenterPage />);

    await waitFor(() => {
      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
