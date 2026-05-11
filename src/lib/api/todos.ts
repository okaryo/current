import { invoke } from "@tauri-apps/api/core";

export type Todo = {
  id: number;
  title: string;
  completed: boolean;
  createdAtMs: number;
  completedAtMs: number | null;
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

export function deleteTodo(id: number) {
  return invoke<void>("delete_todo", { id });
}
