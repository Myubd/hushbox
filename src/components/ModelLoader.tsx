import type { ModelProgress } from "../types";

interface Props {
  progress: ModelProgress;
  onRetry: () => void;
}

const STAGE_LABEL: Record<string, string> = {
  idle: "準備中",
  downloading: "モデルをダウンロード中",
  loading: "モデルを読み込み中",
  ready: "準備完了",
  error: "エラー",
};

export function ModelLoader({ progress, onRetry }: Props) {
  if (progress.status === "error") {
    return (
      <div className="loader-screen loader-screen--error">
        <p className="loader-screen__title">読み込めませんでした</p>
        <p className="loader-screen__message">{progress.detail}</p>
        <button className="btn btn--primary" onClick={onRetry}>
          もう一度試す
        </button>
      </div>
    );
  }

  return (
    <div className="loader-screen">
      <div className="loader-screen__spinner" aria-hidden="true">
        <svg viewBox="0 0 48 48" width="40" height="40">
          <circle
            cx="24"
            cy="24"
            r="19"
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="4"
          />
          <circle
            cx="24"
            cy="24"
            r="19"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="30 999"
            transform="rotate(-90 24 24)"
          />
        </svg>
      </div>
      <p className="loader-screen__title">
        {STAGE_LABEL[progress.status] ?? "準備中"}
      </p>
      <p className="loader-screen__message">{progress.detail || "少々お待ちください…"}</p>
      <p className="loader-screen__hint">
        初回のみ、モデルファイルをHugging Face Hubからダウンロードします(数百MB〜1GB程度)。
        <br />
        2回目からはこの端末にキャッシュされ、通信なしで起動します。
      </p>
    </div>
  );
}
