/**
 * 工厂显示名称统一映射
 * 用于将工厂 ID 转换为可读的工厂名称
 */

export const FACTORY_DISPLAY_MAP: Record<string, string> = {
  'JP-MICROTEC': '日本 MICROTEC 工厂',
  'CN-FACTORY': '中国工厂',
};

/**
 * 获取工厂显示名称
 * @param factoryId 工厂 ID
 * @returns 工厂显示名称，无值返回 '-'，未识别返回原始 ID
 */
export function getFactoryDisplayName(factoryId: string | null | undefined): string {
  if (!factoryId) return '-';
  return FACTORY_DISPLAY_MAP[factoryId] || factoryId;
}
