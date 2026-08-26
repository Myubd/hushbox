import { useCallback, useRef, useState } from "react";
import { scanPii, sendMessage as sendMessageIpc } from "../lib/tauriClient";
import type { AgeMode, ChatMessage, PiiType, PrivacySessionStats } from "../types";
import { useModelManager } from "./useModelManager";
import { useDrillEngine } from "./useDrillEngine";

export type { DrillSessionStats } from "./useDrillEngine";

const EMPTY_PII_COUNTS: Record<PiiType, number> = {
  name: 0,
  address: 0,
  phone: 0,
  email: 0,
  school: 0,
  postal: 0,
};

function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function initialStats(): PrivacySessionStats {
  return {
    messagesSent: 0,
    piiCaught: 0,
    piiByType: { ...EMPTY_PII_COUNTS },
    sessionStartedAt: Date.now(),
  };
}

/**
 * 会話(チャット)の進行だけに責務を絞ったフック。
 * モデルの読込/切替は useModelManager、SNS/AIリテラシー訓練の発生・採点は
 * useDrillEngine にそれぞれ委譲し、ここでは「ユーザー入力をどちらに
 * ルーティングするか」「メッセージ一覧・PII統計・会話履歴の管理」だけを行う。
 *
 * 公開している戻り値の形は分割前と同じにしてあるため、呼び出し側(App.tsx)の
 * 変更は不要。
 */
export function useChatEngine(mode: AgeMode) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState<PrivacySessionStats>(initialStats());

  const modelManager = useModelManager();
  const drillEngine = useDrillEngine(mode);

  // Rustへ渡す会話履歴。ユーザー発話は常にredact済みテキストを保持する
  const historyRef = useRef<[string, string][]>([]);

  const resetConversationState = useCallback(() => {
    setMessages([]);
    historyRef.current = [];
    drillEngine.resetDrill();
  }, [drillEngine.resetDrill]);

  const switchModel = useCallback(
    (modelId: string) => modelManager.switchModel(modelId, resetConversationState),
    [modelManager.switchModel, resetConversationState]
  );

  const previewPii = useCallback(async (text: string) => {
    if (!text.trim()) return { matches: [], redacted: text };
    return scanPii(text);
  }, []);

  const sendMessage = useCallback(
    async (rawText: string) => {
      if (isGenerating || !rawText.trim()) return;

      // 訓練シナリオへの返答として扱うケース(通常のLLM送信は行わない)
      const activeDrill = drillEngine.consumePendingDrill();
      if (activeDrill) {
        const userMsg: ChatMessage = {
          id: newId(),
          role: "user",
          content: rawText,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMsg]);

        const result = await drillEngine.evaluateDrillReply(activeDrill.category, rawText);

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
            void drillEngine.maybeTriggerDrill().then((scenario) => {
              if (!scenario) return;
              setMessages((prev) => [
                ...prev,
                {
                  id: newId(),
                  role: "assistant",
                  content: scenario.aiMessage,
                  timestamp: Date.now(),
                },
              ]);
            });
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
    [mode, isGenerating, drillEngine.consumePendingDrill, drillEngine.evaluateDrillReply, drillEngine.maybeTriggerDrill]
  );

  const clearSession = useCallback(() => {
    resetConversationState();
    setStats(initialStats());
  }, [resetConversationState]);

  return {
    messages,
    modelProgress: modelManager.modelProgress,
    isGenerating,
    stats,
    drillStats: drillEngine.drillStats,
    availableModels: modelManager.availableModels,
    currentModelId: modelManager.currentModelId,
    initModel: modelManager.initModel,
    switchModel,
    previewPii,
    sendMessage,
    clearSession,
  };
}
