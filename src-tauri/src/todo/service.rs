use super::model::Todo;
use super::repository;
use crate::db;
use chrono::{Local, LocalResult, NaiveDate, TimeZone};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;

pub fn list_todos(app: &AppHandle) -> Result<Vec<Todo>, String> {
    let connection = db::open(app)?;
    let (day_start_ms, next_day_start_ms) = current_local_day_bounds_ms()?;

    repository::list_active_for_day(&connection, day_start_ms, next_day_start_ms)
}

pub fn create_todo(app: &AppHandle, title: &str) -> Result<Todo, String> {
    let title = normalize_title(title)?;
    let connection = db::open(app)?;

    repository::create(&connection, title, now_ms()?)
}

pub fn create_subtask(app: &AppHandle, parent_id: u32, title: &str) -> Result<Todo, String> {
    let title = normalize_title(title)?;
    let connection = db::open(app)?;

    repository::create_child(&connection, parent_id, title, now_ms()?)
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
    let title = normalize_title(title)?;
    let connection = db::open(app)?;

    repository::update_title(&connection, id, title)
}

pub fn move_todo_under_previous_root(app: &AppHandle, id: u32) -> Result<Todo, String> {
    let connection = db::open(app)?;

    repository::set_parent_to_previous_root(&connection, id)
}

pub fn promote_todo_to_root(app: &AppHandle, id: u32) -> Result<Todo, String> {
    let connection = db::open(app)?;

    repository::clear_parent(&connection, id)
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

fn current_local_day_bounds_ms() -> Result<(i64, i64), String> {
    local_day_bounds_ms(now_ms()?)
}

fn local_day_bounds_ms(reference_ms: i64) -> Result<(i64, i64), String> {
    let reference = match Local.timestamp_millis_opt(reference_ms) {
        LocalResult::Single(datetime) => datetime,
        LocalResult::Ambiguous(earlier, _) => earlier,
        LocalResult::None => return Err("Failed to resolve local time.".to_string()),
    };
    let day = reference.date_naive();
    let next_day = day
        .succ_opt()
        .ok_or_else(|| "Failed to resolve next local day.".to_string())?;

    Ok((local_midnight_ms(day)?, local_midnight_ms(next_day)?))
}

fn local_midnight_ms(day: NaiveDate) -> Result<i64, String> {
    let midnight = day
        .and_hms_opt(0, 0, 0)
        .ok_or_else(|| "Failed to resolve local midnight.".to_string())?;

    match Local.from_local_datetime(&midnight) {
        LocalResult::Single(datetime) => Ok(datetime.timestamp_millis()),
        LocalResult::Ambiguous(earlier, _) => Ok(earlier.timestamp_millis()),
        LocalResult::None => Err("Failed to resolve local midnight.".to_string()),
    }
}

fn normalize_title(title: &str) -> Result<&str, String> {
    let title = title.trim();

    if title.is_empty() {
        return Err("Todo title is required.".to_string());
    }

    Ok(title)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_title_trims_surrounding_whitespace() {
        assert_eq!(normalize_title("  write tests  "), Ok("write tests"));
    }

    #[test]
    fn normalize_title_rejects_blank_titles() {
        assert_eq!(
            normalize_title(" \n\t "),
            Err("Todo title is required.".to_string())
        );
    }

    #[test]
    fn local_day_bounds_include_reference_time() {
        let reference_ms = now_ms().expect("current timestamp");

        let (day_start_ms, next_day_start_ms) =
            local_day_bounds_ms(reference_ms).expect("local day bounds");

        assert!(day_start_ms <= reference_ms);
        assert!(reference_ms < next_day_start_ms);
    }
}
