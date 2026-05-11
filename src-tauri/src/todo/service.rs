use super::model::Todo;
use super::repository;
use crate::db;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;

pub fn list_todos(app: &AppHandle) -> Result<Vec<Todo>, String> {
    let connection = db::open(app)?;

    repository::list(&connection)
}

pub fn create_todo(app: &AppHandle, title: &str) -> Result<Todo, String> {
    let title = title.trim();

    if title.is_empty() {
        return Err("Todo title is required.".to_string());
    }

    let connection = db::open(app)?;

    repository::create(&connection, title, now_ms()?)
}

pub fn toggle_todo(app: &AppHandle, id: u32) -> Result<Todo, String> {
    let connection = db::open(app)?;
    let todo =
        repository::get(&connection, id)?.ok_or_else(|| format!("Todo #{id} was not found."))?;
    let next_completed = !todo.completed;
    let completed_at_ms = if next_completed {
        Some(now_ms()?)
    } else {
        None
    };

    repository::toggle(&connection, id, next_completed, completed_at_ms)
}

pub fn update_todo_title(app: &AppHandle, id: u32, title: &str) -> Result<Todo, String> {
    let title = title.trim();

    if title.is_empty() {
        return Err("Todo title is required.".to_string());
    }

    let connection = db::open(app)?;

    repository::update_title(&connection, id, title)
}

pub fn delete_todo(app: &AppHandle, id: u32) -> Result<(), String> {
    let connection = db::open(app)?;

    repository::delete(&connection, id)
}

fn now_ms() -> Result<i64, String> {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "System time is before Unix epoch.".to_string())?
        .as_millis();

    i64::try_from(millis).map_err(|_| "Current timestamp is out of range.".to_string())
}
