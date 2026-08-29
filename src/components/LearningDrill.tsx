import { useCallback, useEffect, useState } from "react";
import { checkLearningAnswer, listLearningUnits, nextLearningProblem } from "../lib/tauriClient";
import {
  DRILL_SUBJECTS,
  type AgeMode,
  type DrillSubject,
  type DrillUnit,
  type LearningCheckResult,
  type LearningProblem,
} from "../types";

interface Props {
  mode: AgeMode;
}

// 科目ごとの正解数/回答数はタブを切り替えても失わないよう、
// このコンポーネントの外(科目id単位)で保持する。
type ScoreMap = Record<DrillSubject, { correct: number; total: number }>;

const EMPTY_SCORES: ScoreMap = {
  arithmetic: { correct: 0, total: 0 },
  kanji: { correct: 0, total: 0 },
  science: { correct: 0, total: 0 },
  social: { correct: 0, total: 0 },
  math: { correct: 0, total: 0 },
  english: { correct: 0, total: 0 },
  info: { correct: 0, total: 0 },
};

export function LearningDrill({ mode }: Props) {
  const [subject, setSubject] = useState<DrillSubject>("math");
  const [units, setUnits] = useState<DrillUnit[]>([]);
  const [unit, setUnit] = useState<string>("mixed");
  const [problem, setProblem] = useState<LearningProblem | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [result, setResult] = useState<LearningCheckResult | null>(null);
  const [scores, setScores] = useState<ScoreMap>(EMPTY_SCORES);
  const [loading, setLoading] = useState(false);

  const loadNext = useCallback(
    async (nextSubject: DrillSubject, nextUnit: string) => {
      setLoading(true);
      setResult(null);
      setInputValue("");
      setSelectedChoice(null);
      try {
        const p = await nextLearningProblem(nextSubject, mode, nextUnit);
        setProblem(p);
      } finally {
        setLoading(false);
      }
    },
    [mode]
  );

  // 科目を切り替えたら、その科目の単元一覧を取り直し、単元は「すべて」に戻す
  useEffect(() => {
    let cancelled = false;
    setUnit("mixed");
    listLearningUnits(subject).then((u) => {
      if (!cancelled) setUnits(u);
    });
    return () => {
      cancelled = true;
    };
  }, [subject]);

  useEffect(() => {
    void loadNext(subject, unit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, unit, mode]);

  const submit = useCallback(
    async (answer: string) => {
      if (!problem || result) return;
      setSelectedChoice(answer);
      const r = await checkLearningAnswer(problem.id, answer);
      setResult(r);
      setScores((prev) => ({
        ...prev,
        [subject]: {
          correct: prev[subject].correct + (r.correct ? 1 : 0),
          total: prev[subject].total + 1,
        },
      }));
    },
    [problem, result, subject]
  );

  const currentScore = scores[subject];
  const subjectInfo = DRILL_SUBJECTS.find((s) => s.id === subject)!;
  // 単元が「すべて」しか無い科目(まだ単元分けしていない)は、セレクタ自体を出さない
  const showUnitSelector = units.length > 1;
  const mainSubjects = DRILL_SUBJECTS.filter((s) => !s.advanced);
  const advancedSubjects = DRILL_SUBJECTS.filter((s) => s.advanced);

  return (
    <div className="learning-drill">
      <div className="learning-drill__tabs">
        {mainSubjects.map((s) => (
          <button
            key={s.id}
            className={`learning-drill__tab${subject === s.id ? " is-active" : ""}`}
            onClick={() => setSubject(s.id)}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {advancedSubjects.length > 0 && (
        <div className="learning-drill__tabs learning-drill__tabs--advanced">
          <span className="learning-drill__tabs-label">発展</span>
          {advancedSubjects.map((s) => (
            <button
              key={s.id}
              className={`learning-drill__tab${subject === s.id ? " is-active" : ""}`}
              onClick={() => setSubject(s.id)}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      )}

      {showUnitSelector && (
        <div className="learning-drill__units">
          {units.map((u) => (
            <button
              key={u.id}
              className={`learning-drill__unit${unit === u.id ? " is-active" : ""}`}
              onClick={() => setUnit(u.id)}
            >
              {u.label}
            </button>
          ))}
        </div>
      )}

      <p className="learning-drill__badge">AIを使わず、確実に採点しています</p>

      {currentScore.total > 0 && (
        <p className="learning-drill__score">
          {subjectInfo.label}の正解数: {currentScore.correct} / {currentScore.total}
        </p>
      )}

      {loading || !problem ? (
        <p className="learning-drill__loading">問題を作っています…</p>
      ) : (
        <div className="learning-drill__card">
          <p className="learning-drill__question">{problem.question}</p>

          {problem.kind === "arithmetic" && (
            <form
              className="learning-drill__answer-form"
              onSubmit={(e) => {
                e.preventDefault();
                void submit(inputValue);
              }}
            >
              <input
                type="text"
                inputMode="numeric"
                className="learning-drill__input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={!!result}
                autoFocus
              />
              <button className="btn btn--primary" type="submit" disabled={!!result || !inputValue.trim()}>
                こたえる
              </button>
            </form>
          )}

          {problem.kind === "choice" && (
            <div className="learning-drill__choices">
              {problem.choices.map((choice) => {
                let stateClass = "";
                if (result) {
                  if (choice === result.correctAnswer) {
                    stateClass = "is-correct-choice";
                  } else if (choice === selectedChoice) {
                    stateClass = "is-wrong-choice";
                  } else {
                    stateClass = "is-neutral";
                  }
                }
                return (
                  <button
                    key={choice}
                    className={`learning-drill__choice ${stateClass}`}
                    disabled={!!result}
                    onClick={() => void submit(choice)}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
          )}

          {result && (
            <div className={`learning-drill__feedback${result.correct ? " is-correct" : " is-wrong"}`}>
              <p className="learning-drill__feedback-title">
                {result.correct ? "🎉 せいかい!" : "❌ おしい!"}
              </p>
              <p className="learning-drill__feedback-body">{result.explanation}</p>

              {result.tip && (
                <div className="learning-drill__tip">
                  <p className="learning-drill__tip-title">💡 とき方のコツ</p>
                  <p className="learning-drill__tip-body">{result.tip}</p>
                </div>
              )}

              {result.choiceNotes.length > 0 && (
                <ul className="learning-drill__notes">
                  {result.choiceNotes.map((cn) => {
                    const wasSelected = cn.choice === selectedChoice;
                    return (
                      <li
                        key={cn.choice}
                        className={`learning-drill__note${cn.correct ? " is-correct" : ""}${
                          wasSelected && !cn.correct ? " is-wrong" : ""
                        }`}
                      >
                        <span className="learning-drill__note-icon">
                          {cn.correct ? "⭕" : wasSelected ? "❌" : "・"}
                        </span>
                        <span className="learning-drill__note-text">
                          <strong>{cn.choice}</strong> — {cn.note}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              <button className="btn btn--primary" onClick={() => void loadNext(subject, unit)}>
                つぎの問題へ
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
