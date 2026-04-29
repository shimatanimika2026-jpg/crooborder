import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import ReceivingListPage from '@/pages/ReceivingListPage';
import { mockSupabase } from '@/test-utils';

// Mock 收货记录数据
const mockReceivings = [
  {
    id: 1,
    receiving_no: 'RCV-2026-001',
    shipment_no: 'ASN-2026-001',
    receiving_date: '2026-04-05',
    status: 'completed',
    received_packages: 10,
    has_variance: false,
    iqc_completed: true,
    created_at: '2026-04-05T00:00:00Z',
  },
  {
    id: 2,
    receiving_no: 'RCV-2026-002',
    shipment_no: 'ASN-2026-002',
    receiving_date: '2026-04-15',
    status: 'variance_pending',
    received_packages: 18,
    has_variance: true,
    iqc_completed: false,
    created_at: '2026-04-15T00:00:00Z',
  },
];

describe('ReceivingListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Supabase 查询
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue({
        data: mockReceivings,
        error: null,
      }),
    });
  });

  it('应该渲染收货记录列表页面', async () => {
    render(<ReceivingListPage />);
    
    expect(screen.getByText('收货记录')).toBeInTheDocument();
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('RCV-2026-001')).toBeInTheDocument();
      expect(screen.getByText('RCV-2026-002')).toBeInTheDocument();
    });
  });

  it('应该显示收货状态', async () => {
    render(<ReceivingListPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('已完成')).toBeInTheDocument();
      expect(screen.getByText('差异待处理')).toBeInTheDocument();
    });
  });

  it('应该显示关联的 ASN 单号', async () => {
    render(<ReceivingListPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('ASN-2026-001')).toBeInTheDocument();
      expect(screen.getByText('ASN-2026-002')).toBeInTheDocument();
    });
  });

  it('应该显示差异标识', async () => {
    render(<ReceivingListPage />);
    
    // 等待数据加载
    await waitFor(() => {
      // 有差异的记录应该有特殊标识
      const varianceRow = screen.getByText('RCV-2026-002').closest('tr');
      expect(varianceRow).toHaveClass('bg-yellow-50');
    });
  });

  it('应该显示 IQC 状态', async () => {
    render(<ReceivingListPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('已完成')).toBeInTheDocument();
      expect(screen.getByText('待检验')).toBeInTheDocument();
    });
  });

  it('应该支持搜索功能', async () => {
    const user = userEvent.setup();
    render(<ReceivingListPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('RCV-2026-001')).toBeInTheDocument();
    });
    
    // 搜索
    const searchInput = screen.getByPlaceholderText(/搜索/i);
    await user.type(searchInput, 'RCV-2026-001');
    
    // 应该只显示匹配的结果
    await waitFor(() => {
      expect(screen.getByText('RCV-2026-001')).toBeInTheDocument();
      expect(screen.queryByText('RCV-2026-002')).not.toBeInTheDocument();
    });
  });

  it('应该支持状态筛选', async () => {
    const user = userEvent.setup();
    render(<ReceivingListPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('RCV-2026-001')).toBeInTheDocument();
    });
    
    // 选择状态筛选
    const statusFilter = screen.getByRole('combobox', { name: /状态/i });
    await user.click(statusFilter);
    await user.click(screen.getByText('差异待处理'));
    
    // 应该只显示差异待处理的记录
    await waitFor(() => {
      expect(screen.queryByText('RCV-2026-001')).not.toBeInTheDocument();
      expect(screen.getByText('RCV-2026-002')).toBeInTheDocument();
    });
  });

  it('应该显示新建收货按钮', () => {
    render(<ReceivingListPage />);
    
    const createButton = screen.getByRole('button', { name: /新建收货/i });
    expect(createButton).toBeInTheDocument();
  });

  it('应该显示收货箱数', async () => {
    render(<ReceivingListPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('18')).toBeInTheDocument();
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

    render(<ReceivingListPage />);
    
    // 应该显示空状态提示
    await waitFor(() => {
      expect(screen.getByText(/暂无数据/i)).toBeInTheDocument();
    });
  });

  it('应该支持点击行查看详情', async () => {
    const user = userEvent.setup();
    render(<ReceivingListPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('RCV-2026-001')).toBeInTheDocument();
    });
    
    // 点击行
    const row = screen.getByText('RCV-2026-001').closest('tr');
    await user.click(row!);
    
    // 应该导航到详情页
  });

  it('应该高亮显示有差异的记录', async () => {
    render(<ReceivingListPage />);
    
    // 等待数据加载
    await waitFor(() => {
      const varianceRow = screen.getByText('RCV-2026-002').closest('tr');
      expect(varianceRow).toHaveClass('bg-yellow-50');
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

    render(<ReceivingListPage />);
    
    // 应该显示错误提示
    await waitFor(() => {
      expect(screen.getByText(/加载失败/i)).toBeInTheDocument();
    });
  });
});
