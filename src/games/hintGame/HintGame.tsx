import { useCallback, useMemo, useState } from "react";
import type { GameScreenProps } from "../types";
import { HINT_GAME_QUESTIONS } from "./data";
import { HINT_GAME_CATEGORIES } from "./types";
import type { HintGameQuestion } from "./types";

/**
 * ヒントゲーム(みんなで遊ぶパーティー版)。
 *
 * 4〜6人でプレイする想定: 3〜5人が「ヒントを出す人」、最後の1人が「あてる人」。
 * 1台の端末を回し見しながら遊ぶパスアンドプレイ形式で、
 *   1. 設定画面でヒントを出す人数・難易度(=ヒントの文字数制限)・カテゴリを選ぶ
 *   2. お題が決まったら、ヒントを出す人が1人ずつ「じぶんで考えたヒント」を入力していく
 *      (他の人が入力したヒントは見えない。あてる人はこの間、画面を見ないようにする)
 *   3. 全員分のヒントが集まったら、あてる人の番。集まったヒントを見てお題を自由入力で回答する
 *   4. 結果発表 → 次のお題へ
 *
 * 難易度によって、1人あたりのヒントの文字数制限が変わる
 * (かんたん=3文字まで/ふつう=2文字まで/むずかしい=1文字(漢字1字)まで)。
 * この文字数制限は「その回のヒントを出す人 全員」に共通で適用される
 * (人によって難易度が変わるのではなく、ラウンド全体の難しさを決める設定)。
 */

type Difficulty = "easy" | "normal" | "hard";

const DIFFICULTIES: { id: Difficulty; label: string; maxLength: number; points: number }[] = [
  { id: "easy", label: "かんたん(3文字まで)", maxLength: 3, points: 1 },
  { id: "normal", label: "ふつう(2文字まで)", maxLength: 2, points: 2 },
  { id: "hard", label: "むずかしい(1文字まで)", maxLength: 1, points: 3 },
];

const HINTER_COUNTS = [3, 4, 5] as const;

const ALL_CATEGORY = "すべて";

type Phase =
  | { kind: "setup" }
  | { kind: "cover"; role: "hint" | "guess"; hintIndex: number }
  | { kind: "hint-input"; hintIndex: number }
  | { kind: "guess-input" }
  | { kind: "result"; isCorrect: boolean };

function pickQuestion(pool: HintGameQuestion[], excludeId: string | null): HintGameQuestion {
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

function normalizeAnswer(s: string): string {
  return s.replace(/[\s　]+/g, "").trim();
}

export function HintGame({ onBack, onCorrect }: GameScreenProps) {
  const [hinterCount, setHinterCount] = useState<number>(3);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [category, setCategory] = useState<string>(ALL_CATEGORY);

  const [phase, setPhase] = useState<Phase>({ kind: "setup" });
  const [question, setQuestion] = useState<HintGameQuestion | null>(null);
  const [hints, setHints] = useState<string[]>([]);
  const [hintDraft, setHintDraft] = useState("");
  const [guessDraft, setGuessDraft] = useState("");
  const [roundCount, setRoundCount] = useState(0);

  const pool = useMemo(
    () =>
      category === ALL_CATEGORY
        ? HINT_GAME_QUESTIONS
        : HINT_GAME_QUESTIONS.filter((q) => q.category === category),
    [category]
  );

  const difficultyInfo = DIFFICULTIES.find((d) => d.id === difficulty)!;

  const startRound = useCallback(() => {
    const next = pickQuestion(pool, question?.id ?? null);
    setQuestion(next);
    setHints([]);
    setHintDraft("");
    setGuessDraft("");
    setPhase({ kind: "cover", role: "hint", hintIndex: 0 });
  }, [pool, question]);

  const beginHintInput = useCallback((hintIndex: number) => {
    setHintDraft("");
    setPhase({ kind: "hint-input", hintIndex });
  }, []);

  const submitHint = useCallback(() => {
    const trimmed = hintDraft.trim();
    if (!trimmed) return;
    const nextHints = [...hints, trimmed];
    setHints(nextHints);
    setHintDraft("");
    if (nextHints.length < hinterCount) {
      setPhase({ kind: "cover", role: "hint", hintIndex: nextHints.length });
    } else {
      setPhase({ kind: "cover", role: "guess", hintIndex: nextHints.length });
    }
  }, [hintDraft, hints, hinterCount]);

  const beginGuessInput = useCallback(() => {
    setGuessDraft("");
    setPhase({ kind: "guess-input" });
  }, []);

  const submitGuess = useCallback(() => {
    if (!question || !guessDraft.trim()) return;
    const isCorrect = normalizeAnswer(guessDraft) === normalizeAnswer(question.answer);
    setRoundCount((c) => c + 1);
    if (isCorrect) {
      onCorrect?.(difficultyInfo.points);
    }
    setPhase({ kind: "result", isCorrect });
  }, [question, guessDraft, onCorrect, difficultyInfo.points]);

  const header = (
    <div className="plus-challenge__header">
      <button className="btn btn--ghost btn--small" onClick={onBack}>
        ← もどる
      </button>
      <div className="plus-challenge__heading">
        <span className="plus-challenge__badge">💡 ヒントゲーム</span>
      </div>
    </div>
  );

  // ---- 設定画面 ----
  if (phase.kind === "setup") {
    return (
      <div className="mini-game">
        {header}
        <p className="plus-challenge__notice">
          4〜6人で遊ぶゲームです。3〜5人が「ヒントを出す人」、最後の1人が「あてる人」になります。
          1台の端末を順番に回して遊びます。
        </p>

        <div className="hint-game__setup">
          <div className="hint-game__setup-group">
            <p className="hint-game__setup-label">ヒントを出す人数</p>
            <div className="learning-drill__units">
              {HINTER_COUNTS.map((n) => (
                <button
                  key={n}
                  className={`learning-drill__unit${hinterCount === n ? " is-active" : ""}`}
                  onClick={() => setHinterCount(n)}
                >
                  {n}人(全{n + 1}人)
                </button>
              ))}
            </div>
          </div>

          <div className="hint-game__setup-group">
            <p className="hint-game__setup-label">難易度(ヒントの文字数制限)</p>
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
            <p className="hint-game__setup-label">カテゴリ</p>
            <div className="learning-drill__units">
              <button
                className={`learning-drill__unit${category === ALL_CATEGORY ? " is-active" : ""}`}
                onClick={() => setCategory(ALL_CATEGORY)}
              >
                {ALL_CATEGORY}
              </button>
              {HINT_GAME_CATEGORIES.map((c) => (
                <button
                  key={c}
                  className={`learning-drill__unit${category === c ? " is-active" : ""}`}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button className="btn btn--primary" onClick={startRound}>
          はじめる
        </button>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="mini-game">
        {header}
        <p className="learning-drill__loading">問題を用意できませんでした。カテゴリを変えてみてください。</p>
      </div>
    );
  }

  // ---- 「つぎの人にわたしてください」の目隠し画面 ----
  if (phase.kind === "cover") {
    const isGuess = phase.role === "guess";
    return (
      <div className="mini-game">
        {header}
        <div className="hint-game__cover">
          <p className="hint-game__cover-icon">🙈</p>
          {isGuess ? (
            <>
              <p className="hint-game__cover-title">つぎは「あてる人」の番です</p>
              <p className="hint-game__cover-body">
                ヒントを出した人たちは、画面を見ないようにしてください。
                準備ができたらボタンを押して、集まったヒントを見てお題をあてよう!
              </p>
              <button className="btn btn--primary" onClick={beginGuessInput}>
                じゅんびOK・ヒントを見る
              </button>
            </>
          ) : (
            <>
              <p className="hint-game__cover-title">
                ヒントを出す人 {phase.hintIndex + 1}/{hinterCount} の番です
              </p>
              <p className="hint-game__cover-body">
                「あてる人」は画面を見ないでください。準備ができたらボタンを押してお題を確認しよう。
              </p>
              <button className="btn btn--primary" onClick={() => beginHintInput(phase.hintIndex)}>
                じゅんびOK・お題を見る
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---- ヒントを出す人の入力画面 ----
  if (phase.kind === "hint-input") {
    return (
      <div className="mini-game">
        {header}
        <div className="learning-drill__card mini-game__card">
          <p className="hint-game__role-label">
            ヒントを出す人 {phase.hintIndex + 1}/{hinterCount}
          </p>
          <p className="hint-game__category">{question.category}</p>
          <p className="learning-drill__question">お題: 「{question.answer}」</p>
          <p className="hint-game__limit-note">
            他の人にわからないように、{difficultyInfo.maxLength}文字以内でヒントを考えて入力してね。
          </p>
          <form
            className="learning-drill__answer-form"
            onSubmit={(e) => {
              e.preventDefault();
              submitHint();
            }}
          >
            <input
              type="text"
              className="learning-drill__input"
              value={hintDraft}
              maxLength={difficultyInfo.maxLength}
              onChange={(e) => setHintDraft(e.target.value)}
              placeholder={`ヒント(${difficultyInfo.maxLength}文字まで)`}
              autoFocus
            />
            <button className="btn btn--primary" type="submit" disabled={!hintDraft.trim()}>
              このヒントにする
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ---- あてる人の入力画面 ----
  if (phase.kind === "guess-input") {
    return (
      <div className="mini-game">
        {header}
        <div className="learning-drill__card mini-game__card">
          <p className="hint-game__category">{question.category}</p>
          <ul className="hint-game__hints">
            {hints.map((hint, i) => (
              <li key={i} className="hint-game__hint">
                ヒント{i + 1}: {hint}
              </li>
            ))}
          </ul>
          <form
            className="learning-drill__answer-form"
            onSubmit={(e) => {
              e.preventDefault();
              submitGuess();
            }}
          >
            <input
              type="text"
              className="learning-drill__input"
              value={guessDraft}
              onChange={(e) => setGuessDraft(e.target.value)}
              placeholder="こたえを入力"
              autoFocus
            />
            <button className="btn btn--primary" type="submit" disabled={!guessDraft.trim()}>
              こたえる
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ---- 結果発表 ----
  const isCorrect = phase.kind === "result" && phase.isCorrect;
  return (
    <div className="mini-game">
      {header}
      {roundCount > 0 && <p className="plus-challenge__score">これまでのお題数: {roundCount}</p>}
      <div className="learning-drill__card mini-game__card">
        <p className="hint-game__category">{question.category}</p>
        <ul className="hint-game__hints">
          {hints.map((hint, i) => (
            <li key={i} className="hint-game__hint">
              ヒント{i + 1}: {hint}
            </li>
          ))}
        </ul>
        <div className={`learning-drill__feedback${isCorrect ? " is-correct" : " is-wrong"}`}>
          <p className="learning-drill__feedback-title">
            {isCorrect ? "🎉 正解!" : `❌ おしい! 正解は「${question.answer}」でした`}
          </p>
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
