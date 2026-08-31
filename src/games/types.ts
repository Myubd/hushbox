import type { ComponentType } from "react";

/** 各ゲーム画面が共通で受け取るprops。「もどる」でゲーム一覧に戻る。 */
export interface GameScreenProps {
  onBack: () => void;
  /**
   * 1問(または1ピース)正解するたびに呼ぶ。ポイント交換制(壁紙)のための加算コールバック。
   * 難易度が3段階に分かれているゲームは、簡単なほうから1p/2p/3pを渡す。
   * 難易度の概念がないゲームは、固定値(2p =「ふつう」相当)を渡す。
   * 省略可能なのは、テストなどでポイント計算が不要な場合のため。
   */
  onCorrect?: (points: number) => void;
}

/** ゲーム一覧(選択メニュー)に表示するための情報。 */
export interface GameInfo {
  id: string;
  label: string;
  icon: string;
  description: string;
}

/** レジストリに登録する1エントリ。GameInfo + 実際に描画するコンポーネント。 */
export interface GameEntry extends GameInfo {
  Component: ComponentType<GameScreenProps>;
}
