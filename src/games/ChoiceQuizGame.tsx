import { useCallback, useState, type ReactNode } from "react";

/**
 * 「お題を見て、4つの選択肢から正解を選ぶ」形式のゲームに共通して使える土台。
 * 歴史のタイムスタンプ・世界地図タイムトラベルなど、見せ方(お題の表示内容)だけが
 * 違うゲームはこれを使い回すことで実装量を減らせる。
 *
 * 新しく同じ形式のゲームを追加したいときは:
 *   1. `ChoiceQuizItem` を満たすデータ配列を用意する
 *   2. `renderPrompt` でお題部分(日付・地図画像など)の見た目だけを書く
 * だけでよい。
 */

export interface ChoiceQuizItem {
  id: string;
  /** 選択肢(この中に必ず正解を1つ含める。表示時にシャッフルされる) */
  choices: string[];
  correctChoice: string;
  explanation: string;
}

interface Props<T extends ChoiceQuizItem> {
  title: string;
  icon: string;
  items: T[];
  /** お題部分(日付・地図画像など)の描画。選択肢や正誤表示はこのコンポーネントが担当する。 */
  renderPrompt: (item: T) => ReactNode;
  onBack: () => void;
  /** 問題データが空のときに出す案内文。省略時は共通の文言。 */
  emptyMessage?: string;
  /** ヘッダー直下に常時表示する注記(「準備中」など、問題データが不十分なゲームで使う想定)。 */
  notice?: ReactNode;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function ChoiceQuizGame<T extends ChoiceQuizItem>({
  title,
  icon,
  items,
  renderPrompt,
  onBack,
  emptyMessage,
  notice,
}: Props<T>) {
  const [itemIndex, setItemIndex] = useState<number | null>(() =>
    items.length > 0 ? Math.floor(Math.random() * items.length) : null
  );
  const [shuffledChoices, setShuffledChoices] = useState<string[]>(() =>
    items.length > 0 ? shuffle(items[itemIndex ?? 0].choices) : []
  );
  const [selected, setSelected] = useState<string | null>(null);
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
    setShuffledChoices(shuffle(items[nextIndex].choices));
    setSelected(null);
  }, [items, itemIndex]);

  const submit = useCallback(
    (choice: string) => {
      if (!item || selected) return;
      setSelected(choice);
      setTotal((t) => t + 1);
      if (choice === item.correctChoice) setCorrect((c) => c + 1);
    },
    [item, selected]
  );

  const answeredCorrectly = selected !== null && item !== null && selected === item.correctChoice;

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
            {shuffledChoices.map((choice) => {
              let stateClass = "";
              if (selected) {
                if (choice === item.correctChoice) {
                  stateClass = "is-correct-choice";
                } else if (choice === selected) {
                  stateClass = "is-wrong-choice";
                } else {
                  stateClass = "is-neutral";
                }
              }
              return (
                <button
                  key={choice}
                  className={`learning-drill__choice ${stateClass}`}
                  disabled={!!selected}
                  onClick={() => submit(choice)}
                >
                  {choice}
                </button>
              );
            })}
          </div>

          {selected && (
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
