use super::model::WorkLog;
use super::service;
use tauri::{AppHandle, Emitter};

#[tauri::command]
pub fn list_work_logs(oldest_created_at_ms: i64, app: AppHandle) -> Result<Vec<WorkLog>, String> {
    service::list_work_logs(&app, oldest_created_at_ms)
}

#[tauri::command]
pub fn create_work_log(body: String, app: AppHandle) -> Result<WorkLog, String> {
    let work_log = service::create_work_log(&app, &body)?;

    let _ = app.emit_to("main", "work-log:created", &work_log);

    Ok(work_log)
}
