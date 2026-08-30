/**
 * 都道府県パズルのピースデータ型。
 *
 * データ生成パイプライン(build_pieces.js)が出力するJSONの構造に対応する。
 * 1ピース = 1つの市区町村(hard) または 1つの都道府県相当のまとまり(easy)。
 * `polygons` はピース自身の重心を原点(0,0)としたローカル座標(メートル単位)、
 * `correct_position` はパズル盤面上での「置くべき正解位置」(メートル単位)。
 */

/** 1つのリング(輪郭)。[x, y]の配列。 */
export type Ring = [number, number][];

/** 1つのポリゴン。先頭が外周、以降があれば穴。 */
export type PolygonRingSet = Ring[];

export interface PuzzlePiece {
  id: string;
  name: string;
  prefecture: string;
  area_km2: number;
  /** MultiPolygon相当。複数の島(飛び地)を持つピースもある。 */
  polygons: PolygonRingSet[];
  correct_position: { x: number; y: number };
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
}

/** 本土などの主要盤面に共通するデータ形状。 */
export interface PuzzleSubBoard {
  projection_center: { lon: number; lat: number };
  piece_count: number;
  pieces: PuzzlePiece[];
}

/** 北海道・沖縄本島のように、本土とは別の独立した盤面として扱うもの。 */
export interface PuzzleExtraBoard extends PuzzleSubBoard {
  board_id: string;
  label: string;
  prefecture: string;
}

/** 伊豆諸島・小笠原諸島など、小さな離島をまとめた「インセット」盤面。 */
export interface PuzzleInset extends PuzzleSubBoard {
  inset_id: string;
  label: string;
  prefecture: string | string[];
}

export interface PuzzleData {
  puzzle_id: string;
  mainland: PuzzleSubBoard;
  extra_boards: PuzzleExtraBoard[];
  insets: PuzzleInset[];
  piece_count: number;
  excluded: { id: string; name: string; area_km2: number }[];
}

/** 難易度。easy=都道府県レベル(全国), normal=市区町村レベル(地方ごと), hard=市区町村レベル(全国)。 */
export type PuzzleDifficulty = "easy" | "normal" | "hard";

/** normal(地方別)で選べる地方の一覧。ファイル名(`normal_<地方名>.json`)と対応する。 */
export const PUZZLE_REGIONS = [
  "北海道",
  "東北",
  "関東",
  "甲信越_北陸",
  "東海",
  "近畿",
  "中国",
  "四国",
  "九州",
  "沖縄",
] as const;

export type PuzzleRegion = (typeof PUZZLE_REGIONS)[number];

/** 地方名の表示用ラベル(アンダースコアなどをきれいに見せる)。 */
export const PUZZLE_REGION_LABELS: Record<PuzzleRegion, string> = {
  北海道: "北海道",
  東北: "東北",
  関東: "関東",
  甲信越_北陸: "甲信越・北陸",
  東海: "東海",
  近畿: "近畿",
  中国: "中国",
  四国: "四国",
  九州: "九州",
  沖縄: "沖縄",
};

/**
 * 地方名(日本語)に対応するデータファイル名の識別子(ローマ字・ASCIIのみ)。
 * 実ファイルは `normal_<slug>.json` という名前で配置している。
 *
 * 日本語ファイル名はzip圧縮・展開時にツールや環境によって文字コードが
 * 正しく解釈されず文字化けする(Windows環境で特に起きやすい)ことがあるため、
 * 配布されるファイル名は常にASCIIのみにしている。表示用のラベルは
 * PUZZLE_REGION_LABELS を使う。
 */
export const PUZZLE_REGION_SLUGS: Record<PuzzleRegion, string> = {
  北海道: "hokkaido",
  東北: "tohoku",
  関東: "kanto",
  甲信越_北陸: "koshinetsu_hokuriku",
  東海: "tokai",
  近畿: "kinki",
  中国: "chugoku",
  四国: "shikoku",
  九州: "kyushu",
  沖縄: "okinawa",
};

/** 1つの「盤面」を描画するための正規化された情報(本土/独立盤面/インセットを共通に扱う)。 */
export interface BoardPanelData {
  key: string;
  label: string;
  pieces: PuzzlePiece[];
  /** 盤面の種類。表示サイズの目安付けに使う(mainlandは大きく、insetは小さく)。 */
  kind: "mainland" | "extra" | "inset";
}

/** PuzzleDataを、描画しやすい「盤面の配列」に正規化する。 */
export function toBoardPanels(data: PuzzleData): BoardPanelData[] {
  const panels: BoardPanelData[] = [
    { key: "mainland", label: "本土", pieces: data.mainland.pieces, kind: "mainland" },
  ];
  for (const b of data.extra_boards) {
    panels.push({ key: b.board_id, label: b.label, pieces: b.pieces, kind: "extra" });
  }
  for (const ins of data.insets) {
    panels.push({ key: ins.inset_id, label: ins.label, pieces: ins.pieces, kind: "inset" });
  }
  return panels;
}
