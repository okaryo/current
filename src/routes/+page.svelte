<script lang="ts">
  import { onMount } from "svelte";
  import { createTodo, listTodos, toggleTodo, type Todo } from "$lib/api/todos";

  type Section = {
    title: string;
    shortcut: string;
  };

  type LogEntry = {
    time: string;
    text: string;
  };

  const sections: Section[] = [
    { title: "Pomodoro", shortcut: "⌘1" },
    { title: "Todo", shortcut: "⌘2" },
    { title: "Log", shortcut: "⌘3" },
  ];

  const logs: LogEntry[] = [
    { time: "09:15", text: "アプリの構成を確認" },
    { time: "09:32", text: "初期レイアウトの方向性を整理" },
    { time: "10:05", text: "3つの領域に分けて画面を構成" },
    { time: "10:40", text: "次に実装する単位を小さく分ける" },
  ];

  let todos = $state<Todo[]>([]);
  let todoInput = $state("");
  let todoError = $state<string | null>(null);
  let isLoadingTodos = $state(true);
  let isCreatingTodo = $state(false);

  onMount(() => {
    void loadTodos();
  });

  async function loadTodos() {
    isLoadingTodos = true;
    todoError = null;

    try {
      todos = await listTodos();
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
      todoInput = "";
    } catch (error) {
      todoError = errorMessage(error);
    } finally {
      isCreatingTodo = false;
    }
  }

  async function toggleTodoCompletion(id: number) {
    todoError = null;

    try {
      const updatedTodo = await toggleTodo(id);
      todos = todos
        .map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo))
        .sort(compareTodos);
    } catch (error) {
      todoError = errorMessage(error);
    }
  }

  function compareTodos(a: Todo, b: Todo) {
    if (a.completed !== b.completed) {
      return Number(a.completed) - Number(b.completed);
    }

    return a.id - b.id;
  }

  function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
</script>

<svelte:head>
  <title>Current</title>
</svelte:head>

<main class="app-shell" aria-label="Current">
  <div class="workspace">
    <section class="panel pomodoro" aria-label="Pomodoro">
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
            <button class="primary-button" type="button">Start</button>
            <button type="button">Pause</button>
            <button type="button">Reset</button>
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

    <section class="panel todo" aria-labelledby="todo-title">
      <header class="panel-header inline-header">
        <div class="title-row">
          <p class="section-label section-label-todo">{sections[1].title}</p>
          <kbd>{sections[1].shortcut}</kbd>
        </div>
        <div class="hint-row" aria-label="Todo shortcuts">
          <span><kbd>Enter</kbd>Add</span>
          <span><kbd>Space</kbd>Complete</span>
          <span><kbd>J</kbd>/<kbd>K</kbd>Move</span>
        </div>
      </header>

      <h2 id="todo-title" class="sr-only">Todo</h2>

      <ul class="task-list" aria-label="Todo list">
        {#if isLoadingTodos}
          <li class="task-empty">Loading todos...</li>
        {:else if todos.length === 0}
          <li class="task-empty">No todos yet.</li>
        {:else}
          {#each todos as todo (todo.id)}
            <li class:task-completed={todo.completed}>
              <button
                class="task-check"
                type="button"
                aria-label={todo.completed
                  ? `Mark "${todo.title}" as incomplete`
                  : `Mark "${todo.title}" as complete`}
                onclick={() => toggleTodoCompletion(todo.id)}
              ></button>
              <span class="task-title">{todo.title}</span>
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
          disabled={isCreatingTodo}
        />
      </form>

      {#if todoError}
        <p class="todo-error" role="alert">{todoError}</p>
      {/if}
    </section>

    <section class="panel log" aria-labelledby="log-title">
      <header class="panel-header inline-header">
        <div class="title-row">
          <p class="section-label section-label-log">{sections[2].title}</p>
          <kbd>{sections[2].shortcut}</kbd>
        </div>
        <div class="hint-row" aria-label="Log shortcuts">
          <span><kbd>Enter</kbd>Submit</span>
          <span><kbd>Shift</kbd> + <kbd>Enter</kbd>New line</span>
        </div>
      </header>

      <h2 id="log-title" class="sr-only">Work Log</h2>

      <ol class="log-list" aria-label="Work log">
        {#each logs as log (log.time)}
          <li>
            <time>{log.time}</time>
            <span>{log.text}</span>
          </li>
        {/each}
      </ol>

      <label class="log-input">
        <span aria-hidden="true">&gt;</span>
        <textarea rows="2" placeholder="Write a work log... (Enter to submit)"
        ></textarea>
      </label>
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

  button:focus-visible,
  input:focus-visible,
  textarea:focus-visible {
    outline: 2px solid rgba(91, 143, 249, 0.95);
    outline-offset: 2px;
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
    grid-template-rows: auto minmax(11rem, 1fr) minmax(9rem, 0.75fr);
    gap: 0.75rem;
    width: min(100%, 104rem);
    min-height: calc(100vh - 1.6rem);
    margin: 0 auto;
  }

  .panel {
    min-width: 0;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 0.85rem;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.04),
      rgba(255, 255, 255, 0.02)
    );
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
    grid-template-columns: auto minmax(0, 1fr);
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

  .task-completed {
    color: #7f8794;
  }

  .task-completed .task-title {
    text-decoration: line-through;
  }

  .task-check {
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
    background: #44d16b;
  }

  .task-title {
    overflow: hidden;
    text-overflow: ellipsis;
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
    border: 1px solid rgba(68, 209, 107, 0.65);
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
    background: transparent;
    resize: none;
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

  .log-list time {
    color: #a8b0be;
    font-variant-numeric: tabular-nums;
  }

  .log-input {
    border-color: rgba(91, 143, 249, 0.72);
    align-items: start;
  }

  .log-input span {
    color: #5b8ff9;
    font-weight: 700;
  }

  .todo-error {
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
