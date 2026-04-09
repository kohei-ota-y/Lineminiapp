"use client";

import { useState } from "react";
import { formatCurrency } from "@luca/utils";
import { fetchApi } from "@/lib/api";

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
  const [used, setUsed] = useState(isUsed);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUse = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await fetchApi<{ usedAt: string }>(
      `/api/mini/coupons/${id}/use`,
      { method: "POST" },
    );

    if (!result.ok) {
      setErrorMessage(result.error);
      setIsSubmitting(false);
      return;
    }

    setUsed(true);
    setIsSubmitting(false);
    onUse?.(id);
  };

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

        {/* エラーメッセージ */}
        {errorMessage && (
          <p className="text-red-500 text-xs mt-2">{errorMessage}</p>
        )}

        {/* 有効期限 + ボタン */}
        <div className="flex items-center justify-between mt-3">
          <p className="text-gray-400 text-xs">{formatExpiry(expiresAt)}</p>

          {used ? (
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
              disabled={isSubmitting}
              onClick={handleUse}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-green-500 text-white hover:bg-green-600 active:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "処理中..." : "使用する"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
