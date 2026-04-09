import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? "";

// ---------- バリデーション ----------

interface EarnPointsBody {
  memberId: string;
  amount: number;
  description?: string;
}

/**
 * リクエストボディをバリデーションする。
 * throwせず Result 形式で返す。
 */
function validateBody(
  body: unknown,
): { ok: true; data: EarnPointsBody } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "リクエストボディが不正です" };
  }

  const { memberId, amount, description } = body as Record<string, unknown>;

  if (!memberId || typeof memberId !== "string") {
    return { ok: false, error: "memberId は必須です" };
  }

  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
    return { ok: false, error: "amount は1以上の整数を指定してください" };
  }

  if (description !== undefined && typeof description !== "string") {
    return { ok: false, error: "description は文字列を指定してください" };
  }

  return {
    ok: true,
    data: {
      memberId,
      amount,
      description: typeof description === "string" ? description : undefined,
    },
  };
}

// ---------- 認証 ----------

/**
 * Authorization ヘッダーの Bearer トークンが service_role key と一致するか検証する。
 * MVPでは管理画面がないため、service_role key での認証をサポート。
 */
function authenticateServiceRole(
  request: NextRequest,
): { ok: true } | { ok: false; error: string; status: number } {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, error: "認証トークンが必要です", status: 401 };
  }

  const token = authHeader.slice("Bearer ".length);

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "サーバー設定エラー", status: 500 };
  }

  if (token !== SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "認証に失敗しました", status: 403 };
  }

  return { ok: true };
}

// ---------- API ルート ----------

/**
 * POST /api/mini/points/earn
 * 店舗スタッフが会員にポイントを付与する。
 *
 * MVPでは管理画面がないため、service_role key での認証。
 * Authorization: Bearer <service_role_key>
 *
 * リクエスト: { memberId: string, amount: number, description?: string }
 *
 * 処理:
 * 1. service_role key で認証
 * 2. リクエストボディをバリデーション
 * 3. Supabase RPC (earn_points) をアトミックに実行
 *    - members テーブルで対象会員を取得 (FOR UPDATE)
 *    - point_transactions に INSERT (type: 'earn')
 *    - members.total_points を更新
 *    - balance_after を正しく計算
 *
 * レスポンス: { ok: true, data: { transaction: { id, amount, newBalance } } }
 *          | { ok: false, error: string }
 */
export async function POST(request: NextRequest) {
  // 1. service_role key で認証
  const authResult = authenticateServiceRole(request);
  if (!authResult.ok) {
    return NextResponse.json(
      { ok: false, error: authResult.error },
      { status: authResult.status },
    );
  }

  // 2. 環境変数チェック
  if (!DEFAULT_TENANT_ID) {
    return NextResponse.json(
      { ok: false, error: "DEFAULT_TENANT_ID が設定されていません" },
      { status: 500 },
    );
  }

  // 3. リクエストボディを取得・バリデーション
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "リクエストボディのパースに失敗しました" },
      { status: 400 },
    );
  }

  const validation = validateBody(body);
  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, error: validation.error },
      { status: 400 },
    );
  }

  const { memberId, amount, description } = validation.data;

  // 4. service_role クライアントを取得
  const clientResult = getServiceClient();
  if (!clientResult.ok) {
    return NextResponse.json(
      { ok: false, error: "サーバー設定エラー" },
      { status: 500 },
    );
  }

  const supabase = clientResult.data;

  // 5. RPC でポイント付与をアトミックに実行
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "earn_points",
    {
      p_member_id: memberId,
      p_tenant_id: DEFAULT_TENANT_ID,
      p_amount: amount,
      p_description: description ?? null,
    },
  );

  if (rpcError) {
    return NextResponse.json(
      { ok: false, error: "ポイント付与処理でエラーが発生しました" },
      { status: 500 },
    );
  }

  // 6. RPC の結果を確認
  //    earn_points は json_build_object で { ok, data/error } を返す
  const result = rpcResult as {
    ok: boolean;
    data?: { transactionId: string; amount: number; newBalance: number };
    error?: string;
  };

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "ポイント付与に失敗しました" },
      { status: 400 },
    );
  }

  // 7. 成功レスポンス
  return NextResponse.json({
    ok: true,
    data: {
      transaction: {
        id: result.data!.transactionId,
        amount: result.data!.amount,
        newBalance: result.data!.newBalance,
      },
    },
  });
}
