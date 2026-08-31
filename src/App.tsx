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
import { SettingsPage } from "./components/SettingsPage";
import { WallpaperShop } from "./components/WallpaperShop";
import { useChatEngine } from "./hooks/useChatEngine";
import { usePointsWallet, type PointsWallet } from "./hooks/usePointsWallet";
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

// アプリ全体の文字色。localStorageに保存し、次回起動時も復元する
// (すべてこの端末内で完結し、外へは出ない)。設定ページ(SettingsPage)から変更する。
// --color-ink(通常の文字)と--color-ink-soft(補足文などの薄い文字)の2つを
// 上書きすることで、アプリ全体のほぼすべてのテキストに反映される。
const TEXT_COLOR_STORAGE_KEY = "appTextColor";
const DEFAULT_TEXT_COLOR = "#2b2a28"; // 元々の--color-inkと同じ

function loadStoredTextColor(): string {
  try {
    return localStorage.getItem(TEXT_COLOR_STORAGE_KEY) ?? DEFAULT_TEXT_COLOR;
  } catch {
    return DEFAULT_TEXT_COLOR;
  }
}

/** "#rrggbb" 形式の色から、補足文用に少し薄くしたrgba文字列を作る。 */
function toSoftColor(hex: string, alpha = 0.72): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return hex;
  const value = match[1];
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function App() {
  const [mode, setMode] = useState<AgeMode | null>(null);
  const [showPlusChallenge, setShowPlusChallenge] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showWallpaperShop, setShowWallpaperShop] = useState(false);
  const [textColor, setTextColor] = useState<string>(loadStoredTextColor);
  const wallet = usePointsWallet();

  // アプリ起動時、および設定変更のたびにドキュメントルートへ適用する。
  // どの画面を開いていても常に最新の値が効くようにするため。
  useEffect(() => {
    document.documentElement.style.setProperty("--color-ink", textColor);
    document.documentElement.style.setProperty("--color-ink-soft", toSoftColor(textColor));
  }, [textColor]);

  // 壁紙(アプリ全体のテーマ)。ポイント交換で開放した壁紙を選ぶと、
  // どの画面(チャット/学習ドリル/プラスチャレンジ/設定)を開いていても
  // 常にこの背景が反映される。src/index.cssの--wallpaper-imageを上書きする。
  useEffect(() => {
    const { src } = wallet.activeWallpaper;
    document.documentElement.style.setProperty(
      "--wallpaper-image",
      src ? `url("${src}")` : "none"
    );
  }, [wallet.activeWallpaper]);

  const handleTextColorChange = (color: string) => {
    setTextColor(color);
    try {
      localStorage.setItem(TEXT_COLOR_STORAGE_KEY, color);
    } catch {
      // 保存できなくても表示上の変更自体は継続する
    }
  };

  if (showSettings) {
    return (
      <div className="app-shell">
        <SettingsPage
          textColor={textColor}
          onTextColorChange={handleTextColorChange}
          onBack={() => setShowSettings(false)}
        />
      </div>
    );
  }

  if (showWallpaperShop) {
    return (
      <div className="app-shell">
        <WallpaperShop wallet={wallet} onBack={() => setShowWallpaperShop(false)} />
      </div>
    );
  }

  if (showPlusChallenge) {
    return (
      <div className="app-shell">
        <PlusChallenge onBack={() => setShowPlusChallenge(false)} onCorrect={wallet.addPoints} />
      </div>
    );
  }

  return mode === null ? (
    <div className="app-shell">
      <AgeGate
        onSelect={setMode}
        onPlusChallenge={() => setShowPlusChallenge(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenWallpaperShop={() => setShowWallpaperShop(true)}
        totalPoints={wallet.totalPoints}
      />
    </div>
  ) : (
    <ChatApp
      mode={mode}
      onChangeMode={() => setMode(null)}
      wallet={wallet}
      onOpenWallpaperShop={() => setShowWallpaperShop(true)}
    />
  );
}

function ChatApp({
  mode,
  onChangeMode,
  wallet,
  onOpenWallpaperShop,
}: {
  mode: AgeMode;
  onChangeMode: () => void;
  wallet: PointsWallet;
  onOpenWallpaperShop: () => void;
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
            className="points-badge"
            onClick={onOpenWallpaperShop}
            title="壁紙ショップを開く"
          >
            🌟 {wallet.totalPoints}
          </button>
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
                onAnswered={(subject, correct) => {
                  setDrillScores((prev) => ({
                    ...prev,
                    [subject]: {
                      correct: prev[subject].correct + (correct ? 1 : 0),
                      total: prev[subject].total + 1,
                    },
                  }));
                  if (correct) wallet.addPoints(POINTS_PER_CORRECT_ANSWER[mode]);
                }}
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
