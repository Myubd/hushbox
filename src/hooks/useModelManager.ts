import { useCallback, useEffect, useRef, useState } from "react";
import {
  listenModelProgress,
  listModels,
  loadModel,
  switchModel as switchModelIpc,
} from "../lib/tauriClient";
import type { ModelProgress, ModelSpec } from "../types";

/**
 * モデルのダウンロード/読込/切替と、その進捗表示だけに責務を絞ったフック。
 * 会話(チャット)やSNS/AIリテラシー訓練の状態は一切持たない。
 *
 * 以前は useChatEngine 1つにチャット・訓練・モデル管理が全部詰め込まれていて
 * 見通しが悪かったため、責務ごとに3つのフック(useModelManager /
 * useDrillEngine / useChatEngine)に分割した際の1つ。
 */
export function useModelManager() {
  const [modelProgress, setModelProgress] = useState<ModelProgress>({
    status: "idle",
    detail: "",
  });
  const [availableModels, setAvailableModels] = useState<ModelSpec[]>([]);
  const [currentModelId, setCurrentModelId] = useState<string | null>(null);

  const bootstrapped = useRef(false);
  const progressUnlistenRef = useRef<(() => void) | null>(null);

  // "model-progress" イベントは一度だけ購読し、以降の読込/切り替えすべてで使い回す
  useEffect(() => {
    let cancelled = false;
    listenModelProgress((p) => {
      if (!cancelled) setModelProgress(p);
    }).then((unlisten) => {
      if (cancelled) {
        unlisten();
      } else {
        progressUnlistenRef.current = unlisten;
      }
    });
    return () => {
      cancelled = true;
      progressUnlistenRef.current?.();
    };
  }, []);

  useEffect(() => {
    listModels()
      .then(setAvailableModels)
      .catch((err) => console.error("モデル一覧の取得に失敗しました", err));
  }, []);

  const initModel = useCallback(async () => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    setModelProgress({ status: "downloading", detail: "モデルを確認しています…" });
    try {
      await loadModel();
      const models = await listModels();
      // デフォルトモデルのidを確定させる(先頭要素がqwen1_5b)
      setCurrentModelId((prev) => prev ?? models[0]?.id ?? null);
    } catch (err) {
      setModelProgress({ status: "error", detail: String(err) });
    }
  }, []);

  /**
   * モデルを切り替える。切替に成功した場合のみ `onSwitched` を呼ぶので、
   * 呼び出し側(useChatEngine)はここで会話履歴のリセットなどを行える。
   * (モデル管理フック自身は会話の状態を知らないため、直接リセットはしない)
   */
  const switchModel = useCallback(
    async (modelId: string, onSwitched?: () => void) => {
      if (modelId === currentModelId) return;
      setModelProgress({ status: "downloading", detail: "モデルを切り替えています…" });
      try {
        await switchModelIpc(modelId);
        setCurrentModelId(modelId);
        onSwitched?.();
      } catch (err) {
        setModelProgress({ status: "error", detail: String(err) });
      }
    },
    [currentModelId]
  );

  return {
    modelProgress,
    availableModels,
    currentModelId,
    initModel,
    switchModel,
  };
}
