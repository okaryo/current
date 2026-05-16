use super::model::Todo;
use super::service;
use tauri::{AppHandle, Emitter};

#[tauri::command]
pub fn list_todos(app: AppHandle) -> Result<Vec<Todo>, String> {
    service::list_todos(&app)
}

#[tauri::command]
pub fn create_todo(title: String, app: AppHandle) -> Result<Todo, String> {
    let todo = service::create_todo(&app, &title)?;

    let _ = app.emit_to("main", "todo:created", &todo);

    Ok(todo)
}

#[tauri::command]
pub fn create_subtask(parent_id: u32, title: String, app: AppHandle) -> Result<Todo, String> {
    let todo = service::create_subtask(&app, parent_id, &title)?;

    let _ = app.emit_to("main", "todo:created", &todo);

    Ok(todo)
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
pub fn move_todo_under_previous_root(id: u32, app: AppHandle) -> Result<Todo, String> {
    service::move_todo_under_previous_root(&app, id)
}

#[tauri::command]
pub fn promote_todo_to_root(id: u32, app: AppHandle) -> Result<Todo, String> {
    service::promote_todo_to_root(&app, id)
}

#[tauri::command]
pub fn delete_todo(id: u32, app: AppHandle) -> Result<(), String> {
    service::delete_todo(&app, id)
}
