import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * 统一的页面聚焦 Hook
 * 
 * 规则：
 * 1. 先读 URL 参数
 * 2. 等数据加载完成（loading === false）
 * 3. 确认 DOM id 存在
 * 4. 滚动到目标元素
 * 5. 设置高亮状态
 * 6. 找不到才 toast
 * 
 * @param options 配置项
 * @param options.paramName URL 参数名（如 'focus', 'test_id', 'inspection_id'）
 * @param options.data 数据数组
 * @param options.loading 加载状态
 * @param options.idPrefix DOM id 前缀（如 'test-', 'inspection-'）
 * @param options.setHighlightedId 设置高亮 ID 的函数
 * @param options.notFoundMessage 找不到时的提示信息
 */
interface UseFocusOnLoadOptions<T = Record<string, unknown>> {
  paramName: string;
  data: T[];
  loading: boolean;
  idPrefix: string;
  setHighlightedId?: ((id: string | number | null) => void) | React.Dispatch<React.SetStateAction<string | null>> | React.Dispatch<React.SetStateAction<number | null>>;
  notFoundMessage?: string;
  idField?: keyof T; // 数据对象中的 ID 字段名，默认 'id'
}

export function useFocusOnLoad<T extends Record<string, unknown>>({
  paramName,
  data,
  loading,
  idPrefix,
  setHighlightedId,
  notFoundMessage = '未找到目标记录，已显示当前列表',
  idField = 'id' as keyof T,
}: UseFocusOnLoadOptions<T>) {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // 必须等数据加载完成
    if (loading || data.length === 0) return;

    const targetId = searchParams.get(paramName);
    if (!targetId) return;

    // 设置高亮状态
    if (setHighlightedId) {
      // 尝试转换为数字，如果失败则保持字符串
      const numericId = parseInt(targetId);
      const finalId = isNaN(numericId) ? targetId : numericId;
      (setHighlightedId as (id: string | number | null) => void)(finalId);
    }

    // 延迟滚动，确保 DOM 已渲染
    setTimeout(() => {
      const element = document.getElementById(`${idPrefix}${targetId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // 检查数据中是否存在该记录
        const exists = data.some(item => String(item[idField]) === targetId);
        if (!exists) {
          toast.info(notFoundMessage);
        }
      }
    }, 300);
  }, [searchParams, data, loading, paramName, idPrefix, setHighlightedId, notFoundMessage, idField]);
}
