mod db;
mod todo;
mod work_log;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            db::init(app.handle()).map_err(std::io::Error::other)?;

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
            work_log::commands::create_work_log
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
