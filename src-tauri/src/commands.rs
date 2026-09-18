use rand::seq::SliceRandom;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::mpsc;

use crate::llm_engine::{self, GenerationChunk, LlmEngine, LoadProgress, ModelLoadLock, ModelSpec, SharedEngine, SharedModelId};
use crate::learning_drill::{self, DrillCheckResult, DrillProblem, SharedDrillState, UnitInfo};
use crate::encyclopedia;
use crate::pii_guard::{self, PiiType};
use crate::prompts::{self, system_prompt_for};
use crate::safety_drill::{self, DrillResult, DrillScenario};
use crate::safety_policy::{self, SafetyLevel};
use crate::tutor_state::{self, SharedTutorState, TutorSessionInfo, TutorStage};

/// IPC経由で受け付ける自由入力テキストの文字数上限(手前側の防御線)。
/// メモリ圧迫や`pii_guard::scan`の処理時間増加を避けるため。
/// バイト数ではなくUnicodeスカラ値の数で数える。
const MAX_INPUT_CHARS: usize = 8000;

fn reject_if_too_long(text: &str) -> Result<(), String> {
    let len = text.chars().count();
    if len > MAX_INPUT_CHARS {
        return Err(format!(
            "入力が長すぎます({len}文字)。{MAX_INPUT_CHARS}文字以内で送ってください。"
        ));
    }
    Ok(())
}

/// 送信前のPII検出プレビュー(サーバーではなく、この端末内のRustコードが処理)
#[tauri::command]
pub fn scan_pii(text: String) -> Result<pii_guard::ScanResult, String> {
    reject_if_too_long(&text)?;
    Ok(pii_guard::scan(&text))
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
pub fn evaluate_drill_response(category: PiiType, reply: String) -> Result<DrillResult, String> {
    reject_if_too_long(&reply)?;
    Ok(safety_drill::evaluate(category, &reply))
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

/// 指定した科目の問題バンクの総問題数を返す(UIの「全◯問」表示用)。
/// 算数(計算れんしゅう)のようにその場で無限に生成する科目はNoneを返す。
#[tauri::command]
pub fn get_subject_question_count(subject: String) -> Option<usize> {
    learning_drill::subject_question_count(&subject)
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

/// send_messageが実際にLLMへ渡す入力一式(system prompt / history / 匿名化済み本文)。
///
/// NOTE(P0-4): モデル推論(`eng.generate_stream`)そのものを含まないため、
/// モデル未読込のCI環境でも「PIIがこの構造体に含まれる文字列に残っていないか」を
/// 単体テストできる。send_messageはこの関数が返した値以外をLLMへ渡してはならない、
/// という契約になっている(この契約はtests moduleのアサーションで固定している)。
struct PreparedLlmInput {
    scan_result: pii_guard::ScanResult,
    system_prompt: String,
    history: Vec<HistoryTurn>,
    /// NOTE(P1-9): 推論前の安全ポリシー判定結果。Dangerousの場合、
    /// send_messageはLLMを呼ばずfixed_responseをそのまま返す。
    safety: safety_policy::SafetyAssessment,
}

/// フロントエンドから届いた履歴を、送信直前にもう一度サーバー側でPIIスキャン・匿名化する。
///
/// NOTE(P0-4): フロントエンド(useChatEngine.ts)はユーザー発言をhistoryへ積む際に
/// 既に`scan.redacted`(匿名化済みテキスト)を使っているが、それはあくまで
/// フロントエンド側の実装上の取り決めであり、Rust側からは「本当に匿名化済みか」を
/// 保証できない(将来別のUIから同じコマンドを呼ぶ、フロント側にバグが入る、といった
/// ケースでも生のPIIがLLMに渡らないようにするための多層防御)。
/// アシスタント発言側も、モデルがユーザー入力の固有名詞をそのまま復唱する可能性が
/// ゼロではないため、同様に再スキャンする。
fn redact_history_defense_in_depth(history: Vec<HistoryTurn>) -> Vec<HistoryTurn> {
    history
        .into_iter()
        .map(|(role, content)| {
            let redacted = pii_guard::scan(&content).redacted;
            (role, redacted)
        })
        .collect()
}

/// PII検出→匿名化→(簡易RAGの参照情報を注入した)システムプロンプト組み立て、までを行う。
/// 推論そのものは含まない(モデル未読込でも呼べる/テストできる)。
fn prepare_llm_input(
    mode: &str,
    history: Vec<HistoryTurn>,
    text: &str,
    tutor_stage: Option<TutorStage>,
) -> PreparedLlmInput {
    let scan_result = pii_guard::scan(text);
    let redacted_input = scan_result.redacted.clone();
    let history = redact_history_defense_in_depth(history);

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

    let mut system_prompt = system_prompt_for(mode);
    if let Some(reference_block) = prompts::build_reference_block(&snippets) {
        system_prompt.push_str(&reference_block);
    }

    // NOTE(P1-9): 安全ポリシーの一次判定は匿名化前のtextに対して行う
    // (自傷・暴力等のキーワードはPII検出パターンとは無関係な語彙のため、
    // 匿名化の有無で判定結果が変わることは想定していないが、念のため
    // 「ユーザーが実際に書いた文」を評価対象にしている)。
    let safety = safety_policy::assess(text);
    if let Some(note) = &safety.extra_system_note {
        system_prompt.push_str(note);
    }

    // NOTE(P1-8): Tutor State Machine。フロントエンドが現在の宿題ヒント段階を
    // 明示的に渡してきた場合のみ、その段階専用の指示をsystem promptに追記する。
    // 段階の進行自体(次にどのステージへ進むか)はここでは行わない
    // (start_tutor_session / advance_tutor_session コマンド側の責務)。
    if let Some(stage) = tutor_stage {
        system_prompt.push_str(stage.instruction());
    }

    PreparedLlmInput {
        scan_result,
        system_prompt,
        history,
        safety,
    }
}

/// メッセージ送信。PII検出→匿名化→ローカル推論→ストリーミング応答("chat-chunk"イベント)。
/// この関数の中に外部ネットワーク呼び出しは一切存在しない。
#[tauri::command]
pub async fn send_message(
    app: AppHandle,
    engine: State<'_, SharedEngine>,
    mode: String,
    history: Vec<HistoryTurn>,
    text: String,
    tutor_stage: Option<TutorStage>,
) -> Result<pii_guard::ScanResult, String> {
    reject_if_too_long(&text)?;

    let prepared = prepare_llm_input(&mode, history, &text, tutor_stage);

    // NOTE(P1-9): Dangerousと判定された場合、LLMには一切渡さず
    // (=推論すら行わず)、あらかじめ用意した安全な固定応答をそのまま返す。
    // これにより、暴力・自傷・性的内容・危険物等については、
    // 「1.5B〜7Bモデルがsystem promptの指示をたまたま外す」リスクを
    // そもそも発生させない設計にしている。
    if prepared.safety.level == SafetyLevel::Dangerous {
        let fixed_response = prepared
            .safety
            .fixed_response
            .clone()
            .unwrap_or_else(|| "ごめんね、その内容にはお答えできないよ。".to_string());
        let _ = app.emit("chat-chunk", &fixed_response);
        let _ = app.emit("chat-done", ());
        return Ok(prepared.scan_result);
    }

    let redacted_input = prepared.scan_result.redacted.clone();
    let system_prompt = prepared.system_prompt;
    let history = prepared.history;
    let scan_result = prepared.scan_result;

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

/// P1-8 Tutor State Machine: 新しい宿題設問に取り組み始めるときにフロントエンドが呼ぶ。
/// 生成した(または生成済みの)session_idに対応する段階をUnderstandへ(再)設定して返す。
#[tauri::command]
pub async fn start_tutor_session(
    tutor_state_mgr: State<'_, SharedTutorState>,
    session_id: String,
) -> Result<TutorSessionInfo, String> {
    Ok(tutor_state::start_session(tutor_state_mgr.inner(), session_id).await)
}

/// P1-8 Tutor State Machine: 生徒の返答を受けて段階を進める。
/// `user_attempted` は「生徒が自分で答えようとした発言だったか」をフロントエンドが
/// 明示的に判定して渡す(このコマンド自身は文面から自動判定しない)。
#[tauri::command]
pub async fn advance_tutor_session(
    tutor_state_mgr: State<'_, SharedTutorState>,
    session_id: String,
    user_attempted: bool,
) -> Result<TutorSessionInfo, String> {
    Ok(tutor_state::advance_session(tutor_state_mgr.inner(), session_id, user_attempted).await)
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── P0-4: 「PIIがLLM promptに入らない」ことのE2E的な単体テスト ──
    // 実際のモデル推論は行わず(モデルファイルが無いCI環境でも実行できる)、
    // send_messageが実際にLLMへ渡す値(PreparedLlmInput)を直接検証する。

    #[test]
    fn redacted_input_never_contains_raw_phone_number() {
        let raw = "僕の電話番号は090-1234-5678です。かけてください。";
        let prepared = prepare_llm_input("elementary", vec![], raw, None);
        assert!(
            !prepared.scan_result.redacted.contains("090-1234-5678"),
            "LLMへ渡す本文に生の電話番号が残っています: {}",
            prepared.scan_result.redacted
        );
        assert!(
            !prepared.scan_result.matches.is_empty(),
            "電話番号はPIIとして検出されるはず"
        );
    }

    #[test]
    fn redacted_input_never_contains_raw_self_introduced_name() {
        let raw = "名前は田中太郎です。よろしくお願いします。";
        let prepared = prepare_llm_input("elementary", vec![], raw, None);
        assert!(
            !prepared.scan_result.redacted.contains("田中太郎"),
            "LLMへ渡す本文に生の氏名が残っています: {}",
            prepared.scan_result.redacted
        );
    }

    #[test]
    fn history_is_redacted_server_side_even_if_caller_passes_raw_pii() {
        // フロントエンドは通常scan.redactedをhistoryに積むが、Rust側からは
        // それを信用しきらず、渡された生のhistoryも再スキャンして守る
        // (多層防御。フロントの実装が将来変わっても壊れないようにするテスト)。
        let raw_history = vec![
            ("user".to_string(), "私は田中太郎、090-1234-5678です".to_string()),
            ("assistant".to_string(), "了解しました".to_string()),
        ];
        let prepared = prepare_llm_input("elementary", raw_history, "こんにちは", None);

        for (_role, content) in &prepared.history {
            assert!(
                !content.contains("田中太郎"),
                "history内に生の氏名が残っています: {content}"
            );
            assert!(
                !content.contains("090-1234-5678"),
                "history内に生の電話番号が残っています: {content}"
            );
        }
    }

    #[test]
    fn system_prompt_and_history_do_not_leak_current_turn_raw_text() {
        // system_prompt(RAG参照情報を含む)自体にも、今回のユーザー入力の生テキストが
        // そのまま埋め込まれていないことを確認する(RAGは検索"キーワード"として
        // redacted_inputを使うだけで、本文をプロンプトに丸ごと転記するわけではない)。
        let raw = "私は田中太郎です。二次方程式の解き方を教えて。";
        let prepared = prepare_llm_input("elementary", vec![], raw, None);
        assert!(
            !prepared.system_prompt.contains("田中太郎"),
            "system_promptに生の氏名が含まれています: {}",
            prepared.system_prompt
        );
    }

    // ── P1-9: 安全ポリシーエンジンとの統合 ──

    #[test]
    fn dangerous_input_produces_fixed_response_via_safety_field() {
        let prepared = prepare_llm_input("elementary", vec![], "死にたい", None);
        assert_eq!(prepared.safety.level, crate::safety_policy::SafetyLevel::Dangerous);
        assert!(prepared.safety.fixed_response.is_some());
    }

    #[test]
    fn concerning_input_adds_extra_note_to_system_prompt() {
        let prepared = prepare_llm_input("elementary", vec![], "クラスでいじめられていて辛い", None);
        assert_eq!(
            prepared.safety.level,
            crate::safety_policy::SafetyLevel::Concerning
        );
        assert!(
            prepared.system_prompt.contains("追加の注意"),
            "Concerning判定時はsystem_promptに注意書きが追記されるべき"
        );
    }

    #[test]
    fn normal_input_does_not_alter_system_prompt_with_safety_note() {
        let prepared = prepare_llm_input("elementary", vec![], "二次方程式の解き方を教えて", None);
        assert_eq!(
            prepared.safety.level,
            crate::safety_policy::SafetyLevel::Normal
        );
        assert!(!prepared.system_prompt.contains("追加の注意"));
    }

    // ── P1-8: Tutor State Machineのsystem promptへの反映 ──

    #[test]
    fn tutor_stage_none_does_not_alter_system_prompt() {
        let prepared = prepare_llm_input("elementary", vec![], "二次方程式の解き方を教えて", None);
        assert!(!prepared.system_prompt.contains("今の段階"));
    }

    #[test]
    fn tutor_hint_stage_forbids_answer_in_system_prompt() {
        let prepared = prepare_llm_input(
            "elementary",
            vec![],
            "二次方程式の解き方を教えて",
            Some(TutorStage::Hint1),
        );
        assert!(prepared.system_prompt.contains("ヒント1/3"));
        assert!(prepared
            .system_prompt
            .contains("答えそのものは絶対に言わないでください"));
    }

    #[test]
    fn tutor_explanation_stage_allows_answer_in_system_prompt() {
        let prepared = prepare_llm_input(
            "elementary",
            vec![],
            "二次方程式の解き方を教えて",
            Some(TutorStage::Explanation),
        );
        assert!(prepared.system_prompt.contains("種明かし"));
    }

    // ── P1-10: RAG(簡易参照情報の注入)の統合テスト ──
    // prepare_llm_input は commands.rs 内でのみ呼べる(private)ため、
    // 検索ロジック自体の網羅性は rag_benchmark.rs で計測し、
    // ここでは「system_promptへちゃんと注入されるか/されないか」の配線を確認する。

    #[test]
    fn relevant_query_injects_reference_block_into_system_prompt() {
        let prepared = prepare_llm_input("elementary", vec![], "警察官の仕事について教えて", None);
        assert!(
            prepared.system_prompt.contains("[参考情報]"),
            "カリキュラム内の語句を含む質問には参考情報が注入されるべき"
        );
    }

    #[test]
    fn unrelated_query_does_not_inject_reference_block() {
        let prepared = prepare_llm_input("elementary", vec![], "テストの点数が心配です", None);
        assert!(
            !prepared.system_prompt.contains("[参考情報]"),
            "無関係な雑談文には参考情報を注入すべきではない"
        );
    }
}
