import { AGE_MODES } from "../types";
import type { AgeMode } from "../types";

/**
 * 学年モード(low/mid/junior)を選ぶ最初の画面。
 *
 * 以前は`AgeGate`という名前だったが、Web業界で「age gate」は一般的に
 * 「年齢確認・年齢認証(例: 13歳以上か確認する画面)」を指す用語であり、
 * このコンポーネントはそうした認証を一切行っていない
 * (自己申告のモード選択のみで、裏付けとなる年齢確認ロジックは存在しない)。
 * 実装の実態と名前の意味が食い違うと、後から読む人が「ここに年齢確認の
 * 仕組みがあるはず」と誤解しかねないため、実態に合わせて改名した。
 * CSSクラス名(age-gate等)は見た目に影響しない内部実装の詳細なので、
 * 変更リスクを避けるためそのまま残している。
 */
interface Props {
  onSelect: (mode: AgeMode) => void;
  onPlusChallenge: () => void;
  onOpenSettings: () => void;
  onOpenWallpaperShop: () => void;
  totalPoints: number;
}

export function GradeModeSelect({
  onSelect,
  onPlusChallenge,
  onOpenSettings,
  onOpenWallpaperShop,
  totalPoints,
}: Props) {
  return (
    <div className="age-gate">
      <button
        type="button"
        className="age-gate__wallpaper-shop-btn"
        onClick={onOpenWallpaperShop}
        aria-label="壁紙ショップを開く"
        title="壁紙ショップ"
      >
        🌟 {totalPoints}
      </button>
      <button
        type="button"
        className="age-gate__settings-btn"
        onClick={onOpenSettings}
        aria-label="設定を開く"
        title="設定"
      >
        ⚙️
      </button>

      <div className="age-gate__intro">
        <span className="brand-mark" aria-hidden="true">
          <PaperPlaneIcon />
        </span>
        <h1>プライバシー・バディ</h1>
        <p className="age-gate__tagline">
          きみの言葉は、きみの中だけに。
          <br />
          何を聞いても、外には送られないAIといっしょに学ぼう。
        </p>
      </div>

      <div className="age-gate__grid">
        {AGE_MODES.map((m) => (
          <button
            key={m.id}
            className="age-card"
            onClick={() => onSelect(m.id)}
          >
            <span className="age-card__label">{m.label}</span>
            <span className="age-card__sub">{m.subLabel}</span>
            <span className="age-card__desc">{m.description}</span>
          </button>
        ))}
      </div>

      <button type="button" className="plus-gate-cta" onClick={onPlusChallenge}>
        <span className="plus-gate-cta__icon" aria-hidden="true">
          🎓
        </span>
        <span className="plus-gate-cta__text">
          <span className="plus-gate-cta__label">プラスチャレンジ</span>
          <span className="plus-gate-cta__desc">
            義務教育のその先へ。AI・プライバシー・情報社会について、もっと発展した内容に挑戦しよう
          </span>
        </span>
        <span className="plus-gate-cta__arrow" aria-hidden="true">
          →
        </span>
      </button>

      <p className="age-gate__footnote">
        ※ このアプリはサーバーを一切使いません。AIモデルを最初に一度だけダウンロードしたら、
        あとは目の前の端末の中だけで動きます。
      </p>
    </div>
  );
}

function PaperPlaneIcon() {
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" fill="none" aria-hidden="true">
      <path
        d="M6 24L42 8L30 42L23 27L6 24Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M23 27L42 8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
