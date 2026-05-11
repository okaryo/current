import { invoke } from "@tauri-apps/api/core";

export type Todo = {
  id: number;
  title: string;
  completed: boolean;
  createdAtMs: number;
  completedAtMs: number | null;
  parentId: number | null;
  position: number;
};

export function listTodos() {
  return invoke<Todo[]>("list_todos");
}

export function createTodo(title: string) {
  return invoke<Todo>("create_todo", { title });
}

export function toggleTodo(id: number) {
  return invoke<Todo>("toggle_todo", { id });
}

export function updateTodoTitle(id: number, title: string) {
  return invoke<Todo>("update_todo_title", { id, title });
}

export function moveTodoUnderPreviousRoot(id: number) {
  return invoke<Todo>("move_todo_under_previous_root", { id });
}

export function promoteTodoToRoot(id: number) {
  return invoke<Todo>("promote_todo_to_root", { id });
}

export function deleteTodo(id: number) {
  return invoke<void>("delete_todo", { id });
}
