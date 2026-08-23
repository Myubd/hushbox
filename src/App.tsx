import { useEffect, useRef, useState } from "react";
import { AgeGate } from "./components/AgeGate";
import { ModelLoader } from "./components/ModelLoader";
import { ChatBubble } from "./components/ChatBubble";
import { ChatInput } from "./components/ChatInput";
import { PrivacyPanel } from "./components/PrivacyPanel";
import { useChatEngine } from "./hooks/useChatEngine";
import { AGE_MODES, type AgeMode } from "./types";
import "./App.css";

const MODEL_DISPLAY_NAME = "Qwen2.5-1.5B-Instruct (Candle / GGUF)";

export default function App() {
  const [mode, setMode] = useState<AgeMode | null>(null);

  return mode === null ? (
    <div className="app-shell">
      <AgeGate onSelect={setMode} />
    </div>
  ) : (
    <ChatApp mode={mode} onChangeMode={() => setMode(null)} />
  );
}

function ChatApp({
  mode,
  onChangeMode,
}: {
  mode: AgeMode;
  onChangeMode: () => void;
}) {
  const {
    messages,
    modelProgress,
    isGenerating,
    stats,
    initModel,
    previewPii,
    sendMessage,
    clearSession,
  } = useChatEngine(mode);

  const scrollRef = useRef<HTMLDivElement>(null);
  const modeInfo = AGE_MODES.find((m) => m.id === mode)!;

  useEffect(() => {
    initModel();
  }, [initModel]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const isReady = modelProgress.status === "ready";

  return (
    <div className="app-shell app-shell--chat">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="brand-mark brand-mark--small" aria-hidden="true">
            ✈
          </span>
          <div>
            <p className="app-header__title">プライバシー・バディ</p>
            <p className="app-header__mode">{modeInfo.subLabel}</p>
          </div>
        </div>
        <div className="app-header__actions">
          <button className="btn btn--ghost" onClick={clearSession}>
            会話をリセット
          </button>
          <button className="btn btn--ghost" onClick={onChangeMode}>
            モード変更
          </button>
        </div>
      </header>

      <main className="app-main">
        <section className="chat-panel">
          {!isReady ? (
            <ModelLoader progress={modelProgress} onRetry={initModel} />
          ) : (
            <>
              <div className="chat-scroll" ref={scrollRef}>
                {messages.length === 0 && <EmptyState mode={mode} />}
                {messages.map((m) => (
                  <ChatBubble key={m.id} message={m} />
                ))}
              </div>
              <ChatInput
                mode={mode}
                disabled={isGenerating}
                previewPii={previewPii}
                onSend={sendMessage}
              />
            </>
          )}
        </section>

        <PrivacyPanel stats={stats} modelName={MODEL_DISPLAY_NAME} />
      </main>
    </div>
  );
}

function EmptyState({ mode }: { mode: AgeMode }) {
  const messages: Record<AgeMode, { title: string; body: string }> = {
    low: {
      title: "こんにちは!",
      body: "なにか きいてみてね。まちがえることも あるけど、それも AIの べんきょうだよ。",
    },
    mid: {
      title: "まず自分で考えてみよう",
      body: "調べたいことを入力する前に、頭の中で予想を立ててみよう。それからAIに聞いて、答え合わせをするのがコツだよ。",
    },
    junior: {
      title: "AIの答えは鵜呑みにしない",
      body: "質問したら、AIの答えに「なぜそう言えるの?」と問い返してみよう。根拠を確認する練習にもなるよ。",
    },
  };
  const { title, body } = messages[mode];
  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      <p className="empty-state__body">{body}</p>
    </div>
  );
}
