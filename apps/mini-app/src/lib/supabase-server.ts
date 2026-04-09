import { createServiceClient } from "@luca/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@luca/db";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// モジュール読み込み時に1回だけ環境変数を検証し、未設定ならログに警告を出す
if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    "[supabase-server] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. " +
      "Supabase API calls will fail until these environment variables are configured.",
  );
}

type ServiceClient = SupabaseClient<Database>;

/**
 * サーバーサイド用 Supabase クライアント（service_role key使用）
 * RLSをバイパスして管理操作を行う
 *
 * Result型で返す。環境変数が未設定の場合はエラー。
 */
export function getServiceClient():
  | { ok: true; data: ServiceClient }
  | { ok: false; error: string } {
  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      ok: false,
      error:
        "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
    };
  }
  return { ok: true, data: createServiceClient(supabaseUrl, supabaseServiceKey) };
}
