CREATE TABLE todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    completed INTEGER NOT NULL DEFAULT 0,
    created_at_ms INTEGER NOT NULL,
    completed_at_ms INTEGER
);

CREATE INDEX idx_todos_completed_created_at ON todos (completed, created_at_ms);
