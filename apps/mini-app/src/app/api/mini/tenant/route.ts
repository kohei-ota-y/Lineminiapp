import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@luca/db";

/**
 * GET /api/mini/tenant
 * 認証済みユーザーのテナント設定をSupabaseから取得する。
 *
 * Authorization: Bearer <accessToken> ヘッダーで認証。
 * tenant_settings テーブルから取得（RLSで自動フィルタ）。
 *
 * レスポンス: { ok: true, data: { settings: TenantSettingsCamel } }
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

  // 4. ユーザー情報を取得（RLS用にセッションが必要）
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

  // 5. tenant_settings テーブルから取得（RLSが自動適用される）
  const { data: settingsRow, error: selectError } = await supabase
    .from("tenant_settings")
    .select("*")
    .single();

  if (selectError || !settingsRow) {
    return NextResponse.json(
      { ok: false, error: "テナント設定の取得に失敗しました" },
      { status: 404 },
    );
  }

  // 6. camelCase に変換してレスポンス
  return NextResponse.json({
    ok: true,
    data: {
      settings: {
        brandColor: settingsRow.brand_color,
        logoUrl: settingsRow.logo_url,
        featurePoint: settingsRow.feature_point,
        featureCoupon: settingsRow.feature_coupon,
        featureStamp: settingsRow.feature_stamp,
        featureReservation: settingsRow.feature_reservation,
        featureOrder: settingsRow.feature_order,
        pointRate: settingsRow.point_rate,
      },
    },
  });
}
