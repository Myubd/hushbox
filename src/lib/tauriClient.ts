import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  DrillResult,
  DrillScenario,
  DrillSubject,
  DrillUnit,
  LearningCheckResult,
  LearningProblem,
  ModelProgress,
  ModelSpec,
  PiiType,
  ScanResult,
} from "../types";

// このモジュールが唯一、Rustバックエンド(Tauri IPC)と話す場所。
// IPCはこのアプリ内部のプロセス間通信であり、ネットワークには一切出ない。

/**
 * "model-progress" イベントを1回だけ購読する。呼び出し側(フックのマウント時)で
 * 一度だけ呼び、以降はloadModel/switchModelを何度呼んでも同じリスナーで進捗を受け取る。
 * (initModelを呼ぶたびにlisten()し直すと、モデル切り替えのたびにリスナーが
 * 積み重なってしまうため分離している)
 */
export async function listenModelProgress(
  onProgress: (p: ModelProgress) => void
): Promise<UnlistenFn> {
  return listen<{ stage: string; detail: string }>("model-progress", (event) => {
    onProgress({
      status: event.payload.stage as ModelProgress["status"],
      detail: event.payload.detail,
    });
  });
}

/** モデルを読み込む(初回起動時用)。modelId省略時はデフォルトモデル。 */
export async function loadModel(modelId?: string): Promise<void> {
  await invoke("init_model", { modelId: modelId ?? null });
}

/** 選択可能なモデルの一覧を取得する。 */
export async function listModels(): Promise<ModelSpec[]> {
  return invoke<ModelSpec[]>("list_models");
}

/** 現在読み込まれているモデルのid(未読込ならnull)。 */
export async function getCurrentModel(): Promise<string | null> {
  return invoke<string | null>("get_current_model");
}

/** 読み込み済みモデルを別のモデルへ切り替える。進捗はlistenModelProgressで受け取る。 */
export async function switchModel(modelId: string): Promise<void> {
  await invoke("switch_model", { modelId });
}

export async function scanPii(text: string): Promise<ScanResult> {
  return invoke<ScanResult>("scan_pii", { text });
}

/**
 * SNS/AIリテラシー訓練シナリオを1つ取得する。
 * モデル(Qwen)の読込状態に関係なく呼び出せる(LLM推論を使わない固定シナリオ)。
 */
export async function getDrillScenario(mode: string): Promise<DrillScenario | null> {
  return invoke<DrillScenario | null>("get_drill_scenario", { mode });
}

/** 訓練シナリオへの返答を評価し、フィードバックを取得する。 */
export async function evaluateDrillResponse(
  category: PiiType,
  reply: string
): Promise<DrillResult> {
  return invoke<DrillResult>("evaluate_drill_response", { category, reply });
}

/**
 * 学習ドリル(国語・算数・理科・社会・英語・情報)の新しい問題を1問取得する。
 * AI(Qwen)を一切使わないため、モデル未読込でも呼び出せる。
 * `unit`省略時は科目内の「すべて」からランダムに出題する。
 */
export async function nextLearningProblem(
  subject: DrillSubject,
  mode: string,
  unit?: string
): Promise<LearningProblem> {
  return invoke("next_learning_problem", { subject, mode, unit: unit ?? null });
}

/** 指定した科目で選択できる単元の一覧を取得する(先頭は必ず「すべて」)。 */
export async function listLearningUnits(subject: DrillSubject): Promise<DrillUnit[]> {
  return invoke<DrillUnit[]>("list_learning_units", { subject });
}

/** 学習ドリルの回答を採点する。正解はこの呼び出しの結果でのみ判明する。 */
export async function checkLearningAnswer(
  problemId: string,
  answer: string
): Promise<LearningCheckResult> {
  return invoke("check_learning_answer", { problemId, answer });
}

export interface StreamHandlers {
  onChunk: (token: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

/**
 * メッセージ送信。ストリーミング応答は "chat-chunk" / "chat-done" イベントで届く。
 * 戻り値のPromiseは生成が完了した時点で解決し、そのときのPII検出結果を返す。
 */
export async function sendMessage(
  mode: string,
  history: [string, string][],
  text: string,
  handlers: StreamHandlers
): Promise<ScanResult> {
  const unlistenChunk = await listen<string>("chat-chunk", (event) => {
    handlers.onChunk(event.payload);
  });
  const unlistenDone = await listen("chat-done", () => {
    handlers.onDone();
  });

  try {
    const result = await invoke<ScanResult>("send_message", {
      mode,
      history,
      text,
    });
    return result;
  } catch (err) {
    handlers.onError(String(err));
    throw err;
  } finally {
    unlistenChunk();
    unlistenDone();
  }
}
