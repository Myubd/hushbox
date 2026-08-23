mod commands;
mod llm_engine;
mod pii_guard;
mod prompts;

use llm_engine::SharedEngine;
use std::sync::Arc;
use tokio::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shared_engine: SharedEngine = Arc::new(Mutex::new(None));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(shared_engine)
        .invoke_handler(tauri::generate_handler![
            commands::init_model,
            commands::scan_pii,
            commands::send_message,
        ])
        .run(tauri::generate_context!())
        .expect("プライバシー・バディの起動に失敗しました");
}
