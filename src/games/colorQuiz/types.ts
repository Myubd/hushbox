import type { MultiSelectQuizItem } from "../multiSelectQuiz/MultiSelectQuizGame";

/** 色クイズの1問。選択肢の色のうち、実際に使われている色をすべて選ぶと正解。 */
export interface ColorQuizItem extends MultiSelectQuizItem {
  question: string;
}
