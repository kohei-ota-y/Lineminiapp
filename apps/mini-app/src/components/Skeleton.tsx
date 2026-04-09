/**
 * 汎用スケルトンコンポーネント
 *
 * ローディング中の表示を統一する。
 * Tailwind CSS の animate-pulse を利用したシンプルな実装。
 */

// ---------- CardSkeleton ----------

interface CardSkeletonProps {
  /** タイトル行を表示するか（デフォルト true） */
  showTitle?: boolean;
  /** コンテンツ行の数（デフォルト 3） */
  lines?: number;
}

/**
 * カード型スケルトン。
 * 白背景のカードの中にパルスアニメーション付きのバーを表示する。
 */
export function CardSkeleton({ showTitle = true, lines = 3 }: CardSkeletonProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
      {showTitle && (
        <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
      )}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-gray-200 rounded"
            style={{ width: `${90 - i * 15}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------- ListSkeleton ----------

interface ListSkeletonProps {
  /** 行数（デフォルト 3） */
  rows?: number;
}

/**
 * リスト型スケルトン。
 * アイコン + テキスト行 のペアを繰り返す。
 */
export function ListSkeleton({ rows = 3 }: ListSkeletonProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
      <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            {/* アイコン placeholder */}
            <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full" />
            {/* テキスト placeholder */}
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-3/4" />
              <div className="h-2 bg-gray-100 rounded w-1/2" />
            </div>
            {/* 右端 placeholder */}
            <div className="flex-shrink-0 space-y-2 text-right">
              <div className="h-3 bg-gray-200 rounded w-12 ml-auto" />
              <div className="h-2 bg-gray-100 rounded w-16 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
