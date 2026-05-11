ALTER TABLE todos
ADD COLUMN parent_id INTEGER REFERENCES todos (id) ON DELETE SET NULL;

ALTER TABLE todos
ADD COLUMN position INTEGER NOT NULL DEFAULT 0;

UPDATE todos
SET position = id
WHERE position = 0;

CREATE INDEX idx_todos_parent_position ON todos (parent_id, position);
