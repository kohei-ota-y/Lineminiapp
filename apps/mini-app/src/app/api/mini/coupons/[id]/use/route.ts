import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@luca/db";

// ---------- API ルート ----------

/**
 * POST /api/mini/coupons/[id]/use
 * 認証済みユーザーがクーポンを使用する。
 *
 * Authorization: Bearer <accessToken> ヘッダーで認証。
 * Supabase RPC (use_coupon) でアトミックに処理する。
 *
 * バリデーション（RPC内で実施）:
 * 1. クーポンが存在するか
 * 2. is_active = true か
 * 3. expires_at が未来か（またはnull）
 * 4. max_uses に達していないか（またはnull）
 * 5. この会員が既に使用済みでないか
 *
 * レスポンス: { ok: true, data: { usedAt: string } }
 *          | { ok: false, error: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: couponId } = await params;

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

  // 3. アクセストークンでSupabaseクライアントを作成（グローバルヘッダーでRLS適用）
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 4. トークンを直接渡してユーザー情報を取得（refresh_token不要）
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json(
      { ok: false, error: "ユーザー情報の取得に失敗しました" },
      { status: 401 },
    );
  }

  // 5. app_metadata から member_id と tenant_id を取得
  const memberId = user.app_metadata?.member_id;
  const tenantId = user.app_metadata?.tenant_id;

  if (!memberId) {
    return NextResponse.json(
      { ok: false, error: "会員情報が紐づいていません" },
      { status: 404 },
    );
  }

  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: "テナント情報が紐づいていません" },
      { status: 404 },
    );
  }

  // 6. RPC でアトミックにクーポン使用を処理
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "use_coupon",
    {
      p_coupon_id: couponId,
      p_member_id: memberId,
      p_tenant_id: tenantId,
    },
  );

  if (rpcError) {
    return NextResponse.json(
      { ok: false, error: "クーポン使用処理に失敗しました" },
      { status: 500 },
    );
  }

  // 7. RPC の結果を検証して返す
  const result = rpcResult as { ok: boolean; data?: { usedAt: string }; error?: string };

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "クーポンの使用に失敗しました" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: { usedAt: result.data?.usedAt },
  });
}
