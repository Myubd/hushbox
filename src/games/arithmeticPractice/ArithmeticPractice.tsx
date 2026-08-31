import { useCallback, useState } from "react";
import type { GameScreenProps } from "../types";
import { POINTS_PER_CORRECT_ANSWER } from "../../types";
import {
  ARITHMETIC_DIFFICULTIES,
  ARITHMETIC_OPERATORS,
  generateArithmeticProblem,
  type ArithmeticDifficulty,
  type ArithmeticOperator,
  type ArithmeticProblem,
} from "./logic";

/**
 * 計算れんしゅう(旧・学習ドリルの「算数」)。
 * 4択ではなく自由入力+自動生成の計算ドリルなので、他のプラスチャレンジのゲームが
 * 使っているChoiceQuizGameとは別に、専用の画面として実装している。
 * Tauri IPCは使わず、フロントエンドだけで問題の生成・採点が完結する。
 */
export function ArithmeticPractice({ onBack, onCorrect }: GameScreenProps) {
  const [difficulty, setDifficulty] = useState<ArithmeticDifficulty>("low");
  const [operator, setOperator] = useState<ArithmeticOperator>("mixed");
  const [problem, setProblem] = useState<ArithmeticProblem>(() =>
    generateArithmeticProblem("low", "mixed")
  );
  const [inputValue, setInputValue] = useState("");
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);

  const loadNext = useCallback(
    (nextDifficulty: ArithmeticDifficulty, nextOperator: ArithmeticOperator) => {
      setProblem(generateArithmeticProblem(nextDifficulty, nextOperator));
      setInputValue("");
      setAnswered(false);
    },
    []
  );

  const changeDifficulty = useCallback(
    (d: ArithmeticDifficulty) => {
      setDifficulty(d);
      loadNext(d, operator);
    },
    [operator, loadNext]
  );

  const changeOperator = useCallback(
    (o: ArithmeticOperator) => {
      setOperator(o);
      loadNext(difficulty, o);
    },
    [difficulty, loadNext]
  );

  const isCorrect = answered && Number(inputValue) === problem.answer;

  const submit = useCallback(() => {
    if (answered || !inputValue.trim()) return;
    setAnswered(true);
    setTotal((t) => t + 1);
    if (Number(inputValue) === problem.answer) {
      setCorrect((c) => c + 1);
      onCorrect?.(POINTS_PER_CORRECT_ANSWER[difficulty]);
    }
  }, [answered, inputValue, problem, difficulty, onCorrect]);

  return (
    <div className="mini-game">
      <div className="plus-challenge__header">
        <button className="btn btn--ghost btn--small" onClick={onBack}>
          ← もどる
        </button>
        <div className="plus-challenge__heading">
          <span className="plus-challenge__badge">🧮 計算れんしゅう</span>
        </div>
      </div>

      <div className="learning-drill__units">
        {ARITHMETIC_DIFFICULTIES.map((d) => (
          <button
            key={d.id}
            className={`learning-drill__unit${difficulty === d.id ? " is-active" : ""}`}
            onClick={() => changeDifficulty(d.id)}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="learning-drill__units">
        {ARITHMETIC_OPERATORS.map((o) => (
          <button
            key={o.id}
            className={`learning-drill__unit${operator === o.id ? " is-active" : ""}`}
            onClick={() => changeOperator(o.id)}
          >
            {o.label}
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
        <p className="learning-drill__question">{problem.question}</p>

        <form
          className="learning-drill__answer-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            type="text"
            inputMode="numeric"
            className="learning-drill__input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={answered}
            autoFocus
          />
          <button className="btn btn--primary" type="submit" disabled={answered || !inputValue.trim()}>
            こたえる
          </button>
        </form>

        {answered && (
          <div className={`learning-drill__feedback${isCorrect ? " is-correct" : " is-wrong"}`}>
            <p className="learning-drill__feedback-title">{isCorrect ? "🎉 せいかい!" : "❌ おしい!"}</p>
            <p className="learning-drill__feedback-body">正しい答えは {problem.answer} だよ。</p>

            {problem.tip && (
              <div className="learning-drill__tip">
                <p className="learning-drill__tip-title">💡 とき方のコツ</p>
                <p className="learning-drill__tip-body">{problem.tip}</p>
              </div>
            )}

            <button className="btn btn--primary" onClick={() => loadNext(difficulty, operator)}>
              つぎの問題へ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
