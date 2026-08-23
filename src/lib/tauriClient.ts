import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { ModelProgress, ScanResult } from "../types";

// このモジュールが唯一、Rustバックエンド(Tauri IPC)と話す場所。
// IPCはこのアプリ内部のプロセス間通信であり、ネットワークには一切出ない。

export async function initModel(
  onProgress: (p: ModelProgress) => void
): Promise<UnlistenFn> {
  const unlisten = await listen<{ stage: string; detail: string }>(
    "model-progress",
    (event) => {
      onProgress({
        status: event.payload.stage as ModelProgress["status"],
        detail: event.payload.detail,
      });
    }
  );
  // invoke自体は完了(またはエラー)まで待たず、進捗はイベント経由で受け取る
  invoke("init_model").catch((err) => {
    onProgress({ status: "error", detail: String(err) });
  });
  return unlisten;
}

export async function scanPii(text: string): Promise<ScanResult> {
  return invoke<ScanResult>("scan_pii", { text });
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
