import type { PuzzlePiece } from "./types";

/** ピースのローカル座標(polygons)から、SVGの<path>用d属性文字列を作る。 */
export function piecePathData(piece: PuzzlePiece): string {
  const parts: string[] = [];
  for (const ringSet of piece.polygons) {
    for (const ring of ringSet) {
      if (ring.length === 0) continue;
      const [firstX, firstY] = ring[0];
      let d = `M ${firstX},${firstY}`;
      for (let i = 1; i < ring.length; i++) {
        const [x, y] = ring[i];
        d += ` L ${x},${y}`;
      }
      d += " Z";
      parts.push(d);
    }
  }
  return parts.join(" ");
}

/** ピースを正解位置(correct_position)に平行移動した状態でのSVGパスデータを作る。 */
export function piecePathDataAt(piece: PuzzlePiece, dx: number, dy: number): string {
  const parts: string[] = [];
  for (const ringSet of piece.polygons) {
    for (const ring of ringSet) {
      if (ring.length === 0) continue;
      const [firstX, firstY] = ring[0];
      let d = `M ${firstX + dx},${firstY + dy}`;
      for (let i = 1; i < ring.length; i++) {
        const [x, y] = ring[i];
        d += ` L ${x + dx},${y + dy}`;
      }
      d += " Z";
      parts.push(d);
    }
  }
  return parts.join(" ");
}

/**
 * 複数ピースの「正解位置に置いたときの」輪郭をすべて1つのSVGパスデータへ結合する。
 * ピース数が多い盤面(hard難易度など)で、ガイド表示用に1ピース1つの<path>要素を
 * 作るとDOMノード数が膨大になりパフォーマンスが悪化するため、静的な表示専用の
 * ガイド層だけは1つの<path>にまとめて描画する。
 */
export function combinedGuidePathData(pieces: PuzzlePiece[]): string {
  const parts: string[] = [];
  for (const p of pieces) {
    parts.push(piecePathDataAt(p, p.correct_position.x, p.correct_position.y));
  }
  return parts.join(" ");
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** 複数ピースの「正解位置に置いたときの」全体バウンディングボックスを求める。 */
export function computeBoardBounds(pieces: PuzzlePiece[]): Bounds {
  const b: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const p of pieces) {
    const cx = p.correct_position.x;
    const cy = p.correct_position.y;
    b.minX = Math.min(b.minX, cx + p.bbox.minX);
    b.maxX = Math.max(b.maxX, cx + p.bbox.maxX);
    b.minY = Math.min(b.minY, cy + p.bbox.minY);
    b.maxY = Math.max(b.maxY, cy + p.bbox.maxY);
  }
  if (!Number.isFinite(b.minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  return b;
}

export interface TraySlot {
  pieceId: string;
  /** ピースのローカル座標系における、この位置に置いたときの平行移動量。 */
  x: number;
  y: number;
}

/**
 * ピースをシャッフルして、指定した幅の中に「棚詰め」する。
 * 単純な左詰め+折り返しのシェルフ・パッキング。
 */
export function packTray(
  pieces: PuzzlePiece[],
  trayWidth: number,
  gap: number,
  startX: number,
  startY: number
): { slots: Map<string, TraySlot>; height: number } {
  const shuffled = [...pieces].sort(() => Math.random() - 0.5);
  const slots = new Map<string, TraySlot>();

  let cursorX = startX;
  let cursorY = startY;
  let rowHeight = 0;

  for (const p of shuffled) {
    const w = p.bbox.maxX - p.bbox.minX;
    const h = p.bbox.maxY - p.bbox.minY;
    if (cursorX + w > startX + trayWidth && cursorX > startX) {
      cursorX = startX;
      cursorY += rowHeight + gap;
      rowHeight = 0;
    }
    // ピースのローカル座標(重心が原点)を、このスロットのbbox左上に合わせるための平行移動量
    slots.set(p.id, { pieceId: p.id, x: cursorX - p.bbox.minX, y: cursorY - p.bbox.minY });
    cursorX += w + gap;
    rowHeight = Math.max(rowHeight, h);
  }

  return { slots, height: cursorY + rowHeight - startY };
}

/** リング(座標配列)の符号付き面積(shoelace公式)と重心を計算する。 */
function ringAreaAndCentroid(ring: [number, number][]): { area: number; cx: number; cy: number } {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[(i + 1) % ring.length];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  area = area / 2;
  if (Math.abs(area) < 1e-9) {
    // 退化した(面積ほぼ0の)リングは単純平均で代用
    const avg = ring.reduce((s, [x, y]) => [s[0] + x, s[1] + y], [0, 0]);
    return { area: 0, cx: avg[0] / ring.length, cy: avg[1] / ring.length };
  }
  return { area: Math.abs(area), cx: cx / (6 * area), cy: cy / (6 * area) };
}

/**
 * 複数ピースの中から「面積が最大の1つの島(サブポリゴン)」の絶対座標での
 * 中心点を求める。
 *
 * 盤面全体のbbox中心をズームの基準点にすると、実在するが遠く離れた
 * 複数の陸地を1つのピースが持つ場合(例: 北大東村が北大東島と約150km
 * 離れた沖大東島を含む、小笠原村が父島諸島と1000km以上離れた南鳥島を
 * 含む、など)に、どの陸地の上にも乗らない「海上の一点」が基準になって
 * しまい、ズームしても何も見えない問題が起きる。最も大きい主要な陸地を
 * 基準にすることで、ズームボタンを押したときに必ず何かが見える状態にする。
 */
export function findLargestPartCenter(pieces: PuzzlePiece[]): { x: number; y: number } {
  let best = { area: -1, x: 0, y: 0 };
  for (const piece of pieces) {
    for (const ringSet of piece.polygons) {
      const ext = ringSet[0];
      if (!ext || ext.length < 3) continue;
      const { area, cx, cy } = ringAreaAndCentroid(ext);
      if (area > best.area) {
        best = { area, x: cx + piece.correct_position.x, y: cy + piece.correct_position.y };
      }
    }
  }
  return { x: best.x, y: best.y };
}

export interface GroupInput {
  key: string;
  label: string;
  pieces: PuzzlePiece[];
}

export interface GroupLabelMeta {
  key: string;
  label: string;
  x: number;
  y: number;
}

/**
 * 複数のグループ(本土・北海道・沖縄県・小笠原村など)を1つの盤面として
 * まとめる。全グループが元々同じ投影中心(グローバルな座標系)で生成されて
 * いるため、座標の平行移動は行わず、実際の地理的な位置関係(本土から見て
 * どの方角にどれくらい離れているか)をそのまま保持する(普通の日本地図と
 * 同じ感覚で見える)。
 *
 * 各グループの見出しラベルは、そのグループの中で最も面積の大きい陸地の
 * 中心付近に表示する(ズームボタンの基準点と同じ考え方。
 * findLargestPartCenterのコメントも参照)。
 */
export function combineGroups(groups: GroupInput[]): { pieces: PuzzlePiece[]; groupLabels: GroupLabelMeta[] } {
  const allPieces: PuzzlePiece[] = [];
  const groupLabels: GroupLabelMeta[] = [];

  for (const g of groups) {
    allPieces.push(...g.pieces);
    const center = findLargestPartCenter(g.pieces);
    const bounds = computeBoardBounds(g.pieces);
    groupLabels.push({
      key: g.key,
      label: g.label,
      x: center.x,
      y: bounds.minY - (bounds.maxY - bounds.minY) * 0.04,
    });
  }

  return { pieces: allPieces, groupLabels };
}

