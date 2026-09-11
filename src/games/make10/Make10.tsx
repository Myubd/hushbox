import { useCallback, useState } from "react";
import type { GameScreenProps } from "../types";
import { MAKE10_DIFFICULTIES, puzzlesFor, type Make10Difficulty } from "./data";
import { checkMake10Answer, type Make10CheckResult } from "./engine";
import type { Make10Puzzle } from "./engine";

/**
 * メイク10: 与えられた数字をちょうど1回ずつ使い、+ - × ÷ とカッコで
 * 答えが10になる式を作るパズル。
 *
 * 4桁/5桁/6桁/7桁の4段階(他のプラスチャレンジのゲームに合わせた難易度分け)。
 * 正誤判定はAIを使わず、入力された式をこの場で計算して機械的に行う
 * (`engine.ts`のcheckMake10Answer)。問題データは、収録されている解答例が
 * 実際に正しいことを事前にスクリプトで全問検証済み(詳細はdata*.tsのコメント参照)。
 */

function randomIndex(exclude: Set<number>, length: number): number {
  if (exclude.size >= length) {
    exclude.clear();
  }
  let idx: number;
  do {
    idx = Math.floor(Math.random() * length);
  } while (exclude.has(idx));
  return idx;
}

export function Make10({ onBack, onCorrect }: GameScreenProps) {
  const [difficulty, setDifficulty] = useState<Make10Difficulty>("d4");
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set());
  const [puzzleIndex, setPuzzleIndex] = useState(() =>
    randomIndex(new Set(), puzzlesFor("d4").length)
  );
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Make10CheckResult | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);

  const puzzles = puzzlesFor(difficulty);
  const puzzle: Make10Puzzle | undefined = puzzles[puzzleIndex];
  const difficultyInfo = MAKE10_DIFFICULTIES.find((d) => d.id === difficulty)!;

  const loadNext = useCallback(
    (nextDifficulty: Make10Difficulty, prevUsed: Set<number>) => {
      const list = puzzlesFor(nextDifficulty);
      const nextUsed = nextDifficulty === difficulty ? new Set(prevUsed) : new Set<number>();
      const idx = randomIndex(nextUsed, list.length);
      nextUsed.add(idx);
      setUsedIndices(nextUsed);
      setPuzzleIndex(idx);
      setInput("");
      setResult(null);
      setShowHint(false);
    },
    [difficulty]
  );

  const changeDifficulty = useCallback(
    (d: Make10Difficulty) => {
      setDifficulty(d);
      loadNext(d, new Set());
    },
    [loadNext]
  );

  const submit = useCallback(() => {
    if (!puzzle || !input.trim() || result?.ok) return;
    const r = checkMake10Answer(input, puzzle.digits);
    setResult(r);
    if (r.ok) {
      setTotal((t) => t + 1);
      setCorrect((c) => c + 1);
      onCorrect?.(difficultyInfo.points);
    } else if (r.reason === "not_ten" || r.reason === "syntax" || r.reason === "division_by_zero") {
      // 数字の使い方は合っているのに計算がまだ10になっていない/式が壊れている場合のみ
      // 「挑戦した」とみなして総数にカウントする(digit_mismatchやinvalid_charは
      // 単なる入力途中・打ち間違いのことが多いため数えない)。
      setTotal((t) => t + 1);
    }
  }, [puzzle, input, result, onCorrect, difficultyInfo]);

  if (!puzzle) {
    return (
      <div className="mini-game">
        <div className="plus-challenge__header">
          <button className="btn btn--ghost btn--small" onClick={onBack}>
            ← もどる
          </button>
        </div>
        <p className="learning-drill__loading">問題が読み込めませんでした。</p>
      </div>
    );
  }

  return (
    <div className="mini-game">
      <div className="plus-challenge__header">
        <button className="btn btn--ghost btn--small" onClick={onBack}>
          ← もどる
        </button>
        <div className="plus-challenge__heading">
          <span className="plus-challenge__badge">🔟 メイク10</span>
        </div>
      </div>

      <div className="learning-drill__units">
        {MAKE10_DIFFICULTIES.map((d) => (
          <button
            key={d.id}
            className={`learning-drill__unit${difficulty === d.id ? " is-active" : ""}`}
            onClick={() => changeDifficulty(d.id)}
          >
            {d.label}
          </button>
        ))}
      </div>

      <p className="learning-drill__badge">AIを使わず、確実に採点しています</p>

      {total > 0 && (
        <p className="plus-challenge__score">
          正解数: {correct} / {total}
        </p>
      )}

      <div className="learning-drill__card">
        <p className="learning-drill__question">
          この{puzzle.digits.length}つの数字を1回ずつ使って、10を作ってね
        </p>
        <p className="make10__digits" aria-label="使う数字">
          {[...puzzle.digits].join("　")}
        </p>
        <p className="make10__rule">
          + － × ÷ とカッコ（ ）が使えます。数字の順番は自由に並び替えてOK。
        </p>

        <form
          className="learning-drill__answer-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            type="text"
            inputMode="text"
            className="learning-drill__input make10__input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例: (1+1)×5×1"
            disabled={result?.ok}
            autoFocus
          />
          <button className="btn btn--primary" type="submit" disabled={result?.ok || !input.trim()}>
            こたえる
          </button>
        </form>

        {result && (
          <div className={`learning-drill__feedback${result.ok ? " is-correct" : " is-wrong"}`}>
            <p className="learning-drill__feedback-title">{result.ok ? "🎉 せいかい!" : "❌ おしい!"}</p>
            <p className="learning-drill__feedback-body">{result.message}</p>
          </div>
        )}

        <div className="make10__hint-row">
          {!showHint ? (
            <button className="btn btn--ghost btn--small" onClick={() => setShowHint(true)}>
              💡 こたえの一例を見る
            </button>
          ) : (
            <p className="make10__hint-text">解答例: {puzzle.solution} = 10</p>
          )}

          {!result?.ok && (
            <button
              className="btn btn--ghost btn--small"
              onClick={() => loadNext(difficulty, usedIndices)}
            >
              この問題をスキップ
            </button>
          )}

          {(result?.ok || showHint) && (
            <button className="btn btn--primary" onClick={() => loadNext(difficulty, usedIndices)}>
              つぎの問題へ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
