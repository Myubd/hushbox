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

// モデルの読み込み状態(Rust側 llm_engine::LoadProgress の stage と対応)
export type ModelStatus = "idle" | "downloading" | "loading" | "ready" | "error";

export interface ModelProgress {
  status: ModelStatus;
  detail: string;
}

// プライバシーログ(すべてこの端末内で完結。外部送信は一切なし)
export interface PrivacySessionStats {
  messagesSent: number;
  piiCaught: number;
  piiByType: Record<PiiType, number>;
  sessionStartedAt: number;
}
