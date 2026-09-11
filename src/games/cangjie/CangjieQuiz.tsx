import { useState } from "react";
import type { GameScreenProps } from "../types";
import { ChoiceQuizGame } from "../ChoiceQuizGame";
import { FreeInputQuizGame } from "../FreeInputQuizGame";
import { CANGJIE_1_ITEMS } from "./data1";
import { CANGJIE_2_ITEMS } from "./data2";
import { CANGJIE_4_ITEMS } from "./data4";
import type { CangjieItem } from "./types";

/**
 * 倉頡輸入法パズル: 漢字を構成パーツに分解した並びから、元の漢字・熟語を当てるクイズ。
 *
 * カテゴリ(単漢字/二字熟語/四字熟語)と、出題モード(4択あり/なし)を
 * それぞれ切り替えられる。データは同じ`CangjieItem`を両モードで共用しており、
 * 「4択あり」は`ChoiceQuizGame`(選択式の土台)、「4択なし」は`FreeInputQuizGame`
 * (自由入力の土台)にそのまま渡すだけで実現している。
 */

type Category = "1" | "2" | "4";
type Mode = "choice" | "free";

const CATEGORIES: { id: Category; label: string; items: CangjieItem[] }[] = [
  { id: "1", label: "単漢字", items: CANGJIE_1_ITEMS },
  { id: "2", label: "二字熟語", items: CANGJIE_2_ITEMS },
  { id: "4", label: "四字熟語(HARD)", items: CANGJIE_4_ITEMS },
];

const POINTS: Record<Category, number> = { "1": 1, "2": 2, "4": 3 };

function PartsPrompt({ item, hint }: { item: CangjieItem; hint: string }) {
  return (
    <div className="cangjie__prompt">
      <p className="learning-drill__question">{hint}</p>
      <p className="cangjie__parts">{item.parts}</p>
    </div>
  );
}

export function CangjieQuiz({ onBack, onCorrect }: GameScreenProps) {
  const [category, setCategory] = useState<Category>("1");
  const [mode, setMode] = useState<Mode>("choice");

  const current = CATEGORIES.find((c) => c.id === category)!;
  const promptHint =
    category === "1" ? "次のパーツを組み合わせてできる漢字はどれ?" : "次のパーツを組み合わせてできる言葉はどれ?";

  const selectors = (
    <div className="cangjie__selectors">
      <div className="learning-drill__units">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={`learning-drill__unit${category === c.id ? " is-active" : ""}`}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="learning-drill__units">
        <button
          className={`learning-drill__unit${mode === "choice" ? " is-active" : ""}`}
          onClick={() => setMode("choice")}
        >
          4択あり
        </button>
        <button
          className={`learning-drill__unit${mode === "free" ? " is-active" : ""}`}
          onClick={() => setMode("free")}
        >
          4択なし(記述)
        </button>
      </div>
    </div>
  );

  return mode === "choice" ? (
    <ChoiceQuizGame
      key={`${category}-choice`}
      title={`倉頡パズル・${current.label}`}
      icon="🈴"
      items={current.items}
      onBack={onBack}
      onCorrect={onCorrect}
      pointsPerCorrect={POINTS[category]}
      headerExtra={selectors}
      renderPrompt={(item) => <PartsPrompt item={item} hint={promptHint} />}
    />
  ) : (
    <FreeInputQuizGame
      key={`${category}-free`}
      title={`倉頡パズル・${current.label}(記述)`}
      icon="🈴"
      items={current.items}
      onBack={onBack}
      onCorrect={onCorrect}
      pointsPerCorrect={POINTS[category] + 1}
      headerExtra={selectors}
      inputPlaceholder={category === "1" ? "漢字を入力" : "熟語を入力"}
      renderPrompt={(item) => <PartsPrompt item={item} hint={promptHint} />}
    />
  );
}
