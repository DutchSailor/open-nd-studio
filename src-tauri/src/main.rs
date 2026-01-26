// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::{save_file, load_file, export_dxf, import_dxf};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            save_file,
            load_file,
            export_dxf,
            import_dxf
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
