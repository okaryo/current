use super::model::Todo;
use rusqlite::{params, Connection, OptionalExtension};
use std::collections::{HashMap, HashSet};

pub fn list(connection: &Connection) -> Result<Vec<Todo>, String> {
    list_by_query(
        connection,
        "
        SELECT id, title, completed, created_at_ms, completed_at_ms, parent_id, position
        FROM todos
        ORDER BY position ASC, id ASC
        ",
        [],
    )
}

pub fn list_active_for_day(
    connection: &Connection,
    day_start_ms: i64,
    next_day_start_ms: i64,
) -> Result<Vec<Todo>, String> {
    list_by_query(
        connection,
        "
        SELECT id, title, completed, created_at_ms, completed_at_ms, parent_id, position
        FROM todos
        WHERE completed = 0
           OR (
                completed_at_ms IS NOT NULL
                AND completed_at_ms >= ?1
                AND completed_at_ms < ?2
              )
        ORDER BY position ASC, id ASC
        ",
        params![day_start_ms, next_day_start_ms],
    )
}

fn list_by_query<P>(connection: &Connection, query: &str, params: P) -> Result<Vec<Todo>, String>
where
    P: rusqlite::Params,
{
    let mut statement = connection
        .prepare(query)
        .map_err(|error| format!("Failed to prepare todo list query: {error}"))?;

    let todos = statement
        .query_map(params, todo_from_row)
        .map_err(|error| format!("Failed to query todos: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Failed to read todos: {error}"))?;

    Ok(flatten_todos(todos))
}

pub fn create(connection: &Connection, title: &str, created_at_ms: i64) -> Result<Todo, String> {
    let position = next_position(connection, None)?;

    connection
        .execute(
            "
            INSERT INTO todos (title, completed, created_at_ms, completed_at_ms, parent_id, position)
            VALUES (?1, ?2, ?3, NULL, NULL, ?4)
            ",
            params![title, false, created_at_ms, position],
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

pub fn set_parent_to_previous_root(connection: &Connection, id: u32) -> Result<Todo, String> {
    let todo = get(connection, id)?.ok_or_else(|| format!("Todo #{id} was not found."))?;

    if todo.parent_id.is_some() {
        return Ok(todo);
    }

    let parent = previous_root_todo(connection, id)?
        .ok_or_else(|| "This task needs a task above it before it can be indented.".to_string())?;
    let position = next_position(connection, Some(parent.id))?;

    connection
        .execute(
            "
            UPDATE todos
            SET parent_id = ?1,
                position = ?2
            WHERE id = ?3
            ",
            params![parent.id, position, id],
        )
        .map_err(|error| format!("Failed to indent todo: {error}"))?;

    get(connection, id)?.ok_or_else(|| format!("Todo #{id} was not found after indent."))
}

pub fn clear_parent(connection: &Connection, id: u32) -> Result<Todo, String> {
    let todo = get(connection, id)?.ok_or_else(|| format!("Todo #{id} was not found."))?;
    let Some(parent_id) = todo.parent_id else {
        return Ok(todo);
    };
    let parent = get(connection, parent_id)?
        .ok_or_else(|| format!("Parent todo #{parent_id} was not found."))?;
    let position = parent.position + 1;

    connection
        .execute(
            "
            UPDATE todos
            SET position = position + 1
            WHERE parent_id IS NULL
              AND position > ?1
            ",
            params![parent.position],
        )
        .map_err(|error| format!("Failed to make room for outdented todo: {error}"))?;

    connection
        .execute(
            "
            UPDATE todos
            SET parent_id = NULL,
                position = ?1
            WHERE id = ?2
            ",
            params![position, id],
        )
        .map_err(|error| format!("Failed to outdent todo: {error}"))?;

    get(connection, id)?.ok_or_else(|| format!("Todo #{id} was not found after outdent."))
}

pub fn get(connection: &Connection, id: u32) -> Result<Option<Todo>, String> {
    connection
        .query_row(
            "
            SELECT id, title, completed, created_at_ms, completed_at_ms, parent_id, position
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
        parent_id: row.get(5)?,
        position: row.get(6)?,
    })
}

fn row_id_to_u32(row_id: i64) -> Result<u32, String> {
    u32::try_from(row_id).map_err(|_| format!("Database row id {row_id} is out of range."))
}

fn next_position(connection: &Connection, parent_id: Option<u32>) -> Result<i64, String> {
    let max_position: Option<i64> = match parent_id {
        Some(parent_id) => connection.query_row(
            "SELECT MAX(position) FROM todos WHERE parent_id = ?1",
            params![parent_id],
            |row| row.get(0),
        ),
        None => connection.query_row(
            "SELECT MAX(position) FROM todos WHERE parent_id IS NULL",
            [],
            |row| row.get(0),
        ),
    }
    .map_err(|error| format!("Failed to read next todo position: {error}"))?;

    Ok(max_position.unwrap_or(0) + 1)
}

fn previous_root_todo(connection: &Connection, id: u32) -> Result<Option<Todo>, String> {
    let todos = list(connection)?;
    let Some(current_index) = todos.iter().position(|todo| todo.id == id) else {
        return Ok(None);
    };

    Ok(todos[..current_index]
        .iter()
        .rev()
        .find(|todo| todo.parent_id.is_none())
        .cloned())
}

fn flatten_todos(todos: Vec<Todo>) -> Vec<Todo> {
    let ids = todos.iter().map(|todo| todo.id).collect::<HashSet<_>>();
    let mut children_by_parent = HashMap::<u32, Vec<Todo>>::new();
    let mut roots = Vec::new();

    for todo in todos {
        match todo.parent_id {
            Some(parent_id) if ids.contains(&parent_id) => {
                children_by_parent.entry(parent_id).or_default().push(todo);
            }
            _ => roots.push(todo),
        }
    }

    sort_todo_level(&mut roots, &children_by_parent);

    let mut flattened = Vec::new();

    for root in roots {
        let root_id = root.id;

        flattened.push(root);

        if let Some(mut children) = children_by_parent.remove(&root_id) {
            sort_todo_level(&mut children, &children_by_parent);
            flattened.extend(children);
        }
    }

    flattened
}

fn sort_todo_level(todos: &mut [Todo], children_by_parent: &HashMap<u32, Vec<Todo>>) {
    todos.sort_by_key(|todo| {
        (
            is_sort_completed(todo, children_by_parent),
            todo.position,
            todo.id,
        )
    });
}

fn is_sort_completed(todo: &Todo, children_by_parent: &HashMap<u32, Vec<Todo>>) -> bool {
    todo.completed
        && children_by_parent
            .get(&todo.id)
            .is_none_or(|children| children.iter().all(|child| child.completed))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_support::migrated_connection;

    #[test]
    fn creates_and_lists_todos() {
        let connection = migrated_connection();

        let first = create(&connection, "first", 1000).expect("create first todo");
        let second = create(&connection, "second", 2000).expect("create second todo");

        let todos = list(&connection).expect("list todos");

        assert_eq!(first.id, 1);
        assert_eq!(first.title, "first");
        assert!(!first.completed);
        assert_eq!(first.created_at_ms, 1000);
        assert_eq!(first.completed_at_ms, None);
        assert_eq!(first.parent_id, None);
        assert_eq!(first.position, 1);
        assert_eq!(second.id, 2);
        assert_eq!(second.position, 2);
        assert_eq!(
            todos.iter().map(|todo| todo.id).collect::<Vec<_>>(),
            vec![1, 2]
        );
    }

    #[test]
    fn lists_incomplete_todos_before_completed_todos() {
        let connection = migrated_connection();
        let first = create(&connection, "first", 1000).expect("create first todo");
        let second = create(&connection, "second", 2000).expect("create second todo");

        toggle(&connection, first.id, true, Some(3000)).expect("complete first todo");

        let todos = list(&connection).expect("list todos");

        assert_eq!(
            todos.iter().map(|todo| todo.id).collect::<Vec<_>>(),
            vec![second.id, first.id]
        );
    }

    #[test]
    fn keeps_completed_parent_with_incomplete_child_in_position_order() {
        let connection = migrated_connection();
        let parent = create(&connection, "parent", 1000).expect("create parent todo");
        let child = create(&connection, "child", 2000).expect("create child todo");
        let sibling = create(&connection, "sibling", 3000).expect("create sibling todo");
        set_parent_to_previous_root(&connection, child.id).expect("set child parent");
        toggle(&connection, parent.id, true, Some(4000)).expect("complete parent");

        let todos = list(&connection).expect("list todos");

        assert_eq!(
            todos.iter().map(|todo| todo.id).collect::<Vec<_>>(),
            vec![parent.id, child.id, sibling.id]
        );
    }

    #[test]
    fn moves_completed_parent_after_incomplete_roots_when_children_are_complete() {
        let connection = migrated_connection();
        let parent = create(&connection, "parent", 1000).expect("create parent todo");
        let child = create(&connection, "child", 2000).expect("create child todo");
        let sibling = create(&connection, "sibling", 3000).expect("create sibling todo");
        set_parent_to_previous_root(&connection, child.id).expect("set child parent");
        toggle(&connection, parent.id, true, Some(4000)).expect("complete parent");
        toggle(&connection, child.id, true, Some(5000)).expect("complete child");

        let todos = list(&connection).expect("list todos");

        assert_eq!(
            todos.iter().map(|todo| todo.id).collect::<Vec<_>>(),
            vec![sibling.id, parent.id, child.id]
        );
    }

    #[test]
    fn lists_incomplete_and_completed_todos_for_given_day() {
        let connection = migrated_connection();
        let incomplete = create(&connection, "incomplete", 1000).expect("create incomplete todo");
        let completed_before_day = create(&connection, "before", 2000).expect("create before todo");
        let completed_at_start = create(&connection, "at start", 3000).expect("create start todo");
        let completed_before_end =
            create(&connection, "before end", 4000).expect("create before-end todo");
        let completed_at_end = create(&connection, "at end", 5000).expect("create end todo");

        toggle(&connection, completed_before_day.id, true, Some(999)).expect("complete before day");
        toggle(&connection, completed_at_start.id, true, Some(1000)).expect("complete at start");
        toggle(&connection, completed_before_end.id, true, Some(1999))
            .expect("complete before end");
        toggle(&connection, completed_at_end.id, true, Some(2000)).expect("complete at end");

        let todos = list_active_for_day(&connection, 1000, 2000).expect("list active todos");

        assert_eq!(
            todos.iter().map(|todo| todo.id).collect::<Vec<_>>(),
            vec![
                incomplete.id,
                completed_at_start.id,
                completed_before_end.id
            ]
        );
    }

    #[test]
    fn toggles_completion_state() {
        let connection = migrated_connection();
        let todo = create(&connection, "task", 1000).expect("create todo");

        let completed = toggle(&connection, todo.id, true, Some(2000)).expect("complete todo");
        let reopened = toggle(&connection, todo.id, false, None).expect("reopen todo");

        assert!(completed.completed);
        assert_eq!(completed.completed_at_ms, Some(2000));
        assert!(!reopened.completed);
        assert_eq!(reopened.completed_at_ms, None);
    }

    #[test]
    fn updates_title() {
        let connection = migrated_connection();
        let todo = create(&connection, "old title", 1000).expect("create todo");

        let updated = update_title(&connection, todo.id, "new title").expect("update title");

        assert_eq!(updated.id, todo.id);
        assert_eq!(updated.title, "new title");
    }

    #[test]
    fn deletes_todo() {
        let connection = migrated_connection();
        let todo = create(&connection, "task", 1000).expect("create todo");

        delete(&connection, todo.id).expect("delete todo");

        assert!(get(&connection, todo.id)
            .expect("get deleted todo")
            .is_none());
    }

    #[test]
    fn returns_error_when_updating_missing_todo() {
        let connection = migrated_connection();

        let error = update_title(&connection, 1, "missing").expect_err("update should fail");

        assert_eq!(error, "Todo #1 was not found.");
    }

    #[test]
    fn indents_todo_under_previous_root_todo() {
        let connection = migrated_connection();
        let parent = create(&connection, "parent", 1000).expect("create parent todo");
        let child = create(&connection, "child", 2000).expect("create child todo");

        let indented = set_parent_to_previous_root(&connection, child.id).expect("set todo parent");
        let todos = list(&connection).expect("list todos");

        assert_eq!(indented.parent_id, Some(parent.id));
        assert_eq!(indented.position, 1);
        assert_eq!(
            todos.iter().map(|todo| todo.id).collect::<Vec<_>>(),
            vec![parent.id, child.id]
        );
    }

    #[test]
    fn does_not_indent_first_root_todo() {
        let connection = migrated_connection();
        let todo = create(&connection, "first", 1000).expect("create todo");

        let error =
            set_parent_to_previous_root(&connection, todo.id).expect_err("set parent should fail");

        assert_eq!(
            error,
            "This task needs a task above it before it can be indented."
        );
    }

    #[test]
    fn does_not_create_deeper_nesting() {
        let connection = migrated_connection();
        let parent = create(&connection, "parent", 1000).expect("create parent todo");
        let child = create(&connection, "child", 2000).expect("create child todo");
        let indented = set_parent_to_previous_root(&connection, child.id).expect("set todo parent");

        let second_indent =
            set_parent_to_previous_root(&connection, indented.id).expect("set parent again");

        assert_eq!(second_indent.parent_id, Some(parent.id));
        assert_eq!(second_indent.position, 1);
    }

    #[test]
    fn outdents_nested_todo_after_parent() {
        let connection = migrated_connection();
        let parent = create(&connection, "parent", 1000).expect("create parent todo");
        let child = create(&connection, "child", 2000).expect("create child todo");
        let sibling = create(&connection, "sibling", 3000).expect("create sibling todo");
        set_parent_to_previous_root(&connection, child.id).expect("set child parent");

        let outdented = clear_parent(&connection, child.id).expect("clear child parent");
        let todos = list(&connection).expect("list todos");

        assert_eq!(outdented.parent_id, None);
        assert_eq!(outdented.position, parent.position + 1);
        assert_eq!(
            todos.iter().map(|todo| todo.id).collect::<Vec<_>>(),
            vec![parent.id, child.id, sibling.id]
        );
    }
}
