import { useState } from "react";
import type { GameScreenProps } from "../types";
import { MultiSelectQuizGame } from "../multiSelectQuiz/MultiSelectQuizGame";
import { NUMBER_QUIZ_EASY_ITEMS } from "./dataEasy";
import { NUMBER_QUIZ_NORMAL_ITEMS } from "./dataNormal";
import { NUMBER_QUIZ_HARD_ITEMS } from "./dataHard";
import type { NumberQuizItem } from "./types";

/**
 * 数字クイズ: 選択肢の数字(easy/normalは1・2・4・8固定、hardは問題ごとに変化)の中から、
 * 足し算すると答えの数になる組み合わせをすべて選ぶクイズ。
 */

type Difficulty = "easy" | "normal" | "hard";

const DIFFICULTIES: { id: Difficulty; label: string; items: NumberQuizItem[]; points: number }[] = [
  { id: "easy", label: "かんたん", items: NUMBER_QUIZ_EASY_ITEMS, points: 1 },
  { id: "normal", label: "ふつう", items: NUMBER_QUIZ_NORMAL_ITEMS, points: 2 },
  { id: "hard", label: "むずかしい", items: NUMBER_QUIZ_HARD_ITEMS, points: 3 },
];

function NumberPrompt({ item }: { item: NumberQuizItem }) {
  return <p className="learning-drill__question">{item.question}</p>;
}

export function NumberQuiz({ onBack, onCorrect }: GameScreenProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const current = DIFFICULTIES.find((d) => d.id === difficulty)!;

  const selectors = (
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
  );

  return (
    <MultiSelectQuizGame
      key={difficulty}
      title={`数字クイズ・${current.label}`}
      icon="🔢"
      items={current.items}
      onBack={onBack}
      onCorrect={onCorrect}
      pointsPerCorrect={current.points}
      headerExtra={selectors}
      renderPrompt={(item) => <NumberPrompt item={item} />}
    />
  );
}
