import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, RefObject } from "react";
import type { PuzzlePiece as PuzzlePieceData } from "./types";
import { piecePathData } from "./layout";

interface Props {
  piece: PuzzlePieceData;
  /** トレイ内の初期位置(このピースのローカル座標系における平行移動量)。 */
  initial: { x: number; y: number };
  svgRef: RefObject<SVGSVGElement | null>;
  snapDistanceM: number;
  strokeWidth: number;
  onSolved: (pieceId: string) => void;
}

/**
 * 1ピース分のドラッグ可能な図形。
 *
 * パフォーマンス上の理由(hard難易度では1,600ピース以上を同時に描画するため)から、
 * ドラッグ中の位置更新はReactのstateを経由せずrefで直接DOM(transform属性)を書き換える。
 * Reactのstateを更新するのは「正解位置にスナップして固定する」瞬間だけ。
 */
export const PuzzlePiece = memo(function PuzzlePiece({
  piece,
  initial,
  svgRef,
  snapDistanceM,
  strokeWidth,
  onSolved,
}: Props) {
  const gRef = useRef<SVGGElement | null>(null);
  const pathData = useMemo(() => piecePathData(piece), [piece]);
  const pos = useRef({ x: initial.x, y: initial.y });
  const dragInfo = useRef<{
    startPointer: { x: number; y: number };
    startPos: { x: number; y: number };
  } | null>(null);
  const [locked, setLocked] = useState(false);

  const applyTransform = useCallback(() => {
    gRef.current?.setAttribute("transform", `translate(${pos.current.x},${pos.current.y})`);
  }, []);

  // 初期位置(トレイ内の位置)は、マウント時に一度だけ命令的に設定する。
  // JSX側では transform 属性を宣言しない(以後の再レンダリングで上書きされるのを防ぐため。
  // 詳しくは handlePointerUp 側のコメント参照)。
  useLayoutEffect(() => {
    applyTransform();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toSvgPoint = useCallback(
    (evt: PointerEvent<SVGGElement>): { x: number; y: number } => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const pt = svg.createSVGPoint();
      pt.x = evt.clientX;
      pt.y = evt.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const transformed = pt.matrixTransform(ctm.inverse());
      return { x: transformed.x, y: transformed.y };
    },
    [svgRef]
  );

  const handlePointerDown = useCallback(
    (evt: PointerEvent<SVGGElement>) => {
      if (locked) return;
      const g = gRef.current;
      if (!g) return;
      // 先に最前面へ付け替え(DOM上の再アタッチ)してから setPointerCapture する。
      // 順序が逆だと、要素の再アタッチによってキャプチャが失われ、以後の
      // pointermove/pointerupがこの要素に届かなくなる(ドラッグが動かなくなる)。
      g.parentElement?.appendChild(g);
      g.setPointerCapture(evt.pointerId);
      dragInfo.current = { startPointer: toSvgPoint(evt), startPos: { ...pos.current } };
    },
    [locked, toSvgPoint]
  );

  const handlePointerMove = useCallback(
    (evt: PointerEvent<SVGGElement>) => {
      const drag = dragInfo.current;
      if (!drag) return;
      const cur = toSvgPoint(evt);
      pos.current = {
        x: drag.startPos.x + (cur.x - drag.startPointer.x),
        y: drag.startPos.y + (cur.y - drag.startPointer.y),
      };
      applyTransform();
    },
    [applyTransform, toSvgPoint]
  );

  const handlePointerUp = useCallback(() => {
    if (!dragInfo.current) return;
    dragInfo.current = null;
    const dx = pos.current.x - piece.correct_position.x;
    const dy = pos.current.y - piece.correct_position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= snapDistanceM) {
      pos.current = { x: piece.correct_position.x, y: piece.correct_position.y };
      applyTransform();
      setLocked(true);
      onSolved(piece.id);
    }
  }, [applyTransform, onSolved, piece.correct_position.x, piece.correct_position.y, piece.id, snapDistanceM]);

  return (
    <g
      ref={gRef}
      // transform属性はここでは宣言しない。Reactが再レンダリングのたびに
      // ここへ書き戻してしまうと、スナップ後の位置(applyTransformで命令的に
      // 書き込んだ値)が上書きされて巻き戻ってしまうため。初期位置は
      // 上のuseLayoutEffectで一度だけ設定し、以後はrefで直接更新する。
      className={`prefecture-puzzle__piece${locked ? " is-locked" : ""}`}
      style={{ cursor: locked ? "default" : "grab", touchAction: "none", pointerEvents: locked ? "none" : "auto" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <path
        d={pathData}
        className="prefecture-puzzle__piece-shape"
        fillRule="evenodd"
        strokeWidth={strokeWidth}
      />
      <title>{piece.name}</title>
    </g>
  );
});
