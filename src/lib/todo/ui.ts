import type { Todo } from "$lib/api/todos";

type ChildrenByParent = Record<number, Todo[]>;

export type NowToggleResult = {
  nowTodoId: number | null;
  shouldStartFocus: boolean;
};

export function sortTodos(items: Todo[]) {
  const ids = new Set(items.map((todo) => todo.id));
  const childrenByParent: ChildrenByParent = {};
  const roots: Todo[] = [];

  for (const todo of items) {
    if (todo.parentId === null || !ids.has(todo.parentId)) {
      roots.push(todo);
    } else {
      const children = childrenByParent[todo.parentId] ?? [];
      children.push(todo);
      childrenByParent[todo.parentId] = children;
    }
  }

  roots.sort((a, b) => compareTodos(a, b, childrenByParent));

  return roots.flatMap((root) => [
    root,
    ...(childrenByParent[root.id] ?? []).sort((a, b) =>
      compareTodos(a, b, childrenByParent),
    ),
  ]);
}

export function moveTodoSelection(
  todos: Todo[],
  selectedTodoId: number | null,
  direction: 1 | -1,
) {
  if (todos.length === 0) {
    return null;
  }

  const currentIndex = todos.findIndex((todo) => todo.id === selectedTodoId);
  const nextIndex =
    currentIndex === -1
      ? direction === 1
        ? 0
        : todos.length - 1
      : Math.min(Math.max(currentIndex + direction, 0), todos.length - 1);

  return todos[nextIndex]?.id ?? null;
}

export function toggleNowTodo(
  todos: Todo[],
  selectedTodoId: number | null,
  nowTodoId: number | null,
): NowToggleResult {
  if (selectedTodoId === null) {
    return { nowTodoId, shouldStartFocus: false };
  }

  const selectedTodo = todos.find((todo) => todo.id === selectedTodoId);

  if (!selectedTodo || selectedTodo.completed) {
    return { nowTodoId, shouldStartFocus: false };
  }

  const nextNowTodoId = nowTodoId === selectedTodoId ? null : selectedTodoId;

  return {
    nowTodoId: nextNowTodoId,
    shouldStartFocus: nextNowTodoId !== null,
  };
}

function compareTodos(a: Todo, b: Todo, childrenByParent: ChildrenByParent) {
  const aCompleted = isSortCompleted(a, childrenByParent);
  const bCompleted = isSortCompleted(b, childrenByParent);

  if (aCompleted !== bCompleted) {
    return Number(aCompleted) - Number(bCompleted);
  }

  if (a.position !== b.position) {
    return a.position - b.position;
  }

  return a.id - b.id;
}

function isSortCompleted(todo: Todo, childrenByParent: ChildrenByParent) {
  const children = childrenByParent[todo.id] ?? [];

  return todo.completed && children.every((child) => child.completed);
}
