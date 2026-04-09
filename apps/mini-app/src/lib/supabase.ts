import { createClient } from "@luca/db";
import type { Database } from "@luca/db";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let _supabase: SupabaseClient<Database> | null = null;

/**
 * フロントエンド用 Supabase クライアント（anon key使用）
 * 遅延初期化により、ビルド時（環境変数未設定）にはクラッシュしない。
 */
export function getSupabase(): SupabaseClient<Database> {
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

/**
 * Supabase クライアントに認証セッションをセットする。
 * AuthProvider から /api/mini/auth/line で取得した accessToken を渡して使う。
 * これにより以降の supabase クエリが RLS を通過できるようになる。
 */
export async function setSupabaseSession(
  accessToken: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = getSupabase();
  const { error } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: "",
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
