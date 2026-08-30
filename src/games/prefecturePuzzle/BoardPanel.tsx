import { useMemo, useRef, useState } from "react";
import type { PuzzlePiece as PuzzlePieceData } from "./types";
import { combinedGuidePathData, computeBoardBounds, packTray } from "./layout";
import { PuzzlePiece } from "./PuzzlePiece";

interface Props {
  label: string;
  pieces: PuzzlePieceData[];
  kind: "mainland" | "extra" | "inset";
  snapDistanceM: number;
  onProgress: (solvedDelta: number) => void;
}

export function BoardPanel({ label, pieces, kind, snapDistanceM, onProgress }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [solvedCount, setSolvedCount] = useState(0);

  const layout = useMemo(() => {
    const board = computeBoardBounds(pieces);
    const boardW = board.maxX - board.minX;
    const boardH = board.maxY - board.minY;
    const pad = Math.max(boardW, 1) * 0.04;
    const gapRow = Math.max(boardH, 1) * 0.06;
    const trayGap = Math.max(boardW, 1) * 0.012;

    // トレイの横幅は盤面の幅より広めに取り、より多くの列に並べることで
    // 縦方向に間延びしすぎないようにする(横方向の余白を活用する)。
    const trayWidth = (boardW > 0 ? boardW : 1000) * (kind === "mainland" ? 1.6 : 1);

    const { slots, height: trayHeight } = packTray(
      pieces,
      trayWidth,
      trayGap,
      board.minX,
      board.maxY + gapRow
    );

    const viewMinX = board.minX - pad;
    const viewMinY = board.minY - pad;
    const viewW = Math.max(boardW, trayWidth) + pad * 2;
    const viewH = trayHeight + gapRow + pad * 2 + boardH;
    const strokeWidth = Math.max(boardW, 1) * 0.0012;
    const guidePathData = combinedGuidePathData(pieces);

    return { board, slots, viewMinX, viewMinY, viewW, viewH, strokeWidth, guidePathData };
  }, [pieces, kind]);

  const handleSolved = () => {
    setSolvedCount((c) => c + 1);
    onProgress(1);
  };

  const heightClass =
    kind === "mainland" ? "prefecture-puzzle__panel-svg--mainland" : "prefecture-puzzle__panel-svg--small";

  return (
    <div className={`prefecture-puzzle__panel prefecture-puzzle__panel--${kind}`}>
      <div className="prefecture-puzzle__panel-header">
        <span className="prefecture-puzzle__panel-label">{label}</span>
        <span className="prefecture-puzzle__panel-progress">
          {solvedCount} / {pieces.length}
        </span>
      </div>
      {/* 内部スクロールにはせず、ページの通常のスクロールで下のピース一覧まで見られるようにする */}
      <svg
        ref={svgRef}
        className={`prefecture-puzzle__panel-svg ${heightClass}`}
        viewBox={`${layout.viewMinX} ${layout.viewMinY} ${layout.viewW} ${layout.viewH}`}
        preserveAspectRatio="xMidYMin meet"
      >
        {/* ガイド(正解位置の輪郭)は1ピース1要素ではなく、全ピース分をまとめた
            1つの<path>として描画する。ピース数が多い盤面(hardなど)でも
            DOMノード数を増やさずに済み、描画パフォーマンスが大きく改善する。 */}
        <path
          d={layout.guidePathData}
          className="prefecture-puzzle__guide-shape"
          fillRule="evenodd"
          strokeWidth={layout.strokeWidth}
        />
        <g className="prefecture-puzzle__piece-layer">
          {pieces.map((p) => {
            const slot = layout.slots.get(p.id);
            if (!slot) return null;
            return (
              <PuzzlePiece
                key={p.id}
                piece={p}
                initial={{ x: slot.x, y: slot.y }}
                svgRef={svgRef}
                snapDistanceM={snapDistanceM}
                strokeWidth={layout.strokeWidth}
                onSolved={handleSolved}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
