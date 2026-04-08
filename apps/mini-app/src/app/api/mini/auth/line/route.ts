import { NextRequest, NextResponse } from "next/server";

const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID ?? "";

interface LineVerifyResponse {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  name?: string;
  picture?: string;
}

/**
 * POST /api/mini/auth/line
 * LIFFのIDトークンを検証し、会員登録/ログインを行う
 */
export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { ok: false, error: "IDトークンが必要です" },
        { status: 400 },
      );
    }

    // LINE APIでIDトークンを検証
    const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: LINE_CHANNEL_ID,
      }),
    });

    if (!verifyRes.ok) {
      return NextResponse.json(
        { ok: false, error: "トークン検証に失敗しました" },
        { status: 401 },
      );
    }

    const lineUser: LineVerifyResponse = await verifyRes.json();

    // TODO: Supabaseで会員検索/作成 → JWT発行
    // Phase 1 Step 2 で実装予定

    return NextResponse.json({
      ok: true,
      data: {
        lineUserId: lineUser.sub,
        displayName: lineUser.name,
        pictureUrl: lineUser.picture,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "内部エラーが発生しました" },
      { status: 500 },
    );
  }
}
