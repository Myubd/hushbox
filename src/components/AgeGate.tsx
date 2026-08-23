import { AGE_MODES } from "../types";
import type { AgeMode } from "../types";

interface Props {
  onSelect: (mode: AgeMode) => void;
}

export function AgeGate({ onSelect }: Props) {
  return (
    <div className="age-gate">
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
