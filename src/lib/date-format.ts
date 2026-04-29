/**
 * 日期格式化工具
 * 
 * 统一根据当前语言环境格式化日期，避免在页面中硬编码 'zh-CN'
 */

/**
 * 格式化日期为本地日期字符串
 * 
 * @param date 日期对象、日期字符串或时间戳
 * @param language 语言代码（如 'zh-CN', 'ja-JP'），默认从 i18n 获取
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date | string | number, language?: string): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  
  // 如果没有传入 language，使用默认语言（通常从 i18n 获取）
  const locale = language || 'zh-CN';
  
  return dateObj.toLocaleDateString(locale);
}

/**
 * 格式化日期时间为本地日期时间字符串
 * 
 * @param date 日期对象、日期字符串或时间戳
 * @param language 语言代码（如 'zh-CN', 'ja-JP'），默认从 i18n 获取
 * @returns 格式化后的日期时间字符串
 */
export function formatDateTime(date: Date | string | number, language?: string): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  
  // 如果没有传入 language，使用默认语言（通常从 i18n 获取）
  const locale = language || 'zh-CN';
  
  return dateObj.toLocaleString(locale);
}

/**
 * 格式化时间为本地时间字符串
 * 
 * @param date 日期对象、日期字符串或时间戳
 * @param language 语言代码（如 'zh-CN', 'ja-JP'），默认从 i18n 获取
 * @returns 格式化后的时间字符串
 */
export function formatTime(date: Date | string | number, language?: string): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  
  // 如果没有传入 language，使用默认语言（通常从 i18n 获取）
  const locale = language || 'zh-CN';
  
  return dateObj.toLocaleTimeString(locale);
}
