// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Here we pass the plugins to the builder.
    // Note: The plugin names are converted from kebab-case to snake_case.
    // `tauri-plugin-dialog` becomes `tauri_plugin_dialog`
    // `tauri-plugin-fs` becomes `tauri_plugin_fs`
    tauri::Builder::default()
        // --- ADD THESE TWO LINES ---
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        // -------------------------
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}