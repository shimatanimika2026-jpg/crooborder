import { describe, it, expect } from 'vitest';
import { getFactoryDisplayName } from '@/lib/factory-display';

describe('factory-display', () => {
  describe('getFactoryDisplayName', () => {
    it('应该返回中国工厂的显示名称', () => {
      const result = getFactoryDisplayName('CN-FACTORY');
      expect(result).toBe('中国工厂');
    });

    it('应该返回日本工厂的显示名称', () => {
      const result = getFactoryDisplayName('JP-MICROTEC');
      expect(result).toBe('日本 MICROTEC 工厂');
    });

    it('应该处理未知工厂 ID', () => {
      const result = getFactoryDisplayName('UNKNOWN-FACTORY');
      expect(result).toBe('UNKNOWN-FACTORY');
    });

    it('应该处理 null 输入', () => {
      const result = getFactoryDisplayName(null);
      expect(result).toBe('-');
    });

    it('应该处理 undefined 输入', () => {
      const result = getFactoryDisplayName(undefined);
      expect(result).toBe('-');
    });

    it('应该处理空字符串', () => {
      const result = getFactoryDisplayName('');
      expect(result).toBe('-');
    });

    it('应该区分大小写', () => {
      const result = getFactoryDisplayName('cn-factory');
      // 应该返回原值，因为不匹配
      expect(result).toBe('cn-factory');
    });
  });
});
