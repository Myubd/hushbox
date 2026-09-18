import { lazy } from "react";
import type { GameEntry } from "./types";

/**
 * プラスチャレンジで遊べるゲームの一覧。
 *
 * 新しいゲームを追加する手順:
 *   1. `src/games/<ゲーム名>/` フォルダを作り、`data.ts`(問題データ)と
 *      コンポーネント(`GameScreenProps`の`onBack`を受け取るReactコンポーネント)を書く
 *   2. ここに1件、エントリを追加する
 * これだけで、プラスチャレンジのメニューに自動的にカードが表示される。
 *
 * `Component`は`React.lazy`+動的`import()`で遅延読み込みにしている。
 * ゲームによっては問題データが数百KB規模になるものがあるため、実際に
 * 選んだときだけ該当コードを読み込む(`PlusChallenge.tsx`側に`<Suspense>`あり)。
 */
export const GAMES: GameEntry[] = [
  {
    id: "history-timestamp",
    label: "歴史のタイムスタンプ",
    icon: "🕰️",
    description: "年月日だけを見て、その日に起きた歴史上の出来事を当てよう",
    Component: lazy(() =>
      import("./historyTimestamp/HistoryTimestamp").then((m) => ({ default: m.HistoryTimestamp }))
    ),
  },
  {
    // 問題データがサンプル1問のみで、地図画像も同梱していない(著作権上の理由)ため、
    // 「完成したゲーム」ではなく準備中であることをメニュー上で明示している。
    // 実際の地図画像・問題データを追加したら、この注記を外してよい。
    id: "world-map-time-travel",
    label: "世界地図タイムトラベル（準備中）",
    icon: "🗺️",
    description: "ランダムな年代の世界地図を見て、いつ頃の地図か当てよう(現在はサンプル問題のみ)",
    Component: lazy(() =>
      import("./worldMapTimeTravel/WorldMapTimeTravel").then((m) => ({ default: m.WorldMapTimeTravel }))
    ),
  },
  {
    id: "kanji-square",
    label: "漢字スクエア",
    icon: "🀄",
    description: "上下左右の漢字と組み合わさるように、中央に漢字を入れよう",
    Component: lazy(() => import("./kanjiSquare/KanjiSquare").then((m) => ({ default: m.KanjiSquare }))),
  },
  {
    id: "arithmetic-practice",
    label: "計算れんしゅう",
    icon: "🧮",
    description: "たしざん・ひきざん・かけざん・わりざんを自由入力で練習しよう",
    Component: lazy(() =>
      import("./arithmeticPractice/ArithmeticPractice").then((m) => ({ default: m.ArithmeticPractice }))
    ),
  },
  {
    id: "prefecture-puzzle",
    label: "都道府県パズル",
    icon: "🧩",
    description: "地図のピースをドラッグして、都道府県や市区町村を正しい位置に置こう",
    Component: lazy(() =>
      import("./prefecturePuzzle/PrefecturePuzzle").then((m) => ({ default: m.PrefecturePuzzle }))
    ),
  },
  {
    id: "programming-maze",
    label: "ロジックめいろ",
    icon: "🤖",
    description: "命令ブロック(じゅんじょ・くりかえし・もし)を組み合わせてキャラクターをゴールまで導こう",
    Component: lazy(() =>
      import("./programmingMaze/ProgrammingMaze").then((m) => ({ default: m.ProgrammingMaze }))
    ),
  },
  {
    id: "make10",
    label: "メイク10",
    icon: "🔟",
    description: "与えられた数字を1回ずつ使い、+ - × ÷ とカッコで答えが10になる式を作ろう(4〜7桁)",
    Component: lazy(() => import("./make10/Make10").then((m) => ({ default: m.Make10 }))),
  },
  {
    id: "cangjie",
    label: "倉頡パズル",
    icon: "🈴",
    description: "漢字を構成パーツに分解した並びから、元の漢字・熟語を当てよう(4択あり/なしを選べる)",
    Component: lazy(() => import("./cangjie/CangjieQuiz").then((m) => ({ default: m.CangjieQuiz }))),
  },
  {
    id: "number-quiz",
    label: "数字クイズ",
    icon: "🔢",
    description: "選択肢の数字を足し算して、答えの数になる組み合わせをすべて選ぼう(かんたん/ふつう/むずかしい)",
    Component: lazy(() => import("./numberQuiz/NumberQuiz").then((m) => ({ default: m.NumberQuiz }))),
  },
  {
    id: "color-quiz",
    label: "色クイズ",
    icon: "🎨",
    description: "国旗などのお題を見て、実際に使われている色を選択肢の中からすべて選ぼう(かんたん/ふつう/むずかしい)",
    Component: lazy(() => import("./colorQuiz/ColorQuiz").then((m) => ({ default: m.ColorQuiz }))),
  },
  {
    id: "hint-game",
    label: "ヒントゲーム",
    icon: "💡",
    description:
      "4〜6人でわいわい遊ぶパスアンドプレイ・パーティーゲーム。3〜5人が自分で考えたヒントを1つずつ入力し、最後の1人がお題を当てよう(難易度でヒントの文字数制限が変わる、カテゴリ絞り込みあり)",
    Component: lazy(() => import("./hintGame/HintGame").then((m) => ({ default: m.HintGame }))),
  },
  {
    id: "consensus-quiz",
    label: "バトンタッチクイズ",
    icon: "🎽",
    description:
      "4人で遊ぶパスアンドプレイ・パーティーゲーム。1人ずつスタート/ストップで問題文を1文字ずつ表示させて答えを入力、次の人はその続きから見られる(バトンタッチ形式)。4人の答えがぴったり一致すれば成功(難易度・教科の絞り込みあり)",
    Component: lazy(() => import("./consensusQuiz/ConsensusQuiz").then((m) => ({ default: m.ConsensusQuiz }))),
  },
  {
    id: "pii-hunter",
    label: "PIIハンター",
    icon: "🕵️",
    description:
      "SNSに投稿しようとしている架空の文章の中から、個人情報になりそうな部分をぜんぶタップして選ぼう(かんたん/ふつう/むずかしい)。このアプリのPII検出機能を「見抜く力」として体験できる",
    Component: lazy(() => import("./piiHunter/PiiHunter").then((m) => ({ default: m.PiiHunter }))),
  },
  {
    id: "phishing-simulator",
    label: "フィッシングシミュレーター",
    icon: "📩",
    description:
      "届いたことにする架空のメール/メッセージの中から、「あやしい」と気づくべき部分をぜんぶタップして選ぼう(かんたん/ふつう/むずかしい)。パスワードや個人情報をだまし取ろうとする手口を、安全な模擬体験として学べる",
    Component: lazy(() =>
      import("./phishingSimulator/PhishingSimulator").then((m) => ({ default: m.PhishingSimulator }))
    ),
  },
];
