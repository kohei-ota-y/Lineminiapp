import type { MemberRank } from "@luca/types";

interface MemberCardProps {
  displayName: string;
  pictureUrl?: string;
  rank: MemberRank;
  totalPoints: number;
  visitCount: number;
  memberId: string;
}

const rankLabels: Record<MemberRank, string> = {
  regular: "レギュラー",
  silver: "シルバー",
  gold: "ゴールド",
  platinum: "プラチナ",
};

const rankColors: Record<MemberRank, string> = {
  regular: "bg-gray-100 text-gray-700",
  silver: "bg-gray-200 text-gray-800",
  gold: "bg-yellow-100 text-yellow-800",
  platinum: "bg-purple-100 text-purple-800",
};

export function MemberCard({
  displayName,
  pictureUrl,
  rank,
  totalPoints,
  visitCount,
  memberId,
}: MemberCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="bg-luca-primary px-4 py-3">
        <p className="text-white text-xs opacity-80">会員証</p>
      </div>

      {/* プロフィール */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          {pictureUrl ? (
            <img
              src={pictureUrl}
              alt={displayName}
              className="w-12 h-12 rounded-full"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400 text-lg">
                {displayName.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <p className="font-bold text-lg">{displayName}</p>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${rankColors[rank]}`}
            >
              {rankLabels[rank]}
            </span>
          </div>
        </div>

        {/* ステータス */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-luca-primary">
              {totalPoints.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">ポイント</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-luca-secondary">
              {visitCount}
            </p>
            <p className="text-xs text-gray-500">来店回数</p>
          </div>
        </div>

        {/* 会員番号 */}
        <p className="text-xs text-gray-400 text-center mt-3">
          会員番号: {memberId}
        </p>
      </div>
    </div>
  );
}
