use super::model::WorkLog;
use super::repository;
use crate::db;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;

pub fn list_work_logs(app: &AppHandle) -> Result<Vec<WorkLog>, String> {
    let connection = db::open(app)?;

    repository::list(&connection)
}

pub fn create_work_log(app: &AppHandle, body: &str) -> Result<WorkLog, String> {
    let body = normalize_body(body)?;
    let connection = db::open(app)?;

    repository::create(&connection, body, now_ms()?)
}

fn now_ms() -> Result<i64, String> {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "System time is before Unix epoch.".to_string())?
        .as_millis();

    i64::try_from(millis).map_err(|_| "Current timestamp is out of range.".to_string())
}

fn normalize_body(body: &str) -> Result<&str, String> {
    let body = body.trim();

    if body.is_empty() {
        return Err("Work log body is required.".to_string());
    }

    Ok(body)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_body_trims_surrounding_whitespace() {
        assert_eq!(normalize_body("  wrote log  "), Ok("wrote log"));
    }

    #[test]
    fn normalize_body_rejects_blank_bodies() {
        assert_eq!(
            normalize_body(" \n\t "),
            Err("Work log body is required.".to_string())
        );
    }
}
