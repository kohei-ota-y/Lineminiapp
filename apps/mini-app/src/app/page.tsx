"use client";

import { useAuth } from "@/components/AuthProvider";
import { MemberCard } from "@/components/MemberCard";
import { CouponList } from "@/components/CouponList";

export default function HomePage() {
  const { isAuthenticated, isLoading, error, member } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-luca-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-xl p-6 shadow-sm text-center max-w-sm">
          <p className="text-red-500 font-bold mb-2">エラーが発生しました</p>
          <p className="text-gray-500 text-sm">{error}</p>
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

      {/* ポイント・クーポンは次のステップで実装 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="font-bold text-lg mb-2">ポイント履歴</h2>
        <p className="text-gray-400 text-sm">まだポイント履歴はありません</p>
      </div>

      <CouponList />
    </main>
  );
}
