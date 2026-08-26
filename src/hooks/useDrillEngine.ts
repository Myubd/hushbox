import { useCallback, useRef, useState } from "react";
import { evaluateDrillResponse, getDrillScenario } from "../lib/tauriClient";
import type { AgeMode, DrillScenario, DrillResult, PiiType } from "../types";

// SNS/AIリテラシー訓練の発生頻度調整。
// 「毎回起きる」と警戒されて意味が薄れ、「滅多に起きない」と練習にならないため、
// 通常のやり取りを何回か挟んでから、確率的に発生させる。
const DRILL_MIN_TURNS_BETWEEN = 2;
const DRILL_PROBABILITY = 0.55;

export interface DrillSessionStats {
  attempts: number;
  /** 個人情報を渡してしまった(safe=falseだった)回数 */
  unsafeCount: number;
}

const INITIAL_DRILL_STATS: DrillSessionStats = { attempts: 0, unsafeCount: 0 };

/**
 * SNS/AIリテラシー訓練(不意にPIIを聞き出そうとするシナリオ)の
 * 発生タイミング判定・採点・集計だけに責務を絞ったフック。
 *
 * メッセージ一覧(`messages`)への追加はこのフックの外(useChatEngine)が行う。
 * このフックは「今、訓練シナリオがアクティブか」「発生させるべきか」
 * 「返答をどう採点するか」という判断ロジックと状態だけを持つ。
 */
export function useDrillEngine(mode: AgeMode) {
  const [drillStats, setDrillStats] = useState<DrillSessionStats>(INITIAL_DRILL_STATS);

  // 現在アクティブな訓練シナリオ。nullでなければ、次のユーザー入力は
  // 通常のLLM送信ではなく、この訓練への返答として扱うべき、という意味。
  const pendingDrillRef = useRef<DrillScenario | null>(null);
  const turnsSinceDrillRef = useRef(0);

  /**
   * アクティブな訓練シナリオがあれば取り出し、状態をクリアして返す。
   * 呼び出し側はこれで「今回のユーザー入力は訓練への返答か」を判定できる。
   */
  const consumePendingDrill = useCallback((): DrillScenario | null => {
    const scenario = pendingDrillRef.current;
    pendingDrillRef.current = null;
    return scenario;
  }, []);

  /**
   * 通常のAI応答が完了するたびに呼ぶ。条件を満たしたら訓練シナリオを取得し、
   * 「AIからの1メッセージ」として自然に会話へ挿入できるよう返す(挿入自体は
   * 呼び出し側の責務)。条件を満たさない/シナリオが無い場合はnull。
   */
  const maybeTriggerDrill = useCallback(async (): Promise<DrillScenario | null> => {
    turnsSinceDrillRef.current += 1;
    if (turnsSinceDrillRef.current < DRILL_MIN_TURNS_BETWEEN) return null;
    if (Math.random() > DRILL_PROBABILITY) return null;

    const scenario = await getDrillScenario(mode);
    if (!scenario) return null;

    turnsSinceDrillRef.current = 0;
    pendingDrillRef.current = scenario;
    return scenario;
  }, [mode]);

  /** 訓練シナリオへの返答を採点し、集計を更新した上で結果を返す。 */
  const evaluateDrillReply = useCallback(
    async (category: PiiType, rawText: string): Promise<DrillResult> => {
      const result = await evaluateDrillResponse(category, rawText);
      setDrillStats((prev) => ({
        attempts: prev.attempts + 1,
        unsafeCount: prev.unsafeCount + (result.safe ? 0 : 1),
      }));
      return result;
    },
    []
  );

  const resetDrill = useCallback(() => {
    pendingDrillRef.current = null;
    turnsSinceDrillRef.current = 0;
    setDrillStats(INITIAL_DRILL_STATS);
  }, []);

  return {
    drillStats,
    consumePendingDrill,
    maybeTriggerDrill,
    evaluateDrillReply,
    resetDrill,
  };
}
