import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import ProductionPlansPage from '@/pages/ProductionPlansPage';
import { mockSupabase } from '@/test-utils';

const mockPlans = [
  {
    id: 1,
    plan_code: 'PLAN-2026-001',
    plan_type: 'monthly',
    production_quantity: 100,
    status: 'active',
    plan_period_start: '2026-04-01',
    plan_period_end: '2026-04-30',
    created_at: '2026-04-01T00:00:00Z',
  },
  {
    id: 2,
    plan_code: 'PLAN-2026-002',
    plan_type: 'weekly',
    production_quantity: 50,
    status: 'draft',
    plan_period_start: '2026-04-15',
    plan_period_end: '2026-04-21',
    created_at: '2026-04-15T00:00:00Z',
  },
];

const mockPlansQuery = (result: { data: typeof mockPlans | null; error: unknown }) => ({
  select: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  then: vi.fn((resolve) => resolve(result)),
});

describe('ProductionPlansPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(mockPlansQuery({ data: mockPlans, error: null }));
  });

  it('应该渲染生产计划列表页面', async () => {
    render(<ProductionPlansPage />);

    expect(screen.getByText('生产计划')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('PLAN-2026-001')).toBeInTheDocument();
      expect(screen.getByText('PLAN-2026-002')).toBeInTheDocument();
    });
  });

  it('应该显示加载状态', () => {
    mockSupabase.from.mockReturnValue({
      ...mockPlansQuery({ data: mockPlans, error: null }),
      then: vi.fn(),
    });

    const { container } = render(<ProductionPlansPage />);

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('应该支持搜索功能', async () => {
    const user = userEvent.setup();
    render(<ProductionPlansPage />);

    await screen.findByText('PLAN-2026-001');

    const searchInput = screen.getByPlaceholderText(/搜索/i);
    await user.type(searchInput, 'PLAN-2026-001');

    expect(screen.getByText('PLAN-2026-001')).toBeInTheDocument();
    expect(screen.queryByText('PLAN-2026-002')).not.toBeInTheDocument();
  });

  it('应该显示状态筛选控件', async () => {
    render(<ProductionPlansPage />);

    await screen.findByText('PLAN-2026-001');

    expect(screen.getByRole('combobox')).toHaveTextContent('全部状态');
  });

  it('应该显示新建按钮', () => {
    render(<ProductionPlansPage />);

    expect(screen.getByRole('button', { name: /新建/i })).toBeInTheDocument();
  });

  it('应该处理空数据状态', async () => {
    mockSupabase.from.mockReturnValue(mockPlansQuery({ data: [], error: null }));

    render(<ProductionPlansPage />);

    expect(await screen.findByText(/暂无数据/i)).toBeInTheDocument();
  });

  it('应该处理加载错误', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockSupabase.from.mockReturnValue(mockPlansQuery({ data: null, error: { message: '加载失败' } }));

    render(<ProductionPlansPage />);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalled();
    });
    consoleError.mockRestore();
  });

  it('应该支持点击行查看详情', async () => {
    const user = userEvent.setup();
    render(<ProductionPlansPage />);

    await screen.findByText('PLAN-2026-001');
    const row = screen.getByText('PLAN-2026-001').closest('tr');
    await user.click(row!);
  });

  it('应该显示计划类型标签', async () => {
    render(<ProductionPlansPage />);

    expect(await screen.findByText('月度计划')).toBeInTheDocument();
    expect(screen.getByText('周度计划')).toBeInTheDocument();
  });

  it('应该显示计划状态徽章', async () => {
    render(<ProductionPlansPage />);

    expect(await screen.findByText('PLAN-2026-001')).toBeInTheDocument();
    const row = screen.getByText('PLAN-2026-001').closest('tr');
    expect(row?.textContent).toContain('PLAN-2026-001');
    expect(row?.querySelector('span')).toBeTruthy();
    expect(screen.getByText('草稿')).toBeInTheDocument();
  });
});
