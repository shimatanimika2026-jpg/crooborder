import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getRuntimeConfig, type RuntimeConfig } from "@/lib/runtime-config";

export type RuntimeMode = "real" | "demo";

const runtimeConfig: RuntimeConfig = getRuntimeConfig();

export const missingSupabaseEnvKeys = runtimeConfig.missingSupabaseEnvKeys;
export const hasSupabaseEnv = runtimeConfig.hasSupabaseEnv;
export const supabaseConfigErrorMessage =
  runtimeConfig.supabaseConfigErrorMessage;
export const runtimeMode: RuntimeMode = runtimeConfig.isDemoMode
  ? "demo"
  : "real";
export const isDemoMode = runtimeConfig.isDemoMode;

export const supabase: SupabaseClient = hasSupabaseEnv
  ? createClient(runtimeConfig.supabaseUrl, runtimeConfig.supabaseAnonKey)
  : (null as unknown as SupabaseClient);
