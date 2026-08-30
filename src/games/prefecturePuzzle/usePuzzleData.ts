import { useEffect, useRef, useState } from "react";
import type { PuzzleData, PuzzleDifficulty, PuzzleRegion } from "./types";
import { PUZZLE_REGION_SLUGS } from "./types";

const BASE_PATH = "/plus-challenge/prefecture-puzzle";

function urlFor(difficulty: PuzzleDifficulty, region: PuzzleRegion | null): string {
  if (difficulty === "easy") return `${BASE_PATH}/easy_japan_prefectures.json`;
  if (difficulty === "hard") return `${BASE_PATH}/hard_japan_cities.json`;
  // normal は地方ごとのファイル。regionが決まるまでは呼び出し側でfetchしない想定。
  // 実ファイル名はASCII化されたスラッグ(例: 関東 -> kanto)を使う。
  const slug = region ? PUZZLE_REGION_SLUGS[region] : "";
  return `${BASE_PATH}/normal_${slug}.json`;
}

export type PuzzleDataStatus =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: PuzzleData };

/**
 * 難易度(+ normalの場合は地方)に応じたパズルデータを取得するフック。
 * 一度読み込んだデータはメモリ上にキャッシュし、同じ難易度/地方に戻ってきたときの
 * 再ダウンロードを避ける(hardは43MBあるため特に重要)。
 */
export function usePuzzleData(
  difficulty: PuzzleDifficulty,
  region: PuzzleRegion | null
): PuzzleDataStatus {
  const cache = useRef<Map<string, PuzzleData>>(new Map());
  const [state, setState] = useState<PuzzleDataStatus>({ status: "idle" });

  useEffect(() => {
    if (difficulty === "normal" && !region) {
      setState({ status: "idle" });
      return;
    }

    const url = urlFor(difficulty, region);
    const cached = cache.current.get(url);
    if (cached) {
      setState({ status: "ready", data: cached });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`データの取得に失敗しました (HTTP ${res.status})`);
        return res.json() as Promise<PuzzleData>;
      })
      .then((data) => {
        if (cancelled) return;
        cache.current.set(url, data);
        setState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "データの読み込み中にエラーが発生しました";
        setState({ status: "error", message });
      });

    return () => {
      cancelled = true;
    };
  }, [difficulty, region]);

  return state;
}
