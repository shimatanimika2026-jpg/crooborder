import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import ExceptionCenterPage from '@/pages/ExceptionCenterPage';
import { mockSupabase } from '@/test-utils';
import { toast } from 'sonner';

const mockExceptions = [
  {
    id: 1,
    exception_code: 'EXC-2026-001',
    exception_type: 'wrong_item',
    severity: 'high',
    current_status: 'open',
    source_module: 'iqc',
    source_record_id: 123,
    related_sn: 'SN-001',
    related_plan_id: null,
    related_shipment_id: null,
    related_receiving_id: null,
    related_iqc_id: null,
    related_disposition_id: null,
    related_aging_test_id: null,
    related_final_test_id: null,
    related_qa_release_id: null,
    related_shipment_confirmation_id: null,
    owner_id: 'user-1',
    reported_by: 'user-1',
    reported_at: '2026-04-01T00:00:00Z',
    due_date: null,
    temporary_action: null,
    root_cause: null,
    corrective_action: null,
    resolution_summary: null,
    closed_by: null,
    closed_at: null,
    remarks: null,
    tenant_id: 'CN',
    factory_id: null,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  },
  {
    id: 2,
    exception_code: 'EXC-2026-002',
    exception_type: 'damaged',
    severity: 'medium',
    current_status: 'in_progress',
    source_module: 'receiving',
    source_record_id: 456,
    related_sn: 'SN-002',
    related_plan_id: null,
    related_shipment_id: null,
    related_receiving_id: null,
    related_iqc_id: null,
    related_disposition_id: null,
    related_aging_test_id: null,
    related_final_test_id: null,
    related_qa_release_id: null,
    related_shipment_confirmation_id: null,
    owner_id: null,
    reported_by: 'user-1',
    reported_at: '2026-04-10T00:00:00Z',
    due_date: null,
    temporary_action: null,
    root_cause: null,
    corrective_action: null,
    resolution_summary: null,
    closed_by: null,
    closed_at: null,
    remarks: null,
    tenant_id: 'CN',
    factory_id: null,
    created_at: '2026-04-10T00:00:00Z',
    updated_at: '2026-04-10T00:00:00Z',
  },
  {
    id: 3,
    exception_code: 'EXC-2026-003',
    exception_type: 'aging_failed',
    severity: 'low',
    current_status: 'resolved',
    source_module: 'aging',
    source_record_id: 789,
    related_sn: 'SN-003',
    related_plan_id: null,
    related_shipment_id: null,
    related_receiving_id: null,
    related_iqc_id: null,
    related_disposition_id: null,
    related_aging_test_id: null,
    related_final_test_id: null,
    related_qa_release_id: null,
    related_shipment_confirmation_id: null,
    owner_id: null,
    reported_by: 'user-1',
    reported_at: '2026-04-15T00:00:00Z',
    due_date: null,
    temporary_action: null,
    root_cause: null,
    corrective_action: null,
    resolution_summary: null,
    closed_by: null,
    closed_at: null,
    remarks: null,
    tenant_id: 'CN',
    factory_id: null,
    created_at: '2026-04-15T00:00:00Z',
    updated_at: '2026-04-15T00:00:00Z',
  },
];

const mockProfiles = [
  {
    id: 'user-1',
    full_name: '测试负责人',
    username: 'owner',
    email: 'owner@example.com',
  },
];

const mockQuery = <T,>(result: { data: T; error: unknown }) => ({
  select: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  then: vi.fn((resolve) => resolve(result)),
});

const mockExceptionQueries = (
  result: { data: typeof mockExceptions | null; error: unknown } = { data: mockExceptions, error: null },
) => {
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return mockQuery({ data: mockProfiles, error: null });
    }
    return mockQuery(result);
  });
};

describe('ExceptionCenterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExceptionQueries();
  });

  it('应该渲染异常中心页面', async () => {
    render(<ExceptionCenterPage />);

    expect(await screen.findByText('异常中心')).toBeInTheDocument();
    expect(screen.getByText('EXC-2026-001')).toBeInTheDocument();
    expect(screen.getByText('EXC-2026-002')).toBeInTheDocument();
    expect(screen.getByText('EXC-2026-003')).toBeInTheDocument();
  });

  it('应该显示异常类型、模块和负责人', async () => {
    render(<ExceptionCenterPage />);

    expect(await screen.findByText('收货错料')).toBeInTheDocument();
    expect(screen.getByText('收货破损')).toBeInTheDocument();
    expect(screen.getByText('老化失败')).toBeInTheDocument();
    expect(screen.getByText('IQC')).toBeInTheDocument();
    expect(screen.getByText('收货')).toBeInTheDocument();
    expect(screen.getByText('老化')).toBeInTheDocument();
  });

  it('应该显示严重程度和状态', async () => {
    render(<ExceptionCenterPage />);

    expect(await screen.findByText('高')).toBeInTheDocument();
    expect(screen.getByText('中')).toBeInTheDocument();
    expect(screen.getByText('低')).toBeInTheDocument();
    expect(screen.getByText('待处理')).toBeInTheDocument();
    expect(screen.getByText('处理中')).toBeInTheDocument();
    expect(screen.getByText('已解决')).toBeInTheDocument();
  });

  it('应该显示筛选控件', async () => {
    render(<ExceptionCenterPage />);

    await screen.findByText('EXC-2026-001');

    expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByRole('button', { name: /重置/i })).toBeInTheDocument();
  });

  it('应该支持搜索功能', async () => {
    const user = userEvent.setup();
    render(<ExceptionCenterPage />);

    await screen.findByText('EXC-2026-001');

    await user.type(screen.getByPlaceholderText(/搜索/i), 'SN-002');

    await waitFor(() => {
      expect(screen.queryByText('EXC-2026-001')).not.toBeInTheDocument();
      expect(screen.getByText('EXC-2026-002')).toBeInTheDocument();
      expect(screen.queryByText('EXC-2026-003')).not.toBeInTheDocument();
    });
  });

  it('应该处理空数据状态', async () => {
    mockExceptionQueries({ data: [], error: null });

    render(<ExceptionCenterPage />);

    expect(await screen.findByText(/暂无异常记录/i)).toBeInTheDocument();
  });

  it('应该支持点击异常卡片查看详情', async () => {
    const user = userEvent.setup();
    render(<ExceptionCenterPage />);

    await screen.findByText('EXC-2026-001');
    await user.click(screen.getByText('EXC-2026-001'));
  });

  it('应该显示统计信息', async () => {
    render(<ExceptionCenterPage />);

    expect(await screen.findByText('总计: 3')).toBeInTheDocument();
    expect(screen.getByText('待处理: 1')).toBeInTheDocument();
  });

  it('应该处理加载错误', async () => {
    mockExceptionQueries({ data: null, error: { message: '加载失败' } });

    render(<ExceptionCenterPage />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('加载异常列表失败');
    });
  });
});
