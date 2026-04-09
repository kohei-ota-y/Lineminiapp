"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { MemberCard } from "@/components/MemberCard";
import { PointHistory } from "@/components/PointHistory";
import { CouponList } from "@/components/CouponList";
import { CardSkeleton, ListSkeleton } from "@/components/Skeleton";
import { ErrorMessage } from "@/components/ErrorMessage";
import { fetchApi } from "@/lib/api";
import type { PointTransaction } from "@luca/types";

export default function HomePage() {
  const { isAuthenticated, isLoading, error, member, tenantSettings } = useAuth();

  // ポイント履歴の状態管理
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [pointsError, setPointsError] = useState<string | null>(null);

  // ポイント履歴を取得する関数
  const loadPoints = useCallback(async () => {
    setPointsLoading(true);
    setPointsError(null);

    const result = await fetchApi<{ transactions: PointTransaction[] }>(
      "/api/mini/points",
    );

    if (result.ok) {
      setTransactions(result.data.transactions);
    } else {
      setPointsError(result.error);
    }

    setPointsLoading(false);
  }, []);

  // 認証完了後にポイント履歴を取得
  useEffect(() => {
    if (!isAuthenticated || !member) {
      return;
    }

    loadPoints();
  }, [isAuthenticated, member, loadPoints]);

  if (isLoading) {
    return (
      <main className="max-w-md mx-auto px-4 py-6 space-y-4">
        <CardSkeleton showTitle lines={4} />
        <ListSkeleton rows={3} />
        <CardSkeleton showTitle lines={3} />
      </main>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-xl p-6 shadow-sm text-center max-w-sm">
          <ErrorMessage message={error} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !member) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-xl p-6 shadow-sm text-center max-w-sm">
          <p className="text-gray-500">LINEでログインしてください</p>
        </div>
      </div>
    );
  }

  // フィーチャーフラグ（テナント設定が未取得の場合はデフォルトで表示）
  const showPoints = tenantSettings?.featurePoint !== false;
  const showCoupons = tenantSettings?.featureCoupon !== false;

  return (
    <main className="max-w-md mx-auto px-4 py-6 space-y-4">
      <MemberCard
        displayName={member.displayName}
        pictureUrl={member.pictureUrl ?? undefined}
        rank={member.rank}
        totalPoints={member.totalPoints}
        visitCount={member.visitCount}
        memberId={member.id}
      />

      {showPoints && (
        <PointHistory
          transactions={transactions}
          isLoading={pointsLoading}
          error={pointsError}
          onRetry={loadPoints}
        />
      )}

      {showCoupons && <CouponList />}
    </main>
  );
}
