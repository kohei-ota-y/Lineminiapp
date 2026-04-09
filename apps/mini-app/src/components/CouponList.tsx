"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { CouponCard } from "@/components/CouponCard";
import { CardSkeleton } from "@/components/Skeleton";
import { ErrorMessage } from "@/components/ErrorMessage";
import type { CouponCardProps } from "@/components/CouponCard";

// ---------- 型定義 ----------

type CouponData = Omit<CouponCardProps, "onUse">;

// ---------- コンポーネント ----------

/**
 * クーポン一覧を取得して表示するコンポーネント。
 * fetchApi を使い、認証トークン付きで /api/mini/coupons にリクエストする。
 * ローディング中は CardSkeleton、エラー時は ErrorMessage を表示する。
 */
export function CouponList() {
  const [coupons, setCoupons] = useState<CouponData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCoupons = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await fetchApi<{ coupons: CouponData[] }>(
      "/api/mini/coupons",
    );

    if (result.ok) {
      setCoupons(result.data.coupons);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  // ---------- ローディング ----------

  if (isLoading) {
    return <CardSkeleton showTitle lines={3} />;
  }

  // ---------- エラー ----------

  if (error) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="font-bold text-lg mb-2">クーポン</h2>
        <ErrorMessage message={error} onRetry={loadCoupons} />
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
