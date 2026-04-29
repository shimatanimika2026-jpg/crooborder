/**
 * 设计系统 - Design Tokens
 * 工业冷色系 - 高对比度制造业管理系统
 */

export const designTokens = {
  // 间距系统
  spacing: {
    page: 'p-8', // 页面内边距
    section: 'space-y-6', // 区块间距
    card: 'p-6', // 卡片内边距
    cardGap: 'gap-6', // 卡片之间间距
    form: 'space-y-4', // 表单字段间距
    inline: 'gap-4', // 行内元素间距
    tight: 'gap-2', // 紧凑间距
  },

  // 字体系统 - 强制高对比度
  typography: {
    pageTitle: 'text-2xl font-semibold tracking-tight text-slate-950', // 接近纯黑
    pageSubtitle: 'text-sm text-slate-700', // 加深副标题
    sectionTitle: 'text-lg font-semibold text-slate-950', // 接近纯黑+加粗
    cardTitle: 'text-base font-semibold text-slate-950', // 接近纯黑+加粗
    label: 'text-sm font-semibold text-slate-900', // 加深+加粗
    body: 'text-sm text-slate-800', // 加深正文
    caption: 'text-xs text-slate-600', // 加深说明
    stat: 'text-3xl font-bold text-slate-950', // 接近纯黑+加粗
  },

  // 圆角系统 - 适中
  radius: {
    card: 'rounded-md', // 卡片圆角 6px
    button: 'rounded-md', // 按钮圆角
    input: 'rounded-md', // 输入框圆角
    badge: 'rounded-md', // 标签圆角（改为方形）
  },

  // 阴影系统 - 极克制+强边框
  shadow: {
    card: 'shadow-sm border border-slate-400', // 加深边框
    cardHover: 'hover:shadow-md', // 卡片悬停阴影
    none: 'shadow-none', // 无阴影
  },

  // 边框系统 - 强化清晰度
  border: {
    default: 'border border-slate-400', // 加深边框
    top: 'border-t border-slate-400', // 加深顶部边框
    bottom: 'border-b border-slate-400', // 加深底部边框
    none: 'border-0', // 无边框
  },

  // 布局系统
  layout: {
    maxWidth: 'max-w-7xl', // 内容最大宽度
    container: 'mx-auto', // 居中容器
    grid2: 'grid grid-cols-1 md:grid-cols-2', // 2列网格
    grid3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3', // 3列网格
    grid4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4', // 4列网格
  },

  // 表格系统 - 强化工业风
  table: {
    headerHeight: 'h-12', // 表头高度
    rowHeight: 'h-14', // 行高
    cellPadding: 'px-4 py-3', // 单元格内边距
    headerBg: 'bg-slate-200', // 表头背景加深
    headerText: 'text-slate-950 font-semibold', // 表头文字接近纯黑+加粗
    rowBorder: 'border-b border-slate-300', // 行边框加深
    rowHover: 'hover:bg-slate-100', // 行悬停加深
  },

  // 按钮系统 - 高对比度
  button: {
    height: 'h-10', // 按钮高度
    heightSm: 'h-9', // 小按钮高度
    heightLg: 'h-11', // 大按钮高度
    primary: 'bg-blue-700 text-white hover:bg-blue-800', // 主按钮
    secondary: 'border-slate-300 text-slate-700 hover:bg-slate-50', // 次按钮
  },

  // 输入框系统
  input: {
    height: 'h-10', // 输入框高度
    border: 'border-slate-400', // 加深边框
    focus: 'focus:border-blue-700 focus:ring-2 focus:ring-blue-700', // 加强聚焦
  },

  // 过渡动画
  transition: {
    default: 'transition-all duration-200', // 默认过渡
    fast: 'transition-all duration-150', // 快速过渡
    slow: 'transition-all duration-300', // 慢速过渡
  },
} as const;

// 页面布局常量
export const PAGE_LAYOUT = {
  SIDEBAR_WIDTH: 256, // 左侧导航宽度 (16rem = 256px)
  HEADER_HEIGHT: 64, // 顶部栏高度 (4rem = 64px)
  PAGE_PADDING: 32, // 页面内边距 (2rem = 32px)
  CONTENT_MAX_WIDTH: 1280, // 内容最大宽度 (80rem = 1280px)
} as const;

// 状态颜色映射 - 工业系高对比度
export const STATUS_COLORS = {
  // 生产计划状态
  draft: 'secondary',
  pending_cn_approval: 'secondary',
  pending_jp_approval: 'secondary',
  approved: 'default',
  in_production: 'default',
  completed: 'default',
  cancelled: 'destructive',

  // 库存状态
  in_stock: 'default',
  low_stock: 'secondary',
  out_of_stock: 'destructive',

  // 物流状态
  in_transit: 'default',
  delayed: 'destructive',
  delivered: 'default',

  // 质检状态
  pending: 'secondary',
  passed: 'default',
  failed: 'destructive',
  on_hold: 'secondary',
} as const;

// 状态标签样式 - 强化高对比度
export const STATUS_BADGE_STYLES = {
  default: 'bg-emerald-100 text-emerald-900 border border-emerald-500 font-medium', // 加深文字+边框+加粗
  secondary: 'bg-slate-200 text-slate-900 border border-slate-500 font-medium', // 加深背景+文字+边框+加粗
  destructive: 'bg-red-100 text-red-900 border border-red-500 font-medium', // 加深文字+边框+加粗
  warning: 'bg-amber-100 text-amber-900 border border-amber-500 font-medium', // 加深文字+边框+加粗
  info: 'bg-cyan-100 text-cyan-900 border border-cyan-500 font-medium', // 加深文字+边框+加粗
} as const;
