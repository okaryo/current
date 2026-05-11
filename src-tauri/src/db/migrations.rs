use rusqlite::Connection;

const MIGRATIONS: &[(u32, &str)] = &[
    (1, include_str!("../../migrations/001_initial.sql")),
    (2, include_str!("../../migrations/002_create_work_logs.sql")),
];

pub fn apply(connection: &mut Connection) -> Result<(), String> {
    let current_version = current_schema_version(connection)?;
    let mut previous_version = 0;

    for (version, sql) in MIGRATIONS {
        if *version <= previous_version {
            return Err(format!("Migration v{version} is out of order."));
        }

        previous_version = *version;

        if current_version >= *version {
            continue;
        }

        let transaction = connection
            .transaction()
            .map_err(|error| format!("Failed to start migration v{version}: {error}"))?;

        transaction
            .execute_batch(sql)
            .map_err(|error| format!("Failed to apply migration v{version}: {error}"))?;

        transaction
            .pragma_update(None, "user_version", version)
            .map_err(|error| format!("Failed to update schema version to v{version}: {error}"))?;

        transaction
            .commit()
            .map_err(|error| format!("Failed to commit migration v{version}: {error}"))?;
    }

    Ok(())
}

fn current_schema_version(connection: &Connection) -> Result<u32, String> {
    connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|error| format!("Failed to read schema version: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn applies_pending_migrations() {
        let mut connection = Connection::open_in_memory().expect("open in-memory database");

        apply(&mut connection).expect("apply migrations");

        let version: u32 = connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .expect("read schema version");
        let (todos_table_count, work_logs_table_count): (u32, u32) = connection
            .query_row(
                "
                SELECT
                    SUM(name = 'todos'),
                    SUM(name = 'work_logs')
                FROM sqlite_schema
                WHERE type = 'table'
                  AND name IN ('todos', 'work_logs')
                ",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("read table counts");

        assert_eq!(version, 2);
        assert_eq!(todos_table_count, 1);
        assert_eq!(work_logs_table_count, 1);
    }

    #[test]
    fn applies_only_pending_migrations() {
        let mut connection = Connection::open_in_memory().expect("open in-memory database");

        connection
            .execute_batch(include_str!("../../migrations/001_initial.sql"))
            .expect("apply v1 migration manually");
        connection
            .pragma_update(None, "user_version", 1)
            .expect("set schema version");
        connection
            .execute(
                "
                INSERT INTO todos (title, completed, created_at_ms, completed_at_ms)
                VALUES ('existing todo', 0, 1000, NULL)
                ",
                [],
            )
            .expect("insert existing todo");

        apply(&mut connection).expect("apply pending migrations");

        let version: u32 = connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .expect("read schema version");
        let todo_count: u32 = connection
            .query_row("SELECT COUNT(*) FROM todos", [], |row| row.get(0))
            .expect("read todo count");
        let work_logs_table_count: u32 = connection
            .query_row(
                "
                SELECT COUNT(*)
                FROM sqlite_schema
                WHERE type = 'table'
                  AND name = 'work_logs'
                ",
                [],
                |row| row.get(0),
            )
            .expect("read work logs table count");

        assert_eq!(version, 2);
        assert_eq!(todo_count, 1);
        assert_eq!(work_logs_table_count, 1);
    }

    #[test]
    fn migrations_are_idempotent() {
        let mut connection = Connection::open_in_memory().expect("open in-memory database");

        apply(&mut connection).expect("apply migrations");
        connection
            .execute(
                "
                INSERT INTO work_logs (body, created_at_ms)
                VALUES ('existing log', 1000)
                ",
                [],
            )
            .expect("insert existing work log");

        apply(&mut connection).expect("reapply migrations");

        let version: u32 = connection
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .expect("read schema version");
        let work_log_count: u32 = connection
            .query_row("SELECT COUNT(*) FROM work_logs", [], |row| row.get(0))
            .expect("read work log count");

        assert_eq!(version, 2);
        assert_eq!(work_log_count, 1);
    }
}
