import { useCallback, useEffect, useRef, useState } from "react";
import {
  evaluateDrillResponse,
  getDrillScenario,
  listenModelProgress,
  listModels,
  loadModel,
  scanPii,
  sendMessage as sendMessageIpc,
  switchModel as switchModelIpc,
} from "../lib/tauriClient";
import type {
  AgeMode,
  ChatMessage,
  DrillScenario,
  ModelProgress,
  ModelSpec,
  PiiType,
  PrivacySessionStats,
} from "../types";

const EMPTY_PII_COUNTS: Record<PiiType, number> = {
  name: 0,
  address: 0,
  phone: 0,
  email: 0,
  school: 0,
  postal: 0,
};

// SNS/AIリテラシー訓練の発生頻度調整。
// 「毎回起きる」と警戒されて意味が薄れ、「滅多に起きない」と練習にならないため、
// 通常のやり取りを何回か挟んでから、確率的に発生させる。
const DRILL_MIN_TURNS_BETWEEN = 2;
const DRILL_PROBABILITY = 0.55;

function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export interface DrillSessionStats {
  attempts: number;
  sharedPii: number;
}

export function useChatEngine(mode: AgeMode) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [modelProgress, setModelProgress] = useState<ModelProgress>({
    status: "idle",
    detail: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState<PrivacySessionStats>({
    messagesSent: 0,
    piiCaught: 0,
    piiByType: { ...EMPTY_PII_COUNTS },
    sessionStartedAt: Date.now(),
  });
  const [drillStats, setDrillStats] = useState<DrillSessionStats>({
    attempts: 0,
    sharedPii: 0,
  });
  const [availableModels, setAvailableModels] = useState<ModelSpec[]>([]);
  const [currentModelId, setCurrentModelId] = useState<string | null>(null);

  // Rustへ渡す会話履歴。ユーザー発話は常にredact済みテキストを保持する
  const historyRef = useRef<[string, string][]>([]);

  // 現在アクティブな訓練シナリオ。nullでなければ、次のユーザー入力は
  // 通常のLLM送信ではなく、この訓練への返答として扱う。
  const pendingDrillRef = useRef<DrillScenario | null>(null);
  const turnsSinceDrillRef = useRef(0);

  const bootstrapped = useRef(false);
  const progressUnlistenRef = useRef<(() => void) | null>(null);

  // "model-progress" イベントは一度だけ購読し、以降の読込/切り替えすべてで使い回す
  useEffect(() => {
    let cancelled = false;
    listenModelProgress((p) => {
      if (!cancelled) setModelProgress(p);
    }).then((unlisten) => {
      if (cancelled) {
        unlisten();
      } else {
        progressUnlistenRef.current = unlisten;
      }
    });
    return () => {
      cancelled = true;
      progressUnlistenRef.current?.();
    };
  }, []);

  useEffect(() => {
    listModels()
      .then(setAvailableModels)
      .catch((err) => console.error("モデル一覧の取得に失敗しました", err));
  }, []);

  const doInitModel = useCallback(async () => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    setModelProgress({ status: "downloading", detail: "モデルを確認しています…" });
    try {
      await loadModel();
      const models = await listModels();
      // デフォルトモデルのidを確定させる(先頭要素がqwen1_5b)
      setCurrentModelId((prev) => prev ?? models[0]?.id ?? null);
    } catch (err) {
      setModelProgress({ status: "error", detail: String(err) });
    }
  }, []);

  /** モデルを切り替える。切り替え後は会話をリセットする(履歴の文脈がモデルをまたぐと混乱しやすいため)。 */
  const switchModel = useCallback(async (modelId: string) => {
    if (modelId === currentModelId) return;
    setModelProgress({ status: "downloading", detail: "モデルを切り替えています…" });
    try {
      await switchModelIpc(modelId);
      setCurrentModelId(modelId);
      setMessages([]);
      historyRef.current = [];
      pendingDrillRef.current = null;
      turnsSinceDrillRef.current = 0;
    } catch (err) {
      setModelProgress({ status: "error", detail: String(err) });
    }
  }, [currentModelId]);

  const previewPii = useCallback(async (text: string) => {
    if (!text.trim()) return { matches: [], redacted: text };
    return scanPii(text);
  }, []);

  // 通常のAI応答が完了するたびに呼ぶ。条件を満たしたら訓練シナリオを
  // 「AIからの1メッセージ」として自然に会話に挿入する。
  const maybeTriggerDrill = useCallback(async () => {
    turnsSinceDrillRef.current += 1;
    if (turnsSinceDrillRef.current < DRILL_MIN_TURNS_BETWEEN) return;
    if (Math.random() > DRILL_PROBABILITY) return;

    const scenario = await getDrillScenario(mode);
    if (!scenario) return;

    turnsSinceDrillRef.current = 0;
    pendingDrillRef.current = scenario;

    setMessages((prev) => [
      ...prev,
      {
        id: newId(),
        role: "assistant",
        content: scenario.aiMessage,
        timestamp: Date.now(),
      },
    ]);
  }, [mode]);

  const sendMessage = useCallback(
    async (rawText: string) => {
      if (isGenerating || !rawText.trim()) return;

      // 訓練シナリオへの返答として扱うケース(通常のLLM送信は行わない)
      const activeDrill = pendingDrillRef.current;
      if (activeDrill) {
        pendingDrillRef.current = null;

        const userMsg: ChatMessage = {
          id: newId(),
          role: "user",
          content: rawText,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMsg]);

        const result = await evaluateDrillResponse(activeDrill.category, rawText);

        setDrillStats((prev) => ({
          attempts: prev.attempts + 1,
          sharedPii: prev.sharedPii + (result.sharedPii ? 1 : 0),
        }));

        const noticeMsg: ChatMessage = {
          id: newId(),
          role: "system-notice",
          content: `${result.feedbackTitle}\n${result.feedbackBody}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, noticeMsg]);
        return;
      }

      const scan = await scanPii(rawText);

      const userMsg: ChatMessage = {
        id: newId(),
        role: "user",
        content: rawText,
        piiFlags: scan.matches,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setStats((prev) => {
        const byType = { ...prev.piiByType };
        for (const m of scan.matches) byType[m.type] += 1;
        return {
          ...prev,
          messagesSent: prev.messagesSent + 1,
          piiCaught: prev.piiCaught + scan.matches.length,
          piiByType: byType,
        };
      });

      const assistantId = newId();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", timestamp: Date.now() },
      ]);
      setIsGenerating(true);

      let acc = "";
      try {
        await sendMessageIpc(mode, historyRef.current, rawText, {
          onChunk: (token) => {
            acc += token;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m))
            );
          },
          onDone: () => {
            historyRef.current = [
              ...historyRef.current,
              ["user", scan.redacted],
              ["assistant", acc],
            ];
            void maybeTriggerDrill();
          },
          onError: (message) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: `(エラーが発生しました: ${message})` }
                  : m
              )
            );
          },
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [mode, isGenerating, maybeTriggerDrill]
  );

  const clearSession = useCallback(() => {
    setMessages([]);
    historyRef.current = [];
    pendingDrillRef.current = null;
    turnsSinceDrillRef.current = 0;
    setStats({
      messagesSent: 0,
      piiCaught: 0,
      piiByType: { ...EMPTY_PII_COUNTS },
      sessionStartedAt: Date.now(),
    });
    setDrillStats({ attempts: 0, sharedPii: 0 });
  }, []);

  return {
    messages,
    modelProgress,
    isGenerating,
    stats,
    drillStats,
    availableModels,
    currentModelId,
    initModel: doInitModel,
    switchModel,
    previewPii,
    sendMessage,
    clearSession,
  };
}
