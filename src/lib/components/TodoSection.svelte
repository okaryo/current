<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    createTodo,
    deleteTodo,
    listTodos,
    moveTodoUnderPreviousRoot,
    promoteTodoToRoot,
    toggleTodo,
    updateTodoTitle,
    type Todo,
  } from "$lib/api/todos";
  import KeyboardKey from "$lib/components/KeyboardKey.svelte";

  type TodoCommand =
    | "focusAdd"
    | "focusPreferred"
    | "moveDown"
    | "moveUp"
    | "toggleComplete"
    | "edit"
    | "toggleNow"
    | "indent"
    | "outdent"
    | "delete"
    | "clearSelection";

  type TodoCommandRequest = {
    id: number;
    command: TodoCommand;
  } | null;

  type Props = {
    active: boolean;
    title: string;
    shortcut: string;
    commandRequest: TodoCommandRequest;
    onSetNow: () => void;
    onActivate: () => void;
  };

  let { active, title, shortcut, commandRequest, onSetNow, onActivate }: Props =
    $props();

  let todos = $state<Todo[]>([]);
  let todoInput = $state("");
  let todoError = $state<string | null>(null);
  let isLoadingTodos = $state(true);
  let isCreatingTodo = $state(false);
  let selectedTodoId = $state<number | null>(null);
  let nowTodoId = $state<number | null>(null);
  let editingTodoId = $state<number | null>(null);
  let editingTitle = $state("");
  let isSavingEdit = $state(false);
  let isAddInputFocused = $state(false);
  let addTodoInput = $state<HTMLInputElement>();
  let editTodoInput = $state<HTMLInputElement>();
  let taskListElement = $state<HTMLUListElement>();
  let lastCommandRequestId = 0;
  let dayRefreshTimeout: ReturnType<typeof setTimeout> | undefined;
  const selectedTodo = $derived(
    todos.find((todo) => todo.id === selectedTodoId) ?? null,
  );
  const shouldShowFooterActions = $derived(
    active &&
      !isAddInputFocused &&
      selectedTodo !== null &&
      editingTodoId !== selectedTodo.id,
  );

  onMount(() => {
    void loadTodos();

    scheduleNextDayRefresh();

    return () => {
      if (dayRefreshTimeout) {
        clearTimeout(dayRefreshTimeout);
      }
    };
  });

  $effect(() => {
    if (!active) {
      cancelEdit();
    }
  });

  $effect(() => {
    if (!commandRequest || commandRequest.id === lastCommandRequestId) {
      return;
    }

    lastCommandRequestId = commandRequest.id;
    void handleCommand(commandRequest.command);
  });

  $effect(() => {
    if (!active || selectedTodoId === null) {
      return;
    }

    void scrollSelectedTodoIntoView();
  });

  async function loadTodos() {
    isLoadingTodos = true;
    todoError = null;

    try {
      todos = sortTodos(await listTodos());
      ensureSelectedTodo();
    } catch (error) {
      todoError = errorMessage(error);
    } finally {
      isLoadingTodos = false;
    }
  }

  function scheduleNextDayRefresh() {
    if (dayRefreshTimeout) {
      clearTimeout(dayRefreshTimeout);
    }

    dayRefreshTimeout = setTimeout(() => {
      void refreshTodosForNewDay();
    }, msUntilNextLocalDay());
  }

  async function refreshTodosForNewDay() {
    await loadTodos();
    scheduleNextDayRefresh();
  }

  function msUntilNextLocalDay() {
    const now = new Date();
    const nextLocalDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );

    return Math.max(nextLocalDay.getTime() - now.getTime(), 1000);
  }

  async function submitTodo(event: SubmitEvent) {
    event.preventDefault();

    if (isCreatingTodo) {
      return;
    }

    const title = todoInput.trim();

    if (!title) {
      return;
    }

    isCreatingTodo = true;
    todoError = null;

    try {
      const todo = await createTodo(title);
      todos = sortTodos([...todos, todo]);
      selectedTodoId = null;
      todoInput = "";
    } catch (error) {
      todoError = errorMessage(error);
    } finally {
      isCreatingTodo = false;
    }
  }

  async function toggleTodoCompletion(id: number) {
    onActivate();
    todoError = null;

    try {
      const updatedTodo = await toggleTodo(id);
      todos = sortTodos(
        todos.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo)),
      );
      selectedTodoId = updatedTodo.id;

      if (updatedTodo.completed && nowTodoId === updatedTodo.id) {
        nowTodoId = null;
      }
    } catch (error) {
      todoError = errorMessage(error);
    }
  }

  async function submitEdit(event: SubmitEvent, id: number) {
    event.preventDefault();

    if (isSavingEdit) {
      return;
    }

    const title = editingTitle.trim();

    if (!title) {
      cancelEdit();
      return;
    }

    isSavingEdit = true;
    todoError = null;

    try {
      const updatedTodo = await updateTodoTitle(id, title);
      todos = sortTodos(
        todos.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo)),
      );
      editingTodoId = null;
      editingTitle = "";
      selectedTodoId = updatedTodo.id;
    } catch (error) {
      todoError = errorMessage(error);
    } finally {
      isSavingEdit = false;
    }
  }

  async function handleCommand(command: TodoCommand) {
    switch (command) {
      case "focusAdd":
        await focusAddTodoInput();
        break;
      case "focusPreferred":
        await focusPreferredTodoTarget();
        break;
      case "moveDown":
        moveSelection(1);
        break;
      case "moveUp":
        moveSelection(-1);
        break;
      case "toggleComplete":
        if (selectedTodoId !== null) {
          await toggleTodoCompletion(selectedTodoId);
        }
        break;
      case "edit":
        await startEditSelectedTodo();
        break;
      case "toggleNow":
        toggleNowTodo();
        break;
      case "indent":
        await indentSelectedTodo();
        break;
      case "outdent":
        await outdentSelectedTodo();
        break;
      case "delete":
        await deleteSelectedTodo();
        break;
      case "clearSelection":
        clearTodoSelection();
        break;
    }
  }

  async function deleteSelectedTodo() {
    if (selectedTodoId === null) {
      return;
    }

    const deletedTodoId = selectedTodoId;
    const deletedTodoIndex = todos.findIndex(
      (todo) => todo.id === deletedTodoId,
    );

    if (deletedTodoIndex === -1) {
      return;
    }

    todoError = null;

    try {
      await deleteTodo(deletedTodoId);

      const nextTodos = sortTodos(await listTodos());
      const nextSelectedIndex = Math.min(
        deletedTodoIndex,
        nextTodos.length - 1,
      );

      todos = nextTodos;
      selectedTodoId = nextTodos[nextSelectedIndex]?.id ?? null;

      if (nowTodoId === deletedTodoId) {
        nowTodoId = null;
      }

      if (editingTodoId === deletedTodoId) {
        cancelEdit();
      }
    } catch (error) {
      todoError = errorMessage(error);
    }
  }

  async function indentSelectedTodo() {
    if (selectedTodoId === null) {
      return;
    }

    todoError = null;

    try {
      const updatedTodo = await moveTodoUnderPreviousRoot(selectedTodoId);
      todos = sortTodos(await listTodos());
      selectedTodoId = updatedTodo.id;
    } catch (error) {
      todoError = errorMessage(error);
    }
  }

  async function outdentSelectedTodo() {
    if (selectedTodoId === null) {
      return;
    }

    todoError = null;

    try {
      const updatedTodo = await promoteTodoToRoot(selectedTodoId);
      todos = sortTodos(await listTodos());
      selectedTodoId = updatedTodo.id;
    } catch (error) {
      todoError = errorMessage(error);
    }
  }

  function selectTodo(id: number) {
    onActivate();
    selectedTodoId = id;
  }

  function moveSelection(direction: 1 | -1) {
    if (todos.length === 0) {
      selectedTodoId = null;
      return;
    }

    const currentIndex = todos.findIndex((todo) => todo.id === selectedTodoId);
    const nextIndex =
      currentIndex === -1
        ? direction === 1
          ? 0
          : todos.length - 1
        : Math.min(Math.max(currentIndex + direction, 0), todos.length - 1);

    selectedTodoId = todos[nextIndex]?.id ?? null;
  }

  function toggleNowTodo() {
    if (selectedTodoId === null) {
      return;
    }

    const selectedTodo = todos.find((todo) => todo.id === selectedTodoId);

    if (!selectedTodo || selectedTodo.completed) {
      return;
    }

    const nextNowTodoId = nowTodoId === selectedTodoId ? null : selectedTodoId;

    nowTodoId = nextNowTodoId;

    if (nextNowTodoId !== null) {
      onSetNow();
    }
  }

  async function startEditSelectedTodo() {
    if (selectedTodoId === null) {
      return;
    }

    const selectedTodo = todos.find((todo) => todo.id === selectedTodoId);

    if (!selectedTodo) {
      return;
    }

    editingTodoId = selectedTodo.id;
    editingTitle = selectedTodo.title;
    await tick();
    editTodoInput?.focus();
    editTodoInput?.select();
  }

  function cancelEdit() {
    editingTodoId = null;
    editingTitle = "";
  }

  async function focusAddTodoInput() {
    onActivate();
    clearTodoSelection();
    await tick();
    addTodoInput?.focus();
  }

  async function focusTodoListFromAddInput() {
    const firstTodoId = todos[0]?.id ?? null;

    addTodoInput?.blur();
    selectedTodoId = firstTodoId;
    editingTodoId = null;
    editingTitle = "";

    if (firstTodoId === null) {
      return;
    }

    await tick();

    taskListElement?.focus({ preventScroll: true });
  }

  async function focusPreferredTodoTarget() {
    onActivate();

    if (hasSelectableTodo(selectedTodoId)) {
      cancelEdit();
      return;
    }

    const nextSelectedTodo =
      todos.find((todo) => todo.id === nowTodoId) ?? todos[0];

    if (nextSelectedTodo) {
      selectedTodoId = nextSelectedTodo.id;
      cancelEdit();
      return;
    }

    await focusAddTodoInput();
  }

  function clearTodoSelection() {
    selectedTodoId = null;
    editingTodoId = null;
    editingTitle = "";
  }

  function ensureSelectedTodo() {
    if (todos.length === 0) {
      selectedTodoId = null;
      nowTodoId = null;
      return;
    }

    if (!todos.some((todo) => todo.id === selectedTodoId)) {
      selectedTodoId = todos[0]?.id ?? null;
    }

    if (!todos.some((todo) => todo.id === nowTodoId)) {
      nowTodoId = null;
    }
  }

  function hasSelectableTodo(id: number | null) {
    return id !== null && todos.some((todo) => todo.id === id);
  }

  async function scrollSelectedTodoIntoView() {
    await tick();

    const selectedTodoElement = taskListElement?.querySelector<HTMLElement>(
      `[data-todo-id="${selectedTodoId}"]`,
    );

    selectedTodoElement?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }

  type ChildrenByParent = Record<number, Todo[]>;

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

  function sortTodos(items: Todo[]) {
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

  function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
</script>

<section
  class="panel todo"
  class:panel-active={active}
  aria-labelledby="todo-title"
>
  <header class="panel-header inline-header">
    <div class="title-row">
      <p class="section-label section-label-todo">{title}</p>
      <KeyboardKey value={shortcut} label="Command 2" />
    </div>
    {#if active}
      <div class="hint-row" aria-label="Todo shortcuts">
        {#if isAddInputFocused}
          <span><KeyboardKey value="Esc" label="Escape" />Focus List</span>
        {:else}
          <span><KeyboardKey value="i" />Focus Add</span>
          <span><KeyboardKey value="j" />/<KeyboardKey value="k" />Move</span>
        {/if}
      </div>
    {/if}
  </header>

  <h2 id="todo-title" class="sr-only">Todo</h2>

  <form class="quick-input" onsubmit={submitTodo}>
    <span aria-hidden="true">+</span>
    <input
      type="text"
      placeholder="Add a new task... (Enter to confirm)"
      bind:value={todoInput}
      bind:this={addTodoInput}
      disabled={isCreatingTodo}
      onfocus={() => {
        isAddInputFocused = true;
        onActivate();
        clearTodoSelection();
      }}
      onkeydown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          void focusTodoListFromAddInput();
        }
      }}
      onblur={() => {
        isAddInputFocused = false;
      }}
    />
  </form>

  <div class="task-list-shell">
    <ul
      class="task-list"
      aria-label="Todo list"
      tabindex="-1"
      bind:this={taskListElement}
    >
      {#if isLoadingTodos}
        <li class="task-empty">Loading todos...</li>
      {:else if todos.length === 0}
        <li class="task-empty">No todos yet.</li>
      {:else}
        {#each todos as todo (todo.id)}
          <li
            data-todo-id={todo.id}
            class:task-selected={active && selectedTodoId === todo.id}
            class:task-now={nowTodoId === todo.id}
            class:task-dimmed={nowTodoId !== null &&
              nowTodoId !== todo.id &&
              !todo.completed}
            class:task-completed={todo.completed}
            class:task-child={todo.parentId !== null}
          >
            <button
              class="task-check"
              type="button"
              aria-label={todo.completed
                ? `Mark "${todo.title}" as incomplete`
                : `Mark "${todo.title}" as complete`}
              onclick={() => toggleTodoCompletion(todo.id)}
            >
              {#if todo.completed}
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              {/if}
            </button>
            {#if editingTodoId === todo.id}
              <form
                class="task-edit"
                onsubmit={(event) => submitEdit(event, todo.id)}
              >
                <input
                  type="text"
                  bind:this={editTodoInput}
                  bind:value={editingTitle}
                  disabled={isSavingEdit}
                  onkeydown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      cancelEdit();
                    }
                  }}
                />
              </form>
            {:else}
              <button
                class="task-title-button"
                type="button"
                onclick={() => selectTodo(todo.id)}
              >
                <span class="task-title">{todo.title}</span>
              </button>
            {/if}
            <div class="task-meta">
              {#if nowTodoId === todo.id}
                <span class="now-badge">Now</span>
              {/if}
            </div>
          </li>
        {/each}
      {/if}
    </ul>

    {#if shouldShowFooterActions && selectedTodo !== null}
      <footer class="todo-footer">
        <div class="todo-footer-actions" aria-label="Selected todo shortcuts">
          <span><KeyboardKey value="e" />Edit</span>
          <span>
            <KeyboardKey value="Space" />{selectedTodo.completed
              ? "Incomplete"
              : "Complete"}
          </span>
          {#if !selectedTodo.completed}
            <span>
              <KeyboardKey value="Enter" />{nowTodoId === selectedTodo.id
                ? "Unset Now"
                : "Set Now"}
            </span>
          {/if}
          {#if selectedTodo.parentId === null}
            <span><KeyboardKey value="Tab" />Indent</span>
          {:else}
            <span><KeyboardKey value="⇧Tab" />Outdent</span>
          {/if}
          <span><KeyboardKey value="D" />Delete</span>
        </div>
      </footer>
    {/if}
  </div>

  {#if todoError}
    <p class="todo-error" role="alert">{todoError}</p>
  {/if}
</section>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    justify-content: start;
    position: relative;
    min-width: 0;
    min-height: 0;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 0.85rem;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.04),
      rgba(255, 255, 255, 0.02)
    );
    opacity: 0.7;
    filter: saturate(0.82);
    transition:
      border-color 120ms ease,
      filter 120ms ease,
      box-shadow 120ms ease,
      opacity 120ms ease;
  }

  .panel-active {
    border-color: rgba(255, 255, 255, 0.18);
    opacity: 1;
    filter: saturate(1);
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.055),
      rgba(255, 255, 255, 0.026)
    );
  }

  .todo.panel-active {
    border-color: #44d16b;
    box-shadow:
      0 0 0 1px rgba(68, 209, 107, 0.35),
      0 0 0 4px rgba(68, 209, 107, 0.08),
      0 0.8rem 2rem rgba(68, 209, 107, 0.1);
  }

  button,
  input {
    font: inherit;
  }

  button {
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #e8ecf2;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.11),
      rgba(255, 255, 255, 0.05)
    );
    cursor: pointer;
  }

  button:focus-visible {
    outline: 1px solid rgba(68, 209, 107, 0.8);
    outline-offset: 2px;
  }

  input:focus-visible {
    outline: none;
  }

  .panel-header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.6rem;
  }

  .inline-header {
    align-items: center;
  }

  .title-row,
  .hint-row {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    min-width: 0;
  }

  .hint-row {
    flex-wrap: wrap;
    justify-content: flex-end;
    color: #9ba3b0;
    font-size: 0.86rem;
  }

  .hint-row span {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .section-label {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: 0;
  }

  .section-label-todo {
    color: #44d16b;
  }

  .task-list-shell {
    display: flex;
    flex-direction: column;
    flex: 0 1 auto;
    min-height: 0;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
  }

  .task-list {
    flex: 0 1 auto;
    overflow-x: hidden;
    overflow-y: auto;
    min-height: 0;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .task-list:focus {
    outline: none;
  }

  .task-list li {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    position: relative;
    gap: 0.75rem;
    min-height: 2.75rem;
    padding: 0.45rem 0.8rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    color: #e4e8ef;
  }

  .task-selected {
    background: rgba(255, 255, 255, 0.05);
    box-shadow: inset 3px 0 0 rgba(68, 209, 107, 0.7);
  }

  .task-list li.task-child {
    padding-left: 2.85rem;
  }

  .task-child::before {
    content: "";
    position: absolute;
    left: 1.25rem;
    top: 0.25rem;
    width: 0.8rem;
    height: 1.2rem;
    border-left: 1px solid rgba(155, 163, 176, 0.36);
    border-bottom: 1px solid rgba(155, 163, 176, 0.36);
    border-bottom-left-radius: 5px;
    pointer-events: none;
  }

  .task-now {
    background: rgba(68, 209, 107, 0.08);
    box-shadow:
      inset 3px 0 0 rgba(68, 209, 107, 0.85),
      0 0 0 1px rgba(68, 209, 107, 0.18);
  }

  .task-completed {
    color: #7f8794;
  }

  .task-dimmed .task-title,
  .task-completed .task-title {
    color: #858d9a;
  }

  .task-now .task-title {
    color: #f4f7fb;
    font-weight: 700;
  }

  .task-completed .task-title {
    text-decoration: line-through;
  }

  .task-check {
    display: grid;
    place-items: center;
    width: 1rem;
    height: 1rem;
    border: 1px solid #8c95a4;
    border-radius: 4px;
    padding: 0;
    background: rgba(0, 0, 0, 0.15);
  }

  .task-check:hover {
    border-color: #44d16b;
  }

  .task-completed .task-check {
    border-color: #44d16b;
    color: #0b0d10;
    background: #44d16b;
  }

  .task-check svg {
    width: 0.8rem;
    height: 0.8rem;
  }

  .task-title {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .task-title-button {
    display: block;
    overflow: hidden;
    width: 100%;
    min-width: 0;
    border: 0;
    padding: 0;
    color: inherit;
    background: transparent;
    text-align: left;
  }

  .task-edit {
    min-width: 0;
  }

  .task-edit input {
    width: 100%;
    min-width: 0;
    border: 0;
    border-bottom: 1px solid rgba(68, 209, 107, 0.7);
    color: #e8ecf2;
    caret-color: #44d16b;
    background: transparent;
  }

  .task-edit:focus-within {
    box-shadow: inset 0 -1px 0 #44d16b;
  }

  .now-badge {
    border: 1px solid rgba(68, 209, 107, 0.35);
    border-radius: 999px;
    padding: 0.1rem 0.5rem;
    color: #78e596;
    font-size: 0.76rem;
    font-weight: 650;
  }

  .task-meta {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.6rem;
    min-width: 0;
  }

  .task-empty {
    grid-template-columns: 1fr;
    color: #858d9a;
  }

  .quick-input {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 0.7rem;
    flex: 0 0 auto;
    margin-bottom: 0.7rem;
    border: 1px solid rgba(68, 209, 107, 0.52);
    border-radius: 8px;
    padding: 0.65rem 0.8rem;
    color: #7f8794;
    background: rgba(4, 8, 12, 0.28);
  }

  .quick-input input {
    min-width: 0;
    border: 0;
    color: #e8ecf2;
    caret-color: #44d16b;
    background: transparent;
    resize: none;
  }

  .quick-input:focus-within {
    border-color: #44d16b;
    box-shadow:
      0 0 0 1px rgba(68, 209, 107, 0.35),
      0 0 0 4px rgba(68, 209, 107, 0.08);
  }

  .quick-input input:disabled {
    opacity: 0.65;
  }

  .quick-input input::placeholder {
    color: #858d9a;
  }

  .todo-error {
    margin: 0.55rem 0 0;
    color: #ff8a93;
    font-size: 0.88rem;
    overflow-wrap: anywhere;
  }

  .todo-footer {
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    flex: 0 0 auto;
    min-height: 2.4rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding: 0.45rem 0.75rem;
    color: #9ba3b0;
    font-size: 0.76rem;
    background: rgba(9, 12, 16, 0.18);
  }

  .todo-footer-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 0.32rem 0.62rem;
    width: 100%;
    min-width: 0;
  }

  .todo-footer-actions span {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    flex: 0 0 auto;
    white-space: nowrap;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }

</style>
