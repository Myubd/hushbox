import { MAKE10_4_DIGIT } from "./data4";
import { MAKE10_5_DIGIT } from "./data5";
import { MAKE10_6_DIGIT } from "./data6";
import { MAKE10_7_DIGIT } from "./data7";
import type { Make10Puzzle } from "./engine";

export type Make10Difficulty = "d4" | "d5" | "d6" | "d7";

export interface Make10DifficultyInfo {
  id: Make10Difficulty;
  label: string;
  /** 正解1問あたりのポイント(壁紙ショップ用)。桁数が多いほど高くする。 */
  points: number;
  puzzles: Make10Puzzle[];
}

export const MAKE10_DIFFICULTIES: Make10DifficultyInfo[] = [
  { id: "d4", label: "4桁(かんたん)", points: 1, puzzles: MAKE10_4_DIGIT },
  { id: "d5", label: "5桁(ふつう)", points: 2, puzzles: MAKE10_5_DIGIT },
  { id: "d6", label: "6桁(むずかしい)", points: 3, puzzles: MAKE10_6_DIGIT },
  { id: "d7", label: "7桁(たいへん)", points: 4, puzzles: MAKE10_7_DIGIT },
];

export function puzzlesFor(difficulty: Make10Difficulty): Make10Puzzle[] {
  return MAKE10_DIFFICULTIES.find((d) => d.id === difficulty)?.puzzles ?? [];
}

export { MAKE10_4_DIGIT, MAKE10_5_DIGIT, MAKE10_6_DIGIT, MAKE10_7_DIGIT };
export type { Make10Puzzle };
