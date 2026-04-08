import { createClient as supabaseCreateClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * フロントエンド用クライアント（anon key使用）
 */
export function createClient(supabaseUrl: string, supabaseAnonKey: string) {
  return supabaseCreateClient<Database>(supabaseUrl, supabaseAnonKey);
}

/**
 * サーバーサイド用クライアント（service_role key使用）
 * Edge Functions や Server Actions で使用
 */
export function createServiceClient(
  supabaseUrl: string,
  supabaseServiceKey: string,
) {
  return supabaseCreateClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
