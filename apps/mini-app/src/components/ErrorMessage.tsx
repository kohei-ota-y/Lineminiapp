/**
 * エラー表示を統一するコンポーネント
 *
 * 全画面のエラー表示ではなく、セクション内にインラインで配置する想定。
 * オプションでリトライボタンを表示できる。
 */

interface ErrorMessageProps {
  message: string;
  /** リトライボタンを表示する場合にコールバックを渡す */
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <p className="text-red-500 text-sm text-center">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 text-sm font-bold text-white bg-luca-primary rounded-lg hover:opacity-90 active:opacity-80 transition-opacity"
        >
          再試行
        </button>
      )}
    </div>
  );
}
