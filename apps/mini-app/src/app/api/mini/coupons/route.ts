import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@luca/db";
import type { DiscountType } from "@luca/types";

// ---------- 型定義 ----------

type CouponWithUsage = {
  id: string;
  title: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  expiresAt: string | null;
  isUsed: boolean;
};

// ---------- API ルート ----------

/**
 * GET /api/mini/coupons
 * テナントの有効なクーポン一覧を取得する。
 *
 * Authorization: Bearer <accessToken> ヘッダーで認証。
 * 条件: is_active = true AND (expires_at IS NULL OR expires_at > now())
 * 各クーポンの使用済み判定: coupon_uses に member_id のレコードがあるか
 *
 * レスポンス: { ok: true, data: { coupons: CouponWithUsage[] } }
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

  // 6. 有効なクーポン一覧を取得（RLSが自動適用される）
  const now = new Date().toISOString();
  const { data: couponRows, error: couponsError } = await supabase
    .from("coupons")
    .select("*")
    .eq("is_active", true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("created_at", { ascending: false });

  if (couponsError) {
    return NextResponse.json(
      { ok: false, error: "クーポンの取得に失敗しました" },
      { status: 500 },
    );
  }

  if (!couponRows || couponRows.length === 0) {
    return NextResponse.json({
      ok: true,
      data: { coupons: [] },
    });
  }

  // 7. この会員の使用済みクーポンIDを取得
  const couponIds = couponRows.map((c) => c.id);
  const { data: couponUseRows, error: usesError } = await supabase
    .from("coupon_uses")
    .select("coupon_id")
    .eq("member_id", memberId)
    .in("coupon_id", couponIds);

  if (usesError) {
    return NextResponse.json(
      { ok: false, error: "クーポン使用状況の取得に失敗しました" },
      { status: 500 },
    );
  }

  const usedCouponIds = new Set(
    (couponUseRows ?? []).map((u) => u.coupon_id),
  );

  // 8. レスポンス用に変換
  const coupons: CouponWithUsage[] = couponRows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    discountType: row.discount_type as DiscountType,
    discountValue: row.discount_value,
    expiresAt: row.expires_at,
    isUsed: usedCouponIds.has(row.id),
  }));

  // 9. レスポンス
  return NextResponse.json({
    ok: true,
    data: { coupons },
  });
}
