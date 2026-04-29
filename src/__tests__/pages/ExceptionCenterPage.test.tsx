import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import ExceptionCenterPage from '@/pages/ExceptionCenterPage';
import { mockSupabase } from '@/test-utils';

// Mock 异常数据
const mockExceptions = [
  {
    id: 1,
    exception_no: 'EXC-2026-001',
    exception_type: 'quality',
    severity: 'high',
    status: 'open',
    title: '零件质量异常',
    description: '控制盒外壳有划痕',
    source_module: 'iqc',
    source_record_id: '123',
    created_at: '2026-04-01T00:00:00Z',
  },
  {
    id: 2,
    exception_no: 'EXC-2026-002',
    exception_type: 'logistics',
    severity: 'medium',
    status: 'in_progress',
    title: '物流延迟',
    description: '货物未按时到达',
    source_module: 'asn',
    source_record_id: '456',
    created_at: '2026-04-10T00:00:00Z',
  },
  {
    id: 3,
    exception_no: 'EXC-2026-003',
    exception_type: 'production',
    severity: 'low',
    status: 'resolved',
    title: '生产计划调整',
    description: '需要调整生产顺序',
    source_module: 'production',
    source_record_id: '789',
    created_at: '2026-04-15T00:00:00Z',
  },
];

describe('ExceptionCenterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Supabase 查询
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue({
        data: mockExceptions,
        error: null,
      }),
    });
  });

  it('应该渲染异常中心页面', async () => {
    render(<ExceptionCenterPage />);
    
    expect(screen.getByText('异常中心')).toBeInTheDocument();
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('EXC-2026-001')).toBeInTheDocument();
      expect(screen.getByText('EXC-2026-002')).toBeInTheDocument();
      expect(screen.getByText('EXC-2026-003')).toBeInTheDocument();
    });
  });

  it('应该显示异常类型', async () => {
    render(<ExceptionCenterPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('质量异常')).toBeInTheDocument();
      expect(screen.getByText('物流异常')).toBeInTheDocument();
      expect(screen.getByText('生产异常')).toBeInTheDocument();
    });
  });

  it('应该显示严重程度', async () => {
    render(<ExceptionCenterPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('高')).toBeInTheDocument();
      expect(screen.getByText('中')).toBeInTheDocument();
      expect(screen.getByText('低')).toBeInTheDocument();
    });
  });

  it('应该显示异常状态', async () => {
    render(<ExceptionCenterPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('待处理')).toBeInTheDocument();
      expect(screen.getByText('处理中')).toBeInTheDocument();
      expect(screen.getByText('已解决')).toBeInTheDocument();
    });
  });

  it('应该支持按类型筛选', async () => {
    const user = userEvent.setup();
    render(<ExceptionCenterPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('EXC-2026-001')).toBeInTheDocument();
    });
    
    // 选择类型筛选
    const typeFilter = screen.getByRole('combobox', { name: /类型/i });
    await user.click(typeFilter);
    await user.click(screen.getByText('质量异常'));
    
    // 应该只显示质量异常
    await waitFor(() => {
      expect(screen.getByText('EXC-2026-001')).toBeInTheDocument();
      expect(screen.queryByText('EXC-2026-002')).not.toBeInTheDocument();
      expect(screen.queryByText('EXC-2026-003')).not.toBeInTheDocument();
    });
  });

  it('应该支持按严重程度筛选', async () => {
    const user = userEvent.setup();
    render(<ExceptionCenterPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('EXC-2026-001')).toBeInTheDocument();
    });
    
    // 选择严重程度筛选
    const severityFilter = screen.getByRole('combobox', { name: /严重程度/i });
    await user.click(severityFilter);
    await user.click(screen.getByText('高'));
    
    // 应该只显示高严重程度的异常
    await waitFor(() => {
      expect(screen.getByText('EXC-2026-001')).toBeInTheDocument();
      expect(screen.queryByText('EXC-2026-002')).not.toBeInTheDocument();
      expect(screen.queryByText('EXC-2026-003')).not.toBeInTheDocument();
    });
  });

  it('应该支持按状态筛选', async () => {
    const user = userEvent.setup();
    render(<ExceptionCenterPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('EXC-2026-001')).toBeInTheDocument();
    });
    
    // 选择状态筛选
    const statusFilter = screen.getByRole('combobox', { name: /状态/i });
    await user.click(statusFilter);
    await user.click(screen.getByText('待处理'));
    
    // 应该只显示待处理的异常
    await waitFor(() => {
      expect(screen.getByText('EXC-2026-001')).toBeInTheDocument();
      expect(screen.queryByText('EXC-2026-002')).not.toBeInTheDocument();
      expect(screen.queryByText('EXC-2026-003')).not.toBeInTheDocument();
    });
  });

  it('应该支持搜索功能', async () => {
    const user = userEvent.setup();
    render(<ExceptionCenterPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('EXC-2026-001')).toBeInTheDocument();
    });
    
    // 搜索
    const searchInput = screen.getByPlaceholderText(/搜索/i);
    await user.type(searchInput, '质量');
    
    // 应该只显示匹配的结果
    await waitFor(() => {
      expect(screen.getByText('EXC-2026-001')).toBeInTheDocument();
      expect(screen.queryByText('EXC-2026-002')).not.toBeInTheDocument();
      expect(screen.queryByText('EXC-2026-003')).not.toBeInTheDocument();
    });
  });

  it('应该显示异常标题和描述', async () => {
    render(<ExceptionCenterPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('零件质量异常')).toBeInTheDocument();
      expect(screen.getByText('控制盒外壳有划痕')).toBeInTheDocument();
    });
  });

  it('应该高亮显示高严重程度异常', async () => {
    render(<ExceptionCenterPage />);
    
    // 等待数据加载
    await waitFor(() => {
      const highSeverityRow = screen.getByText('EXC-2026-001').closest('tr');
      expect(highSeverityRow).toHaveClass('bg-red-50');
    });
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

    render(<ExceptionCenterPage />);
    
    // 应该显示空状态提示
    await waitFor(() => {
      expect(screen.getByText(/暂无异常/i)).toBeInTheDocument();
    });
  });

  it('应该支持点击行查看详情', async () => {
    const user = userEvent.setup();
    render(<ExceptionCenterPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('EXC-2026-001')).toBeInTheDocument();
    });
    
    // 点击行
    const row = screen.getByText('EXC-2026-001').closest('tr');
    await user.click(row!);
    
    // 应该导航到详情页
  });

  it('应该显示统计信息', async () => {
    render(<ExceptionCenterPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('总异常数')).toBeInTheDocument();
      expect(screen.getByText('待处理')).toBeInTheDocument();
      expect(screen.getByText('处理中')).toBeInTheDocument();
      expect(screen.getByText('已解决')).toBeInTheDocument();
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

    render(<ExceptionCenterPage />);
    
    // 应该显示错误提示
    await waitFor(() => {
      expect(screen.getByText(/加载失败/i)).toBeInTheDocument();
    });
  });
});
