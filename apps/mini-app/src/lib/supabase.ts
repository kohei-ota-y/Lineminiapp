import { createClient } from "@luca/db";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Supabase クライアントに認証セッションをセットする。
 * AuthProvider から /api/mini/auth/line で取得した accessToken を渡して使う。
 * これにより以降の supabase クエリが RLS を通過できるようになる。
 */
export async function setSupabaseSession(
  accessToken: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: "",
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
