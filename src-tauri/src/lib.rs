mod db;
mod todo;

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
            todo::commands::update_todo_title
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
