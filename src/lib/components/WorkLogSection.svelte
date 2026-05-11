<script lang="ts">
  import { onMount, tick } from "svelte";
  import { createWorkLog, listWorkLogs, type WorkLog } from "$lib/api/workLogs";
  import KeyboardKey from "$lib/components/KeyboardKey.svelte";

  type Props = {
    active: boolean;
    title: string;
    shortcut: string;
    focusRequest: number;
    onActivate: () => void;
  };

  let { active, title, shortcut, focusRequest, onActivate }: Props = $props();

  let workLogs = $state<WorkLog[]>([]);
  let workLogInput = $state("");
  let workLogError = $state<string | null>(null);
  let isLoadingWorkLogs = $state(true);
  let isCreatingWorkLog = $state(false);
  let workLogInputElement = $state<HTMLTextAreaElement>();
  let lastFocusRequest = 0;

  onMount(() => {
    void loadWorkLogs();
  });

  $effect(() => {
    if (focusRequest === 0 || focusRequest === lastFocusRequest) {
      return;
    }

    lastFocusRequest = focusRequest;
    void focusInput();
  });

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

  async function focusInput() {
    onActivate();
    await tick();
    workLogInputElement?.focus();
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

<section
  class="panel log"
  class:panel-active={active}
  aria-labelledby="log-title"
>
  <header class="panel-header inline-header">
    <div class="title-row">
      <p class="section-label section-label-log">{title}</p>
      <KeyboardKey value={shortcut} label="Command 3" />
    </div>
    {#if active}
      <div class="hint-row" aria-label="Log shortcuts">
        <span><KeyboardKey value="i" />Focus Input</span>
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
    <span class="log-prompt" aria-hidden="true">&gt;</span>
    <div class="log-input-field">
      <textarea
        rows="2"
        placeholder="Write a work log..."
        aria-describedby="work-log-input-help"
        bind:value={workLogInput}
        bind:this={workLogInputElement}
        disabled={isCreatingWorkLog}
        onfocus={onActivate}
        onkeydown={handleWorkLogKeydown}
      ></textarea>
      <p id="work-log-input-help" class="log-input-help">
        Enter to submit, Shift+Enter for new line
      </p>
    </div>
  </form>

  {#if workLogError}
    <p class="log-error" role="alert">{workLogError}</p>
  {/if}
</section>

<style>
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

  .log.panel-active {
    border-color: #5b8ff9;
    box-shadow:
      0 0 0 1px rgba(91, 143, 249, 0.35),
      0 0 0 4px rgba(91, 143, 249, 0.08),
      0 0.8rem 2rem rgba(91, 143, 249, 0.11);
  }

  textarea {
    font: inherit;
  }

  textarea:focus-visible {
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

  .section-label-log {
    color: #5b8ff9;
  }

  .log-list {
    min-height: 8rem;
    margin: 0;
    padding: 0.75rem 0.9rem;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    background: rgba(9, 12, 16, 0.28);
    list-style: none;
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
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;
    gap: 0.7rem;
    margin-top: 0.7rem;
    border: 1px solid rgba(91, 143, 249, 0.72);
    border-radius: 8px;
    padding: 0.65rem 0.8rem;
    color: #7f8794;
    background: rgba(4, 8, 12, 0.28);
  }

  .log-input:focus-within {
    border-color: #5b8ff9;
    box-shadow:
      0 0 0 1px rgba(91, 143, 249, 0.35),
      0 0 0 4px rgba(91, 143, 249, 0.08);
  }

  .log-prompt {
    color: #5b8ff9;
    font-weight: 700;
  }

  .log-input-field {
    display: grid;
    gap: 0.3rem;
    min-width: 0;
  }

  .log-input textarea {
    display: block;
    width: 100%;
    min-width: 0;
    border: 0;
    color: #e8ecf2;
    caret-color: #5b8ff9;
    background: transparent;
    resize: none;
  }

  .log-input textarea:disabled {
    opacity: 0.65;
  }

  .log-input textarea::placeholder {
    color: #858d9a;
  }

  .log-input-help {
    margin: 0;
    color: #858d9a;
    font-size: 0.78rem;
    line-height: 1.3;
  }

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
    .inline-header {
      align-items: start;
      flex-direction: column;
    }

    .hint-row {
      justify-content: flex-start;
    }
  }

  @media (max-width: 560px) {
    .panel {
      padding: 0.8rem;
    }
  }
</style>
