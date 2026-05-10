use super::model::Todo;
use super::service;
use tauri::AppHandle;

#[tauri::command]
pub fn list_todos(app: AppHandle) -> Result<Vec<Todo>, String> {
    service::list_todos(&app)
}

#[tauri::command]
pub fn create_todo(title: String, app: AppHandle) -> Result<Todo, String> {
    service::create_todo(&app, &title)
}

#[tauri::command]
pub fn toggle_todo(id: u32, app: AppHandle) -> Result<Todo, String> {
    service::toggle_todo(&app, id)
}
