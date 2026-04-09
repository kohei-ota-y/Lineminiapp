import type { Result } from "@luca/types";

/**
 * 成功レスポンスを生成
 */
export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

/**
 * エラーレスポンスを生成
 */
export function err<E = string>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * 日付を YYYY-MM-DD 形式にフォーマット
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * 金額を ¥1,000 形式にフォーマット
 */
export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}
