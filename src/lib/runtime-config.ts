export interface RuntimeConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  hasSupabaseEnv: boolean;
  isDemoMode: boolean;
  missingSupabaseEnvKeys: string[];
  supabaseConfigErrorMessage: string;
}

let testModeOverride: RuntimeConfig | null = null;

export function setTestModeConfig(config: RuntimeConfig | null) {
  testModeOverride = config;
}

function getProcessEnv(): Record<string, string | undefined> | undefined {
  return (globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }).process?.env;
}

function getEnvValue(key: string): string {
  const processEnv = getProcessEnv();
  if (processEnv) {
    return processEnv[key] || '';
  }

  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return (import.meta.env[key] as string) || '';
  }

  return '';
}

export function getRuntimeConfig(): RuntimeConfig {
  if (testModeOverride) {
    return testModeOverride;
  }

  const supabaseUrl = getEnvValue('VITE_SUPABASE_URL');
  const supabaseAnonKey = getEnvValue('VITE_SUPABASE_ANON_KEY');
  const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);
  const missingSupabaseEnvKeys: string[] = [];

  if (!supabaseUrl) missingSupabaseEnvKeys.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missingSupabaseEnvKeys.push('VITE_SUPABASE_ANON_KEY');

  return {
    supabaseUrl,
    supabaseAnonKey,
    hasSupabaseEnv,
    isDemoMode: !hasSupabaseEnv,
    missingSupabaseEnvKeys,
    supabaseConfigErrorMessage:
      missingSupabaseEnvKeys.length > 0
        ? `缺少以下环境变量: ${missingSupabaseEnvKeys.join(', ')}`
        : '',
  };
}

export function hasSupabaseEnv(): boolean {
  return getRuntimeConfig().hasSupabaseEnv;
}

export function isDemoMode(): boolean {
  return getRuntimeConfig().isDemoMode;
}

export function getMissingEnvKeys(): string[] {
  return getRuntimeConfig().missingSupabaseEnvKeys;
}

export function getConfigErrorMessage(): string {
  return getRuntimeConfig().supabaseConfigErrorMessage;
}
