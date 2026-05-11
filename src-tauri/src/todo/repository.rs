use super::model::Todo;
use rusqlite::{params, Connection, OptionalExtension};

pub fn list(connection: &Connection) -> Result<Vec<Todo>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, title, completed, created_at_ms, completed_at_ms
            FROM todos
            ORDER BY completed ASC, id ASC
            ",
        )
        .map_err(|error| format!("Failed to prepare todo list query: {error}"))?;

    let todos = statement
        .query_map([], todo_from_row)
        .map_err(|error| format!("Failed to query todos: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Failed to read todos: {error}"))?;

    Ok(todos)
}

pub fn create(connection: &Connection, title: &str, created_at_ms: i64) -> Result<Todo, String> {
    connection
        .execute(
            "
            INSERT INTO todos (title, completed, created_at_ms, completed_at_ms)
            VALUES (?1, ?2, ?3, NULL)
            ",
            params![title, false, created_at_ms],
        )
        .map_err(|error| format!("Failed to create todo: {error}"))?;

    let id = row_id_to_u32(connection.last_insert_rowid())?;

    get(connection, id)?.ok_or_else(|| format!("Todo #{id} was not found after creation."))
}

pub fn toggle(
    connection: &Connection,
    id: u32,
    completed: bool,
    completed_at_ms: Option<i64>,
) -> Result<Todo, String> {
    let updated_rows = connection
        .execute(
            "
            UPDATE todos
            SET completed = ?1,
                completed_at_ms = ?2
            WHERE id = ?3
            ",
            params![completed, completed_at_ms, id],
        )
        .map_err(|error| format!("Failed to update todo: {error}"))?;

    if updated_rows == 0 {
        return Err(format!("Todo #{id} was not found."));
    }

    get(connection, id)?.ok_or_else(|| format!("Todo #{id} was not found after update."))
}

pub fn update_title(connection: &Connection, id: u32, title: &str) -> Result<Todo, String> {
    let updated_rows = connection
        .execute(
            "
            UPDATE todos
            SET title = ?1
            WHERE id = ?2
            ",
            params![title, id],
        )
        .map_err(|error| format!("Failed to update todo title: {error}"))?;

    if updated_rows == 0 {
        return Err(format!("Todo #{id} was not found."));
    }

    get(connection, id)?.ok_or_else(|| format!("Todo #{id} was not found after title update."))
}

pub fn delete(connection: &Connection, id: u32) -> Result<(), String> {
    let deleted_rows = connection
        .execute("DELETE FROM todos WHERE id = ?1", params![id])
        .map_err(|error| format!("Failed to delete todo: {error}"))?;

    if deleted_rows == 0 {
        return Err(format!("Todo #{id} was not found."));
    }

    Ok(())
}

pub fn get(connection: &Connection, id: u32) -> Result<Option<Todo>, String> {
    connection
        .query_row(
            "
            SELECT id, title, completed, created_at_ms, completed_at_ms
            FROM todos
            WHERE id = ?1
            ",
            params![id],
            todo_from_row,
        )
        .optional()
        .map_err(|error| format!("Failed to read todo #{id}: {error}"))
}

fn todo_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Todo> {
    Ok(Todo {
        id: row.get(0)?,
        title: row.get(1)?,
        completed: row.get(2)?,
        created_at_ms: row.get(3)?,
        completed_at_ms: row.get(4)?,
    })
}

fn row_id_to_u32(row_id: i64) -> Result<u32, String> {
    u32::try_from(row_id).map_err(|_| format!("Database row id {row_id} is out of range."))
}
