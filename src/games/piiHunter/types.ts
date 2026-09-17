import type { MultiSelectQuizItem } from "../multiSelectQuiz/MultiSelectQuizGame";

/**
 * PIIハンターの1問。
 * SNS/チャットに投稿しようとしている架空の文章(`postText`)をいくつかの
 * フレーズに分解したものが`choices`で、そのうち個人情報になりうる部分が
 * `correctChoices`。実在の人物・場所は一切登場しない、完全に架空のデータのみを扱う。
 */
export interface PiiHunterItem extends MultiSelectQuizItem {
  /** 投稿しようとしている文章全体(お題として上部に表示する)。 */
  postText: string;
}
