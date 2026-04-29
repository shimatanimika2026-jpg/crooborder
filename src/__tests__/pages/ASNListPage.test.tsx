import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import ASNListPage from '@/pages/ASNListPage';
import { mockSupabase } from '@/test-utils';
import { toast } from 'sonner';

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

const mockAsnQuery = (result: { data: typeof mockASNs | null; error: unknown }) => ({
  select: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  then: vi.fn((resolve) => resolve(result)),
});

describe('ASNListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(mockAsnQuery({ data: mockASNs, error: null }));
  });

  it('应该渲染 ASN 列表页面', async () => {
    render(<ASNListPage />);

    expect(screen.getByText('ASN管理')).toBeInTheDocument();
    expect(await screen.findByText('ASN-2026-001')).toBeInTheDocument();
    expect(screen.getByText('ASN-2026-002')).toBeInTheDocument();
  });

  it('应该显示 ASN 状态和日期', async () => {
    render(<ASNListPage />);

    expect(await screen.findByText('在途')).toBeInTheDocument();
    expect(screen.getByText('草稿')).toBeInTheDocument();
    expect(screen.getByText('2026-04-05')).toBeInTheDocument();
    expect(screen.getByText('2026-04-15')).toBeInTheDocument();
  });

  it('应该显示物流单号', async () => {
    render(<ASNListPage />);

    expect(await screen.findByText('SF1234567890')).toBeInTheDocument();
    expect(screen.getByText('COSCO9876543210')).toBeInTheDocument();
  });

  it('应该支持搜索功能', async () => {
    const user = userEvent.setup();
    render(<ASNListPage />);

    await screen.findByText('ASN-2026-001');

    await user.type(screen.getByPlaceholderText(/搜索/i), 'ASN-2026-001');

    expect(screen.getByText('ASN-2026-001')).toBeInTheDocument();
    expect(screen.queryByText('ASN-2026-002')).not.toBeInTheDocument();
  });

  it('应该显示创建 ASN 按钮', () => {
    render(<ASNListPage />);

    expect(screen.getByRole('button', { name: /创建ASN/i })).toBeInTheDocument();
  });

  it('应该处理空数据状态', async () => {
    mockSupabase.from.mockReturnValue(mockAsnQuery({ data: [], error: null }));

    render(<ASNListPage />);

    expect(await screen.findByText(/暂无发货单/i)).toBeInTheDocument();
  });

  it('应该支持点击行查看详情', async () => {
    const user = userEvent.setup();
    render(<ASNListPage />);

    await screen.findByText('ASN-2026-001');

    const row = screen.getByText('ASN-2026-001').closest('tr');
    await user.click(row!);
  });

  it('应该处理加载错误', async () => {
    mockSupabase.from.mockReturnValue(mockAsnQuery({ data: null, error: { message: '加载失败' } }));

    render(<ASNListPage />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('获取发货单失败');
    });
  });
});
