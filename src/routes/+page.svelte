<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    createTodo,
    deleteTodo,
    listTodos,
    toggleTodo,
    updateTodoTitle,
    type Todo,
  } from "$lib/api/todos";
  import { createWorkLog, listWorkLogs, type WorkLog } from "$lib/api/workLogs";

  type SectionId = "pomodoro" | "todo" | "log";

  type Section = {
    id: SectionId;
    title: string;
    shortcut: string;
  };

  const sections: Section[] = [
    { id: "pomodoro", title: "Pomodoro", shortcut: "⌘1" },
    { id: "todo", title: "Todo", shortcut: "⌘2" },
    { id: "log", title: "Log", shortcut: "⌘3" },
  ];

  let activeSection = $state<SectionId>("todo");
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
  let addTodoInput = $state<HTMLInputElement>();
  let editTodoInput = $state<HTMLInputElement>();
  let workLogs = $state<WorkLog[]>([]);
  let workLogInput = $state("");
  let workLogError = $state<string | null>(null);
  let isLoadingWorkLogs = $state(true);
  let isCreatingWorkLog = $state(false);
  let workLogInputElement = $state<HTMLTextAreaElement>();

  onMount(() => {
    void loadTodos();
    void loadWorkLogs();
  });

  async function loadTodos() {
    isLoadingTodos = true;
    todoError = null;

    try {
      todos = await listTodos();
      ensureSelectedTodo();
    } catch (error) {
      todoError = errorMessage(error);
    } finally {
      isLoadingTodos = false;
    }
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
      todos = [...todos, todo].sort(compareTodos);
      selectedTodoId = null;
      todoInput = "";
    } catch (error) {
      todoError = errorMessage(error);
    } finally {
      isCreatingTodo = false;
    }
  }

  async function toggleTodoCompletion(id: number) {
    setActiveSection("todo", { preserveFocus: true });
    todoError = null;

    try {
      const updatedTodo = await toggleTodo(id);
      todos = todos
        .map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo))
        .sort(compareTodos);
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
      todos = todos
        .map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo))
        .sort(compareTodos);
      editingTodoId = null;
      editingTitle = "";
      selectedTodoId = updatedTodo.id;
    } catch (error) {
      todoError = errorMessage(error);
    } finally {
      isSavingEdit = false;
    }
  }

  async function loadWorkLogs() {
    isLoadingWorkLogs = true;
    workLogError = null;

    try {
      workLogs = await listWorkLogs();
    } catch (error) {
      workLogError = errorMessage(error);
    } finally {
      isLoadingWorkLogs = false;
    }
  }

  async function submitWorkLog() {
    if (isCreatingWorkLog) {
      return;
    }

    const body = workLogInput.trim();

    if (!body) {
      return;
    }

    isCreatingWorkLog = true;
    workLogError = null;

    try {
      const workLog = await createWorkLog(body);
      workLogs = [...workLogs, workLog].sort(compareWorkLogs);
      workLogInput = "";
    } catch (error) {
      workLogError = errorMessage(error);
    } finally {
      isCreatingWorkLog = false;
    }
  }

  function handleWorkLogKeydown(event: KeyboardEvent) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    void submitWorkLog();
  }

  function handleKeydown(event: KeyboardEvent) {
    const sectionShortcut = sectionFromShortcut(event);

    if (sectionShortcut) {
      event.preventDefault();
      setActiveSection(sectionShortcut);
      return;
    }

    if (isTextInputTarget(event.target)) {
      if (event.key === "Escape") {
        (event.target as HTMLElement).blur();
      }

      return;
    }

    switch (activeSection) {
      case "todo":
        handleTodoSectionKeydown(event);
        break;
      case "log":
        handleLogSectionKeydown(event);
        break;
    }
  }

  function handleTodoSectionKeydown(event: KeyboardEvent) {
    if (editingTodoId !== null) {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelEdit();
      }

      return;
    }

    if (todos.length === 0) {
      if (event.key === "i") {
        event.preventDefault();
        focusAddTodoInput();
      }

      return;
    }

    switch (event.key) {
      case "D":
        if (event.shiftKey) {
          event.preventDefault();
          void deleteSelectedTodo();
        }
        break;
      case "j":
      case "ArrowDown":
        event.preventDefault();
        moveSelection(1);
        break;
      case "k":
      case "ArrowUp":
        event.preventDefault();
        moveSelection(-1);
        break;
      case " ":
        event.preventDefault();
        if (selectedTodoId !== null) {
          void toggleTodoCompletion(selectedTodoId);
        }
        break;
      case "i":
        event.preventDefault();
        focusAddTodoInput();
        break;
      case "e":
        event.preventDefault();
        startEditSelectedTodo();
        break;
      case "Enter":
        event.preventDefault();
        toggleNowTodo();
        break;
      case "Escape":
        event.preventDefault();
        selectedTodoId = null;
        break;
    }
  }

  function handleLogSectionKeydown(event: KeyboardEvent) {
    if (event.key === "i") {
      event.preventDefault();
      focusWorkLogInput();
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

      const nextTodos = todos.filter((todo) => todo.id !== deletedTodoId);
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

  function selectTodo(id: number) {
    setActiveSection("todo", { preserveFocus: true });
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

    nowTodoId = nowTodoId === selectedTodoId ? null : selectedTodoId;
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
    setActiveSection("todo", { preserveFocus: true });
    clearTodoSelection();
    await tick();
    addTodoInput?.focus();
  }

  async function focusWorkLogInput() {
    setActiveSection("log", { preserveFocus: true });
    clearTodoSelection();
    await tick();
    workLogInputElement?.focus();
  }

  function setActiveSection(
    section: SectionId,
    options: { preserveFocus?: boolean } = {},
  ) {
    activeSection = section;

    if (section !== "todo") {
      cancelEdit();
    }

    if (!options.preserveFocus && isTextInputTarget(document.activeElement)) {
      (document.activeElement as HTMLElement).blur();
    }
  }

  function sectionFromShortcut(event: KeyboardEvent): SectionId | null {
    if (!event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
      return null;
    }

    switch (event.key) {
      case "1":
        return "pomodoro";
      case "2":
        return "todo";
      case "3":
        return "log";
      default:
        return null;
    }
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

  function isTextInputTarget(target: EventTarget | null) {
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    );
  }

  function compareTodos(a: Todo, b: Todo) {
    if (a.completed !== b.completed) {
      return Number(a.completed) - Number(b.completed);
    }

    return a.id - b.id;
  }

  function compareWorkLogs(a: WorkLog, b: WorkLog) {
    if (a.createdAtMs !== b.createdAtMs) {
      return a.createdAtMs - b.createdAtMs;
    }

    return a.id - b.id;
  }

  function formatLogTime(createdAtMs: number) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(createdAtMs));
  }

  function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
</script>

<svelte:head>
  <title>Current</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<main class="app-shell" aria-label="Current">
  <div class="workspace">
    <section
      class="panel pomodoro"
      class:panel-active={activeSection === "pomodoro"}
      aria-label="Pomodoro"
    >
      <header class="panel-header">
        <div class="title-row">
          <p class="section-label section-label-focus">{sections[0].title}</p>
          <kbd>{sections[0].shortcut}</kbd>
        </div>
      </header>

      <div class="timer-layout">
        <div class="timer-ring" aria-label="25 minutes remaining">
          <span class="time">25:00</span>
          <span class="mode">Focus</span>
        </div>

        <div class="timer-details">
          <p class="session">Today's sessions <strong>2 / 4</strong></p>
          <div class="timer-actions" aria-label="Pomodoro controls">
            <button
              class="primary-button"
              type="button"
              onfocus={() =>
                setActiveSection("pomodoro", { preserveFocus: true })}
              onclick={() =>
                setActiveSection("pomodoro", { preserveFocus: true })}
            >
              Start
            </button>
            <button
              type="button"
              onfocus={() =>
                setActiveSection("pomodoro", { preserveFocus: true })}
              onclick={() =>
                setActiveSection("pomodoro", { preserveFocus: true })}
            >
              Pause
            </button>
            <button
              type="button"
              onfocus={() =>
                setActiveSection("pomodoro", { preserveFocus: true })}
              onclick={() =>
                setActiveSection("pomodoro", { preserveFocus: true })}
            >
              Reset
            </button>
          </div>
        </div>

        <dl class="shortcut-list" aria-label="Pomodoro shortcuts">
          <div>
            <dt><kbd>⌘P</kbd></dt>
            <dd>Start / Pause</dd>
          </div>
          <div>
            <dt><kbd>⌘R</kbd></dt>
            <dd>Reset</dd>
          </div>
          <div>
            <dt><kbd>⌘L</kbd></dt>
            <dd>Log completed session</dd>
          </div>
        </dl>
      </div>
    </section>

    <section
      class="panel todo"
      class:panel-active={activeSection === "todo"}
      aria-labelledby="todo-title"
    >
      <header class="panel-header inline-header">
        <div class="title-row">
          <p class="section-label section-label-todo">{sections[1].title}</p>
          <kbd>{sections[1].shortcut}</kbd>
        </div>
        {#if activeSection === "todo"}
          <div class="hint-row" aria-label="Todo shortcuts">
            <span><kbd>i</kbd>Focus Add</span>
            <span><kbd>j</kbd>/<kbd>k</kbd>Move</span>
          </div>
        {/if}
      </header>

      <h2 id="todo-title" class="sr-only">Todo</h2>

      <ul class="task-list" aria-label="Todo list">
        {#if isLoadingTodos}
          <li class="task-empty">Loading todos...</li>
        {:else if todos.length === 0}
          <li class="task-empty">No todos yet.</li>
        {:else}
          {#each todos as todo (todo.id)}
            <li
              class:task-selected={activeSection === "todo" &&
                selectedTodoId === todo.id}
              class:task-now={nowTodoId === todo.id}
              class:task-dimmed={nowTodoId !== null &&
                nowTodoId !== todo.id &&
                !todo.completed}
              class:task-completed={todo.completed}
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
                {#if activeSection === "todo" && selectedTodoId === todo.id && editingTodoId !== todo.id}
                  <div
                    class="task-actions"
                    aria-label="Selected todo shortcuts"
                  >
                    <span><kbd>e</kbd>Edit</span>
                    <span>
                      <kbd>Space</kbd>{todo.completed
                        ? "Incomplete"
                        : "Complete"}
                    </span>
                    {#if !todo.completed}
                      <span>
                        <kbd>Enter</kbd>{nowTodoId === todo.id
                          ? "Unset Now"
                          : "Set Now"}
                      </span>
                    {/if}
                    <span><kbd>D</kbd>Delete</span>
                  </div>
                {/if}
              </div>
            </li>
          {/each}
        {/if}
      </ul>

      <form class="quick-input" onsubmit={submitTodo}>
        <span aria-hidden="true">+</span>
        <input
          type="text"
          placeholder="Add a new task... (Enter to confirm)"
          bind:value={todoInput}
          bind:this={addTodoInput}
          disabled={isCreatingTodo}
          onfocus={() => {
            setActiveSection("todo", { preserveFocus: true });
            clearTodoSelection();
          }}
        />
      </form>

      {#if todoError}
        <p class="todo-error" role="alert">{todoError}</p>
      {/if}
    </section>

    <section
      class="panel log"
      class:panel-active={activeSection === "log"}
      aria-labelledby="log-title"
    >
      <header class="panel-header inline-header">
        <div class="title-row">
          <p class="section-label section-label-log">{sections[2].title}</p>
          <kbd>{sections[2].shortcut}</kbd>
        </div>
        {#if activeSection === "log"}
          <div class="hint-row" aria-label="Log shortcuts">
            <span><kbd>i</kbd>Focus Input</span>
            <span><kbd>Enter</kbd>Submit</span>
            <span><kbd>Shift</kbd> + <kbd>Enter</kbd>New line</span>
          </div>
        {/if}
      </header>

      <h2 id="log-title" class="sr-only">Work Log</h2>

      <ol class="log-list" aria-label="Work log">
        {#if isLoadingWorkLogs}
          <li class="log-empty">Loading logs...</li>
        {:else if workLogs.length === 0}
          <li class="log-empty">No logs yet.</li>
        {:else}
          {#each workLogs as log (log.id)}
            <li>
              <time>{formatLogTime(log.createdAtMs)}</time>
              <span>{log.body}</span>
            </li>
          {/each}
        {/if}
      </ol>

      <form
        class="log-input"
        onsubmit={(event) => {
          event.preventDefault();
          void submitWorkLog();
        }}
      >
        <span aria-hidden="true">&gt;</span>
        <textarea
          rows="2"
          placeholder="Write a work log... (Enter to submit)"
          bind:value={workLogInput}
          bind:this={workLogInputElement}
          disabled={isCreatingWorkLog}
          onfocus={() => setActiveSection("log", { preserveFocus: true })}
          onkeydown={handleWorkLogKeydown}
        ></textarea>
      </form>

      {#if workLogError}
        <p class="log-error" role="alert">{workLogError}</p>
      {/if}
    </section>
  </div>
</main>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(html) {
    color: #e8ecf2;
    background: #0b0d10;
    font-family:
      Inter,
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
    font-size: 16px;
    line-height: 1.5;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
  }

  :global(body) {
    min-width: 360px;
    min-height: 100vh;
    margin: 0;
  }

  button,
  input,
  textarea {
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

  input:focus-visible,
  textarea:focus-visible {
    outline: none;
  }

  kbd {
    display: inline-flex;
    min-width: 1.65rem;
    height: 1.35rem;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 5px;
    padding: 0 0.38rem;
    color: #c8ced8;
    background: rgba(255, 255, 255, 0.06);
    box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.3);
    font-size: 0.76rem;
    font-weight: 500;
    line-height: 1;
  }

  .app-shell {
    min-height: 100vh;
    padding: 0.8rem;
    background:
      radial-gradient(
        circle at top left,
        rgba(255, 255, 255, 0.05),
        transparent 28rem
      ),
      #0b0d10;
  }

  .workspace {
    display: grid;
    grid-template-rows: auto auto minmax(9rem, 1fr);
    gap: 0.75rem;
    width: min(100%, 104rem);
    min-height: calc(100vh - 1.6rem);
    margin: 0 auto;
  }

  .panel {
    position: relative;
    min-width: 0;
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

  .pomodoro.panel-active {
    border-color: #ff5965;
    box-shadow:
      0 0 0 1px rgba(255, 89, 101, 0.34),
      0 0 0 4px rgba(255, 89, 101, 0.08),
      0 0.8rem 2rem rgba(255, 89, 101, 0.1);
  }

  .todo.panel-active {
    border-color: #44d16b;
    box-shadow:
      0 0 0 1px rgba(68, 209, 107, 0.35),
      0 0 0 4px rgba(68, 209, 107, 0.08),
      0 0.8rem 2rem rgba(68, 209, 107, 0.1);
  }

  .log.panel-active {
    border-color: #5b8ff9;
    box-shadow:
      0 0 0 1px rgba(91, 143, 249, 0.35),
      0 0 0 4px rgba(91, 143, 249, 0.08),
      0 0.8rem 2rem rgba(91, 143, 249, 0.11);
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

  .section-label-focus {
    color: #ff5965;
  }

  .section-label-todo {
    color: #44d16b;
  }

  .section-label-log {
    color: #5b8ff9;
  }

  .timer-layout {
    display: grid;
    grid-template-columns: auto minmax(14rem, 1fr) minmax(13rem, auto);
    align-items: center;
    gap: 1.4rem;
    min-height: 7.4rem;
    padding: 0.65rem;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    background: rgba(9, 12, 16, 0.28);
  }

  .timer-ring {
    display: grid;
    place-items: center;
    align-content: center;
    width: clamp(6.4rem, 12vw, 7.6rem);
    aspect-ratio: 1;
    border: 0.3rem solid #f05260;
    border-radius: 999px;
    box-shadow:
      0 0 0 0.35rem rgba(240, 82, 96, 0.08),
      inset 0 0 2rem rgba(0, 0, 0, 0.22);
  }

  .time {
    font-size: clamp(1.8rem, 3.6vw, 2.25rem);
    font-weight: 650;
    line-height: 1;
  }

  .mode {
    margin-top: 0.25rem;
    font-size: 0.9rem;
    color: #ff5965;
    font-weight: 600;
  }

  .session {
    margin: 0 0 0.75rem;
    color: #c7cdd6;
    font-size: 1rem;
  }

  .session strong {
    margin-left: 0.5rem;
    color: #ffffff;
  }

  .timer-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
  }

  .timer-actions button {
    min-width: 5.5rem;
    min-height: 2.45rem;
    padding: 0 0.85rem;
    font-weight: 650;
  }

  .timer-actions .primary-button {
    border-color: rgba(255, 255, 255, 0.14);
    background: linear-gradient(180deg, #ff6670, #df3745);
    color: #ffffff;
  }

  .shortcut-list {
    display: grid;
    gap: 0.4rem;
    margin: 0;
    color: #aeb5c1;
  }

  .shortcut-list div {
    display: grid;
    grid-template-columns: 3rem 1fr;
    align-items: center;
    gap: 0.65rem;
  }

  .shortcut-list dt,
  .shortcut-list dd {
    margin: 0;
  }

  .task-list,
  .log-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .task-list {
    overflow: auto;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
  }

  .task-list li {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
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
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .task-title-button {
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

  .task-meta,
  .task-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.6rem;
    min-width: 0;
  }

  .task-actions {
    flex-wrap: wrap;
    color: #9ba3b0;
    font-size: 0.78rem;
  }

  .task-actions span {
    display: inline-flex;
    align-items: center;
    gap: 0.32rem;
    white-space: nowrap;
  }

  .task-empty {
    grid-template-columns: 1fr;
    color: #858d9a;
  }

  .quick-input,
  .log-input {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 0.7rem;
    margin-top: 0.7rem;
    border: 1px solid rgba(68, 209, 107, 0.52);
    border-radius: 8px;
    padding: 0.65rem 0.8rem;
    background: rgba(4, 8, 12, 0.28);
    color: #7f8794;
  }

  .quick-input input,
  .log-input textarea {
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

  .quick-input input::placeholder,
  .log-input textarea::placeholder {
    color: #858d9a;
  }

  .log-list {
    min-height: 8rem;
    padding: 0.75rem 0.9rem;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    background: rgba(9, 12, 16, 0.28);
  }

  .log-list li {
    display: grid;
    grid-template-columns: 4rem minmax(0, 1fr);
    gap: 0.9rem;
    color: #d7dce4;
  }

  .log-list span {
    white-space: pre-wrap;
  }

  .log-list .log-empty {
    grid-template-columns: 1fr;
    color: #858d9a;
  }

  .log-list time {
    color: #a8b0be;
    font-variant-numeric: tabular-nums;
  }

  .log-input {
    border-color: rgba(91, 143, 249, 0.72);
    align-items: start;
  }

  .log-input:focus-within {
    border-color: #5b8ff9;
    box-shadow:
      0 0 0 1px rgba(91, 143, 249, 0.35),
      0 0 0 4px rgba(91, 143, 249, 0.08);
  }

  .log-input span {
    color: #5b8ff9;
    font-weight: 700;
  }

  .log-input textarea {
    caret-color: #5b8ff9;
  }

  .log-input textarea:disabled {
    opacity: 0.65;
  }

  .todo-error,
  .log-error {
    margin: 0.55rem 0 0;
    color: #ff8a93;
    font-size: 0.88rem;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }

  @media (max-width: 860px) {
    .workspace {
      grid-template-rows: auto auto auto;
      min-height: auto;
    }

    .timer-layout {
      grid-template-columns: 1fr;
      justify-items: start;
      gap: 1.25rem;
    }

    .shortcut-list {
      width: 100%;
    }

    .inline-header {
      align-items: start;
      flex-direction: column;
    }

    .hint-row {
      justify-content: flex-start;
    }
  }

  @media (max-width: 560px) {
    .app-shell {
      padding: 0;
    }

    .workspace {
      padding: 0.55rem;
    }

    .panel {
      padding: 0.8rem;
    }

    .timer-actions {
      width: 100%;
    }

    .timer-actions button {
      flex: 1 1 8rem;
    }

    .task-title {
      white-space: normal;
    }
  }
</style>
