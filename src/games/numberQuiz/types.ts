import type { MultiSelectQuizItem } from "../multiSelectQuiz/MultiSelectQuizGame";

/** 数字クイズの1問。選択肢の数字を足し算して答えの数を作る組み合わせが正解。 */
export interface NumberQuizItem extends MultiSelectQuizItem {
  question: string;
}
