import { useCallback, useRef, useState } from "react";
import { initModel, scanPii, sendMessage as sendMessageIpc } from "../lib/tauriClient";
import type {
  AgeMode,
  ChatMessage,
  ModelProgress,
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

function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
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

  // Rustへ渡す会話履歴。ユーザー発話は常にredact済みテキストを保持する
  const historyRef = useRef<[string, string][]>([]);

  const bootstrapped = useRef(false);

  const doInitModel = useCallback(async () => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    setModelProgress({ status: "downloading", detail: "モデルを確認しています…" });
    await initModel((p) => setModelProgress(p));
  }, []);

  const previewPii = useCallback(async (text: string) => {
    if (!text.trim()) return { matches: [], redacted: text };
    return scanPii(text);
  }, []);

  const sendMessage = useCallback(
    async (rawText: string) => {
      if (isGenerating || !rawText.trim()) return;

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
    [mode, isGenerating]
  );

  const clearSession = useCallback(() => {
    setMessages([]);
    historyRef.current = [];
    setStats({
      messagesSent: 0,
      piiCaught: 0,
      piiByType: { ...EMPTY_PII_COUNTS },
      sessionStartedAt: Date.now(),
    });
  }, []);

  return {
    messages,
    modelProgress,
    isGenerating,
    stats,
    initModel: doInitModel,
    previewPii,
    sendMessage,
    clearSession,
  };
}
