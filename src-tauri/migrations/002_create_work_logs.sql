CREATE TABLE work_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    body TEXT NOT NULL CHECK (length(trim(body)) > 0),
    created_at_ms INTEGER NOT NULL
);

CREATE INDEX idx_work_logs_created_at ON work_logs (created_at_ms);
