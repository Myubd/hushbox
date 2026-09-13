import { useState } from "react";
import type { GameScreenProps } from "../types";
import { MultiSelectQuizGame } from "../multiSelectQuiz/MultiSelectQuizGame";
import { COLOR_QUIZ_EASY_ITEMS } from "./dataEasy";
import { COLOR_QUIZ_NORMAL_ITEMS } from "./dataNormal";
import { COLOR_QUIZ_HARD_ITEMS } from "./dataHard";
import type { ColorQuizItem } from "./types";

/**
 * 色クイズ: 国旗などのお題に対して、選択肢の色(easy/normalは青・赤・緑・黄固定、
 * hardは問題ごとに変化)のうち、実際に使われている色をすべて選ぶクイズ。
 */

type Difficulty = "easy" | "normal" | "hard";

const DIFFICULTIES: { id: Difficulty; label: string; items: ColorQuizItem[]; points: number }[] = [
  { id: "easy", label: "かんたん", items: COLOR_QUIZ_EASY_ITEMS, points: 1 },
  { id: "normal", label: "ふつう", items: COLOR_QUIZ_NORMAL_ITEMS, points: 2 },
  { id: "hard", label: "むずかしい", items: COLOR_QUIZ_HARD_ITEMS, points: 3 },
];

function ColorPrompt({ item }: { item: ColorQuizItem }) {
  return <p className="learning-drill__question">{item.question}</p>;
}

export function ColorQuiz({ onBack, onCorrect }: GameScreenProps) {
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
      title={`色クイズ・${current.label}`}
      icon="🎨"
      items={current.items}
      onBack={onBack}
      onCorrect={onCorrect}
      pointsPerCorrect={current.points}
      headerExtra={selectors}
      renderPrompt={(item) => <ColorPrompt item={item} />}
    />
  );
}
