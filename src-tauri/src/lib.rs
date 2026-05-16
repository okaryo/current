mod db;
mod quick_entry;
mod todo;
mod work_log;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            db::init(app.handle()).map_err(std::io::Error::other)?;
            quick_entry::commands::setup_quick_entry_window(app.handle())?;

            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::ShortcutState;

                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_shortcuts(["CommandOrControl+Shift+L"])?
                        .with_handler(|app, _shortcut, event| {
                            if event.state == ShortcutState::Pressed {
                                let _ =
                                    quick_entry::commands::toggle_quick_entry_window(app.clone());
                            }
                        })
                        .build(),
                )?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            todo::commands::list_todos,
            todo::commands::create_todo,
            todo::commands::toggle_todo,
            todo::commands::update_todo_title,
            todo::commands::move_todo_under_previous_root,
            todo::commands::promote_todo_to_root,
            todo::commands::delete_todo,
            work_log::commands::list_work_logs,
            work_log::commands::create_work_log,
            quick_entry::commands::show_quick_entry_window,
            quick_entry::commands::hide_quick_entry_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
