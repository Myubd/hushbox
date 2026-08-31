import { useEffect, useRef, useState } from "react";
import { AgeGate } from "./components/AgeGate";
import { ModelLoader } from "./components/ModelLoader";
import { ChatBubble } from "./components/ChatBubble";
import { ChatInput } from "./components/ChatInput";
import { LearningDrill } from "./components/LearningDrill";
import { LearningDrillSidebar } from "./components/LearningDrillSidebar";
import { PlusChallenge } from "./components/PlusChallenge";
import { ModelSettings } from "./components/ModelSettings";
import { PrivacyPanel } from "./components/PrivacyPanel";
import { useChatEngine } from "./hooks/useChatEngine";
import {
  AGE_MODES,
  DRILL_SUBJECTS,
  EMPTY_DRILL_SCORES,
  POINTS_PER_CORRECT_ANSWER,
  type AgeMode,
  type DrillSubject,
} from "./types";
import "./App.css";

const MODEL_DISPLAY_NAME = "Qwen2.5-1.5B-Instruct (Candle / GGUF)";
type MainTab = "chat" | "drill";

export default function App() {
  const [mode, setMode] = useState<AgeMode | null>(null);
  const [showPlusChallenge, setShowPlusChallenge] = useState(false);

  if (showPlusChallenge) {
    return (
      <div className="app-shell">
        <PlusChallenge onBack={() => setShowPlusChallenge(false)} />
      </div>
    );
  }

  return mode === null ? (
    <div className="app-shell">
      <AgeGate onSelect={setMode} onPlusChallenge={() => setShowPlusChallenge(true)} />
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
    drillStats,
    availableModels,
    currentModelId,
    initModel,
    switchModel,
    previewPii,
    sendMessage,
    clearSession,
  } = useChatEngine(mode);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [tab, setTab] = useState<MainTab>("chat");
  const [drillSubject, setDrillSubject] = useState<DrillSubject>("math");
  const [drillScores, setDrillScores] = useState(EMPTY_DRILL_SCORES);
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
          <button
            className="btn btn--ghost"
            onClick={() => setShowModelSettings((v) => !v)}
            disabled={isGenerating}
          >
            モデル設定
          </button>
          <button className="btn btn--ghost" onClick={clearSession}>
            会話をリセット
          </button>
          <button className="btn btn--ghost" onClick={onChangeMode}>
            モード変更
          </button>
        </div>
      </header>

      {showModelSettings && (
        <ModelSettings
          models={availableModels}
          currentModelId={currentModelId}
          disabled={isGenerating || modelProgress.status === "downloading" || modelProgress.status === "loading"}
          onSelect={(id) => {
            switchModel(id);
            setShowModelSettings(false);
          }}
          onClose={() => setShowModelSettings(false)}
        />
      )}

      <div className="main-tabs">
        <button
          className={`main-tabs__item${tab === "chat" ? " is-active" : ""}`}
          onClick={() => setTab("chat")}
        >
          💬 自由に質問(AI)
        </button>
        <button
          className={`main-tabs__item${tab === "drill" ? " is-active" : ""}`}
          onClick={() => setTab("drill")}
        >
          ✏️ 学習ドリル(AI不使用)
        </button>
      </div>

      <main className="app-main">
        {tab === "chat" ? (
          <>
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

            <PrivacyPanel
              stats={stats}
              drillStats={drillStats}
              modelName={
                availableModels.find((m) => m.id === currentModelId)?.label ?? MODEL_DISPLAY_NAME
              }
            />
          </>
        ) : (
          <>
            <section className="chat-panel">
              <LearningDrill
                mode={mode}
                subject={drillSubject}
                onSubjectChange={setDrillSubject}
                onAnswered={(subject, correct) =>
                  setDrillScores((prev) => ({
                    ...prev,
                    [subject]: {
                      correct: prev[subject].correct + (correct ? 1 : 0),
                      total: prev[subject].total + 1,
                    },
                  }))
                }
              />
            </section>

            <LearningDrillSidebar
              subjectInfo={DRILL_SUBJECTS.find((s) => s.id === drillSubject)!}
              score={drillScores[drillSubject]}
              points={drillScores[drillSubject].correct * POINTS_PER_CORRECT_ANSWER[mode]}
            />
          </>
        )}
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
