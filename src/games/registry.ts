import { HistoryTimestamp } from "./historyTimestamp/HistoryTimestamp";
import { WorldMapTimeTravel } from "./worldMapTimeTravel/WorldMapTimeTravel";
import { KanjiSquare } from "./kanjiSquare/KanjiSquare";
import { ArithmeticPractice } from "./arithmeticPractice/ArithmeticPractice";
import type { GameEntry } from "./types";

/**
 * プラスチャレンジで遊べるゲームの一覧。
 *
 * 新しいゲームを追加する手順:
 *   1. `src/games/<ゲーム名>/` フォルダを作り、`data.ts`(問題データ)と
 *      コンポーネント(`GameScreenProps`の`onBack`を受け取るReactコンポーネント)を書く
 *   2. ここに1件、エントリを追加する
 * これだけで、プラスチャレンジのメニューに自動的にカードが表示される。
 */
export const GAMES: GameEntry[] = [
  {
    id: "history-timestamp",
    label: "歴史のタイムスタンプ",
    icon: "🕰️",
    description: "年月日だけを見て、その日に起きた歴史上の出来事を当てよう",
    Component: HistoryTimestamp,
  },
  {
    // 問題データがサンプル1問のみで、地図画像も同梱していない(著作権上の理由)ため、
    // 「完成したゲーム」ではなく準備中であることをメニュー上で明示している。
    // 実際の地図画像・問題データを追加したら、この注記を外してよい。
    id: "world-map-time-travel",
    label: "世界地図タイムトラベル（準備中）",
    icon: "🗺️",
    description: "ランダムな年代の世界地図を見て、いつ頃の地図か当てよう(現在はサンプル問題のみ)",
    Component: WorldMapTimeTravel,
  },
  {
    id: "kanji-square",
    label: "漢字スクエア",
    icon: "🀄",
    description: "上下左右の漢字と組み合わさるように、中央に漢字を入れよう",
    Component: KanjiSquare,
  },
  {
    id: "arithmetic-practice",
    label: "計算れんしゅう",
    icon: "🧮",
    description: "たしざん・ひきざん・かけざん・わりざんを自由入力で練習しよう",
    Component: ArithmeticPractice,
  },
];
