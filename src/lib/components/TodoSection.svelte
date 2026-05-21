<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import { ChevronRight } from "@lucide/svelte";
  import { listen, type UnlistenFn } from "@tauri-apps/api/event";
  import { createCurrentAudio } from "$lib/audio/player";
  import { todoCompletionSounds } from "$lib/audio/sounds";
  import {
    createTodo,
    createSubtask,
    deleteTodo,
    listTodos,
    toggleTodo,
    updateTodoTitle,
    type Todo,
  } from "$lib/api/todos";
  import KeyboardKey from "$lib/components/KeyboardKey.svelte";
  import { effectWithDeps } from "$lib/effectWithDeps.svelte";
  import {
    moveTodoSelection,
    sortTodos,
    toggleNowTodo as toggleNowTodoState,
  } from "$lib/todo/ui";

  type TodoCommand =
    | "focusPreferred"
    | "moveDown"
    | "moveUp"
    | "toggleComplete"
    | "edit"
    | "toggleNow"
    | "addTodo"
    | "addSubtask"
    | "expandSubtasks"
    | "collapseSubtasks"
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
  let todoError = $state<string | null>(null);
  let isLoadingTodos = $state(true);
  let selectedTodoId = $state<number | null>(null);
  let nowTodoId = $state<number | null>(null);
  let editingTodoId = $state<number | null>(null);
  let editingTitle = $state("");
  let isSavingEdit = $state(false);
  let editTodoInput = $state<HTMLInputElement>();
  let isDraftingTodo = $state(false);
  let draftTodoTitle = $state("");
  let isSavingTodo = $state(false);
  let draftTodoInput = $state<HTMLInputElement>();
  let draftSubtaskParentId = $state<number | null>(null);
  let draftSubtaskTitle = $state("");
  let isSavingSubtask = $state(false);
  let draftSubtaskInput = $state<HTMLInputElement>();
  let taskListElement = $state<HTMLUListElement>();
  let todoFooterElement = $state<HTMLElement>();
  let hasScrollableTaskList = $state(false);
  let collapsedParentIds = $state<number[]>([]);
  let lastCommandRequestId = 0;
  let dayRefreshTimeout: ReturnType<typeof setTimeout> | undefined;
  let unlistenTodoCreated: UnlistenFn | undefined;
  const todoCompletionAudio = createCurrentAudio({
    src: todoCompletionSounds[0].src,
    failureMessage: "Failed to play TODO completion sound.",
  });
  const selectedTodo = $derived(
    todos.find((todo) => todo.id === selectedTodoId) ?? null,
  );
  const isInputMode = $derived(
    editingTodoId !== null || isDraftingTodo || draftSubtaskParentId !== null,
  );
  const shouldShowFooterActions = $derived(active && !isInputMode);
  const visibleTodos = $derived(
    todos.filter(
      (todo) =>
        todo.parentId === null || !collapsedParentIds.includes(todo.parentId),
    ),
  );

  onMount(() => {
    todoCompletionAudio.load();
    void loadTodos();

    if (isTauriRuntime()) {
      void listen<Todo>("todo:created", (event) => {
        addTodo(event.payload);
      }).then((unlisten) => {
        unlistenTodoCreated = unlisten;
      });
    }

    scheduleNextDayRefresh();

    return () => {
      if (dayRefreshTimeout) {
        clearTimeout(dayRefreshTimeout);
      }
    };
  });

  onDestroy(() => {
    unlistenTodoCreated?.();
    todoCompletionAudio.dispose();
  });

  $effect(() => {
    if (!active) {
      cancelEdit();
      cancelDraftTodo();
      cancelDraftSubtask();
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

  effectWithDeps(
    () => {
      void updateTaskListScrollState();
    },
    () => [
      todos,
      isDraftingTodo,
      draftSubtaskParentId,
      collapsedParentIds,
      shouldShowFooterActions,
    ],
  );

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

  async function toggleTodoCompletion(id: number) {
    onActivate();
    todoError = null;

    const todo = todos.find((todo) => todo.id === id);
    const shouldPlayCompletionSound = todo !== undefined && !todo.completed;

    if (shouldPlayCompletionSound) {
      todoCompletionAudio.play();
    }

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
      case "addTodo":
        await startAddTodo();
        break;
      case "addSubtask":
        await startAddSubtaskForSelectedTodo();
        break;
      case "expandSubtasks":
        expandSelectedTodo();
        break;
      case "collapseSubtasks":
        collapseSelectedTodo();
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

  async function startAddSubtaskForSelectedTodo() {
    if (selectedTodoId === null) {
      return;
    }

    const selectedTodo = todos.find((todo) => todo.id === selectedTodoId);

    if (!selectedTodo) {
      return;
    }

    const parentId = selectedTodo.parentId ?? selectedTodo.id;

    todoError = null;
    cancelEdit();
    cancelDraftTodo();
    expandParent(parentId);
    draftSubtaskParentId = parentId;
    draftSubtaskTitle = "";
    await tick();
    draftSubtaskInput?.focus();
  }

  async function startAddTodo() {
    todoError = null;
    cancelEdit();
    cancelDraftSubtask();
    isDraftingTodo = true;
    draftTodoTitle = "";
    await tick();
    draftTodoInput?.focus();
  }

  async function submitDraftTodo(event: SubmitEvent) {
    event.preventDefault();

    if (isSavingTodo || !isDraftingTodo) {
      return;
    }

    const title = draftTodoTitle.trim();

    if (!title) {
      cancelDraftTodo();
      return;
    }

    isSavingTodo = true;
    todoError = null;

    try {
      const createdTodo = await createTodo(title);
      todos = sortTodos(await listTodos());
      selectedTodoId = createdTodo.id;
      cancelDraftTodo();
    } catch (error) {
      todoError = errorMessage(error);
    } finally {
      isSavingTodo = false;
    }
  }

  function cancelDraftTodo() {
    isDraftingTodo = false;
    draftTodoTitle = "";
  }

  async function submitDraftSubtask(event: SubmitEvent) {
    event.preventDefault();

    if (isSavingSubtask || draftSubtaskParentId === null) {
      return;
    }

    const title = draftSubtaskTitle.trim();

    if (!title) {
      cancelDraftSubtask();
      return;
    }

    isSavingSubtask = true;
    todoError = null;

    try {
      const createdTodo = await createSubtask(draftSubtaskParentId, title);
      todos = sortTodos(await listTodos());
      selectedTodoId = createdTodo.id;
      cancelDraftSubtask();
    } catch (error) {
      todoError = errorMessage(error);
    } finally {
      isSavingSubtask = false;
    }
  }

  function cancelDraftSubtask() {
    draftSubtaskParentId = null;
    draftSubtaskTitle = "";
  }

  function selectTodo(id: number) {
    onActivate();
    selectedTodoId = id;
  }

  function selectTodoFromRow(todo: Todo) {
    selectTodo(todo.id);

    if (todo.parentId === null && hasSubtasks(todo)) {
      toggleParentCollapsed(todo);
    }
  }

  function rowActionLabel(todo: Todo) {
    if (todo.parentId !== null || !hasSubtasks(todo)) {
      return `Select "${todo.title}"`;
    }

    return isParentCollapsed(todo)
      ? `Expand subtasks for "${todo.title}"`
      : `Collapse subtasks for "${todo.title}"`;
  }

  function moveSelection(direction: 1 | -1) {
    selectedTodoId = moveTodoSelection(visibleTodos, selectedTodoId, direction);
  }

  function toggleNowTodo() {
    const result = toggleNowTodoState(todos, selectedTodoId, nowTodoId);

    nowTodoId = result.nowTodoId;

    if (result.shouldStartFocus) {
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

  async function focusPreferredTodoTarget() {
    onActivate();

    if (hasSelectableTodo(selectedTodoId)) {
      cancelEdit();
      await tick();
      taskListElement?.focus({ preventScroll: true });
      return;
    }

    const nextSelectedTodo =
      visibleTodos.find((todo) => todo.id === nowTodoId) ?? visibleTodos[0];

    if (nextSelectedTodo) {
      selectedTodoId = nextSelectedTodo.id;
      cancelEdit();
      await tick();
      taskListElement?.focus({ preventScroll: true });
      return;
    }

    clearTodoSelection();
    await tick();
    taskListElement?.focus({ preventScroll: true });
  }

  function clearTodoSelection() {
    selectedTodoId = null;
    editingTodoId = null;
    editingTitle = "";
    cancelDraftTodo();
    cancelDraftSubtask();
  }

  function ensureSelectedTodo() {
    if (todos.length === 0) {
      selectedTodoId = null;
      nowTodoId = null;
      return;
    }

    pruneCollapsedParents();

    if (!visibleTodos.some((todo) => todo.id === selectedTodoId)) {
      selectedTodoId = visibleTodos[0]?.id ?? null;
    }

    if (!todos.some((todo) => todo.id === nowTodoId)) {
      nowTodoId = null;
    }
  }

  function addTodo(todo: Todo) {
    if (todos.some((existingTodo) => existingTodo.id === todo.id)) {
      return;
    }

    todos = sortTodos([...todos, todo]);
    ensureSelectedTodo();
  }

  function hasSelectableTodo(id: number | null) {
    return id !== null && visibleTodos.some((todo) => todo.id === id);
  }

  function shouldShowDraftSubtaskAfter(todo: Todo) {
    if (draftSubtaskParentId === null) {
      return false;
    }

    if (
      todo.id !== draftSubtaskParentId &&
      todo.parentId !== draftSubtaskParentId
    ) {
      return false;
    }

    const index = todos.findIndex((item) => item.id === todo.id);
    const nextTodo = todos[index + 1];

    return nextTodo?.parentId !== draftSubtaskParentId;
  }

  function hasSubtasks(todo: Todo) {
    return todos.some((item) => item.parentId === todo.id);
  }

  function isParentCollapsed(todo: Todo) {
    return collapsedParentIds.includes(todo.id);
  }

  function toggleParentCollapsed(todo: Todo) {
    onActivate();

    if (!hasSubtasks(todo)) {
      return;
    }

    if (collapsedParentIds.includes(todo.id)) {
      collapsedParentIds = collapsedParentIds.filter((id) => id !== todo.id);
    } else {
      collapsedParentIds = [...collapsedParentIds, todo.id];

      if (draftSubtaskParentId === todo.id) {
        cancelDraftSubtask();
      }

      if (
        todos.some(
          (item) => item.parentId === todo.id && item.id === selectedTodoId,
        )
      ) {
        selectedTodoId = todo.id;
      }
    }
  }

  function expandSelectedTodo() {
    const selectedTodo = todos.find((todo) => todo.id === selectedTodoId);

    if (
      !selectedTodo ||
      selectedTodo.parentId !== null ||
      !hasSubtasks(selectedTodo)
    ) {
      return;
    }

    expandParent(selectedTodo.id);
  }

  function collapseSelectedTodo() {
    const selectedTodo = todos.find((todo) => todo.id === selectedTodoId);

    if (!selectedTodo) {
      return;
    }

    if (selectedTodo.parentId !== null) {
      selectedTodoId = selectedTodo.parentId;
      return;
    }

    if (!hasSubtasks(selectedTodo) || isParentCollapsed(selectedTodo)) {
      return;
    }

    collapsedParentIds = [...collapsedParentIds, selectedTodo.id];

    if (draftSubtaskParentId === selectedTodo.id) {
      cancelDraftSubtask();
    }
  }

  function expandParent(parentId: number) {
    if (!collapsedParentIds.includes(parentId)) {
      return;
    }

    collapsedParentIds = collapsedParentIds.filter((id) => id !== parentId);
  }

  function pruneCollapsedParents() {
    const parentIds = new Set(
      todos.filter((todo) => todo.parentId === null).map((todo) => todo.id),
    );
    const nextCollapsedParentIds = collapsedParentIds.filter((id) =>
      parentIds.has(id),
    );

    if (nextCollapsedParentIds.length !== collapsedParentIds.length) {
      collapsedParentIds = nextCollapsedParentIds;
    }
  }

  function shouldShowParentConnector(todo: Todo) {
    return (
      todo.parentId === null &&
      !isParentCollapsed(todo) &&
      (todos.some((item) => item.parentId === todo.id) ||
        draftSubtaskParentId === todo.id)
    );
  }

  async function updateTaskListScrollState() {
    await tick();

    if (!taskListElement) {
      hasScrollableTaskList = false;
      return;
    }

    hasScrollableTaskList =
      taskListElement.scrollHeight > taskListElement.clientHeight + 1;
  }

  async function scrollSelectedTodoIntoView() {
    await tick();
    await updateTaskListScrollState();

    const selectedTodoElement = taskListElement?.querySelector<HTMLElement>(
      `[data-todo-id="${selectedTodoId}"]`,
    );

    selectedTodoElement?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });

    scrollSelectedTodoAboveFooter(selectedTodoElement);
  }

  function scrollSelectedTodoAboveFooter(
    selectedTodoElement?: HTMLElement | null,
  ) {
    if (!selectedTodoElement || !taskListElement || !todoFooterElement) {
      return;
    }

    const selectedRect = selectedTodoElement.getBoundingClientRect();
    const footerRect = todoFooterElement.getBoundingClientRect();
    const overlap = selectedRect.bottom - footerRect.top + 8;

    if (overlap > 0) {
      taskListElement.scrollTop += overlap;
    }
  }

  function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  function isTauriRuntime() {
    return "__TAURI_INTERNALS__" in window;
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
        {#if isInputMode}
          <span><KeyboardKey value="Enter" size="compact" />Save</span>
          <span
            ><KeyboardKey
              value="Esc"
              label="Escape"
              size="compact"
            />Cancel</span
          >
        {:else}
          <span
            ><KeyboardKey value="j" size="compact" /><KeyboardKey
              value="k"
              size="compact"
            />Move</span
          >
        {/if}
      </div>
    {/if}
  </header>

  <h2 id="todo-title" class="sr-only">Todo</h2>

  <div class="task-list-shell">
    <ul
      class="task-list"
      class:task-list-footer-visible={shouldShowFooterActions &&
        hasScrollableTaskList}
      aria-label="Todo list"
      tabindex="-1"
      bind:this={taskListElement}
    >
      {#if isLoadingTodos}
        <li class="task-empty">Loading todos...</li>
      {:else if todos.length === 0 && !isDraftingTodo}
        <li class="task-empty">No todos yet.</li>
      {:else}
        {#if isDraftingTodo}
          <li class="task-draft">
            <span class="task-check task-check-placeholder"></span>
            <form class="task-edit" onsubmit={submitDraftTodo}>
              <input
                type="text"
                bind:this={draftTodoInput}
                bind:value={draftTodoTitle}
                disabled={isSavingTodo}
                placeholder="Add a todo..."
                onkeydown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelDraftTodo();
                  }
                }}
              />
            </form>
            <div class="task-meta"></div>
          </li>
        {/if}
        {#each visibleTodos as todo (todo.id)}
          <li
            data-todo-id={todo.id}
            class:task-selected={active && selectedTodoId === todo.id}
            class:task-now={nowTodoId === todo.id}
            class:task-dimmed={nowTodoId !== null &&
              nowTodoId !== todo.id &&
              !todo.completed}
            class:task-completed={todo.completed}
            class:task-root={todo.parentId === null}
            class:task-child={todo.parentId !== null}
            class:task-parent-connected={shouldShowParentConnector(todo)}
          >
            {#if todo.parentId === null && hasSubtasks(todo)}
              <span
                class="task-tree-indicator"
                class:task-tree-indicator-open={!isParentCollapsed(todo)}
                aria-hidden="true"
              >
                <ChevronRight aria-hidden="true" size={16} />
              </span>
            {/if}
            {#if editingTodoId !== todo.id}
              <button
                class="task-row-button"
                type="button"
                aria-label={rowActionLabel(todo)}
                aria-expanded={todo.parentId === null && hasSubtasks(todo)
                  ? !isParentCollapsed(todo)
                  : undefined}
                onclick={() => selectTodoFromRow(todo)}
              ></button>
            {/if}
            <button
              class="task-check"
              type="button"
              aria-label={todo.completed
                ? `Mark "${todo.title}" as incomplete`
                : `Mark "${todo.title}" as complete`}
              onclick={(event) => {
                event.stopPropagation();
                toggleTodoCompletion(todo.id);
              }}
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
              <span class="task-title-button">
                <span class="task-title">{todo.title}</span>
              </span>
            {/if}
            <div class="task-meta">
              {#if nowTodoId === todo.id}
                <span class="now-badge">Now</span>
              {/if}
            </div>
          </li>
          {#if shouldShowDraftSubtaskAfter(todo)}
            <li class="task-child task-draft">
              <span class="task-check task-check-placeholder"></span>
              <form class="task-edit" onsubmit={submitDraftSubtask}>
                <input
                  type="text"
                  bind:this={draftSubtaskInput}
                  bind:value={draftSubtaskTitle}
                  disabled={isSavingSubtask}
                  placeholder="Add a subtask..."
                  onkeydown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      cancelDraftSubtask();
                    }
                  }}
                />
              </form>
              <div class="task-meta"></div>
            </li>
          {/if}
        {/each}
      {/if}
    </ul>
  </div>

  {#if shouldShowFooterActions}
    <footer class="todo-footer" bind:this={todoFooterElement}>
      <div class="todo-footer-actions" aria-label="Todo shortcuts">
        <span><KeyboardKey value="a" size="compact" />Add</span>
        {#if selectedTodo !== null}
          <span><KeyboardKey value="e" size="compact" />Edit</span>
          <span>
            <KeyboardKey value="Space" size="compact" />{selectedTodo.completed
              ? "Incomplete"
              : "Complete"}
          </span>
          {#if !selectedTodo.completed}
            <span>
              <KeyboardKey value="Enter" size="compact" />{nowTodoId ===
              selectedTodo.id
                ? "Unset Now"
                : "Set Now"}
            </span>
          {/if}
          <span>
            <KeyboardKey value="t" size="compact" />{selectedTodo.parentId ===
            null
              ? "Subtask"
              : "Sibling"}
          </span>
          {#if selectedTodo.parentId === null && hasSubtasks(selectedTodo)}
            <span>
              <KeyboardKey
                value={isParentCollapsed(selectedTodo) ? "→" : "←"}
                label={isParentCollapsed(selectedTodo)
                  ? "Arrow Right"
                  : "Arrow Left"}
                size="compact"
              />{isParentCollapsed(selectedTodo) ? "Expand" : "Collapse"}
            </span>
          {:else if selectedTodo.parentId !== null}
            <span
              ><KeyboardKey
                value="←"
                label="Arrow Left"
                size="compact"
              />Parent</span
            >
          {/if}
          <span><KeyboardKey value="D" size="compact" />Delete</span>
        {/if}
      </div>
    </footer>
  {/if}

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

  .task-list-footer-visible {
    padding-bottom: 3.3rem;
    scroll-padding-bottom: 3.3rem;
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

  .task-list li:last-child {
    border-bottom: 0;
  }

  .task-selected {
    background: rgba(255, 255, 255, 0.05);
    box-shadow: inset 3px 0 0 rgba(68, 209, 107, 0.7);
  }

  .task-list li.task-child {
    padding-left: 1.9rem;
  }

  .task-list li.task-root {
    padding-left: 1.4rem;
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

  .task-row-button {
    position: absolute;
    inset: 0;
    z-index: 1;
    border: 0;
    border-radius: 0;
    padding: 0;
    background: transparent;
  }

  .task-check {
    position: relative;
    z-index: 2;
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

  .task-check-placeholder {
    border-style: dashed;
    opacity: 0.45;
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

  .task-tree-indicator {
    position: absolute;
    top: 50%;
    left: 0.28rem;
    z-index: 2;
    display: grid;
    place-items: center;
    width: 1.05rem;
    height: 1.05rem;
    margin-top: -0.525rem;
    color: #9ba3b0;
    pointer-events: none;
  }

  .task-tree-indicator :global(svg) {
    transition: transform 120ms ease;
  }

  .task-tree-indicator-open :global(svg) {
    transform: rotate(90deg);
  }

  .task-title {
    display: -webkit-box;
    overflow: hidden;
    font-size: 14px;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }

  .task-title-button {
    position: relative;
    z-index: 0;
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

  .task-draft .task-edit input::placeholder {
    color: #707987;
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

  .todo-error {
    margin: 0.55rem 0 0;
    color: #ff8a93;
    font-size: 0.88rem;
    overflow-wrap: anywhere;
  }

  .todo-footer {
    position: absolute;
    right: 0.8rem;
    bottom: 0.8rem;
    left: 0.8rem;
    z-index: 3;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    min-height: 2.2rem;
    border: 1px solid rgba(68, 209, 107, 0.24);
    border-radius: 8px;
    padding: 0.45rem 0.65rem;
    color: #9ba3b0;
    font-size: 0.76rem;
    background: rgba(7, 11, 15, 0.78);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.035),
      0 0.7rem 2rem rgba(0, 0, 0, 0.22);
    backdrop-filter: blur(14px);
    pointer-events: none;
  }

  .todo-footer-actions {
    display: flex;
    align-items: center;
    justify-content: center;
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
