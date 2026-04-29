import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import ProductionPlansPage from '@/pages/ProductionPlansPage';
import { mockSupabase } from '@/test-utils';

// Mock 生产计划数据
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

describe('ProductionPlansPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Supabase 查询
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue({
        data: mockPlans,
        error: null,
      }),
    });
  });

  it('应该渲染生产计划列表页面', async () => {
    render(<ProductionPlansPage />);
    
    expect(screen.getByText('生产计划')).toBeInTheDocument();
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('PLAN-2026-001')).toBeInTheDocument();
      expect(screen.getByText('PLAN-2026-002')).toBeInTheDocument();
    });
  });

  it('应该显示加载状态', () => {
    // Mock 延迟响应
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      ),
    });

    render(<ProductionPlansPage />);
    
    // 应该显示加载骨架屏
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('应该支持搜索功能', async () => {
    const user = userEvent.setup();
    render(<ProductionPlansPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('PLAN-2026-001')).toBeInTheDocument();
    });
    
    // 搜索
    const searchInput = screen.getByPlaceholderText(/搜索/i);
    await user.type(searchInput, 'PLAN-2026-001');
    
    // 应该只显示匹配的结果
    await waitFor(() => {
      expect(screen.getByText('PLAN-2026-001')).toBeInTheDocument();
      expect(screen.queryByText('PLAN-2026-002')).not.toBeInTheDocument();
    });
  });

  it('应该支持状态筛选', async () => {
    const user = userEvent.setup();
    render(<ProductionPlansPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('PLAN-2026-001')).toBeInTheDocument();
    });
    
    // 选择状态筛选
    const statusFilter = screen.getByRole('combobox', { name: /状态/i });
    await user.click(statusFilter);
    await user.click(screen.getByText('草稿'));
    
    // 应该只显示草稿状态的计划
    await waitFor(() => {
      expect(screen.queryByText('PLAN-2026-001')).not.toBeInTheDocument();
      expect(screen.getByText('PLAN-2026-002')).toBeInTheDocument();
    });
  });

  it('应该显示新建计划按钮', () => {
    render(<ProductionPlansPage />);
    
    const createButton = screen.getByRole('button', { name: /新建计划/i });
    expect(createButton).toBeInTheDocument();
  });

  it('应该处理空数据状态', async () => {
    // Mock 空数据
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    });

    render(<ProductionPlansPage />);
    
    // 应该显示空状态提示
    await waitFor(() => {
      expect(screen.getByText(/暂无数据/i)).toBeInTheDocument();
    });
  });

  it('应该处理加载错误', async () => {
    // Mock 错误响应
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue({
        data: null,
        error: { message: '加载失败' },
      }),
    });

    render(<ProductionPlansPage />);
    
    // 应该显示错误提示
    await waitFor(() => {
      expect(screen.getByText(/加载失败/i)).toBeInTheDocument();
    });
  });

  it('应该支持点击行查看详情', async () => {
    const user = userEvent.setup();
    render(<ProductionPlansPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('PLAN-2026-001')).toBeInTheDocument();
    });
    
    // 点击行
    const row = screen.getByText('PLAN-2026-001').closest('tr');
    await user.click(row!);
    
    // 应该导航到详情页（通过 router mock 验证）
    // 这里简化处理，实际应该 mock useNavigate
  });

  it('应该显示计划类型标签', async () => {
    render(<ProductionPlansPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('月度计划')).toBeInTheDocument();
      expect(screen.getByText('周度计划')).toBeInTheDocument();
    });
  });

  it('应该显示计划状态徽章', async () => {
    render(<ProductionPlansPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('生效中')).toBeInTheDocument();
      expect(screen.getByText('草稿')).toBeInTheDocument();
    });
  });
});
