import { beforeAll, beforeEach, vi } from 'vitest';
import '@/i18n'; // 初始化 i18n
import { setTestModeConfig, type RuntimeConfig } from '@/lib/runtime-config';

// Mock environment variables for tests
beforeAll(() => {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
});

/**
 * 创建统一的 Supabase mock builder
 * 支持完整的链式调用
 */
const createMockBuilder = () => {
  const builder: any = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    gt: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    in: vi.fn(() => builder),
    is: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
    like: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    range: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    then: vi.fn((resolve) => resolve({ data: [], error: null })),
  };
  return builder;
};

/**
 * 可控的 Supabase mock 工厂
 * 支持切换 real / demo / missing-env 三种模式
 */
export const createSupabaseMock = (mode: 'real' | 'demo' | 'missing-env' = 'real') => {
  const isDemoMode = mode === 'demo';
  const hasMissingEnv = mode === 'missing-env';
  const hasSupabaseEnv = mode === 'real';
  
  return {
    supabase: (isDemoMode || hasMissingEnv) ? null : {
      from: vi.fn(() => createMockBuilder()),
      rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
      channel: vi.fn(() => ({
        on: vi.fn(function(this: any) { return this; }),
        subscribe: vi.fn(() => ({ unsubscribe: vi.fn() }))
      })),
      functions: {
        invoke: vi.fn(() => Promise.resolve({ data: null, error: null }))
      },
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(() => Promise.resolve({ data: null, error: null })),
          download: vi.fn(() => Promise.resolve({ data: null, error: null })),
          getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://test.com/file.jpg' } })),
          remove: vi.fn(() => Promise.resolve({ data: null, error: null })),
        }))
      },
      auth: {
        getSession: vi.fn(() => Promise.resolve({ 
          data: { session: null }, 
          error: null 
        })),
        getUser: vi.fn(() => Promise.resolve({ 
          data: { user: null }, 
          error: null 
        })),
        signInWithPassword: vi.fn(() => Promise.resolve({ 
          data: { user: null, session: null }, 
          error: null 
        })),
        signUp: vi.fn(() => Promise.resolve({ 
          data: { user: null, session: null }, 
          error: null 
        })),
        signOut: vi.fn(() => Promise.resolve({ error: null })),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } }
        })),
        updateUser: vi.fn(() => Promise.resolve({ 
          data: { user: null }, 
          error: null 
        })),
      }
    },
    runtimeMode: mode,
    isDemoMode,
    hasSupabaseEnv,
    missingSupabaseEnvKeys: (isDemoMode || hasMissingEnv) ? ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] : [],
    supabaseConfigErrorMessage: (isDemoMode || hasMissingEnv) ? 'Missing environment variables' : '',
  };
};

/**
 * Mock Supabase client (默认 real 模式)
 */
vi.mock('@/db/supabase', () => createSupabaseMock('real'));

/**
 * 统一运行模式切换函数
 *
 * 模式语义：
 *   real        — 真实 Supabase 环境变量已配置，非 Demo，路由正常工作
 *   demo        — 模拟"演示环境"：env 变量存在（demo 占位值），路由正常工作，isDemoMode=true
 *   missing-env — 环境变量完全缺失，hasSupabaseEnv=false，路由守卫将未认证访问重定向到 /login（渲染演示登录页 DemoLoginCard）
 *
 * 关键区别：
 *   demo 与 missing-env 都标记为演示态，但只有 missing-env 的 hasSupabaseEnv=false；
 *   路由守卫在两种模式下行为相同：未认证访问一律重定向到 /login，/config-error 不参与。
 *   demo 模式下 hasSupabaseEnv=true，路由守卫放行，页面正常渲染。
 */
export const setTestMode = (mode: 'real' | 'demo' | 'missing-env') => {
  if (mode === 'missing-env') {
    // 环境变量完全缺失 → hasSupabaseEnv=false → 路由守卫将未认证访问重定向到 /login（渲染演示登录页 DemoLoginCard）
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    setTestModeConfig({
      supabaseUrl: '',
      supabaseAnonKey: '',
      hasSupabaseEnv: false,
      isDemoMode: true,
      missingSupabaseEnvKeys: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
      supabaseConfigErrorMessage: '缺少以下环境变量: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY',
    });
  } else if (mode === 'demo') {
    // 演示环境：env 变量存在（demo 占位值），路由正常，数据来自 mock
    vi.stubEnv('VITE_SUPABASE_URL', 'https://demo.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'demo-anon-key');
    setTestModeConfig({
      supabaseUrl: 'https://demo.supabase.co',
      supabaseAnonKey: 'demo-anon-key',
      hasSupabaseEnv: true,
      isDemoMode: true,
      missingSupabaseEnvKeys: [],
      supabaseConfigErrorMessage: '',
    });
  } else {
    // real：真实环境，hasSupabaseEnv=true，isDemoMode=false
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
    setTestModeConfig({
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'test-anon-key',
      hasSupabaseEnv: true,
      isDemoMode: false,
      missingSupabaseEnvKeys: [],
      supabaseConfigErrorMessage: '',
    });
  }
};

/**
 * Mock sonner toast
 */
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    promise: vi.fn(),
  },
  Toaster: () => null,
}));

/**
 * Mock IntersectObserver
 */
vi.mock('tailwindcss-intersect', () => ({
  Observer: {
    restart: vi.fn(),
  },
}));

