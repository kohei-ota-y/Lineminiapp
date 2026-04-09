import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getServiceClient } from "@/lib/supabase-server";
import type { Member, MemberRank } from "@luca/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@luca/db";

const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID ?? "";
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? "";

type ServiceClient = SupabaseClient<Database>;
type MembersRow = Database["public"]["Tables"]["members"]["Row"];

interface LineVerifyResponse {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  name?: string;
  picture?: string;
}

// ---------- ヘルパー関数 ----------

/**
 * DBのmembers行をMember型に変換する
 */
function toMember(row: MembersRow): Member {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    line_user_id: row.line_user_id,
    auth_user_id: row.auth_user_id,
    display_name: row.display_name,
    picture_url: row.picture_url,
    rank: row.rank as MemberRank,
    total_points: row.total_points,
    visit_count: row.visit_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * 暗号学的に安全なランダムパスワードを生成する
 */
function generateSecurePassword(): string {
  return randomBytes(32).toString("hex");
}

/**
 * LINE APIでIDトークンを検証する
 */
async function verifyLineToken(
  idToken: string,
): Promise<
  { ok: true; data: LineVerifyResponse } | { ok: false; error: string }
> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: LINE_CHANNEL_ID,
      }),
      signal: controller.signal,
    });

    if (!verifyRes.ok) {
      return { ok: false, error: "トークン検証に失敗しました" };
    }

    const lineUser: LineVerifyResponse = await verifyRes.json();

    if (lineUser.aud !== LINE_CHANNEL_ID) {
      return { ok: false, error: "トークンの対象チャネルが不正です" };
    }

    return { ok: true, data: lineUser };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * membersテーブルで会員を検索し、なければ作成する
 */
async function findOrCreateMember(
  supabase: ServiceClient,
  tenantId: string,
  lineUserId: string,
  displayName: string,
  pictureUrl: string | null,
): Promise<{ ok: true; data: Member } | { ok: false; error: string }> {
  // 既存会員を検索
  const { data: existingMember, error: selectError } = await supabase
    .from("members")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("line_user_id", lineUserId)
    .single();

  // PGRST116 = "JSON object requested, multiple (or no) rows returned"
  // → 会員が見つからなかった場合なので、新規作成に進む
  if (selectError && selectError.code !== "PGRST116") {
    return { ok: false, error: "会員検索に失敗しました" };
  }

  if (existingMember) {
    // 既存会員: display_name, picture_url を最新に更新
    const { data: updatedMember, error: updateError } = await supabase
      .from("members")
      .update({
        display_name: displayName,
        picture_url: pictureUrl,
      })
      .eq("id", existingMember.id)
      .select("*")
      .single();

    if (updateError || !updatedMember) {
      return { ok: false, error: "会員情報の更新に失敗しました" };
    }

    return { ok: true, data: toMember(updatedMember) };
  }

  // 新規会員を作成
  const { data: newMember, error: insertError } = await supabase
    .from("members")
    .insert({
      tenant_id: tenantId,
      line_user_id: lineUserId,
      display_name: displayName,
      picture_url: pictureUrl,
      rank: "regular",
      total_points: 0,
      visit_count: 0,
    })
    .select("*")
    .single();

  if (insertError || !newMember) {
    return { ok: false, error: "会員作成に失敗しました" };
  }

  return { ok: true, data: toMember(newMember) };
}

/**
 * Supabase Auth でユーザーを作成/取得し、JWTを発行する
 *
 * 方式: LINE user IDベースの内部メールアドレスでSupabase Authユーザーを管理。
 * membersテーブルの auth_user_id カラムで会員とAuthユーザーを紐づける。
 * 毎回ランダムな一時パスワードを設定し、signIn後に即座にパスワードを
 * 無効化（別のランダム値で上書き）することでセキュリティを確保。
 * app_metadata に tenant_id と member_id を埋め込むことで、
 * RLSポリシーがJWTからテナントを自動判別できる。
 */
async function issueAuthToken(
  supabase: ServiceClient,
  tenantId: string,
  memberId: string,
  lineUserId: string,
  existingAuthUserId: string | null,
): Promise<
  { ok: true; data: { accessToken: string; authUserId: string } } | { ok: false; error: string }
> {
  const email = `${lineUserId}@line.luca.internal`;
  const appMetadata = { tenant_id: tenantId, member_id: memberId };
  const tempPassword = generateSecurePassword();

  let authUserId: string;

  if (existingAuthUserId) {
    // membersテーブルに auth_user_id が既にある場合、パスワードとメタデータを更新
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingAuthUserId,
      { password: tempPassword, app_metadata: appMetadata },
    );

    if (updateError) {
      return { ok: false, error: "認証情報の更新に失敗しました" };
    }

    authUserId = existingAuthUserId;
  } else {
    // auth_user_id が未設定 → 新規Authユーザーを作成
    const { data: newUser, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        app_metadata: appMetadata,
      });

    if (newUser?.user) {
      authUserId = newUser.user.id;
    } else if (
      createError &&
      createError.message?.includes("already been registered")
    ) {
      // Authユーザーは存在するが members.auth_user_id が未設定の場合
      // （マイグレーション移行期のみ発生する可能性がある）
      // createUser の重複エラーから getUserById はできないため、
      // パスワードリセット用のリンク生成でユーザーIDを取得する
      // 注: admin.listUsers() は全件取得で非効率なので使わない
      const { data: linkData, error: linkError } =
        await supabase.auth.admin.generateLink({
          type: "magiclink",
          email,
        });

      if (linkError || !linkData?.user) {
        return { ok: false, error: "既存認証ユーザーの取得に失敗しました" };
      }

      authUserId = linkData.user.id;

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        authUserId,
        { password: tempPassword, app_metadata: appMetadata },
      );

      if (updateError) {
        return { ok: false, error: "認証情報の更新に失敗しました" };
      }
    } else {
      return { ok: false, error: "認証ユーザーの作成に失敗しました" };
    }
  }

  // 一時パスワードでサインインしてセッションを取得
  // signIn 用に anon クライアントを別途作成（service_role クライアントのセッション汚染を防ぐ）
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
  const { data: signInData, error: signInError } =
    await anonClient.auth.signInWithPassword({ email, password: tempPassword });

  if (signInError || !signInData?.session) {
    return { ok: false, error: "セッション作成に失敗しました" };
  }

  // サインイン成功後、パスワードを即座にランダム値で上書きして無効化
  const { error: invalidateError } = await supabase.auth.admin.updateUserById(authUserId, {
    password: generateSecurePassword(),
  });
  if (invalidateError) {
    console.error("[auth/line] パスワード無効化に失敗:", invalidateError.message);
  }

  return {
    ok: true,
    data: { accessToken: signInData.session.access_token, authUserId },
  };
}

// ---------- API ルート ----------

/**
 * POST /api/mini/auth/line
 * LIFFのIDトークンを検証し、会員登録/ログインを行う
 *
 * リクエスト: { idToken: string }
 * レスポンス: { ok: true, data: { accessToken, member } }
 *          | { ok: false, error: string }
 */
export async function POST(request: NextRequest) {
  // 1. リクエストバリデーション
  let body: { idToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "リクエストの解析に失敗しました" },
      { status: 400 },
    );
  }

  const idToken = body.idToken;
  if (!idToken) {
    return NextResponse.json(
      { ok: false, error: "IDトークンが必要です" },
      { status: 400 },
    );
  }

  if (!DEFAULT_TENANT_ID) {
    return NextResponse.json(
      { ok: false, error: "テナント設定が不正です" },
      { status: 500 },
    );
  }

  if (!LINE_CHANNEL_ID) {
    return NextResponse.json(
      { ok: false, error: "LINE設定が不正です" },
      { status: 500 },
    );
  }

  // 2. Supabase service_role クライアントを取得
  const clientResult = getServiceClient();
  if (!clientResult.ok) {
    return NextResponse.json(
      { ok: false, error: "サーバー設定エラー" },
      { status: 500 },
    );
  }
  const supabase = clientResult.data;

  // 3. LINE APIでIDトークンを検証
  const lineResult = await verifyLineToken(idToken);
  if (!lineResult.ok) {
    return NextResponse.json(
      { ok: false, error: lineResult.error },
      { status: 401 },
    );
  }

  const lineUser = lineResult.data;

  // 4. 会員を検索/作成
  const memberResult = await findOrCreateMember(
    supabase,
    DEFAULT_TENANT_ID,
    lineUser.sub,
    lineUser.name ?? "",
    lineUser.picture ?? null,
  );

  if (!memberResult.ok) {
    return NextResponse.json(
      { ok: false, error: memberResult.error },
      { status: 500 },
    );
  }

  const member = memberResult.data;

  // 5. Supabase Auth でJWTを発行（既存のauth_user_idがあればそれを使う）
  const tokenResult = await issueAuthToken(
    supabase,
    DEFAULT_TENANT_ID,
    member.id,
    lineUser.sub,
    member.auth_user_id,
  );

  if (!tokenResult.ok) {
    return NextResponse.json(
      { ok: false, error: tokenResult.error },
      { status: 500 },
    );
  }

  // 6. auth_user_id が未設定の場合、membersテーブルに保存
  if (!member.auth_user_id) {
    const { error: linkError } = await supabase
      .from("members")
      .update({ auth_user_id: tokenResult.data.authUserId })
      .eq("id", member.id);

    if (linkError) {
      console.warn(
        `[auth/line] Failed to save auth_user_id for member ${member.id}: ${linkError.message}`,
      );
    }
  }

  // 7. レスポンス
  return NextResponse.json({
    ok: true,
    data: {
      accessToken: tokenResult.data.accessToken,
      member: {
        id: member.id,
        displayName: member.display_name,
        pictureUrl: member.picture_url,
        rank: member.rank,
        totalPoints: member.total_points,
      },
    },
  });
}
