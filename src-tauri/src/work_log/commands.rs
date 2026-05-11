use super::model::WorkLog;
use super::service;
use tauri::AppHandle;

#[tauri::command]
pub fn list_work_logs(app: AppHandle) -> Result<Vec<WorkLog>, String> {
    service::list_work_logs(&app)
}

#[tauri::command]
pub fn create_work_log(body: String, app: AppHandle) -> Result<WorkLog, String> {
    service::create_work_log(&app, &body)
}
