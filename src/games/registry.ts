import { HistoryTimestamp } from "./historyTimestamp/HistoryTimestamp";
import { WorldMapTimeTravel } from "./worldMapTimeTravel/WorldMapTimeTravel";
import { KanjiSquare } from "./kanjiSquare/KanjiSquare";
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
    id: "world-map-time-travel",
    label: "世界地図タイムトラベル",
    icon: "🗺️",
    description: "ランダムな年代の世界地図を見て、いつ頃の地図か当てよう",
    Component: WorldMapTimeTravel,
  },
  {
    id: "kanji-square",
    label: "漢字スクエア",
    icon: "🀄",
    description: "上下左右の漢字と組み合わさるように、中央に漢字を入れよう",
    Component: KanjiSquare,
  },
];
