"use client";

import { useEffect, useState } from "react";
import type liff from "@line/liff";

type Liff = typeof liff;

interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

interface UseLiffReturn {
  liff: Liff | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  profile: LiffProfile | null;
}

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID ?? "";

export function useLiff(): UseLiffReturn {
  const [liffInstance, setLiffInstance] = useState<Liff | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<LiffProfile | null>(null);

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
        const userProfile = await liff.getProfile();
        setProfile({
          userId: userProfile.userId,
          displayName: userProfile.displayName,
          pictureUrl: userProfile.pictureUrl,
        });
      })
      .catch((e: Error) => {
        setError(e.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return { liff: liffInstance, isLoggedIn, isLoading, error, profile };
}
