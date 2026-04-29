import { describe, it, expect } from 'vitest';
import { cn, createQueryString, formatDate } from '@/lib/utils';

describe('utils', () => {
  describe('cn (classNames utility)', () => {
    it('应该合并多个类名', () => {
      const result = cn('class1', 'class2', 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('应该处理条件类名', () => {
      const result = cn('base', true && 'truthy', false && 'falsy');
      expect(result).toBe('base truthy');
    });

    it('应该处理 undefined 和 null', () => {
      const result = cn('base', undefined, null, 'end');
      expect(result).toBe('base end');
    });

    it('应该合并 Tailwind 冲突类名', () => {
      const result = cn('px-2', 'px-4');
      // 后面的类名应该覆盖前面的
      expect(result).toContain('px-4');
      expect(result).not.toContain('px-2');
    });

    it('应该处理空输入', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('应该处理对象形式的类名', () => {
      const result = cn({
        'class1': true,
        'class2': false,
        'class3': true,
      });
      expect(result).toContain('class1');
      expect(result).toContain('class3');
      expect(result).not.toContain('class2');
    });

    it('应该处理数组形式的类名', () => {
      const result = cn(['class1', 'class2'], 'class3');
      expect(result).toBe('class1 class2 class3');
    });
  });

  describe('createQueryString', () => {
    it('应该创建查询字符串', () => {
      const searchParams = new URLSearchParams();
      const result = createQueryString({ page: 1, limit: 10 }, searchParams);
      expect(result).toBe('page=1&limit=10');
    });

    it('应该更新现有参数', () => {
      const searchParams = new URLSearchParams('page=1&limit=10');
      const result = createQueryString({ page: 2 }, searchParams);
      expect(result).toBe('page=2&limit=10');
    });

    it('应该删除 null 值参数', () => {
      const searchParams = new URLSearchParams('page=1&limit=10');
      const result = createQueryString({ limit: null }, searchParams);
      expect(result).toBe('page=1');
    });

    it('应该删除 undefined 值参数', () => {
      const searchParams = new URLSearchParams('page=1&limit=10');
      const result = createQueryString({ limit: undefined }, searchParams);
      expect(result).toBe('page=1');
    });

    it('应该处理数字参数', () => {
      const searchParams = new URLSearchParams();
      const result = createQueryString({ page: 1, limit: 20 }, searchParams);
      expect(result).toBe('page=1&limit=20');
    });

    it('应该处理空对象', () => {
      const searchParams = new URLSearchParams('page=1');
      const result = createQueryString({}, searchParams);
      expect(result).toBe('page=1');
    });
  });

  describe('formatDate', () => {
    it('应该格式化 Date 对象', () => {
      const date = new Date('2026-04-19');
      const result = formatDate(date);
      expect(result).toContain('2026');
      expect(result).toContain('4');
      expect(result).toContain('19');
    });

    it('应该格式化字符串日期', () => {
      const result = formatDate('2026-04-19');
      expect(result).toContain('2026');
      expect(result).toContain('4');
      expect(result).toContain('19');
    });

    it('应该格式化时间戳', () => {
      const timestamp = new Date('2026-04-19').getTime();
      const result = formatDate(timestamp);
      expect(result).toContain('2026');
    });

    it('应该支持自定义格式选项', () => {
      const date = new Date('2026-04-19');
      const result = formatDate(date, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      expect(result).toMatch(/\d{4}.\d{2}.\d{2}/);
    });

    it('应该使用默认格式', () => {
      const date = new Date('2026-04-19');
      const result = formatDate(date);
      // 默认格式应该包含年月日
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });
});
