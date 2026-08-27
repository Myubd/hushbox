import type { ChoiceQuizItem } from "../ChoiceQuizGame";

/**
 * 世界地図タイムトラベル: ランダムな年代の世界地図を見て、それがいつ頃の地図かを当てるゲーム。
 *
 * 地図画像は著作権の関係でこのプロジェクトには同梱していない。
 * `public/plus-challenge/maps/` フォルダに画像ファイルを置き、
 * `imageSrc` にそのパス(例: "/plus-challenge/maps/1700s.png")を指定すると表示される。
 * 画像がまだ無い場合は、代わりに案内用のプレースホルダーが表示される。
 *
 * 問題を追加したいときは、この配列に1件足すだけでよい。
 *   - imageSrc: 表示する地図画像のパス(public/ 以下)
 *   - correctChoice: 正解の年代(1つ)
 *   - choices: correctChoiceを含む4つの選択肢(順番はゲーム側でシャッフルされる)
 *   - explanation: 正解発表時に表示する解説文
 *   - caption: 画像の下に出す短い注記(出典など。任意)
 */
export interface WorldMapEraQuestion extends ChoiceQuizItem {
  imageSrc: string;
  caption?: string;
  /**
   * true の間は「画像未設置のサンプル/プレースホルダー問題」として扱われ、
   * 画像存在チェック(src/games/__tests__/worldMapImages.test.ts)の対象から除外される。
   * ファクトチェックが済み、実際の地図画像を public/ 以下に配置したら、
   * このフィールドごと削除すること。それだけで自動的にCIの存在チェック対象になる。
   */
  sample?: boolean;
}

export const WORLD_MAP_TIME_TRAVEL_QUESTIONS: WorldMapEraQuestion[] = [
  // サンプル(実際の地図画像を用意したら imageSrc を差し替えてください)
  {
    id: "sample-1600s",
    imageSrc: "/plus-challenge/maps/sample-1600s.png",
    correctChoice: "1600年代",
    choices: ["1600年代", "1800年代", "1950年代", "2020年代"],
    explanation:
      "これはサンプル問題です。public/plus-challenge/maps/ に地図画像を追加し、このデータのimageSrcを差し替えてください。",
    caption: "サンプル問題(画像未設定)",
    sample: true,
  },
];
