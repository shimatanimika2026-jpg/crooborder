import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import ReceivingListPage from '@/pages/ReceivingListPage';
import { mockSupabase } from '@/test-utils';
import { toast } from 'sonner';

const mockReceivings = [
  {
    id: 1,
    receiving_code: 'RCV-2026-001',
    receiving_number: 'RCV-2026-001',
    receiving_date: '2026-04-05',
    status: 'completed',
    has_variance: false,
    variance_resolved: false,
    iqc_completed: true,
    created_at: '2026-04-05T00:00:00Z',
  },
  {
    id: 2,
    receiving_code: 'RCV-2026-002',
    receiving_number: 'RCV-2026-002',
    receiving_date: '2026-04-15',
    status: 'variance_pending',
    has_variance: true,
    variance_resolved: false,
    iqc_completed: false,
    created_at: '2026-04-15T00:00:00Z',
  },
];

const mockReceivingQuery = (result: { data: typeof mockReceivings | null; error: unknown }) => ({
  select: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  then: vi.fn((resolve) => resolve(result)),
});

describe('ReceivingListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(mockReceivingQuery({ data: mockReceivings, error: null }));
  });

  it('应该渲染收货记录列表页面', async () => {
    render(<ReceivingListPage />);

    expect(screen.getByText('收货管理')).toBeInTheDocument();
    expect(await screen.findByText('RCV-2026-001')).toBeInTheDocument();
    expect(screen.getByText('RCV-2026-002')).toBeInTheDocument();
  });

  it('应该显示收货状态、差异和 IQC 状态', async () => {
    render(<ReceivingListPage />);

    expect(await screen.findByText('已完成')).toBeInTheDocument();
    expect(screen.getAllByText('检测到收货差异').length).toBeGreaterThan(0);
    expect(screen.getByText('待检验')).toBeInTheDocument();
  });

  it('应该支持搜索功能', async () => {
    const user = userEvent.setup();
    render(<ReceivingListPage />);

    await screen.findByText('RCV-2026-001');

    await user.type(screen.getByPlaceholderText(/搜索/i), 'RCV-2026-001');

    expect(screen.getByText('RCV-2026-001')).toBeInTheDocument();
    expect(screen.queryByText('RCV-2026-002')).not.toBeInTheDocument();
  });

  it('应该显示从 ASN 创建收货单按钮', () => {
    render(<ReceivingListPage />);

    expect(screen.getByRole('button', { name: /从ASN创建收货单/i })).toBeInTheDocument();
  });

  it('应该处理空数据状态', async () => {
    mockSupabase.from.mockReturnValue(mockReceivingQuery({ data: [], error: null }));

    render(<ReceivingListPage />);

    expect(await screen.findByText(/暂无收货单/i)).toBeInTheDocument();
  });

  it('应该支持点击行查看详情', async () => {
    const user = userEvent.setup();
    render(<ReceivingListPage />);

    await screen.findByText('RCV-2026-001');

    const row = screen.getByText('RCV-2026-001').closest('tr');
    await user.click(row!);
  });

  it('应该处理加载错误', async () => {
    mockSupabase.from.mockReturnValue(mockReceivingQuery({ data: null, error: { message: '加载失败' } }));

    render(<ReceivingListPage />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('获取收货单失败');
    });
  });
});
