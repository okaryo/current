mod db;
mod quick_entry;
mod settings;
mod todo;
mod work_log;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            db::init(app.handle()).map_err(std::io::Error::other)?;
            quick_entry::commands::setup_quick_entry_window(app.handle())?;

            #[cfg(desktop)]
            {
                app.handle()
                    .plugin(tauri_plugin_global_shortcut::Builder::new().build())?;
                settings::commands::setup_global_shortcuts(app.handle())?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            todo::commands::list_todos,
            todo::commands::create_todo,
            todo::commands::create_subtask,
            todo::commands::toggle_todo,
            todo::commands::update_todo_title,
            todo::commands::move_todo_under_previous_root,
            todo::commands::promote_todo_to_root,
            todo::commands::delete_todo,
            work_log::commands::list_work_logs,
            work_log::commands::create_work_log,
            work_log::commands::update_work_log,
            settings::commands::get_settings,
            settings::commands::update_quick_entry_global_shortcut,
            settings::commands::update_pomodoro_timer_settings,
            settings::commands::update_pomodoro_sound_settings,
            settings::commands::update_todo_sound_settings,
            settings::commands::update_notification_permission_prompt_seen,
            settings::commands::pause_quick_entry_global_shortcut,
            settings::commands::resume_quick_entry_global_shortcut,
            quick_entry::commands::show_quick_entry_window,
            quick_entry::commands::hide_quick_entry_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
