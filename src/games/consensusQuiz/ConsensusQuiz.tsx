import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameScreenProps } from "../types";
import { CONSENSUS_QUIZ_QUESTIONS } from "./data";
import { CONSENSUS_QUIZ_SUBJECTS } from "./types";
import type { ConsensusQuizDifficulty, ConsensusQuizQuestion } from "./types";

/**
 * バトンタッチクイズ(4人で遊ぶパスアンドプレイ・パーティーゲーム)。
 *
 * 1人ずつ順番に、問題文が1文字ずつ表示されていくのを見る。
 * 「スタート」ボタンで表示が始まり、好きなタイミングで「ストップ」を押すとそこで表示が止まる。
 * 次の人はそこで止まったところから続きが表示される(バトンタッチ形式)。
 * どこまで見て答えるかはプレイヤー次第(あらかじめ問題文を区切ったりはしない)。
 * 4人ぶんの回答が集まったら、全員の答えがぴったり一致していれば成功。
 */

const PLAYER_COUNT = 4;
const DIFFICULTIES: { id: ConsensusQuizDifficulty; label: string; points: number; revealMs: number }[] = [
  { id: "easy", label: "かんたん(長め)", points: 1, revealMs: 420 },
  { id: "normal", label: "ふつう", points: 2, revealMs: 350 },
  { id: "hard", label: "むずかしい(短め)", points: 3, revealMs: 280 },
];

const ALL_SUBJECT = "すべて";

type Phase =
  | { kind: "setup" }
  | { kind: "cover"; playerIndex: number }
  | { kind: "answer-input"; playerIndex: number }
  | { kind: "result" };

function pickQuestion(pool: ConsensusQuizQuestion[], excludeId: string | null): ConsensusQuizQuestion {
  if (pool.length === 1) return pool[0];
  let candidate = pool[Math.floor(Math.random() * pool.length)];
  if (excludeId) {
    let guard = 0;
    while (candidate.id === excludeId && guard < 20) {
      candidate = pool[Math.floor(Math.random() * pool.length)];
      guard += 1;
    }
  }
  return candidate;
}

function normalize(s: string): string {
  return s.replace(/[\s　]+/g, "").trim();
}

export function ConsensusQuiz({ onBack, onCorrect }: GameScreenProps) {
  const [difficulty, setDifficulty] = useState<ConsensusQuizDifficulty>("normal");
  const [subject, setSubject] = useState<string>(ALL_SUBJECT);

  const [phase, setPhase] = useState<Phase>({ kind: "setup" });
  const [question, setQuestion] = useState<ConsensusQuizQuestion | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [answerDraft, setAnswerDraft] = useState("");
  const [roundCount, setRoundCount] = useState(0);

  // ---- 1文字ずつの表示(タイプライター)まわりの状態 ----
  // revealedCount: 問題文全体を通しての表示位置(バトンタッチでずっと引き継がれる)
  // turnStartCount: 今の人の番が始まった時点でのrevealedCount(=前の人が見た範囲との境目)
  const [revealedCount, setRevealedCount] = useState(0);
  const [turnStartCount, setTurnStartCount] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearRevealTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => clearRevealTimer, [clearRevealTimer]);

  const pool = useMemo(
    () =>
      CONSENSUS_QUIZ_QUESTIONS.filter(
        (q) => q.difficulty === difficulty && (subject === ALL_SUBJECT || q.subject === subject)
      ),
    [difficulty, subject]
  );

  const difficultyInfo = DIFFICULTIES.find((d) => d.id === difficulty)!;

  const startRound = useCallback(() => {
    if (pool.length === 0) return;
    const next = pickQuestion(pool, question?.id ?? null);
    clearRevealTimer();
    setQuestion(next);
    setAnswers([]);
    setAnswerDraft("");
    setRevealedCount(0);
    setTurnStartCount(0);
    setIsRevealing(false);
    setPhase({ kind: "cover", playerIndex: 0 });
  }, [pool, question, clearRevealTimer]);

  const beginAnswerInput = useCallback(
    (playerIndex: number) => {
      // 表示位置(revealedCount)はリセットしない: 前の人が止めたところから続きを表示する(バトンタッチ)。
      // ただし前の人が見ていた文字はこの人には見せないので、今の番の開始位置を記録しておく。
      clearRevealTimer();
      setTurnStartCount(revealedCount);
      setIsRevealing(false);
      setAnswerDraft("");
      setPhase({ kind: "answer-input", playerIndex });
    },
    [clearRevealTimer, revealedCount]
  );

  const startRevealing = useCallback(() => {
    if (!question || isRevealing) return;
    setIsRevealing(true);
    const total = question.question.length;
    intervalRef.current = setInterval(() => {
      setRevealedCount((count) => {
        const next = count + 1;
        if (next >= total) {
          clearRevealTimer();
          setIsRevealing(false);
          return total;
        }
        return next;
      });
    }, difficultyInfo.revealMs);
  }, [question, isRevealing, clearRevealTimer, difficultyInfo.revealMs]);

  const stopRevealing = useCallback(() => {
    clearRevealTimer();
    setIsRevealing(false);
  }, [clearRevealTimer]);

  const submitAnswer = useCallback(() => {
    const trimmed = answerDraft.trim();
    if (!trimmed) return;
    const nextAnswers = [...answers, trimmed];
    setAnswers(nextAnswers);
    setAnswerDraft("");
    if (nextAnswers.length < PLAYER_COUNT) {
      setPhase({ kind: "cover", playerIndex: nextAnswers.length });
    } else {
      setRoundCount((c) => c + 1);
      const normalized = nextAnswers.map(normalize);
      const allMatch = normalized.every((a) => a === normalized[0]);
      const matchesCorrect = question ? normalized[0] === normalize(question.answer) : false;
      if (allMatch && matchesCorrect) {
        onCorrect?.(difficultyInfo.points);
      }
      setPhase({ kind: "result" });
    }
  }, [answerDraft, answers, question, onCorrect, difficultyInfo.points]);

  const header = (
    <div className="plus-challenge__header">
      <button className="btn btn--ghost btn--small" onClick={onBack}>
        ← もどる
      </button>
      <div className="plus-challenge__heading">
        <span className="plus-challenge__badge">🎽 バトンタッチクイズ</span>
      </div>
    </div>
  );

  // ---- 設定画面 ----
  if (phase.kind === "setup") {
    return (
      <div className="mini-game">
        {header}
        <p className="plus-challenge__notice">
          4人で遊ぶゲームです。1人ずつ「スタート」ボタンで問題文を1文字ずつ表示させ、
          好きなタイミングで「ストップ」を押して、そこまで見えた内容から答えを入力しよう。
          次の人はその続きから表示される、バトンタッチ形式です。
          どこまで見て答えるかは自分次第! 4人ぶんの答えがぴったり一致すれば成功です。
          1台の端末を順番に回して遊びます。
        </p>

        <div className="hint-game__setup">
          <div className="hint-game__setup-group">
            <p className="hint-game__setup-label">難易度</p>
            <div className="learning-drill__units">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  className={`learning-drill__unit${difficulty === d.id ? " is-active" : ""}`}
                  onClick={() => setDifficulty(d.id)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="hint-game__setup-group">
            <p className="hint-game__setup-label">教科</p>
            <div className="learning-drill__units">
              <button
                className={`learning-drill__unit${subject === ALL_SUBJECT ? " is-active" : ""}`}
                onClick={() => setSubject(ALL_SUBJECT)}
              >
                {ALL_SUBJECT}
              </button>
              {CONSENSUS_QUIZ_SUBJECTS.map((s) => (
                <button
                  key={s}
                  className={`learning-drill__unit${subject === s ? " is-active" : ""}`}
                  onClick={() => setSubject(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button className="btn btn--primary" disabled={pool.length === 0} onClick={startRound}>
          はじめる
        </button>
        {pool.length === 0 && (
          <p className="learning-drill__loading">この組み合わせの問題がありません。設定を変えてみてください。</p>
        )}
      </div>
    );
  }

  if (!question) {
    return (
      <div className="mini-game">
        {header}
        <p className="learning-drill__loading">問題を用意できませんでした。設定を変えてみてください。</p>
      </div>
    );
  }

  // ---- 「つぎの人にわたしてください」の目隠し画面 ----
  if (phase.kind === "cover") {
    return (
      <div className="mini-game">
        {header}
        <div className="hint-game__cover">
          <p className="hint-game__cover-icon">🙈</p>
          <p className="hint-game__cover-title">{phase.playerIndex + 1}人目の番です</p>
          <p className="hint-game__cover-body">
            他の人は画面を見ないでください。準備ができたらボタンを押して
            {phase.playerIndex > 0 ? "続きから" : ""}問題文を表示しよう。
          </p>
          <button className="btn btn--primary" onClick={() => beginAnswerInput(phase.playerIndex)}>
            じゅんびOK
          </button>
        </div>
      </div>
    );
  }

  // ---- 回答入力画面(スタート/ストップで1文字ずつ表示、前の人の分は見せない) ----
  if (phase.kind === "answer-input") {
    const total = question.question.length;
    // 自分の番になってから新しく表示された部分だけを見せる(前の人が見た文字は表示しない)
    const visibleText = question.question.slice(turnStartCount, revealedCount);
    const nothingLeftToReveal = revealedCount >= total;
    const revealedSomethingThisTurn = revealedCount > turnStartCount;
    const hasStopped = !isRevealing && (revealedSomethingThisTurn || nothingLeftToReveal);
    const canContinue = !isRevealing && !nothingLeftToReveal;
    const isContinuation = turnStartCount > 0;

    return (
      <div className="mini-game">
        {header}
        <div className="learning-drill__card mini-game__card">
          <p className="hint-game__role-label">
            {phase.playerIndex + 1}人目/{PLAYER_COUNT}人
          </p>
          <p className="hint-game__category">{question.subject}</p>

          <div className="consensus-quiz__display">
            <p className="consensus-quiz__question">
              {visibleText}
              {isRevealing && <span className="consensus-quiz__caret">｜</span>}
            </p>
            {!revealedSomethingThisTurn && !isRevealing && (
              <p className="consensus-quiz__placeholder">
                {nothingLeftToReveal
                  ? "これ以上表示できる文字はありません。ここまでの内容だけで答えてね。"
                  : "まだ何も表示されていません"}
              </p>
            )}
          </div>

          <div className="consensus-quiz__controls">
            {canContinue && (
              <button className="btn btn--primary" onClick={startRevealing}>
                {isContinuation ? "▶ つづきを見る" : "▶ スタート"}
              </button>
            )}
            {isRevealing && (
              <button className="btn btn--primary" onClick={stopRevealing}>
                ⏹ ストップ
              </button>
            )}
          </div>

          {hasStopped && (
            <form
              className="learning-drill__answer-form"
              onSubmit={(e) => {
                e.preventDefault();
                submitAnswer();
              }}
            >
              <input
                type="text"
                className="learning-drill__input"
                value={answerDraft}
                onChange={(e) => setAnswerDraft(e.target.value)}
                placeholder="こたえを入力"
                autoFocus
              />
              <button className="btn btn--primary" type="submit" disabled={!answerDraft.trim()}>
                このこたえにする
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ---- 結果発表 ----
  const normalizedAnswers = answers.map(normalize);
  const allMatch = normalizedAnswers.every((a) => a === normalizedAnswers[0]);
  const matchesCorrect = normalizedAnswers[0] === normalize(question.answer);
  const isFullSuccess = allMatch && matchesCorrect;

  let resultTitle: string;
  if (isFullSuccess) {
    resultTitle = "🎉 全員一致で大正解!";
  } else if (allMatch) {
    resultTitle = "😅 全員一致したけど、正解は違いました";
  } else {
    resultTitle = "🙅 意見がバラバラでした";
  }

  return (
    <div className="mini-game">
      {header}
      {roundCount > 0 && <p className="plus-challenge__score">これまでのお題数: {roundCount}</p>}
      <div className="learning-drill__card mini-game__card">
        <p className="hint-game__category">{question.subject}</p>
        <p className="learning-drill__question consensus-quiz__question">{question.question}</p>

        <ul className="hint-game__hints">
          {answers.map((a, i) => (
            <li key={i} className="hint-game__hint">
              {i + 1}人目: {a}
            </li>
          ))}
        </ul>

        <div className={`learning-drill__feedback${isFullSuccess ? " is-correct" : " is-wrong"}`}>
          <p className="learning-drill__feedback-title">{resultTitle}</p>
          <p className="learning-drill__feedback-body">正解:「{question.answer}」</p>
          <div className="hint-game__result-actions">
            <button className="btn btn--primary" onClick={startRound}>
              つぎのお題へ
            </button>
            <button className="btn btn--ghost" onClick={() => setPhase({ kind: "setup" })}>
              せっていを変える
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
