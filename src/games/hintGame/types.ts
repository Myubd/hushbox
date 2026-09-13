/** ヒントゲームの1問。3つのヒント(easy/normal/hardでヒント語の長さが変わる)から答えを当てる。 */
export interface HintGameQuestion {
  id: string;
  /** 出題ジャンル(世界史・化学・スポーツなど)。カテゴリ絞り込みに使う。 */
  category: string;
  /** 正解(人名・国名・用語など)。 */
  answer: string;
  hints: {
    /** ヒント語は3文字まで。 */
    easy: [string, string, string];
    /** ヒント語は2文字まで。 */
    normal: [string, string, string];
    /** ヒント語は1文字(漢字1字)。 */
    hard: [string, string, string];
  };
}

/** 出題ジャンルの一覧(データ内の登場順)。カテゴリ絞り込みのチップ表示に使う。 */
export const HINT_GAME_CATEGORIES: string[] = [
  "世界史（人物）",
  "日本史（人物・出来事）",
  "世界の国・地理",
  "化学",
  "物理",
  "生物",
  "天文・宇宙",
  "数学",
  "文学作品",
  "音楽",
  "美術",
  "スポーツ",
  "動物",
  "食べ物・料理",
  "企業・ブランド",
  "世界遺産・建築",
  "ことわざ・四字熟語",
];
