export type ConsensusQuizDifficulty = "easy" | "normal" | "hard";

/** 一致クイズの1問。1つの長い問題文と、その正解(1つ)を持つ。 */
export interface ConsensusQuizQuestion {
  id: string;
  /** 出題教科(雑学・国語・数学・理科・社会・情報)。カテゴリ絞り込みに使う。 */
  subject: string;
  /** 文字数の目安による難易度区分(easy=80-100字/normal=60-79字/hard=40-59字)。 */
  difficulty: ConsensusQuizDifficulty;
  question: string;
  answer: string;
}

/** 出題教科の一覧。カテゴリ絞り込みのチップ表示に使う。 */
export const CONSENSUS_QUIZ_SUBJECTS: string[] = [
  "雑学",
  "国語",
  "数学",
  "理科",
  "社会",
  "情報",
];
