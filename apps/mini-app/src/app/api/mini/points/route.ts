import { NextRequest, NextResponse } from "next/server";
import { createUserClient } from "@luca/db";
import type { PointTransaction, PointTransactionType } from "@luca/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * GET /api/mini/points
 * 認証済みユーザーのポイント取引履歴を取得（直近30件）
 *
 * - Authorization ヘッダーの Bearer トークンで認証
 * - Supabase RLS で tenant_id フィルタは自動適用
 * - member_id は JWT の app_metadata から取得
 *
 * レスポンス: { ok: true, data: { transactions: PointTransaction[] } }
 *          | { ok: false, error: string }
 */
export async function GET(request: NextRequest) {
  // 1. Authorization ヘッダーからトークンを取得
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "認証トークンが必要です" },
      { status: 401 },
    );
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { ok: false, error: "サーバー設定エラー" },
      { status: 500 },
    );
  }

  // 2. anon クライアントを作成（グローバルヘッダーでRLS適用）
  const supabase = createUserClient(supabaseUrl, supabaseAnonKey, token);

  // トークンを直接渡してユーザー情報を取得（refresh_token不要）
  const { data: userData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !userData.user) {
    return NextResponse.json(
      { ok: false, error: "認証に失敗しました" },
      { status: 401 },
    );
  }

  // 3. JWT の app_metadata から member_id を取得
  const memberId = userData.user.app_metadata?.member_id;
  if (!memberId) {
    return NextResponse.json(
      { ok: false, error: "会員情報が見つかりません" },
      { status: 403 },
    );
  }

  // 4. point_transactions テーブルから取得（直近30件）
  const { data: rows, error: queryError } = await supabase
    .from("point_transactions")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (queryError) {
    return NextResponse.json(
      { ok: false, error: "ポイント履歴の取得に失敗しました" },
      { status: 500 },
    );
  }

  // 5. 型変換して返す
  const transactions: PointTransaction[] = (rows ?? []).map((row) => ({
    id: row.id,
    member_id: row.member_id,
    tenant_id: row.tenant_id,
    amount: row.amount,
    balance_after: row.balance_after,
    type: row.type as PointTransactionType,
    description: row.description,
    created_at: row.created_at,
  }));

  return NextResponse.json({
    ok: true,
    data: { transactions },
  });
}
