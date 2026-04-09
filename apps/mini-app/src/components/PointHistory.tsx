"use client";

import type { PointTransaction, PointTransactionType } from "@luca/types";
import { ListSkeleton } from "@/components/Skeleton";
import { ErrorMessage } from "@/components/ErrorMessage";

// ---------- 取引タイプの表示設定 ----------

interface TypeConfig {
  label: string;
  icon: string;
  colorClass: string;
  prefix: string;
}

const typeConfigs: Record<PointTransactionType, TypeConfig> = {
  earn: {
    label: "獲得",
    icon: "+"  ,
    colorClass: "text-green-600 bg-green-50",
    prefix: "+",
  },
  redeem: {
    label: "使用",
    icon: "-",
    colorClass: "text-red-600 bg-red-50",
    prefix: "",
  },
  expire: {
    label: "期限切れ",
    icon: "-",
    colorClass: "text-gray-500 bg-gray-50",
    prefix: "",
  },
  adjust: {
    label: "調整",
    icon: "~",
    colorClass: "text-blue-600 bg-blue-50",
    prefix: "",
  },
};

// ---------- 日付フォーマット ----------

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

// ---------- ポイント量の表示 ----------

function formatAmount(type: PointTransactionType, amount: number): string {
  const config = typeConfigs[type];
  // earn は常に +、redeem/expire は amount が負なのでそのまま、adjust は符号付き
  if (type === "earn") {
    return `${config.prefix}${Math.abs(amount).toLocaleString()}`;
  }
  if (type === "adjust") {
    const prefix = amount >= 0 ? "+" : "";
    return `${prefix}${amount.toLocaleString()}`;
  }
  // redeem, expire: amount は負の値が入っている想定
  return amount.toLocaleString();
}

// ---------- コンポーネント ----------

interface PointHistoryProps {
  transactions: PointTransaction[];
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
}

export function PointHistory({ transactions, isLoading, error, onRetry }: PointHistoryProps) {
  // ローディング中はスケルトンを表示
  if (isLoading) {
    return <ListSkeleton rows={3} />;
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h2 className="font-bold text-lg mb-3">ポイント履歴</h2>

      {/* エラー */}
      {error && (
        <ErrorMessage message={error} onRetry={onRetry} />
      )}

      {/* 空の場合 */}
      {!error && transactions.length === 0 && (
        <p className="text-gray-400 text-sm">まだポイント履歴はありません</p>
      )}

      {/* 履歴リスト */}
      {!error && transactions.length > 0 && (
        <ul className="divide-y divide-gray-100">
          {transactions.map((tx) => {
            const config = typeConfigs[tx.type];
            return (
              <li key={tx.id} className="flex items-center gap-3 py-3">
                {/* タイプアイコン */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${config.colorClass}`}
                >
                  {config.icon}
                </div>

                {/* 説明 + 日付 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">
                    {tx.description ?? config.label}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatShortDate(tx.created_at)}
                  </p>
                </div>

                {/* ポイント量 + 残高 */}
                <div className="flex-shrink-0 text-right">
                  <p className={`text-sm font-bold ${config.colorClass.split(" ")[0]}`}>
                    {formatAmount(tx.type, tx.amount)} pt
                  </p>
                  <p className="text-xs text-gray-400">
                    残高 {tx.balance_after.toLocaleString()}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
