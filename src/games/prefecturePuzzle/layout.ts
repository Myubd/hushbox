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
