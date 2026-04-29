/**
 * 从 catch 块捕获的 unknown 类型错误中安全提取错误消息。
 *
 * TypeScript 将 catch 变量默认为 unknown，直接访问 .message 会报错。
 * 使用此函数统一处理，避免 `catch (error: any)` 模式。
 *
 * @param error catch 块捕获的错误（unknown 类型）
 * @param fallback 无法提取消息时的兜底文案（默认 '操作失败'）
 */
export function getErrorMessage(error: unknown, fallback = '操作失败'): string {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === 'string') return error || fallback;
  return fallback;
}
