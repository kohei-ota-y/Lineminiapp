"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLiff } from "@/lib/liff";
import { setSupabaseSession } from "@/lib/supabase";
import { fetchApi } from "@/lib/api";
import type { MemberRank } from "@luca/types";

// ---------- 型定義 ----------

interface AuthMember {
  id: string;
  displayName: string;
  pictureUrl: string | null;
  rank: MemberRank;
  totalPoints: number;
  visitCount: number;
}

interface AuthContextValue {
  member: AuthMember | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  /** /api/mini/members/me を呼んで会員情報を最新に更新する */
  refreshMember: () => Promise<void>;
}

interface AuthApiResponse {
  ok: boolean;
  data?: {
    accessToken: string;
    member: AuthMember;
  };
  error?: string;
}

// ---------- Context ----------

const AuthContext = createContext<AuthContextValue>({
  member: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  refreshMember: async () => {},
});

// ---------- Provider ----------

/**
 * LIFF認証 → サーバー認証 → Supabaseセッション設定 を一括で行うプロバイダ。
 *
 * 処理フロー:
 * 1. useLiff() で LIFF 初期化 + liff.login()
 * 2. liff.getIDToken() で IDトークン取得
 * 3. /api/mini/auth/line に POST → accessToken + member を取得
 * 4. setSupabaseSession() で Supabase クライアントにセッションをセット
 * 5. member を context に保持
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn, isLoading: isLiffLoading, error: liffError, getIDToken } = useLiff();

  const [member, setMember] = useState<AuthMember | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // 二重認証防止ガード
  const authenticatingRef = useRef(false);

  useEffect(() => {
    // LIFF がまだ読み込み中、またはログインしていない場合はスキップ
    if (isLiffLoading || !isLoggedIn || authenticatingRef.current) {
      return;
    }
    authenticatingRef.current = true;

    const authenticate = async () => {
      setIsAuthLoading(true);
      try {
        // 1. IDトークンを取得
        const idToken = getIDToken();
        if (!idToken) {
          setAuthError("IDトークンの取得に失敗しました");
          return;
        }

        // 2. サーバーに認証リクエストを送信
        let res: Response;
        try {
          res = await fetch("/api/mini/auth/line", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
        } catch {
          setAuthError("認証サーバーへの接続に失敗しました");
          return;
        }

        let body: AuthApiResponse;
        try {
          body = await res.json();
        } catch {
          setAuthError("認証レスポンスの解析に失敗しました");
          return;
        }

        if (!body.ok || !body.data) {
          setAuthError(body.error ?? "認証に失敗しました");
          return;
        }

        const { accessToken, member: memberData } = body.data;

        // 3. Supabase クライアントにセッションをセット
        const sessionResult = await setSupabaseSession(accessToken);
        if (!sessionResult.ok) {
          setAuthError(sessionResult.error);
          return;
        }

        // 4. 会員情報を保持
        setMember(memberData);
      } finally {
        setIsAuthLoading(false);
      }
    };

    authenticate();
  }, [isLiffLoading, isLoggedIn, getIDToken]);

  /**
   * /api/mini/members/me を呼んで会員情報を最新に更新する。
   * ポイント付与・来店記録の後などに呼び出すことで、
   * visitCount や totalPoints を画面に反映できる。
   */
  const refreshMember = useCallback(async () => {
    const result = await fetchApi<{ member: AuthMember }>(
      "/api/mini/members/me",
    );
    if (result.ok) {
      setMember(result.data.member);
    }
  }, []);

  // ローディング状態: LIFF読み込み中 or 認証処理中
  const isLoading = isLiffLoading || isAuthLoading;
  // エラー: LIFF エラー or 認証エラー
  const error = liffError ?? authError;
  const isAuthenticated = member !== null;

  return (
    <AuthContext.Provider value={{ member, isAuthenticated, isLoading, error, refreshMember }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------- Hook ----------

/**
 * AuthContext から認証情報を取得するフック。
 * AuthProvider の子コンポーネントで使用する。
 */
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
