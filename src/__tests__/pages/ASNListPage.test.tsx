import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import ASNListPage from '@/pages/ASNListPage';
import { mockSupabase } from '@/test-utils';

// Mock ASN 数据
const mockASNs = [
  {
    id: 1,
    shipment_no: 'ASN-2026-001',
    shipment_date: '2026-04-01',
    eta_date: '2026-04-05',
    status: 'in_transit',
    carrier: '顺丰速运',
    tracking_no: 'SF1234567890',
    total_boxes: 10,
    created_at: '2026-04-01T00:00:00Z',
  },
  {
    id: 2,
    shipment_no: 'ASN-2026-002',
    shipment_date: '2026-04-10',
    eta_date: '2026-04-15',
    status: 'draft',
    carrier: '中远海运',
    tracking_no: 'COSCO9876543210',
    total_boxes: 20,
    created_at: '2026-04-10T00:00:00Z',
  },
];

describe('ASNListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Supabase 查询
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue({
        data: mockASNs,
        error: null,
      }),
    });
  });

  it('应该渲染 ASN 列表页面', async () => {
    render(<ASNListPage />);
    
    expect(screen.getByText('发货通知单')).toBeInTheDocument();
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('ASN-2026-001')).toBeInTheDocument();
      expect(screen.getByText('ASN-2026-002')).toBeInTheDocument();
    });
  });

  it('应该显示 ASN 状态', async () => {
    render(<ASNListPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('在途')).toBeInTheDocument();
      expect(screen.getByText('草稿')).toBeInTheDocument();
    });
  });

  it('应该显示承运商信息', async () => {
    render(<ASNListPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('顺丰速运')).toBeInTheDocument();
      expect(screen.getByText('中远海运')).toBeInTheDocument();
    });
  });

  it('应该显示追踪号', async () => {
    render(<ASNListPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('SF1234567890')).toBeInTheDocument();
      expect(screen.getByText('COSCO9876543210')).toBeInTheDocument();
    });
  });

  it('应该支持搜索功能', async () => {
    const user = userEvent.setup();
    render(<ASNListPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('ASN-2026-001')).toBeInTheDocument();
    });
    
    // 搜索
    const searchInput = screen.getByPlaceholderText(/搜索/i);
    await user.type(searchInput, 'ASN-2026-001');
    
    // 应该只显示匹配的结果
    await waitFor(() => {
      expect(screen.getByText('ASN-2026-001')).toBeInTheDocument();
      expect(screen.queryByText('ASN-2026-002')).not.toBeInTheDocument();
    });
  });

  it('应该支持状态筛选', async () => {
    const user = userEvent.setup();
    render(<ASNListPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('ASN-2026-001')).toBeInTheDocument();
    });
    
    // 选择状态筛选
    const statusFilter = screen.getByRole('combobox', { name: /状态/i });
    await user.click(statusFilter);
    await user.click(screen.getByText('在途'));
    
    // 应该只显示在途状态的 ASN
    await waitFor(() => {
      expect(screen.getByText('ASN-2026-001')).toBeInTheDocument();
      expect(screen.queryByText('ASN-2026-002')).not.toBeInTheDocument();
    });
  });

  it('应该显示新建 ASN 按钮', () => {
    render(<ASNListPage />);
    
    const createButton = screen.getByRole('button', { name: /新建 ASN/i });
    expect(createButton).toBeInTheDocument();
  });

  it('应该显示箱数信息', async () => {
    render(<ASNListPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
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

    render(<ASNListPage />);
    
    // 应该显示空状态提示
    await waitFor(() => {
      expect(screen.getByText(/暂无数据/i)).toBeInTheDocument();
    });
  });

  it('应该支持点击行查看详情', async () => {
    const user = userEvent.setup();
    render(<ASNListPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('ASN-2026-001')).toBeInTheDocument();
    });
    
    // 点击行
    const row = screen.getByText('ASN-2026-001').closest('tr');
    await user.click(row!);
    
    // 应该导航到详情页
  });

  it('应该显示预计到达日期', async () => {
    render(<ASNListPage />);
    
    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('2026-04-05')).toBeInTheDocument();
      expect(screen.getByText('2026-04-15')).toBeInTheDocument();
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

    render(<ASNListPage />);
    
    // 应该显示错误提示
    await waitFor(() => {
      expect(screen.getByText(/加载失败/i)).toBeInTheDocument();
    });
  });
});
