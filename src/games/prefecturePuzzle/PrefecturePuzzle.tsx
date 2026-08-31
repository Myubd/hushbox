import { useCallback, useMemo, useState } from "react";
import type { GameScreenProps } from "../types";
import type { PuzzleDifficulty, PuzzleRegion } from "./types";
import { PUZZLE_REGIONS, PUZZLE_REGION_LABELS, toBoardPanels } from "./types";
import { usePuzzleData } from "./usePuzzleData";
import { BoardPanel } from "./BoardPanel";

/** 難易度ごとのスナップ判定距離(メートル)。ピースの粒度に合わせて調整。 */
const SNAP_DISTANCE_M: Record<PuzzleDifficulty, number> = {
  easy: 20_000, // 20km: 都道府県レベルなのでやや緩め
  normal: 5_000, // 5km: 地方ごとの市区町村レベル
  hard: 3_000, // 3km: 全国の市区町村レベル。区が密集する都市部を考慮しやや厳しめ
};

const DIFFICULTY_INFO: { id: PuzzleDifficulty; label: string; description: string }[] = [
  { id: "easy", label: "やさしい", description: "都道府県(全国47パーツ)" },
  { id: "normal", label: "ふつう", description: "市区町村(地方をえらぶ)" },
  { id: "hard", label: "むずかしい", description: "市区町村(全国約1,900パーツ)" },
];

/** 難易度ごとの獲得ポイント(1ピース正しく置くごと)。簡単なほうから1p/2p/3p。 */
const POINTS_BY_DIFFICULTY: Record<PuzzleDifficulty, number> = {
  easy: 1,
  normal: 2,
  hard: 3,
};

type Selection = { difficulty: PuzzleDifficulty; region: PuzzleRegion | null };

export function PrefecturePuzzle({ onBack, onCorrect }: GameScreenProps) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [solvedTotal, setSolvedTotal] = useState(0);

  const status = usePuzzleData(selection?.difficulty ?? "easy", selection?.region ?? null);
  const active = selection !== null;

  const panels = useMemo(() => {
    if (status.status !== "ready") return [];
    return toBoardPanels(status.data);
  }, [status]);

  const totalPieces = status.status === "ready" ? status.data.piece_count : 0;

  const handleProgress = useCallback(
    (delta: number) => {
      setSolvedTotal((s) => s + delta);
      if (delta > 0 && selection) {
        onCorrect?.(delta * POINTS_BY_DIFFICULTY[selection.difficulty]);
      }
    },
    [selection, onCorrect]
  );

  const handleSelectDifficulty = (difficulty: PuzzleDifficulty) => {
    setSolvedTotal(0);
    setSelection({ difficulty, region: null });
  };

  const handleSelectRegion = (region: PuzzleRegion) => {
    setSolvedTotal(0);
    setSelection({ difficulty: "normal", region });
  };

  const handleChangeSelection = () => {
    setSelection(null);
    setSolvedTotal(0);
  };

  const isComplete = active && totalPieces > 0 && solvedTotal >= totalPieces;

  return (
    <div className="mini-game prefecture-puzzle">
      <div className="plus-challenge__header">
        <button className="btn btn--ghost btn--small" onClick={onBack}>
          ← もどる
        </button>
        <div className="plus-challenge__heading">
          <span className="plus-challenge__badge">🧩 都道府県パズル</span>
        </div>
      </div>

      {!active && (
        <div className="learning-drill__card mini-game__card prefecture-puzzle__select">
          <p className="prefecture-puzzle__hint">むずかしさをえらんでね</p>
          <div className="prefecture-puzzle__difficulty-grid">
            {DIFFICULTY_INFO.map((d) => (
              <button
                key={d.id}
                className="prefecture-puzzle__difficulty-btn"
                onClick={() => handleSelectDifficulty(d.id)}
              >
                <span className="prefecture-puzzle__difficulty-label">{d.label}</span>
                <span className="prefecture-puzzle__difficulty-desc">{d.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {active && selection.difficulty === "normal" && !selection.region && (
        <div className="learning-drill__card mini-game__card prefecture-puzzle__select">
          <p className="prefecture-puzzle__hint">地方をえらんでね</p>
          <div className="prefecture-puzzle__region-grid">
            {PUZZLE_REGIONS.map((r) => (
              <button key={r} className="prefecture-puzzle__region-btn" onClick={() => handleSelectRegion(r)}>
                {PUZZLE_REGION_LABELS[r]}
              </button>
            ))}
          </div>
          <button className="btn btn--ghost btn--small" onClick={handleChangeSelection}>
            ← むずかしさをえらびなおす
          </button>
        </div>
      )}

      {active && (selection.difficulty !== "normal" || selection.region) && (
        <>
          {status.status === "loading" && (
            <p className="learning-drill__loading">
              地図データを読みこみ中です…
              {selection.difficulty === "hard" && "(全国データなので少し時間がかかります)"}
            </p>
          )}

          {status.status === "error" && (
            <div className="learning-drill__feedback is-wrong">
              <p className="learning-drill__feedback-title">読み込みに失敗しました</p>
              <p>{status.message}</p>
              <button className="btn btn--primary" onClick={handleChangeSelection}>
                やりなおす
              </button>
            </div>
          )}

          {status.status === "ready" && (
            <>
              <div className="prefecture-puzzle__toolbar">
                <span className="prefecture-puzzle__total-progress">
                  ぜんたい: {solvedTotal} / {totalPieces}
                </span>
                <button className="btn btn--ghost btn--small" onClick={handleChangeSelection}>
                  ← むずかしさをえらびなおす
                </button>
              </div>

              {isComplete && (
                <div className="learning-drill__feedback is-correct">
                  <p className="learning-drill__feedback-title">🎉 かんせい！ぜんぶのピースをおけたよ！</p>
                </div>
              )}

              <div className="prefecture-puzzle__panels">
                {panels
                  .filter((p) => p.kind === "mainland")
                  .map((panel) => (
                    <BoardPanel
                      key={panel.key}
                      label={panel.label}
                      pieces={panel.pieces}
                      kind={panel.kind}
                      snapDistanceM={SNAP_DISTANCE_M[selection.difficulty]}
                      onProgress={handleProgress}
                    />
                  ))}
              </div>

              {panels.some((p) => p.kind !== "mainland") && (
                <div className="prefecture-puzzle__secondary-panels">
                  {panels
                    .filter((p) => p.kind !== "mainland")
                    .map((panel) => (
                      <BoardPanel
                        key={panel.key}
                        label={panel.label}
                        pieces={panel.pieces}
                        kind={panel.kind}
                        snapDistanceM={SNAP_DISTANCE_M[selection.difficulty]}
                        onProgress={handleProgress}
                      />
                    ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
