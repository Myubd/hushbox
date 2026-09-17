import { useState } from "react";
import type { GameScreenProps } from "../types";
import { MultiSelectQuizGame } from "../multiSelectQuiz/MultiSelectQuizGame";
import { PII_HUNTER_EASY_ITEMS } from "./dataEasy";
import { PII_HUNTER_NORMAL_ITEMS } from "./dataNormal";
import { PII_HUNTER_HARD_ITEMS } from "./dataHard";
import type { PiiHunterItem } from "./types";

/**
 * PIIハンター: SNS/チャットに投稿しようとしている架空の文章の中から、
 * 個人情報になりうる部分をすべてタップして選ぶゲーム。
 *
 * このアプリの中核機能であるPII検出(pii_guard.rs)を、チャット入力時の
 * 「守ってもらう」体験だけでなく、「自分で見抜く」練習としてゲーム化したもの。
 * ここでの判定はUI側の固定データで完結しており、pii_guard.rs 自体は呼ばない
 * (架空の例文について「教育的に正しい答え」を人手で用意したもののため)。
 */

type Difficulty = "easy" | "normal" | "hard";

const DIFFICULTIES: {
  id: Difficulty;
  label: string;
  items: PiiHunterItem[];
  points: number;
}[] = [
  { id: "easy", label: "かんたん", items: PII_HUNTER_EASY_ITEMS, points: 1 },
  { id: "normal", label: "ふつう", items: PII_HUNTER_NORMAL_ITEMS, points: 2 },
  { id: "hard", label: "むずかしい", items: PII_HUNTER_HARD_ITEMS, points: 3 },
];

function PiiHunterPrompt({ item }: { item: PiiHunterItem }) {
  return (
    <div className="pii-hunter__post">
      <p className="pii-hunter__post-label">📱 SNSに投稿しようとしている文章</p>
      <p className="pii-hunter__post-text">「{item.postText}」</p>
      <p className="learning-drill__question">
        この中で、個人情報になりそうな部分をぜんぶ選ぼう。
      </p>
    </div>
  );
}

export function PiiHunter({ onBack, onCorrect }: GameScreenProps) {
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
      title={`PIIハンター・${current.label}`}
      icon="🕵️"
      items={current.items}
      onBack={onBack}
      onCorrect={onCorrect}
      pointsPerCorrect={current.points}
      headerExtra={selectors}
      notice="すべて架空の人物・場所についての例文だよ。実際に自分の情報を書きこまないでね。"
      renderPrompt={(item) => <PiiHunterPrompt item={item} />}
    />
  );
}
