import type { MultiSelectQuizItem } from "../multiSelectQuiz/MultiSelectQuizGame";

/**
 * フィッシングシミュレーターの1問。
 * 届いたことにする架空のメール/メッセージ全文(`messageText`)を提示し、
 * その中から「あやしいと気づくべき部分(フィッシングのサイン)」をすべて選ばせる。
 * PiiHunterItem(postText)と同じ設計方針: 実在の企業名・サービス名・URLは
 * 一切登場させず、すべて架空の名称(「〇〇」を含む仮の名前)のみを使う。
 */
export interface PhishingItem extends MultiSelectQuizItem {
  /** 届いたことにする、架空のメール/メッセージの全文。 */
  messageText: string;
  /** 「誰から届いたことになっているか」の表示用ラベル(例: "件名"や"送信者")。 */
  senderLabel: string;
}
