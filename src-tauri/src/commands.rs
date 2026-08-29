use rand::seq::SliceRandom;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::mpsc;

use crate::llm_engine::{self, GenerationChunk, LlmEngine, LoadProgress, ModelLoadLock, ModelSpec, SharedEngine, SharedModelId};
use crate::learning_drill::{self, DrillCheckResult, DrillProblem, SharedDrillState, UnitInfo};
use crate::encyclopedia;
use crate::pii_guard::{self, PiiType};
use crate::prompts::{self, system_prompt_for};
use crate::safety_drill::{self, DrillResult, DrillScenario};

/// 送信前のPII検出プレビュー(サーバーではなく、この端末内のRustコードが処理)
#[tauri::command]
pub fn scan_pii(text: String) -> pii_guard::ScanResult {
    pii_guard::scan(&text)
}

/// SNS/AIリテラシー訓練: 学年モードに応じたシナリオを1つランダムに返す。
/// LLM推論は使わない(固定シナリオのみ)ので、モデル未読込でも呼び出せる。
#[tauri::command]
pub fn get_drill_scenario(mode: String) -> Option<DrillScenario> {
    let scenarios = safety_drill::scenarios_for_mode(&mode);
    scenarios.choose(&mut rand::thread_rng()).cloned()
}

/// 訓練シナリオへの生徒の返答を評価し、フィードバック文を返す。
#[tauri::command]
pub fn evaluate_drill_response(category: PiiType, reply: String) -> DrillResult {
    safety_drill::evaluate(category, &reply)
}

/// 学習ドリル(国語・算数・理科・社会・英語・情報)の新しい問題を1問生成する。
/// LLMは一切使わない。正解はフロントへ送らず、サーバー側の状態にのみ保持する。
/// `unit`省略時は科目内の「すべて」からランダムに出題する。
#[tauri::command]
pub async fn next_learning_problem(
    subject: String,
    mode: String,
    unit: Option<String>,
    drill_state: State<'_, SharedDrillState>,
) -> Result<DrillProblem, String> {
    let unit_ref = unit.as_deref();
    let (problem, pending) = match subject.as_str() {
        "arithmetic" => learning_drill::generate_arithmetic(&mode, unit_ref),
        "kanji" => learning_drill::generate_kanji(&mode, unit_ref),
        "science" => learning_drill::generate_science(&mode, unit_ref),
        "social" => learning_drill::generate_social(&mode, unit_ref),
        "math" => learning_drill::generate_math(&mode, unit_ref),
        "english" => learning_drill::generate_english(&mode, unit_ref),
        "info" => learning_drill::generate_info(&mode, unit_ref),
        other => return Err(format!("不明な科目です: {other}")),
    };

    let id = match &problem {
        DrillProblem::Arithmetic { id, .. } => id.clone(),
        DrillProblem::Choice { id, .. } => id.clone(),
    };

    let mut state = drill_state.lock().await;
    // メモリ上に溜まり続けないよう、上限を超えたら古いものから間引く
    if state.len() > 200 {
        state.clear();
    }
    state.insert(id, pending);

    Ok(problem)
}

/// 指定した科目で選択できる単元の一覧を返す(先頭は必ず「すべて」)。
/// まだ単元分けしていない科目は「すべて」1件のみを返すので、
/// フロント側はこれが1件しか無ければ単元セレクタ自体を隠せばよい。
#[tauri::command]
pub fn list_learning_units(subject: String) -> Vec<UnitInfo> {
    learning_drill::units_for_subject(&subject)
}

/// 学習ドリルの回答を採点する。
#[tauri::command]
pub async fn check_learning_answer(
    problem_id: String,
    answer: String,
    drill_state: State<'_, SharedDrillState>,
) -> Result<DrillCheckResult, String> {
    let mut state = drill_state.lock().await;
    let pending = state
        .remove(&problem_id)
        .ok_or_else(|| "この問題はすでに終了しているか、見つかりませんでした".to_string())?;
    Ok(learning_drill::check(&answer, &pending))
}

// プラスチャレンジ(歴史クイズ・漢字スクエア・世界地図)は、フロントエンド側の
// 静的データ+決定論的ロジック(src/games/)に統一したため、Rust側のIPCコマンドは
// 撤去した(旧`plus_challenge.rs`は問題データ未投入のスタブのまま未使用だった)。
// 経緯はREADMEの「つまずいたポイント」を参照。

/// 選択可能なモデルの一覧を返す(モデル切り替え機能用)。LLM未初期化でも呼べる。
#[tauri::command]
pub fn list_models() -> Vec<ModelSpec> {
    llm_engine::available_models()
}

/// 現在読み込まれているモデルのidを返す(未読込ならNone)。
#[tauri::command]
pub async fn get_current_model(current_model: State<'_, SharedModelId>) -> Result<Option<String>, String> {
    Ok(current_model.lock().await.clone())
}

/// モデルの初期化(初回はダウンロード、以降はローカルキャッシュから読込)。
/// `model_id`省略時はデフォルトモデル(qwen1_5b)。既に同じモデルが読込済みなら何もしない。
/// 進捗は "model-progress" イベントでフロントエンドへストリーミング通知する。
#[tauri::command]
pub async fn init_model(
    app: AppHandle,
    engine: State<'_, SharedEngine>,
    current_model: State<'_, SharedModelId>,
    load_lock: State<'_, ModelLoadLock>,
    model_id: Option<String>,
) -> Result<(), String> {
    let target_id = model_id.unwrap_or_else(|| llm_engine::default_model_id().to_string());
    eprintln!("[commands] init_model コマンドが呼び出されました: {target_id}");
    {
        let guard = engine.lock().await;
        let cur = current_model.lock().await;
        if guard.is_some() && cur.as_deref() == Some(target_id.as_str()) {
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

    // ロード処理全体(ダウンロード〜構築〜スワップ)を1回に1つに直列化する。
    // これがないと、init_modelとswitch_modelがほぼ同時に呼ばれた場合や
    // switch_modelの多重クリックで、2つのロード処理が競合してしまう。
    let _load_guard = load_lock.lock().await;
    load_model_into_state(app, engine, current_model, target_id).await
}

/// 読み込み済みモデルを別のモデルへ切り替える。
/// 生成中(send_message実行中)はengineのMutexを保持しているため、
/// 完了を待ってから安全に切り替わる。
#[tauri::command]
pub async fn switch_model(
    app: AppHandle,
    engine: State<'_, SharedEngine>,
    current_model: State<'_, SharedModelId>,
    load_lock: State<'_, ModelLoadLock>,
    model_id: String,
) -> Result<(), String> {
    let _load_guard = load_lock.lock().await;
    load_model_into_state(app, engine, current_model, model_id).await
}

async fn load_model_into_state(
    app: AppHandle,
    engine: State<'_, SharedEngine>,
    current_model: State<'_, SharedModelId>,
    model_id: String,
) -> Result<(), String> {
    let spec = llm_engine::find_model(&model_id)
        .ok_or_else(|| format!("不明なモデルIDです: {model_id}"))?;

    // 新モデルの読込前に旧モデルを破棄しない。ロード失敗時に旧モデルへ
    // フォールバックできるよう、新モデルの構築が完全に成功するまでは
    // engine/current_modelの状態に一切触れない(実際の入れ替えロジックは
    // llm_engine::apply_load_result に切り出してあり、テストで直接検証している)。
    let (tx, mut rx) = mpsc::unbounded_channel::<LoadProgress>();
    let app_for_progress = app.clone();
    tokio::spawn(async move {
        while let Some(p) = rx.recv().await {
            let _ = app_for_progress.emit("model-progress", p);
        }
    });

    let result = LlmEngine::load(&spec, tx).await.map_err(|e| e.to_string());
    if let Err(e) = &result {
        let _ = app.emit(
            "model-progress",
            LoadProgress {
                stage: "error".into(),
                detail: e.clone(),
            },
        );
    }

    llm_engine::apply_load_result(engine.inner(), current_model.inner(), result, spec.id.clone())
        .await
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

    // ハルシネーション対策(簡易RAG): 質問文が問題バンク(カリキュラム範囲)や
    // 百科事典(手作業で追加している一般知識)の項目と重なる場合、検証済みの
    // 内容を「参照情報」としてシステムプロンプトに注入する。
    // 該当が無い場合は何も注入せず、system_prompt_for()の基本ルール
    // (「わからないことは正直に言う」)だけに委ねる。
    const MAX_REFERENCE_SNIPPETS: usize = 3;
    let mut snippets = learning_drill::search_curriculum_facts(&redacted_input, MAX_REFERENCE_SNIPPETS);
    if snippets.len() < MAX_REFERENCE_SNIPPETS {
        let remaining = MAX_REFERENCE_SNIPPETS - snippets.len();
        snippets.extend(encyclopedia::search(&redacted_input, remaining));
    }

    let mut system_prompt = system_prompt_for(&mode);
    if let Some(reference_block) = prompts::build_reference_block(&snippets) {
        system_prompt.push_str(&reference_block);
    }

    // Candleの推論はCPU/GPUバウンドの同期処理なので、専用スレッドで実行し
    // Tauriの非同期ランタイムをブロックしない
    let join_result = tokio::task::spawn_blocking(move || {
        let rt = tokio::runtime::Handle::current();
        let mut guard = rt.block_on(engine_arc.lock());
        match guard.as_mut() {
            Some(eng) => eng.generate_stream(
                &system_prompt,
                &history,
                &redacted_input,
                LlmEngine::DEFAULT_MAX_GENERATION_TOKENS,
                tx,
            ),
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
