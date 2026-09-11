import { useCallback, useState, type ReactNode } from "react";

/**
 * 「お題を見て、答えを自分で入力する」形式のゲームに共通して使える土台。
 * `ChoiceQuizGame`(4択形式)の自由入力版。同じ問題データを4択あり/なしの
 * 両方で出したいときは、`ChoiceQuizItem`互換のデータ1つを両方に渡せる
 * (`correctChoice`を正解として文字列比較に使う。`choices`はこちらでは使わない)。
 */

export interface FreeInputQuizItem {
  id: string;
  correctChoice: string;
  explanation: string;
}

interface Props<T extends FreeInputQuizItem> {
  title: string;
  icon: string;
  items: T[];
  /** お題部分の描画。入力欄・正誤表示はこのコンポーネントが担当する。 */
  renderPrompt: (item: T) => ReactNode;
  onBack: () => void;
  emptyMessage?: string;
  notice?: ReactNode;
  headerExtra?: ReactNode;
  pointsPerCorrect?: number;
  onCorrect?: (points: number) => void;
  /** 入力欄のplaceholder。省略時は「こたえを入力」。 */
  inputPlaceholder?: string;
}

function normalizeAnswer(s: string): string {
  // 全角/半角スペース・前後の空白の違いだけで不正解にしないための正規化。
  return s.replace(/[\s　]+/g, "").trim();
}

export function FreeInputQuizGame<T extends FreeInputQuizItem>({
  title,
  icon,
  items,
  renderPrompt,
  onBack,
  emptyMessage,
  notice,
  headerExtra,
  pointsPerCorrect = 2,
  onCorrect,
  inputPlaceholder = "こたえを入力してね",
}: Props<T>) {
  const [itemIndex, setItemIndex] = useState<number | null>(() =>
    items.length > 0 ? Math.floor(Math.random() * items.length) : null
  );
  const [input, setInput] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);

  const item = itemIndex !== null ? items[itemIndex] : null;

  const goToNext = useCallback(() => {
    if (items.length === 0) return;
    const nextIndex =
      items.length === 1
        ? 0
        : (() => {
            let idx = Math.floor(Math.random() * items.length);
            while (idx === itemIndex) idx = Math.floor(Math.random() * items.length);
            return idx;
          })();
    setItemIndex(nextIndex);
    setInput("");
    setResult(null);
  }, [items, itemIndex]);

  const submit = useCallback(() => {
    if (!item || result || !input.trim()) return;
    const isCorrect = normalizeAnswer(input) === normalizeAnswer(item.correctChoice);
    setResult(isCorrect ? "correct" : "wrong");
    setTotal((t) => t + 1);
    if (isCorrect) {
      setCorrect((c) => c + 1);
      onCorrect?.(pointsPerCorrect);
    }
  }, [item, result, input, onCorrect, pointsPerCorrect]);

  return (
    <div className="mini-game">
      <div className="plus-challenge__header">
        <button className="btn btn--ghost btn--small" onClick={onBack}>
          ← もどる
        </button>
        <div className="plus-challenge__heading">
          <span className="plus-challenge__badge">
            {icon} {title}
          </span>
        </div>
      </div>

      {headerExtra}

      {notice && <p className="plus-challenge__notice">{notice}</p>}

      {total > 0 && (
        <p className="plus-challenge__score">
          正解数: {correct} / {total}
        </p>
      )}

      {!item ? (
        <p className="learning-drill__loading">
          {emptyMessage ?? "まだ問題が用意されていません。データを追加すると、ここに出題されます。"}
        </p>
      ) : (
        <div className="learning-drill__card mini-game__card">
          {renderPrompt(item)}

          <form
            className="learning-drill__answer-form"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input
              type="text"
              className="learning-drill__input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={inputPlaceholder}
              disabled={!!result}
              autoFocus
            />
            <button className="btn btn--primary" type="submit" disabled={!!result || !input.trim()}>
              こたえる
            </button>
          </form>

          {result && (
            <div className={`learning-drill__feedback${result === "correct" ? " is-correct" : " is-wrong"}`}>
              <p className="learning-drill__feedback-title">
                {result === "correct" ? "🎉 正解!" : `❌ おしい! 正解は「${item.correctChoice}」でした`}
              </p>
              <p className="learning-drill__feedback-body">{item.explanation}</p>
              <button className="btn btn--primary" onClick={goToNext}>
                つぎの問題へ
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
