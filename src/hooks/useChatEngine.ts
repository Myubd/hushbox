import { useCallback, useRef, useState } from "react";
import {
  advanceTutorSession,
  scanPii,
  sendMessage as sendMessageIpc,
  startTutorSession,
} from "../lib/tauriClient";
import type { AgeMode, ChatMessage, PiiType, PrivacySessionStats, TutorSessionInfo } from "../types";
import { MAX_INPUT_CHARS } from "../types";
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
  social_id: 0,
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

  // P1-8 Tutor State Machine: 宿題ヒントモードが有効な間、現在のsession_id/段階を保持する。
  // null = 通常のチャット(段階制御なし)。
  const [tutorSession, setTutorSession] = useState<TutorSessionInfo | null>(null);

  // Rustへ渡す会話履歴。ユーザー発話は常にredact済みテキストを保持する
  const historyRef = useRef<[string, string][]>([]);

  const resetConversationState = useCallback(() => {
    setMessages([]);
    historyRef.current = [];
    drillEngine.resetDrill();
    setTutorSession(null);
  }, [drillEngine.resetDrill]);

  const switchModel = useCallback(
    (modelId: string) => modelManager.switchModel(modelId, resetConversationState),
    [modelManager.switchModel, resetConversationState]
  );

  const previewPii = useCallback(async (text: string) => {
    if (!text.trim()) return { matches: [], redacted: text };
    return scanPii(text);
  }, []);

  /**
   * P1-8 Tutor State Machine: 宿題ヒントモードを開始する。
   * 段階(Understand)はRust側の状態機械が管理し、システムプロンプトへの
   * 指示文の追加(答えを言わない縛り等)もRust側(prepare_llm_input)が行う。
   * ここではセッションを開始し、案内メッセージをチャットに1件追加するだけ。
   */
  const startTutorMode = useCallback(async () => {
    const sessionId = newId();
    const info = await startTutorSession(sessionId);
    setTutorSession(info);
    setMessages((prev) => [
      ...prev,
      {
        id: newId(),
        role: "system-notice",
        content:
          "📚 宿題ヒントモードを始めるよ。どんな問題か教えてね。答えはすぐに言わずに、少しずつヒントを出すよ。",
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const stopTutorMode = useCallback(() => {
    setTutorSession(null);
  }, []);

  const sendMessage = useCallback(
    async (rawText: string, userAttempted: boolean = true) => {
      if (isGenerating || !rawText.trim()) return;

      // Rust側(commands.rs::MAX_INPUT_CHARS)の最終防衛線に達する前に、
      // フロントエンド側でも気づけるようにする。ここで弾いた場合はIPCすら
      // 呼ばず、わかりやすいシステム通知だけをチャットに追加する。
      if (rawText.length > MAX_INPUT_CHARS) {
        const noticeMsg: ChatMessage = {
          id: newId(),
          role: "system-notice",
          content: `メッセージが長すぎます(${rawText.length}文字)。${MAX_INPUT_CHARS}文字以内にしてから、もう一度送ってください。`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, noticeMsg]);
        return;
      }

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

      // 宿題ヒントモード中は、開始時にRust側で発行された現在の段階を
      // system promptへ追加してもらう(答えを言ってよい範囲をRust側で縛るため)。
      const activeTutorSession = tutorSession;

      let acc = "";
      try {
        await sendMessageIpc(
          mode,
          historyRef.current,
          rawText,
          {
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
              // 宿題ヒントモード中は、生徒の発言を受けて段階を1つ進める(または
              // 「試みなかった」場合は同じヒント段階に留まる)。次のsendMessage呼び出しで
              // この新しい段階がsystem promptに反映される。
              if (activeTutorSession) {
                void advanceTutorSession(activeTutorSession.sessionId, userAttempted).then(
                  setTutorSession
                );
              }
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
          },
          activeTutorSession?.stage
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [
      mode,
      isGenerating,
      tutorSession,
      drillEngine.consumePendingDrill,
      drillEngine.evaluateDrillReply,
      drillEngine.maybeTriggerDrill,
    ]
  );

  /**
   * 宿題ヒントモードの「わからない、もう一度ヒントがほしい」用ショートカット。
   * userAttempted=falseで送るため、ヒント段階は進まず同じ段階に留まる
   * (tutor_state.rsのnext()仕様どおり)。
   */
  const sendTutorStuck = useCallback(() => {
    void sendMessage("わからないので、もう一度ヒントをください。", false);
  }, [sendMessage]);

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
    tutorSession,
    startTutorMode,
    stopTutorMode,
    sendTutorStuck,
  };
}
