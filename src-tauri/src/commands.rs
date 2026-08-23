use tauri::{AppHandle, Emitter, State};
use tokio::sync::mpsc;

use crate::llm_engine::{GenerationChunk, LlmEngine, LoadProgress, SharedEngine};
use crate::pii_guard;
use crate::prompts::system_prompt_for;

/// 送信前のPII検出プレビュー(サーバーではなく、この端末内のRustコードが処理)
#[tauri::command]
pub fn scan_pii(text: String) -> pii_guard::ScanResult {
    pii_guard::scan(&text)
}

/// モデルの初期化(初回はダウンロード、以降はローカルキャッシュから読込)。
/// 進捗は "model-progress" イベントでフロントエンドへストリーミング通知する。
#[tauri::command]
pub async fn init_model(app: AppHandle, engine: State<'_, SharedEngine>) -> Result<(), String> {
    eprintln!("[commands] init_model コマンドが呼び出されました");
    {
        let guard = engine.lock().await;
        if guard.is_some() {
            let _ = app.emit(
                "model-progress",
                LoadProgress {
                    stage: "ready".into(),
                    detail: "準備完了".into(),
                },
            );
            return Ok(());
        }
    }

    let (tx, mut rx) = mpsc::unbounded_channel::<LoadProgress>();
    let app_for_progress = app.clone();
    tokio::spawn(async move {
        while let Some(p) = rx.recv().await {
            let _ = app_for_progress.emit("model-progress", p);
        }
    });

    match LlmEngine::load(tx).await {
        Ok(loaded) => {
            let mut guard = engine.lock().await;
            *guard = Some(loaded);
            Ok(())
        }
        Err(e) => {
            let _ = app.emit(
                "model-progress",
                LoadProgress {
                    stage: "error".into(),
                    detail: e.to_string(),
                },
            );
            Err(e.to_string())
        }
    }
}

/// 1往復分のチャット履歴(ロール, 内容)
pub type HistoryTurn = (String, String);

/// メッセージ送信。PII検出→匿名化→ローカル推論→ストリーミング応答("chat-chunk"イベント)。
/// この関数の中に外部ネットワーク呼び出しは一切存在しない。
#[tauri::command]
pub async fn send_message(
    app: AppHandle,
    engine: State<'_, SharedEngine>,
    mode: String,
    history: Vec<HistoryTurn>,
    text: String,
) -> Result<pii_guard::ScanResult, String> {
    let scan_result = pii_guard::scan(&text);
    let redacted_input = scan_result.redacted.clone();

    let (tx, mut rx) = mpsc::unbounded_channel::<GenerationChunk>();
    let app_for_stream = app.clone();
    tokio::spawn(async move {
        while let Some(chunk) = rx.recv().await {
            let _ = app_for_stream.emit("chat-chunk", &chunk.token);
            if chunk.done {
                let _ = app_for_stream.emit("chat-done", ());
                break;
            }
        }
    });

    let engine_arc = engine.inner().clone();
    let system_prompt = system_prompt_for(&mode);

    // Candleの推論はCPU/GPUバウンドの同期処理なので、専用スレッドで実行し
    // Tauriの非同期ランタイムをブロックしない
    let join_result = tokio::task::spawn_blocking(move || {
        let rt = tokio::runtime::Handle::current();
        let mut guard = rt.block_on(engine_arc.lock());
        match guard.as_mut() {
            Some(eng) => eng.generate_stream(&system_prompt, &history, &redacted_input, 512, tx),
            None => Err(crate::llm_engine::EngineError::Inference(
                "モデルが読み込まれていません".into(),
            )),
        }
    })
    .await;

    match join_result {
        Ok(Ok(())) => Ok(scan_result),
        Ok(Err(e)) => Err(e.to_string()),
        Err(e) => Err(format!("推論タスクが異常終了しました: {e}")),
    }
}
