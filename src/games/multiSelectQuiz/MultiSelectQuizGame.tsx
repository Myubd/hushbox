import { useCallback, useState, type ReactNode } from "react";

/**
 * 「お題を見て、選択肢の中から正解をすべて選ぶ(複数選択もありうる)」形式の
 * ゲームに共通して使える土台。`ChoiceQuizGame`(単一選択)の複数選択版。
 *
 * 数字クイズ(選択肢の数字を足すと答えになる組み合わせを選ぶ)や、
 * 色クイズ(選択肢の色のうち、実際に使われている色をすべて選ぶ)など、
 * 「選択肢は固定 or 問題ごとに変わるが、正解は1つとは限らない」形式で使う。
 *
 * 新しく同じ形式のゲームを追加したいときは:
 *   1. `MultiSelectQuizItem` を満たすデータ配列を用意する
 *   2. `renderPrompt` でお題部分の見た目だけを書く
 * だけでよい。
 */

export interface MultiSelectQuizItem {
  id: string;
  /** 選択肢(問題ごとに異なってもよい)。表示順はそのまま使う(シャッフルしない)。 */
  choices: string[];
  /** 正解の選択肢(1つ以上)。 */
  correctChoices: string[];
  explanation: string;
}

interface Props<T extends MultiSelectQuizItem> {
  title: string;
  icon: string;
  items: T[];
  /** お題部分の描画。選択肢や正誤表示はこのコンポーネントが担当する。 */
  renderPrompt: (item: T) => ReactNode;
  onBack: () => void;
  emptyMessage?: string;
  notice?: ReactNode;
  headerExtra?: ReactNode;
  /** 正解1問あたりのポイント。難易度に応じて呼び出し側が渡す想定(未指定時は2p)。 */
  pointsPerCorrect?: number;
  onCorrect?: (points: number) => void;
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((v) => setB.has(v));
}

export function MultiSelectQuizGame<T extends MultiSelectQuizItem>({
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
}: Props<T>) {
  const [itemIndex, setItemIndex] = useState<number | null>(() =>
    items.length > 0 ? Math.floor(Math.random() * items.length) : null
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
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
    setSelected([]);
    setSubmitted(false);
  }, [items, itemIndex]);

  const toggle = useCallback(
    (choice: string) => {
      if (submitted) return;
      setSelected((prev) =>
        prev.includes(choice) ? prev.filter((c) => c !== choice) : [...prev, choice]
      );
    },
    [submitted]
  );

  const submit = useCallback(() => {
    if (!item || submitted || selected.length === 0) return;
    setSubmitted(true);
    setTotal((t) => t + 1);
    if (sameSet(selected, item.correctChoices)) {
      setCorrect((c) => c + 1);
      onCorrect?.(pointsPerCorrect);
    }
  }, [item, submitted, selected, onCorrect, pointsPerCorrect]);

  const answeredCorrectly = submitted && item !== null && sameSet(selected, item.correctChoices);

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

          <div className="learning-drill__choices mini-game__choices">
            {item.choices.map((choice) => {
              const isSelected = selected.includes(choice);
              const isCorrectChoice = item.correctChoices.includes(choice);
              let stateClass = "";
              if (submitted) {
                if (isCorrectChoice) {
                  stateClass = "is-correct-choice";
                } else if (isSelected) {
                  stateClass = "is-wrong-choice";
                } else {
                  stateClass = "is-neutral";
                }
              } else if (isSelected) {
                stateClass = "is-selected";
              }
              return (
                <button
                  key={choice}
                  className={`learning-drill__choice ${stateClass}`}
                  disabled={submitted}
                  onClick={() => toggle(choice)}
                >
                  {choice}
                </button>
              );
            })}
          </div>

          {!submitted && (
            <button
              className="btn btn--primary"
              disabled={selected.length === 0}
              onClick={submit}
            >
              けってい
            </button>
          )}

          {submitted && (
            <div className={`learning-drill__feedback${answeredCorrectly ? " is-correct" : " is-wrong"}`}>
              <p className="learning-drill__feedback-title">
                {answeredCorrectly ? "🎉 正解!" : "❌ おしい!"}
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
