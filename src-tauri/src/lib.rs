mod commands;
mod encyclopedia;
mod knowledge;
mod learning_drill;
mod llm_engine;
#[cfg(test)]
mod pii_benchmark;
mod pii_guard;
mod prompts;
mod safety_drill;
mod safety_policy;
mod tutor_state;

use learning_drill::SharedDrillState;
use llm_engine::{ModelLoadLock, SharedEngine, SharedModelId};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // NOTE(P0-1/P0-2): モデルのpin(revision固定+SHA-256固定)が未設定のまま
    // 配布してしまうリグレッションを防ぐため、起動時に一度だけチェックし、
    // 未設定のモデルがあれば警告ログを出す(起動自体は妨げない)。
    // scripts/fetch_model_pins.py で実際の値を取得し、
    // llm_engine::available_models() のPIN_TODO箇所を埋めればこの警告は消える。
    let unpinned = llm_engine::unpinned_model_ids();
    if !unpinned.is_empty() {
        eprintln!(
            "[hushbox] 警告: 以下のモデルはrevision/SHA-256がpinされていません(scripts/fetch_model_pins.pyで値を取得し埋め込んでください): {}",
            unpinned.join(", ")
        );
    }

    let shared_engine: SharedEngine = Arc::new(Mutex::new(None));
    let shared_model_id: SharedModelId = Arc::new(Mutex::new(None));
    let shared_drill_state: SharedDrillState = Arc::new(Mutex::new(HashMap::new()));
    // init_model / switch_model の呼び出し全体を直列化するための専用ロック。
    // engine自体のMutexはロード処理の「区間ごと」にしか保護しないため、
    // これとは別に「ロード処理全体」を1つずつしか走らせないようにする。
    let model_load_lock: ModelLoadLock = Arc::new(Mutex::new(()));
    // P1-8: 宿題ヒントの段階(Tutor State Machine)をセッションごとに保持する状態。
    let shared_tutor_state: tutor_state::SharedTutorState = tutor_state::new_shared_state();

    tauri::Builder::default()
        .manage(shared_engine)
        .manage(shared_model_id)
        .manage(shared_drill_state)
        .manage(model_load_lock)
        .manage(shared_tutor_state)
        .invoke_handler(tauri::generate_handler![
            commands::init_model,
            commands::scan_pii,
            commands::send_message,
            commands::get_drill_scenario,
            commands::evaluate_drill_response,
            commands::list_models,
            commands::get_current_model,
            commands::switch_model,
            commands::next_learning_problem,
            commands::check_learning_answer,
            commands::list_learning_units,
            commands::get_subject_question_count,
            commands::start_tutor_session,
            commands::advance_tutor_session,
        ])
        .run(tauri::generate_context!())
        .expect("プライバシー・バディの起動に失敗しました");
}
