mod commands;
mod learning_drill;
mod llm_engine;
mod pii_guard;
mod prompts;
mod safety_drill;

use learning_drill::SharedDrillState;
use llm_engine::{SharedEngine, SharedModelId};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shared_engine: SharedEngine = Arc::new(Mutex::new(None));
    let shared_model_id: SharedModelId = Arc::new(Mutex::new(None));
    let shared_drill_state: SharedDrillState = Arc::new(Mutex::new(HashMap::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(shared_engine)
        .manage(shared_model_id)
        .manage(shared_drill_state)
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
