import { getSupabase } from "@/lib/supabase";
import type { Result } from "@luca/types";

/**
 * 認証トークン付きでAPIを呼ぶヘルパー関数。
 * Supabaseセッションから access_token を取得し、
 * Authorization ヘッダーに付与してリクエストを送信する。
 *
 * レスポンスは { ok, data/error } 形式の Result 型で返す。
 */
export async function fetchApi<T>(
  path: string,
  options?: RequestInit,
): Promise<Result<T>> {
  // Supabase セッションからアクセストークンを取得
  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { ok: false, error: "認証セッションが見つかりません" };
  }

  // リクエスト送信
  let res: Response;
  try {
    res = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        ...options?.headers,
      },
    });
  } catch {
    return { ok: false, error: "APIへの接続に失敗しました" };
  }

  // レスポンス解析
  let body: { ok: boolean; data?: T; error?: string };
  try {
    body = await res.json();
  } catch {
    return { ok: false, error: "レスポンスの解析に失敗しました" };
  }

  if (!body.ok || !body.data) {
    return { ok: false, error: body.error ?? "APIエラーが発生しました" };
  }

  return { ok: true, data: body.data };
}
