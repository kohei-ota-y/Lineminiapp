"use client";

import { useEffect, useState, useCallback } from "react";
import type liff from "@line/liff";

type Liff = typeof liff;

interface UseLiffReturn {
  liff: Liff | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  getIDToken: () => string | null;
}

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID ?? "";

/**
 * LIFF SDK のラッパーフック。
 * LIFF の初期化とログインのみを担当する。
 * 認証ロジック（IDトークン送信・会員情報取得）は AuthProvider で行う。
 */
export function useLiff(): UseLiffReturn {
  const [liffInstance, setLiffInstance] = useState<Liff | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!LIFF_ID) {
      setError("LIFF IDが設定されていません");
      setIsLoading(false);
      return;
    }

    import("@line/liff")
      .then((liffModule) => liffModule.default)
      .then(async (liff) => {
        await liff.init({ liffId: LIFF_ID });
        setLiffInstance(liff);

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        setIsLoggedIn(true);
      })
      .catch((e: Error) => {
        setError(e.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const getIDToken = useCallback((): string | null => {
    if (!liffInstance) {
      return null;
    }
    return liffInstance.getIDToken();
  }, [liffInstance]);

  return { liff: liffInstance, isLoggedIn, isLoading, error, getIDToken };
}
