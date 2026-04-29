/**
 * MVP 主链测试组 3：委托单工作区（Project Workspace）关键操作
 *
 * 覆盖范围（纯业务逻辑，无需 DOM 渲染）：
 *   A. 合法状态转换 — isOperationAllowed 返回 true（8 条）
 *      - pending_acceptance → accept / reject / report_exception
 *      - accepted → register_plan / report_exception
 *      - in_production → update_progress / register_shipment / report_exception
 *      - shipped → confirm_arrival
 *      - exception → close_exception
 *   B. 非法状态转换 — isOperationAllowed 返回 false（8 条）
 *      - accepted 不能再 accept
 *      - in_production 不能 accept / reject
 *      - completed（终态）所有操作均不允许
 *      - exception 不能 accept / register_plan / register_shipment
 *      - 未知操作名 → false
 *   C. getOperationNotAllowedReason（4 条）
 *      - 允许操作 → null
 *      - 非法操作 → 返回 i18n key 字符串（非 null）
 *      - 终态 completed + accept → i18n key
 *      - 未知操作 → null（函数不崩溃）
 *
 * 总计：20 条
 */

import { describe, it, expect } from 'vitest';
import {
  isOperationAllowed,
  getOperationNotAllowedReason,
} from '@/lib/commission-rules';
import type { CommissionStatus } from '@/types';

// ═══════════════════════════════════════════════════════════════
// A. 合法状态转换
// ═══════════════════════════════════════════════════════════════
describe('A. 合法状态转换（应返回 true）', () => {
  it('A1: pending_acceptance + accept → true（待受理可受理）', () => {
    expect(isOperationAllowed('pending_acceptance', 'accept')).toBe(true);
  });

  it('A2: pending_acceptance + reject → true（待受理可拒绝）', () => {
    expect(isOperationAllowed('pending_acceptance', 'reject')).toBe(true);
  });

  it('A3: pending_acceptance + report_exception → true（任何非终态可报告异常）', () => {
    expect(isOperationAllowed('pending_acceptance', 'report_exception')).toBe(true);
  });

  it('A4: accepted + register_plan → true（受理后可登记生产计划）', () => {
    expect(isOperationAllowed('accepted', 'register_plan')).toBe(true);
  });

  it('A5: accepted + report_exception → true', () => {
    expect(isOperationAllowed('accepted', 'report_exception')).toBe(true);
  });

  it('A6: in_production + update_progress → true（生产中可更新进度）', () => {
    expect(isOperationAllowed('in_production', 'update_progress')).toBe(true);
  });

  it('A7: in_production + register_shipment → true（生产中可登记出货）', () => {
    expect(isOperationAllowed('in_production', 'register_shipment')).toBe(true);
  });

  it('A8: shipped + confirm_arrival → true（出货后可确认到货）', () => {
    expect(isOperationAllowed('shipped', 'confirm_arrival')).toBe(true);
  });

  it('A9: exception + close_exception → true（异常状态可关闭异常）', () => {
    expect(isOperationAllowed('exception', 'close_exception')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// B. 非法状态转换（硬闭合：防止越级流转）
// ═══════════════════════════════════════════════════════════════
describe('B. 非法状态转换（应返回 false）', () => {
  it('B1: accepted + accept → false（已受理不能再受理）', () => {
    expect(isOperationAllowed('accepted', 'accept')).toBe(false);
  });

  it('B2: in_production + accept → false（生产中不能受理）', () => {
    expect(isOperationAllowed('in_production', 'accept')).toBe(false);
  });

  it('B3: in_production + reject → false（生产中不能拒绝）', () => {
    expect(isOperationAllowed('in_production', 'reject')).toBe(false);
  });

  it('B4: completed + accept → false（终态不允许任何操作）', () => {
    expect(isOperationAllowed('completed', 'accept')).toBe(false);
  });

  it('B5: completed + register_plan → false', () => {
    expect(isOperationAllowed('completed', 'register_plan')).toBe(false);
  });

  it('B6: completed + report_exception → false（终态禁止报告异常）', () => {
    expect(isOperationAllowed('completed', 'report_exception')).toBe(false);
  });

  it('B7: exception + register_plan → false（异常中不能登记计划）', () => {
    expect(isOperationAllowed('exception', 'register_plan')).toBe(false);
  });

  it('B8: 未知操作名 unknown_op → false（不崩溃，返回 false）', () => {
    expect(isOperationAllowed('pending_acceptance', 'unknown_op')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// C. getOperationNotAllowedReason — i18n key 检查
// ═══════════════════════════════════════════════════════════════
describe('C. getOperationNotAllowedReason 返回值校验', () => {
  it('C1: 合法操作 → 返回 null（无原因）', () => {
    expect(
      getOperationNotAllowedReason('pending_acceptance', 'accept')
    ).toBeNull();
  });

  it('C2: 非法操作（accepted + accept）→ 返回非空 i18n key 字符串', () => {
    const reason = getOperationNotAllowedReason('accepted', 'accept');
    expect(reason).not.toBeNull();
    expect(typeof reason).toBe('string');
    expect((reason as string).length).toBeGreaterThan(0);
  });

  it('C3: 终态（completed + accept）→ 返回包含 "alreadyCompleted" 的 i18n key', () => {
    const reason = getOperationNotAllowedReason('completed', 'accept');
    expect(reason).toContain('alreadyCompleted');
  });

  it('C4: 未知操作名 → 返回 invalidOperation i18n key（函数不崩溃）', () => {
    const reason = getOperationNotAllowedReason(
      'pending_acceptance',
      'unknown_op'
    );
    // 函数对未知操作返回通用 i18n key，而非 null/crash
    expect(reason).toBe('commission.disabledReasons.invalidOperation');
  });
});

// ═══════════════════════════════════════════════════════════════
// D. 状态机完整性快照验证
// ═══════════════════════════════════════════════════════════════
describe('D. 状态机完整性快照', () => {
  // 所有有效状态列表
  const allStatuses: CommissionStatus[] = [
    'pending_acceptance',
    'accepted',
    'in_production',
    'shipped',
    'completed',
    'exception',
    'rejected',
  ];

  it('D1: 任何状态对未知操作名均返回 false', () => {
    for (const status of allStatuses) {
      expect(isOperationAllowed(status, 'nonexistent_action')).toBe(false);
    }
  });

  it('D2: completed（终态）对所有已知操作均返回 false', () => {
    const knownOperations = [
      'accept',
      'reject',
      'register_plan',
      'update_progress',
      'register_shipment',
      'confirm_arrival',
      'report_exception',
      'close_exception',
    ];
    for (const op of knownOperations) {
      expect(isOperationAllowed('completed', op)).toBe(false);
    }
  });

  it('D3: rejected（终态）对所有已知操作均返回 false', () => {
    const knownOperations = [
      'accept',
      'register_plan',
      'update_progress',
      'register_shipment',
      'confirm_arrival',
      'report_exception',
      'close_exception',
    ];
    for (const op of knownOperations) {
      expect(isOperationAllowed('rejected', op)).toBe(false);
    }
  });
});
