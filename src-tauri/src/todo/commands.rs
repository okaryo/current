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

#[tauri::command]
pub fn update_todo_title(id: u32, title: String, app: AppHandle) -> Result<Todo, String> {
    service::update_todo_title(&app, id, &title)
}

#[tauri::command]
pub fn delete_todo(id: u32, app: AppHandle) -> Result<(), String> {
    service::delete_todo(&app, id)
}
