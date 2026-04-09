import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@luca/db";
import type { MemberRank } from "@luca/types";

/**
 * GET /api/mini/members/me
 * 認証済みユーザーの会員情報をSupabaseから取得する。
 *
 * Authorization: Bearer <accessToken> ヘッダーで認証。
 * Supabase の auth.getUser() でユーザーを確認し、
 * app_metadata.member_id で members テーブルから取得する。
 *
 * レスポンス: { ok: true, data: { member } }
 *          | { ok: false, error: string }
 */
export async function GET(request: NextRequest) {
  // 1. Authorization ヘッダーからトークンを取得
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { ok: false, error: "認証トークンが必要です" },
      { status: 401 },
    );
  }

  const accessToken = authHeader.slice("Bearer ".length);

  // 2. 環境変数の検証
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { ok: false, error: "サーバー設定エラー" },
      { status: 500 },
    );
  }

  // 3. アクセストークンでSupabaseクライアントを作成
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: "",
  });

  if (sessionError) {
    return NextResponse.json(
      { ok: false, error: "セッションの設定に失敗しました" },
      { status: 401 },
    );
  }

  // 4. ユーザー情報を取得
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { ok: false, error: "ユーザー情報の取得に失敗しました" },
      { status: 401 },
    );
  }

  // 5. app_metadata から member_id を取得
  const memberId = user.app_metadata?.member_id;
  if (!memberId) {
    return NextResponse.json(
      { ok: false, error: "会員情報が紐づいていません" },
      { status: 404 },
    );
  }

  // 6. members テーブルから会員情報を取得（RLSが自動適用される）
  const { data: memberRow, error: selectError } = await supabase
    .from("members")
    .select("*")
    .eq("id", memberId)
    .single();

  if (selectError || !memberRow) {
    return NextResponse.json(
      { ok: false, error: "会員情報の取得に失敗しました" },
      { status: 404 },
    );
  }

  // 7. レスポンス
  return NextResponse.json({
    ok: true,
    data: {
      member: {
        id: memberRow.id,
        displayName: memberRow.display_name,
        pictureUrl: memberRow.picture_url,
        rank: memberRow.rank as MemberRank,
        totalPoints: memberRow.total_points,
        visitCount: memberRow.visit_count,
      },
    },
  });
}
