import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { PuzzlePiece as PuzzlePieceData } from "./types";
import { combinedGuidePathData, computeBoardBounds, findLargestPartCenter, packTray } from "./layout";
import type { GroupLabelMeta } from "./layout";
import { PuzzlePiece } from "./PuzzlePiece";

interface Props {
  label: string;
  pieces: PuzzlePieceData[];
  kind: "mainland" | "extra" | "inset" | "combined";
  snapDistanceM: number;
  onProgress: (solvedDelta: number) => void;
  /** combined種別のとき、地図上に各グループ名を表示するためのラベル情報。 */
  groupLabels?: GroupLabelMeta[];
}

const MIN_SCALE = 1;
const MAX_SCALE = 10;

export function BoardPanel({ label, pieces, kind, snapDistanceM, onProgress, groupLabels }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [solvedCount, setSolvedCount] = useState(0);
  const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);

  const base = useMemo(() => {
    const board = computeBoardBounds(pieces);
    const boardW = board.maxX - board.minX;
    const boardH = board.maxY - board.minY;
    const pad = Math.max(boardW, 1) * 0.04;
    const gap = Math.max(boardW, 1) * 0.06;
    const trayGap = Math.max(boardW, 1) * 0.012;

    // ピース一覧(トレイ)は地図の下に、地図と同じ横幅で並べる。
    const trayWidth = boardW > 0 ? boardW : 1000;
    const trayStartX = board.minX;
    const trayStartY = board.maxY + gap;

    const { slots, height: trayHeight } = packTray(pieces, trayWidth, trayGap, trayStartX, trayStartY);
    const trayBottom = trayStartY + trayHeight;

    const viewMinX = board.minX - pad;
    const viewMinY = board.minY - pad;
    const viewW = boardW + pad * 2;
    const viewH = trayBottom - board.minY + pad * 2;

    const strokeWidth = Math.max(boardW, 1) * 0.0012;
    const guidePathData = combinedGuidePathData(pieces);

    // ズームボタンの基準点(盤面全体のbbox中心ではなく、面積最大の陸地の中心。
    // 理由はfindLargestPartCenterのコメントを参照)。
    const largestPart = findLargestPartCenter(pieces);

    // 地図(ガイド)の背景として塗る矩形の範囲。ピース一覧(トレイ)側には
    // 背景を塗らず、ページの地色がそのまま見えるようにすることで、
    // 「ピースが地図の箱の中に入っている」ように見えるのを防ぐ。
    const boardBgRect = {
      x: board.minX - pad,
      y: board.minY - pad,
      width: boardW + pad * 2,
      height: boardH + pad * 2,
    };

    return {
      viewMinX,
      viewMinY,
      viewW,
      viewH,
      slots,
      strokeWidth,
      guidePathData,
      boardCenterX: largestPart.x,
      boardCenterY: largestPart.y,
      boardBgRect,
    };
  }, [pieces]);

  // ズーム/パン状態。(ox, oy, vw, vh) が実際に表示するviewBox。
  const [view, setView] = useState({ ox: 0, oy: 0, vw: 0, vh: 0, scale: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const lastBaseKey = useRef<string>("");
  const baseKey = `${base.viewMinX}:${base.viewMinY}:${base.viewW}:${base.viewH}`;
  if (lastBaseKey.current !== baseKey && base.viewW > 0) {
    lastBaseKey.current = baseKey;
    // データ(pieces)が変わって基準となる範囲が変化したときだけリセットする。
    // レンダー中の直接setStateだが、これは「入力(props)から導出される値の
    // 同期」であり、Reactが公式に許容しているパターン。
    viewRef.current = { ox: base.viewMinX, oy: base.viewMinY, vw: base.viewW, vh: base.viewH, scale: 1 };
    setView(viewRef.current);
  }

  const panInfo = useRef<{ startClientX: number; startClientY: number; startOx: number; startOy: number } | null>(
    null
  );

  const handleWheel = useCallback(
    (evt: WheelEvent) => {
      evt.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const pt = svg.createSVGPoint();
      pt.x = evt.clientX;
      pt.y = evt.clientY;
      const userPt = pt.matrixTransform(ctm.inverse());

      const factor = evt.deltaY > 0 ? 0.88 : 1 / 0.88;
      const cur = viewRef.current;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, cur.scale * factor));
      const newVw = base.viewW / newScale;
      const newVh = base.viewH / newScale;
      const fracX = (userPt.x - cur.ox) / cur.vw;
      const fracY = (userPt.y - cur.oy) / cur.vh;
      const newOx = userPt.x - fracX * newVw;
      const newOy = userPt.y - fracY * newVh;
      setView({ ox: newOx, oy: newOy, vw: newVw, vh: newVh, scale: newScale });
    },
    [base.viewW, base.viewH]
  );

  // React(v17以降)はwheel/touch系イベントをルート要素にpassiveリスナーとして
  // 登録するため、JSXの onWheel={...} に evt.preventDefault() を書いても
  // 実際には無視され、ページ自体がスクロールしてしまう。
  // これを避けるため、ネイティブの addEventListener を { passive: false } で
  // 明示的に使い、地図にカーソルがある間はページのスクロールを止める。
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const zoomBy = useCallback(
    (factor: number) => {
      const cur = viewRef.current;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, cur.scale * factor));
      const newVw = base.viewW / newScale;
      const newVh = base.viewH / newScale;
      // 盤面全体の中心ではなく、常に地図(board)の中心を基準に拡大縮小する。
      // トレイが縦に長い場合、盤面全体の中心だと地図から外れた場所を
      // 拡大してしまうため。
      setView({
        ox: base.boardCenterX - newVw / 2,
        oy: base.boardCenterY - newVh / 2,
        vw: newVw,
        vh: newVh,
        scale: newScale,
      });
    },
    [base.viewW, base.viewH, base.boardCenterX, base.boardCenterY]
  );

  const resetView = useCallback(() => {
    setView({ ox: base.viewMinX, oy: base.viewMinY, vw: base.viewW, vh: base.viewH, scale: 1 });
  }, [base.viewMinX, base.viewMinY, base.viewW, base.viewH]);

  const handleBackgroundPointerDown = useCallback(
    (evt: ReactPointerEvent<SVGSVGElement>) => {
      if (view.scale <= 1) return;
      const svg = svgRef.current;
      if (!svg) return;
      svg.setPointerCapture(evt.pointerId);
      panInfo.current = {
        startClientX: evt.clientX,
        startClientY: evt.clientY,
        startOx: view.ox,
        startOy: view.oy,
      };
    },
    [view.scale, view.ox, view.oy]
  );

  const handleBackgroundPointerMove = useCallback((evt: ReactPointerEvent<SVGSVGElement>) => {
    const pan = panInfo.current;
    const svg = svgRef.current;
    if (!pan || !svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const dxScreen = evt.clientX - pan.startClientX;
    const dyScreen = evt.clientY - pan.startClientY;
    const cur = viewRef.current;
    const dxUser = (dxScreen / rect.width) * cur.vw;
    const dyUser = (dyScreen / rect.height) * cur.vh;
    setView({ ...cur, ox: pan.startOx - dxUser, oy: pan.startOy - dyUser });
  }, []);

  const handleBackgroundPointerUp = useCallback((evt: ReactPointerEvent<SVGSVGElement>) => {
    if (panInfo.current) {
      svgRef.current?.releasePointerCapture(evt.pointerId);
    }
    panInfo.current = null;
  }, []);

  const handleSolved = () => {
    setSolvedCount((c) => c + 1);
    onProgress(1);
  };

  const handleHoverChange = useCallback((name: string | null, clientX: number, clientY: number) => {
    setHover(name ? { name, x: clientX, y: clientY } : null);
  }, []);

  const heightClass = "prefecture-puzzle__panel-svg--mainland";
  const effectiveView = view.vw > 0 ? view : { ox: base.viewMinX, oy: base.viewMinY, vw: base.viewW, vh: base.viewH };

  return (
    <div className={`prefecture-puzzle__panel prefecture-puzzle__panel--${kind}`}>
      <div className="prefecture-puzzle__panel-header">
        <span className="prefecture-puzzle__panel-label">{label}</span>
        <span className="prefecture-puzzle__panel-progress">
          {solvedCount} / {pieces.length}
        </span>
      </div>
      <div className="prefecture-puzzle__panel-svg-wrap">
        <svg
          ref={svgRef}
          className={`prefecture-puzzle__panel-svg ${heightClass}`}
          viewBox={`${effectiveView.ox} ${effectiveView.oy} ${effectiveView.vw} ${effectiveView.vh}`}
          preserveAspectRatio="xMidYMin meet"
          onPointerDown={handleBackgroundPointerDown}
          onPointerMove={handleBackgroundPointerMove}
          onPointerUp={handleBackgroundPointerUp}
          onPointerCancel={handleBackgroundPointerUp}
          style={{ cursor: view.scale > 1 ? "grab" : "default" }}
        >
          {/* 地図(ガイド)部分にだけ背景を塗る。ピース一覧(トレイ)側は
              背景なし(ページの地色がそのまま見える)にすることで、
              「ピースが地図と同じ箱に入っている」ように見えるのを防ぐ。 */}
          <rect
            x={base.boardBgRect.x}
            y={base.boardBgRect.y}
            width={base.boardBgRect.width}
            height={base.boardBgRect.height}
            rx={base.boardBgRect.width * 0.015}
            className="prefecture-puzzle__board-bg"
          />
          {/* ガイド(正解位置の輪郭)は1ピース1要素ではなく、全ピース分をまとめた
              1つの<path>として描画する。ピース数が多い盤面(hardなど)でも
              DOMノード数を増やさずに済み、描画パフォーマンスが大きく改善する。 */}
          <path
            d={base.guidePathData}
            className="prefecture-puzzle__guide-shape"
            fillRule="evenodd"
            strokeWidth={base.strokeWidth}
          />
          {groupLabels && groupLabels.length > 0 && (
            <g className="prefecture-puzzle__group-labels">
              {groupLabels.map((g) => (
                <text
                  key={g.key}
                  x={g.x}
                  y={g.y}
                  textAnchor="middle"
                  fontSize={base.strokeWidth * 40}
                  className="prefecture-puzzle__group-label-text"
                >
                  {g.label}
                </text>
              ))}
            </g>
          )}
          <g className="prefecture-puzzle__piece-layer">
            {pieces.map((p) => {
              const slot = base.slots.get(p.id);
              if (!slot) return null;
              return (
                <PuzzlePiece
                  key={p.id}
                  piece={p}
                  initial={{ x: slot.x, y: slot.y }}
                  svgRef={svgRef}
                  snapDistanceM={snapDistanceM}
                  strokeWidth={base.strokeWidth}
                  onSolved={handleSolved}
                  onHoverChange={handleHoverChange}
                />
              );
            })}
          </g>
        </svg>
        <div className="prefecture-puzzle__zoom-controls">
          <button type="button" onClick={() => zoomBy(1.4)} aria-label="拡大">
            +
          </button>
          <button type="button" onClick={() => zoomBy(1 / 1.4)} aria-label="縮小">
            −
          </button>
          <button type="button" onClick={resetView} aria-label="表示をリセット">
            ⟲
          </button>
        </div>
        {hover && <div className="prefecture-puzzle__tooltip" style={{ left: hover.x, top: hover.y }}>{hover.name}</div>}
      </div>
    </div>
  );
}
