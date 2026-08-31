import { useCallback, useEffect, useState } from "react";
import { checkLearningAnswer, getSubjectQuestionCount, listLearningUnits, nextLearningProblem } from "../lib/tauriClient";
import {
  DRILL_SUBJECTS,
  type AgeMode,
  type DrillSubject,
  type DrillUnit,
  type LearningCheckResult,
  type LearningProblem,
} from "../types";

const DRILL_SUBJECTS_MAIN = DRILL_SUBJECTS.filter((s) => !s.advanced);
const DRILL_SUBJECTS_ADVANCED = DRILL_SUBJECTS.filter((s) => s.advanced);

interface Props {
  mode: AgeMode;
  subject: DrillSubject;
  onSubjectChange: (subject: DrillSubject) => void;
  onAnswered: (subject: DrillSubject, correct: boolean) => void;
}

export function LearningDrill({ mode, subject, onSubjectChange, onAnswered }: Props) {
  const [units, setUnits] = useState<DrillUnit[]>([]);
  const [unit, setUnit] = useState<string>("mixed");
  const [questionCount, setQuestionCount] = useState<number | null>(null);
  const [problem, setProblem] = useState<LearningProblem | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [result, setResult] = useState<LearningCheckResult | null>(null);
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

  // 科目を切り替えたら、その科目の単元一覧・総問題数を取り直し、単元は「すべて」に戻す
  useEffect(() => {
    let cancelled = false;
    setUnit("mixed");
    listLearningUnits(subject).then((u) => {
      if (!cancelled) setUnits(u);
    });
    getSubjectQuestionCount(subject).then((c) => {
      if (!cancelled) setQuestionCount(c);
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
      onAnswered(subject, r.correct);
    },
    [problem, result, subject, onAnswered]
  );

  // 単元が「すべて」しか無い科目(まだ単元分けしていない)は、セレクタ自体を出さない
  const showUnitSelector = units.length > 1;

  return (
    <div className="learning-drill">
      <div className="learning-drill__tabs">
        {DRILL_SUBJECTS_MAIN.map((s) => (
          <button
            key={s.id}
            className={`learning-drill__tab${subject === s.id ? " is-active" : ""}`}
            onClick={() => onSubjectChange(s.id)}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {DRILL_SUBJECTS_ADVANCED.length > 0 && (
        <div className="learning-drill__tabs learning-drill__tabs--advanced">
          <span className="learning-drill__tabs-label">発展</span>
          {DRILL_SUBJECTS_ADVANCED.map((s) => (
            <button
              key={s.id}
              className={`learning-drill__tab${subject === s.id ? " is-active" : ""}`}
              onClick={() => onSubjectChange(s.id)}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      )}

      {showUnitSelector && (
        <div className="learning-drill__units-row">
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
          {questionCount !== null && (
            <span className="learning-drill__question-count">全{questionCount}問</span>
          )}
        </div>
      )}

      <p className="learning-drill__badge">AIを使わず、確実に採点しています</p>

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
