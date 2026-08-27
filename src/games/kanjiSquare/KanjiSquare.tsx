import { useCallback, useState } from "react";
import { KANJI_SQUARE_PUZZLES, type KanjiSquarePuzzle } from "./data";
import type { GameScreenProps } from "../types";

function pickRandomIndex(length: number, excludeIndex: number | null): number {
  if (length <= 1) return 0;
  let idx = Math.floor(Math.random() * length);
  while (idx === excludeIndex) idx = Math.floor(Math.random() * length);
  return idx;
}

export function KanjiSquare({ onBack }: GameScreenProps) {
  const [puzzleIndex, setPuzzleIndex] = useState<number | null>(() =>
    KANJI_SQUARE_PUZZLES.length > 0 ? pickRandomIndex(KANJI_SQUARE_PUZZLES.length, null) : null
  );
  const [input, setInput] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);

  const puzzle: KanjiSquarePuzzle | null = puzzleIndex !== null ? KANJI_SQUARE_PUZZLES[puzzleIndex] : null;

  const goToNext = useCallback(() => {
    if (KANJI_SQUARE_PUZZLES.length === 0) return;
    setPuzzleIndex((prev) => pickRandomIndex(KANJI_SQUARE_PUZZLES.length, prev));
    setInput("");
    setResult(null);
  }, []);

  const submit = useCallback(() => {
    if (!puzzle || result) return;
    const cleaned = input.trim();
    setTotal((t) => t + 1);
    if (cleaned === puzzle.answer) {
      setResult("correct");
      setCorrect((c) => c + 1);
    } else {
      setResult("wrong");
    }
  }, [puzzle, input, result]);

  return (
    <div className="mini-game">
      <div className="plus-challenge__header">
        <button className="btn btn--ghost btn--small" onClick={onBack}>
          ← もどる
        </button>
        <div className="plus-challenge__heading">
          <span className="plus-challenge__badge">🀄 漢字スクエア</span>
        </div>
      </div>

      {total > 0 && (
        <p className="plus-challenge__score">
          正解数: {correct} / {total}
        </p>
      )}

      {!puzzle ? (
        <p className="learning-drill__loading">まだ問題が用意されていません。データを追加すると、ここに出題されます。</p>
      ) : (
        <div className="learning-drill__card mini-game__card">
          <p className="kanji-square__hint">中央に漢字を1字入れて、4つの熟語を完成させよう</p>

          <div className="kanji-square__grid">
            <div className="kanji-square__cell kanji-square__cell--top">{puzzle.top}</div>
            <div className="kanji-square__cell kanji-square__cell--left">{puzzle.left}</div>
            <input
              className="kanji-square__cell kanji-square__input"
              value={input}
              maxLength={2}
              disabled={!!result}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              aria-label="中央に入れる漢字"
            />
            <div className="kanji-square__cell kanji-square__cell--right">{puzzle.right}</div>
            <div className="kanji-square__cell kanji-square__cell--bottom">{puzzle.bottom}</div>
          </div>

          {!result && (
            <button className="btn btn--primary" onClick={submit} disabled={input.trim().length === 0}>
              こたえる
            </button>
          )}

          {result && (
            <div className={`learning-drill__feedback${result === "correct" ? " is-correct" : " is-wrong"}`}>
              <p className="learning-drill__feedback-title">
                {result === "correct" ? "🎉 正解!" : `❌ おしい! 正解は「${puzzle.answer}」`}
              </p>
              <ul className="kanji-square__words">
                <li>
                  {puzzle.top} + {puzzle.answer} = <strong>{puzzle.words.top}</strong>
                </li>
                <li>
                  {puzzle.left} + {puzzle.answer} = <strong>{puzzle.words.left}</strong>
                </li>
                <li>
                  {puzzle.answer} + {puzzle.right} = <strong>{puzzle.words.right}</strong>
                </li>
                <li>
                  {puzzle.answer} + {puzzle.bottom} = <strong>{puzzle.words.bottom}</strong>
                </li>
              </ul>
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
