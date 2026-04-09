import { getSupabase } from "@/lib/supabase";
import type { Result } from "@luca/types";

/** fetchApi のオプション（RequestInit を拡張） */
interface FetchApiOptions extends RequestInit {
  /** タイムアウト（ミリ秒）。デフォルト 10000 (10秒) */
  timeoutMs?: number;
}

/**
 * 認証トークン付きでAPIを呼ぶヘルパー関数。
 * Supabaseセッションから access_token を取得し、
 * Authorization ヘッダーに付与してリクエストを送信する。
 *
 * レスポンスは { ok, data/error } 形式の Result 型で返す。
 *
 * - ネットワークエラー・タイムアウト・JSON解析エラーを Result で返す
 * - 401 の場合は認証切れ専用メッセージを返す
 */
export async function fetchApi<T>(
  path: string,
  options?: FetchApiOptions,
): Promise<Result<T>> {
  // Supabase セッションからアクセストークンを取得
  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { ok: false, error: "認証セッションが見つかりません" };
  }

  const { timeoutMs = 10_000, ...fetchOptions } = options ?? {};

  // タイムアウト用 AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // リクエスト送信
  let res: Response;
  try {
    res = await fetch(path, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        ...fetchOptions.headers,
      },
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, error: "リクエストがタイムアウトしました" };
    }
    return { ok: false, error: "APIへの接続に失敗しました" };
  } finally {
    clearTimeout(timeoutId);
  }

  // 認証切れ (401) を特別扱い
  if (res.status === 401) {
    return {
      ok: false,
      error: "認証の有効期限が切れました。再度ログインしてください",
    };
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
