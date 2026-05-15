use super::model::WorkLog;
use rusqlite::{params, Connection, OptionalExtension};

pub fn list_since(
    connection: &Connection,
    oldest_created_at_ms: i64,
) -> Result<Vec<WorkLog>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, body, created_at_ms
            FROM work_logs
            WHERE created_at_ms >= ?1
            ORDER BY created_at_ms DESC, id DESC
            ",
        )
        .map_err(|error| format!("Failed to prepare work log list query: {error}"))?;

    let logs = statement
        .query_map(params![oldest_created_at_ms], work_log_from_row)
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_support::migrated_connection;

    #[test]
    fn creates_and_lists_recent_work_logs() {
        let connection = migrated_connection();

        let first = create(&connection, "first log", 1000).expect("create first work log");
        let second = create(&connection, "second log", 2000).expect("create second work log");

        let logs = list_since(&connection, 1500).expect("list work logs");

        assert_eq!(first.id, 1);
        assert_eq!(first.body, "first log");
        assert_eq!(first.created_at_ms, 1000);
        assert_eq!(second.id, 2);
        assert_eq!(
            logs.iter().map(|log| log.id).collect::<Vec<_>>(),
            vec![second.id]
        );
    }

    #[test]
    fn preserves_multiline_body() {
        let connection = migrated_connection();
        let body = "- first\n- second";

        let log = create(&connection, body, 1000).expect("create work log");

        assert_eq!(log.body, body);
    }

    #[test]
    fn lists_work_logs_by_creation_time_then_id_descending() {
        let connection = migrated_connection();
        let second = create(&connection, "second", 2000).expect("create second work log");
        let first = create(&connection, "first", 1000).expect("create first work log");
        let same_time = create(&connection, "same time", 1000).expect("create same-time work log");

        let logs = list_since(&connection, 0).expect("list work logs");

        assert_eq!(
            logs.iter().map(|log| log.id).collect::<Vec<_>>(),
            vec![second.id, same_time.id, first.id]
        );
    }
}
