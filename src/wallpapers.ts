// 壁紙(アプリ全体のテーマ)のカタログ。
// 「開放型」: 必要ポイントに到達したら、そのポイントを消費せずに永久に使えるようになる。
// 判定はシンプルに「今の合計ポイント(totalPoints) >= cost」で行うため、
// 「どれを開放済みか」を別途保存する必要はない(ポイントは増える一方なので)。
export interface Wallpaper {
  id: string;
  label: string;
  /** 開放に必要な合計ポイント。0は最初から使える(壁紙なし、など)。 */
  cost: number;
  /** publicディレクトリ配下のパス。空文字は「壁紙なし(無地)」を表す。 */
  src: string;
}

export const WALLPAPERS: Wallpaper[] = [
  { id: "none", label: "背景なし", cost: 0, src: "" },
  { id: "aurora-test", label: "オーロラ(テスト壁紙)", cost: 10, src: "/test-wallpaper.jpg" },
];

export const DEFAULT_WALLPAPER_ID = "none";
