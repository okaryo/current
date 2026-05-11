use super::model::WorkLog;
use rusqlite::{params, Connection, OptionalExtension};

pub fn list(connection: &Connection) -> Result<Vec<WorkLog>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, body, created_at_ms
            FROM work_logs
            ORDER BY created_at_ms ASC, id ASC
            ",
        )
        .map_err(|error| format!("Failed to prepare work log list query: {error}"))?;

    let logs = statement
        .query_map([], work_log_from_row)
        .map_err(|error| format!("Failed to query work logs: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Failed to read work logs: {error}"))?;

    Ok(logs)
}

pub fn create(connection: &Connection, body: &str, created_at_ms: i64) -> Result<WorkLog, String> {
    connection
        .execute(
            "
            INSERT INTO work_logs (body, created_at_ms)
            VALUES (?1, ?2)
            ",
            params![body, created_at_ms],
        )
        .map_err(|error| format!("Failed to create work log: {error}"))?;

    let id = row_id_to_u32(connection.last_insert_rowid())?;

    get(connection, id)?.ok_or_else(|| format!("Work log #{id} was not found after creation."))
}

fn get(connection: &Connection, id: u32) -> Result<Option<WorkLog>, String> {
    connection
        .query_row(
            "
            SELECT id, body, created_at_ms
            FROM work_logs
            WHERE id = ?1
            ",
            params![id],
            work_log_from_row,
        )
        .optional()
        .map_err(|error| format!("Failed to read work log #{id}: {error}"))
}

fn work_log_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<WorkLog> {
    Ok(WorkLog {
        id: row.get(0)?,
        body: row.get(1)?,
        created_at_ms: row.get(2)?,
    })
}

fn row_id_to_u32(row_id: i64) -> Result<u32, String> {
    u32::try_from(row_id).map_err(|_| format!("Database row id {row_id} is out of range."))
}
