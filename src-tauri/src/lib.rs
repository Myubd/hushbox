mod commands;
mod encyclopedia;
mod knowledge;
mod learning_drill;
mod llm_engine;
mod pii_guard;
mod prompts;
mod safety_drill;

use learning_drill::SharedDrillState;
use llm_engine::{ModelLoadLock, SharedEngine, SharedModelId};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shared_engine: SharedEngine = Arc::new(Mutex::new(None));
    let shared_model_id: SharedModelId = Arc::new(Mutex::new(None));
    let shared_drill_state: SharedDrillState = Arc::new(Mutex::new(HashMap::new()));
    // init_model / switch_model の呼び出し全体を直列化するための専用ロック。
    // engine自体のMutexはロード処理の「区間ごと」にしか保護しないため、
    // これとは別に「ロード処理全体」を1つずつしか走らせないようにする。
    let model_load_lock: ModelLoadLock = Arc::new(Mutex::new(()));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(shared_engine)
        .manage(shared_model_id)
        .manage(shared_drill_state)
        .manage(model_load_lock)
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
        ])
        .run(tauri::generate_context!())
        .expect("プライバシー・バディの起動に失敗しました");
}
