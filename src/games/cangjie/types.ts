/** 倉頡輸入法パズルの1問。ChoiceQuizItem互換(4択モードでChoiceQuizGameをそのまま使うため)。 */
export interface CangjieItem {
  id: string;
  /** 出題するパーツの並び(例: 「心・卜・廿・心」「手・中・田　山・山」)。 */
  parts: string;
  /** 4つの選択肢(この中に必ず正解を1つ含む)。 */
  choices: string[];
  correctChoice: string;
  /** 各選択肢の倉頡コードの導出根拠(4択モードの答え合わせ、記述モードのヒントに使う)。 */
  explanation: string;
}
