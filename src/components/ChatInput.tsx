import { useEffect, useRef, useState } from "react";
import type { AgeMode, PiiMatch } from "../types";
import { PII_LABELS } from "../types";

interface Props {
  mode: AgeMode;
  disabled: boolean;
  previewPii: (text: string) => Promise<{ matches: PiiMatch[]; redacted: string }>;
  onSend: (text: string) => void;
}

export function ChatInput({ mode, disabled, previewPii, onSend }: Props) {
  const [text, setText] = useState("");
  const [matches, setMatches] = useState<PiiMatch[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const requestId = useRef(0);

  // 入力のたびにRust側(ローカルIPC、通信は発生しない)へPIIスキャンをリクエスト。
  // 連打による競合を避けるため、最後に投げたリクエストの結果だけを反映する。
  useEffect(() => {
    const id = ++requestId.current;
    if (!text.trim()) {
      setMatches([]);
      return;
    }
    const timer = setTimeout(() => {
      previewPii(text).then((res) => {
        if (requestId.current === id) setMatches(res.matches);
      });
    }, 120);
    return () => clearTimeout(timer);
  }, [text, previewPii]);

  const hasPii = matches.length > 0;

  const placeholder =
    mode === "low"
      ? "AIに きいてみたいことを かいてね"
      : mode === "mid"
      ? "まず自分で考えてから、AIに聞いてみよう"
      : "質問や考えを入力(AIの答えには『なぜ?』と聞き返してみよう)";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    if (hasPii && !confirmed) return;
    onSend(text);
    setText("");
    setMatches([]);
    setConfirmed(false);
  }

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      {hasPii && (
        <div className="pii-alert">
          <p className="pii-alert__title">🛡️ ちょっとまって!これは教えなくていいよ</p>
          <ul className="pii-alert__list">
            {matches.map((m, i) => (
              <li key={i}>
                <strong>{PII_LABELS[m.type]}</strong>らしき「{m.text}」
              </li>
            ))}
          </ul>
          <label className="pii-alert__confirm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            それでも送る(自動でマスクしてAIに送ります。元の文字は保存されません)
          </label>
        </div>
      )}
      <div className="chat-input__row">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              handleSubmit(e);
            }
          }}
        />
        <button
          type="submit"
          className="btn btn--send"
          disabled={disabled || !text.trim() || (hasPii && !confirmed)}
        >
          送る
        </button>
      </div>
    </form>
  );
}
