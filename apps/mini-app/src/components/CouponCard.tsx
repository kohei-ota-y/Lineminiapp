"use client";

import { formatCurrency } from "@luca/utils";

// ---------- 型定義 ----------

export interface CouponCardProps {
  id: string;
  title: string;
  description: string | null;
  discountType: "fixed" | "percentage";
  discountValue: number;
  expiresAt: string | null;
  isUsed: boolean;
  onUse?: (couponId: string) => void;
}

// ---------- ヘルパー ----------

/**
 * 割引内容を表示用テキストに変換する
 */
function formatDiscount(type: "fixed" | "percentage", value: number): string {
  if (type === "fixed") {
    return `${formatCurrency(value)} OFF`;
  }
  return `${value}% OFF`;
}

/**
 * 有効期限を表示用テキストに変換する
 */
function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) {
    return "期限なし";
  }
  const d = new Date(expiresAt);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}まで`;
}

// ---------- コンポーネント ----------

export function CouponCard({
  id,
  title,
  description,
  discountType,
  discountValue,
  expiresAt,
  isUsed,
  onUse,
}: CouponCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-4">
        {/* タイトル */}
        <h3 className="font-bold text-lg">{title}</h3>

        {/* 割引内容 */}
        <p className="text-luca-primary text-xl font-bold mt-1">
          {formatDiscount(discountType, discountValue)}
        </p>

        {/* 説明文 */}
        {description && (
          <p className="text-gray-500 text-sm mt-2">{description}</p>
        )}

        {/* 有効期限 + ボタン */}
        <div className="flex items-center justify-between mt-3">
          <p className="text-gray-400 text-xs">{formatExpiry(expiresAt)}</p>

          {isUsed ? (
            <button
              type="button"
              disabled
              className="px-4 py-2 rounded-lg text-sm font-bold bg-gray-200 text-gray-400 cursor-not-allowed"
            >
              使用済み
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onUse?.(id)}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-green-500 text-white hover:bg-green-600 active:bg-green-700 transition-colors"
            >
              使用する
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
