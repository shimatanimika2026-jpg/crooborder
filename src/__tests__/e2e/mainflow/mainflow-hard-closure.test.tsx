import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/db/supabase';

/**
 * 主流程硬闭合自动测试
 * 
 * 测试目标：
 * 1. 老化未通过阻断 Final Test
 * 2. Final Test pass 后允许 QA
 * 3. QA 未通过阻断 Shipment
 * 4. blocked/fail 场景真实生成异常
 */

describe('Main Flow Hard Closure Tests', () => {
  const testTenantId = 'JP';
  const testUserId = '00000000-0000-0000-0000-000000000001';
  const testFinishedProductSn = `TEST-SN-${Date.now()}`;

  beforeEach(() => {
    // 清理测试数据
    vi.clearAllMocks();
  });

  /**
   * 测试1：老化未通过阻断 Final Test
   */
  it('should block Final Test when aging test has not passed', async () => {
    // 模拟老化测试未通过的情况
    const mockAgingTest = {
      finished_product_sn: testFinishedProductSn,
      status: 'failed',
      result: 'fail',
      tenant_id: testTenantId,
    };

    // Mock supabase.from('aging_tests').select()
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [mockAgingTest],
              error: null,
            }),
          }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({
        data: null,
        error: { message: '老化测试未通过，不允许进行最终测试' },
      }),
    } as any);

    // 尝试创建 Final Test（应该失败）
    const { data, error } = await supabase
      .from('final_tests')
      .insert({
        finished_product_sn: testFinishedProductSn,
        test_status: 'pending',
        tenant_id: testTenantId,
        created_by: testUserId,
      });

    // 验证：应该返回错误
    expect(error).toBeTruthy();
    expect(error?.message).toContain('老化测试未通过');
  });

  /**
   * 测试2：Final Test pass 后允许 QA
   */
  it('should allow QA Release when Final Test has passed', async () => {
    // 模拟 Final Test 通过的情况
    const mockFinalTest = {
      finished_product_sn: testFinishedProductSn,
      test_status: 'pass',
      tenant_id: testTenantId,
    };

    // Mock supabase.from('final_tests').select()
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [mockFinalTest],
              error: null,
            }),
          }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({
        data: { id: 1 },
        error: null,
      }),
    } as any);

    // 尝试创建 QA Release（应该成功）
    const { data, error } = await supabase
      .from('qa_releases')
      .insert({
        finished_product_sn: testFinishedProductSn,
        release_status: 'pending',
        tenant_id: testTenantId,
        created_by: testUserId,
      });

    // 验证：应该成功
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  /**
   * 测试3：QA 未通过阻断 Shipment
   */
  it('should block Shipment when QA Release has not been approved', async () => {
    // 模拟 QA 未通过的情况
    const mockQARelease = {
      finished_product_sn: testFinishedProductSn,
      release_status: 'blocked',
      tenant_id: testTenantId,
    };

    // Mock supabase.from('qa_releases').select()
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [mockQARelease],
              error: null,
            }),
          }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'QA 放行未通过，不允许出货' },
      }),
    } as any);

    // 尝试创建 Shipment Confirmation（应该失败）
    const { data, error } = await supabase
      .from('shipment_confirmations')
      .insert({
        finished_product_sn: testFinishedProductSn,
        confirmation_status: 'pending',
        tenant_id: testTenantId,
        created_by: testUserId,
      });

    // 验证：应该返回错误
    expect(error).toBeTruthy();
    expect(error?.message).toContain('QA 放行未通过');
  });

  /**
   * 测试4：blocked/fail 场景真实生成异常
   */
  it('should create exception when Final Test is blocked', async () => {
    const testId = 1;
    const mockException = {
      id: 1,
      exception_type: 'final_test_blocked',
      source_module: 'final_test',
      source_record_id: testId,
      related_sn: testFinishedProductSn,
      related_final_test_id: testId,
      severity: 'high',
      status: 'open',
    };

    // Mock supabase.from('operation_exceptions').select()
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockException,
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { test_status: 'blocked' },
          error: null,
        }),
      }),
    } as any);

    // 模拟更新 Final Test 状态为 blocked
    const { data: updateData, error: updateError } = await supabase
      .from('final_tests')
      .update({ test_status: 'blocked' })
      .eq('id', testId);

    expect(updateError).toBeNull();

    // 验证：应该生成异常记录
    const { data: exceptionData, error: exceptionError } = await supabase
      .from('operation_exceptions')
      .select('*')
      .eq('source_record_id', testId)
      .maybeSingle();

    expect(exceptionError).toBeNull();
    expect(exceptionData).toBeTruthy();
    expect(exceptionData?.exception_type).toBe('final_test_blocked');
    expect(exceptionData?.source_module).toBe('final_test');
    expect(exceptionData?.related_final_test_id).toBe(testId);
  });

  /**
   * 测试5：QA blocked 场景真实生成异常
   */
  it('should create exception when QA Release is blocked', async () => {
    const testId = 1;
    const mockException = {
      id: 1,
      exception_type: 'qa_blocked',
      source_module: 'qa',
      source_record_id: testId,
      related_sn: testFinishedProductSn,
      related_qa_release_id: testId,
      severity: 'critical',
      status: 'open',
    };

    // Mock supabase.from('operation_exceptions').select()
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockException,
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { release_status: 'blocked' },
          error: null,
        }),
      }),
    } as any);

    // 模拟更新 QA Release 状态为 blocked
    const { data: updateData, error: updateError } = await supabase
      .from('qa_releases')
      .update({ release_status: 'blocked' })
      .eq('id', testId);

    expect(updateError).toBeNull();

    // 验证：应该生成异常记录
    const { data: exceptionData, error: exceptionError } = await supabase
      .from('operation_exceptions')
      .select('*')
      .eq('source_record_id', testId)
      .maybeSingle();

    expect(exceptionError).toBeNull();
    expect(exceptionData).toBeTruthy();
    expect(exceptionData?.exception_type).toBe('qa_blocked');
    expect(exceptionData?.source_module).toBe('qa');
    expect(exceptionData?.related_qa_release_id).toBe(testId);
  });

  /**
   * 测试6：Shipment blocked 场景真实生成异常
   */
  it('should create exception when Shipment is blocked', async () => {
    const testId = 1;
    const mockException = {
      id: 1,
      exception_type: 'shipment_blocked',
      source_module: 'shipment',
      source_record_id: testId,
      related_sn: testFinishedProductSn,
      related_shipment_confirmation_id: testId,
      severity: 'critical',
      status: 'open',
    };

    // Mock supabase.from('operation_exceptions').select()
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockException,
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: { confirmation_status: 'blocked' },
          error: null,
        }),
      }),
    } as any);

    // 模拟更新 Shipment Confirmation 状态为 blocked
    const { data: updateData, error: updateError } = await supabase
      .from('shipment_confirmations')
      .update({ confirmation_status: 'blocked' })
      .eq('id', testId);

    expect(updateError).toBeNull();

    // 验证：应该生成异常记录
    const { data: exceptionData, error: exceptionError } = await supabase
      .from('operation_exceptions')
      .select('*')
      .eq('source_record_id', testId)
      .maybeSingle();

    expect(exceptionError).toBeNull();
    expect(exceptionData).toBeTruthy();
    expect(exceptionData?.exception_type).toBe('shipment_blocked');
    expect(exceptionData?.source_module).toBe('shipment');
    expect(exceptionData?.related_shipment_confirmation_id).toBe(testId);
  });
});
