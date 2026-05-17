import { describe, expect, it } from "vitest";
import { moveTodoSelection, sortTodos, toggleNowTodo } from "$lib/todo/ui";
import type { Todo } from "$lib/api/todos";

function todo(overrides: Partial<Todo> & Pick<Todo, "id" | "title">): Todo {
  return {
    completed: false,
    createdAtMs: 0,
    completedAtMs: null,
    parentId: null,
    position: 0,
    ...overrides,
  };
}

describe("sortTodos", () => {
  it("keeps children directly after their root and sorts by position", () => {
    const sorted = sortTodos([
      todo({ id: 4, title: "child 2", parentId: 1, position: 2 }),
      todo({ id: 2, title: "root 2", position: 2 }),
      todo({ id: 3, title: "child 1", parentId: 1, position: 1 }),
      todo({ id: 1, title: "root 1", position: 1 }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual([1, 3, 4, 2]);
  });

  it("treats todos with missing parents as roots", () => {
    const sorted = sortTodos([
      todo({ id: 2, title: "orphan", parentId: 99, position: 1 }),
      todo({ id: 1, title: "root", position: 2 }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual([2, 1]);
  });

  it("keeps a completed parent with incomplete children in the incomplete group", () => {
    const sorted = sortTodos([
      todo({ id: 1, title: "done root", completed: true, position: 1 }),
      todo({ id: 2, title: "active root", position: 2 }),
      todo({ id: 3, title: "active child", parentId: 1, position: 1 }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual([1, 3, 2]);
  });

  it("moves completed roots after incomplete roots when all children are complete", () => {
    const sorted = sortTodos([
      todo({ id: 1, title: "done root", completed: true, position: 1 }),
      todo({ id: 2, title: "active root", position: 2 }),
      todo({
        id: 3,
        title: "done child",
        completed: true,
        parentId: 1,
        position: 1,
      }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual([2, 1, 3]);
  });
});

describe("moveTodoSelection", () => {
  const todos = [
    todo({ id: 1, title: "first" }),
    todo({ id: 2, title: "second" }),
    todo({ id: 3, title: "third" }),
  ];

  it("selects the first or last item when nothing is selected", () => {
    expect(moveTodoSelection(todos, null, 1)).toBe(1);
    expect(moveTodoSelection(todos, null, -1)).toBe(3);
  });

  it("moves within bounds", () => {
    expect(moveTodoSelection(todos, 1, 1)).toBe(2);
    expect(moveTodoSelection(todos, 3, 1)).toBe(3);
    expect(moveTodoSelection(todos, 1, -1)).toBe(1);
  });

  it("clears selection for an empty list", () => {
    expect(moveTodoSelection([], 1, 1)).toBeNull();
  });
});

describe("toggleNowTodo", () => {
  const todos = [
    todo({ id: 1, title: "active" }),
    todo({ id: 2, title: "completed", completed: true }),
  ];

  it("sets an incomplete selected todo as Now and starts focus", () => {
    expect(toggleNowTodo(todos, 1, null)).toEqual({
      nowTodoId: 1,
      shouldStartFocus: true,
    });
  });

  it("unsets the current Now todo without restarting focus", () => {
    expect(toggleNowTodo(todos, 1, 1)).toEqual({
      nowTodoId: null,
      shouldStartFocus: false,
    });
  });

  it("ignores completed, missing, or empty selections", () => {
    expect(toggleNowTodo(todos, 2, 1)).toEqual({
      nowTodoId: 1,
      shouldStartFocus: false,
    });
    expect(toggleNowTodo(todos, 99, 1)).toEqual({
      nowTodoId: 1,
      shouldStartFocus: false,
    });
    expect(toggleNowTodo(todos, null, 1)).toEqual({
      nowTodoId: 1,
      shouldStartFocus: false,
    });
  });
});
