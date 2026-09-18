import { useState } from "react";
import type { GameScreenProps } from "../types";
import { MultiSelectQuizGame } from "../multiSelectQuiz/MultiSelectQuizGame";
import { PHISHING_EASY_ITEMS } from "./dataEasy";
import { PHISHING_NORMAL_ITEMS } from "./dataNormal";
import { PHISHING_HARD_ITEMS } from "./dataHard";
import type { PhishingItem } from "./types";

/**
 * フィッシングシミュレーター: 届いたことにする架空のメール/メッセージの中から、
 * 「あやしい」と気づくべき部分(フィッシングのサイン)をすべてタップして選ぶゲーム。
 *
 * PiiHunter(自分が書く文章の中からPIIを見抜く)の逆方向にあたる練習で、
 * こちらは「他人から届いた文章の中から、だまそうとしている部分を見抜く」力を鍛える。
 * 複数の外部レビューで「生成AI/フィッシング詐欺への実践的な備えが手薄」と
 * 指摘されたことを受けて追加した。
 *
 * PiiHunterと同じくMultiSelectQuizGameをそのまま使い、UI側の固定データのみで完結する
 * (実在の企業名・サービス名・URLは一切使わず、すべて「〇〇」を含む架空の名称)。
 */

type Difficulty = "easy" | "normal" | "hard";

const DIFFICULTIES: {
  id: Difficulty;
  label: string;
  items: PhishingItem[];
  points: number;
}[] = [
  { id: "easy", label: "かんたん", items: PHISHING_EASY_ITEMS, points: 1 },
  { id: "normal", label: "ふつう", items: PHISHING_NORMAL_ITEMS, points: 2 },
  { id: "hard", label: "むずかしい", items: PHISHING_HARD_ITEMS, points: 3 },
];

function PhishingPrompt({ item }: { item: PhishingItem }) {
  return (
    <div className="pii-hunter__post">
      <p className="pii-hunter__post-label">📩 {item.senderLabel}</p>
      <p className="pii-hunter__post-text">「{item.messageText}」</p>
      <p className="learning-drill__question">
        この中で、「あやしい」と気づくべき部分をぜんぶ選ぼう。
      </p>
    </div>
  );
}

export function PhishingSimulator({ onBack, onCorrect }: GameScreenProps) {
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
      title={`フィッシングシミュレーター・${current.label}`}
      icon="📩"
      items={current.items}
      onBack={onBack}
      onCorrect={onCorrect}
      pointsPerCorrect={current.points}
      headerExtra={selectors}
      notice="すべて架空のサービス・人物についての例文だよ。もし似たメッセージが本当に届いたら、リンクは押さずに家の人や先生に相談しよう。"
      renderPrompt={(item) => <PhishingPrompt item={item} />}
    />
  );
}
