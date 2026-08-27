import type { ComponentType } from "react";

/** 各ゲーム画面が共通で受け取るprops。「もどる」でゲーム一覧に戻る。 */
export interface GameScreenProps {
  onBack: () => void;
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
