"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { CouponCard } from "@/components/CouponCard";
import type { CouponCardProps } from "@/components/CouponCard";

// ---------- 型定義 ----------

type CouponData = Omit<CouponCardProps, "onUse">;

interface CouponsApiResponse {
  ok: boolean;
  data?: {
    coupons: CouponData[];
  };
  error?: string;
}

// ---------- コンポーネント ----------

/**
 * クーポン一覧を取得して表示するコンポーネント。
 * Supabase のセッションから access_token を取得し、
 * /api/mini/coupons に Bearer 認証でリクエストする。
 */
export function CouponList() {
  const [coupons, setCoupons] = useState<CouponData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCoupons = async () => {
      setIsLoading(true);
      setError(null);

      // 1. Supabase セッションからアクセストークンを取得
      const supabase = getSupabase();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        setError("認証情報が取得できませんでした");
        setIsLoading(false);
        return;
      }

      // 2. API リクエスト
      let res: Response;
      try {
        res = await fetch("/api/mini/coupons", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch {
        setError("クーポン情報の取得に失敗しました");
        setIsLoading(false);
        return;
      }

      let body: CouponsApiResponse;
      try {
        body = await res.json();
      } catch {
        setError("レスポンスの解析に失敗しました");
        setIsLoading(false);
        return;
      }

      if (!body.ok || !body.data) {
        setError(body.error ?? "クーポンの取得に失敗しました");
        setIsLoading(false);
        return;
      }

      setCoupons(body.data.coupons);
      setIsLoading(false);
    };

    fetchCoupons();
  }, []);

  // ---------- ローディング ----------

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="font-bold text-lg mb-2">クーポン</h2>
        <div className="flex justify-center py-4">
          <div className="animate-spin h-6 w-6 border-3 border-luca-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  // ---------- エラー ----------

  if (error) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="font-bold text-lg mb-2">クーポン</h2>
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  // ---------- 空状態 ----------

  if (coupons.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="font-bold text-lg mb-2">クーポン</h2>
        <p className="text-gray-400 text-sm">利用可能なクーポンはありません</p>
      </div>
    );
  }

  // ---------- クーポン一覧 ----------

  return (
    <div className="space-y-3">
      <h2 className="font-bold text-lg">クーポン</h2>
      {coupons.map((coupon) => (
        <CouponCard
          key={coupon.id}
          id={coupon.id}
          title={coupon.title}
          description={coupon.description}
          discountType={coupon.discountType}
          discountValue={coupon.discountValue}
          expiresAt={coupon.expiresAt}
          isUsed={coupon.isUsed}
        />
      ))}
    </div>
  );
}
