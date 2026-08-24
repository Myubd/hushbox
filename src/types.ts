// 学年帯モード
export type AgeMode = "low" | "mid" | "junior";

export interface AgeModeInfo {
  id: AgeMode;
  label: string;
  subLabel: string;
  description: string;
}

export const AGE_MODES: AgeModeInfo[] = [
  {
    id: "low",
    label: "1〜3年生",
    subLabel: "たいけんモード",
    description: "AIとあそびながら、まちがえることもあるって知ろう",
  },
  {
    id: "mid",
    label: "4〜6年生",
    subLabel: "しゅうかんモード",
    description: "自分で考えてから、AIに聞くくせをつけよう",
  },
  {
    id: "junior",
    label: "中学生",
    subLabel: "批判的思考モード",
    description: "AIの答えを鵜呑みにせず、根拠を問い返す練習をしよう",
  },
];

// チャットメッセージ
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system-notice";
  content: string;
  timestamp: number;
  piiFlags?: PiiMatch[];
}

// PII検出結果(Rust側のpii_guard::PiiMatchとシリアライズ形式を揃えている)
export type PiiType = "name" | "address" | "phone" | "email" | "school" | "postal";

export interface PiiMatch {
  type: PiiType;
  text: string;
}

export interface ScanResult {
  matches: PiiMatch[];
  redacted: string;
}

export const PII_LABELS: Record<PiiType, string> = {
  name: "名前",
  address: "住所",
  phone: "電話番号",
  email: "メールアドレス",
  school: "学校名",
  postal: "郵便番号",
};

// SNS/AIリテラシー訓練(Rust側 safety_drill.rs と対応)
export interface DrillScenario {
  id: string;
  category: PiiType;
  aiMessage: string;
}

export interface DrillResult {
  sharedPii: boolean;
  matches: PiiMatch[];
  feedbackTitle: string;
  feedbackBody: string;
}

// モデルの読み込み状態(Rust側 llm_engine::LoadProgress の stage と対応)
export type ModelStatus = "idle" | "downloading" | "loading" | "ready" | "error";

export interface ModelProgress {
  status: ModelStatus;
  detail: string;
}

// 切り替え可能なモデルの定義(Rust側 llm_engine::ModelSpec と対応)
export interface ModelSpec {
  id: string;
  label: string;
  repo: string;
  file: string;
  tokenizerRepo: string;
  tokenizerFile: string;
  approxSizeMb: number;
  note: string;
}

// 学習ドリル(国語・算数・理科・社会・英語・情報。AI不使用、Rust側で確定的に生成・採点)
export type DrillSubject = "arithmetic" | "kanji" | "science" | "social" | "english" | "info";

export interface SubjectInfo {
  id: DrillSubject;
  label: string;
  icon: string;
}

export const DRILL_SUBJECTS: SubjectInfo[] = [
  { id: "arithmetic", label: "算数", icon: "🔢" },
  { id: "kanji", label: "国語(漢字)", icon: "📖" },
  { id: "science", label: "理科", icon: "🔬" },
  { id: "social", label: "社会", icon: "🗾" },
  { id: "english", label: "英語", icon: "🔤" },
  { id: "info", label: "情報", icon: "💻" },
];

export type LearningProblem =
  | { kind: "arithmetic"; id: string; question: string }
  | { kind: "choice"; id: string; subject: string; question: string; choices: string[] };

export interface LearningCheckResult {
  correct: boolean;
  correctAnswer: string;
  explanation: string;
}

// 単元(例: 算数 → 足し算/引き算/掛け算/割り算)。先頭は必ず id="mixed"(すべて)。
export interface DrillUnit {
  id: string;
  label: string;
}

// プライバシーログ(すべてこの端末内で完結。外部送信は一切なし)
export interface PrivacySessionStats {
  messagesSent: number;
  piiCaught: number;
  piiByType: Record<PiiType, number>;
  sessionStartedAt: number;
}
