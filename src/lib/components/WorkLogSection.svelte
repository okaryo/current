<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import { listen, type UnlistenFn } from "@tauri-apps/api/event";
  import { listWorkLogs, type WorkLog } from "$lib/api/workLogs";
  import KeyboardKey from "$lib/components/KeyboardKey.svelte";

  type WorkLogCommand = "focusPreferred";

  type WorkLogCommandRequest = {
    id: number;
    command: WorkLogCommand;
  } | null;

  type Props = {
    active: boolean;
    title: string;
    shortcut: string;
    commandRequest: WorkLogCommandRequest;
    reminderEnabled: boolean;
    reminderProgress: number;
    reminderRemainingLabel: string;
    onToggleReminder: () => void;
    onActivate: () => void;
  };

  type WorkLogGroup = {
    dateKey: string;
    label: string;
    logs: WorkLog[];
  };

  const RECENT_WORK_LOG_DAY_COUNT = 7;

  let {
    active,
    title,
    shortcut,
    commandRequest,
    reminderEnabled,
    reminderProgress,
    reminderRemainingLabel,
    onToggleReminder,
    onActivate,
  }: Props = $props();

  let workLogs = $state<WorkLog[]>([]);
  let workLogError = $state<string | null>(null);
  let isLoadingWorkLogs = $state(true);
  let workLogListElement = $state<HTMLOListElement>();
  let lastCommandRequestId = 0;
  let unlistenWorkLogCreated: UnlistenFn | undefined;
  const visibleWorkLogGroups = $derived(groupVisibleWorkLogs(workLogs));

  onMount(() => {
    void loadWorkLogs();

    if (!isTauriRuntime()) {
      return;
    }

    void listen<WorkLog>("work-log:created", (event) => {
      addWorkLog(event.payload);
    }).then((unlisten) => {
      unlistenWorkLogCreated = unlisten;
    });
  });

  onDestroy(() => {
    unlistenWorkLogCreated?.();
  });

  $effect(() => {
    if (!commandRequest || commandRequest.id === lastCommandRequestId) {
      return;
    }

    lastCommandRequestId = commandRequest.id;

    switch (commandRequest.command) {
      case "focusPreferred":
        void focusList();
        break;
    }
  });

  async function loadWorkLogs() {
    isLoadingWorkLogs = true;
    workLogError = null;

    try {
      workLogs = (await listWorkLogs(oldestVisibleDayStartMs())).sort(
        compareWorkLogs,
      );
    } catch (error) {
      workLogError = errorMessage(error);
    } finally {
      isLoadingWorkLogs = false;
    }
  }

  async function focusList() {
    onActivate();
    await tick();
    workLogListElement?.focus({ preventScroll: true });
  }

  async function scrollLogListToTop() {
    await tick();

    if (workLogListElement) {
      workLogListElement.scrollTop = 0;
    }
  }

  function compareWorkLogs(a: WorkLog, b: WorkLog) {
    if (a.createdAtMs !== b.createdAtMs) {
      return b.createdAtMs - a.createdAtMs;
    }

    return b.id - a.id;
  }

  function addWorkLog(workLog: WorkLog) {
    if (workLogs.some((existingWorkLog) => existingWorkLog.id === workLog.id)) {
      return;
    }

    workLogs = [...workLogs, workLog].sort(compareWorkLogs);
    void scrollLogListToTop();
  }

  function groupVisibleWorkLogs(logs: WorkLog[]): WorkLogGroup[] {
    const todayStartMs = startOfLocalDay(Date.now());
    const groups: WorkLogGroup[] = [];
    const groupByDateKey: Record<string, WorkLogGroup> = {};

    for (const log of logs) {
      const date = new Date(log.createdAtMs);
      const dateKey = localDateKey(date);
      const group = groupByDateKey[dateKey];

      if (group) {
        group.logs.push(log);
        continue;
      }

      const nextGroup = {
        dateKey,
        label: formatLogDateLabel(date, todayStartMs),
        logs: [log],
      };

      groupByDateKey[dateKey] = nextGroup;
      groups.push(nextGroup);
    }

    return groups;
  }

  function oldestVisibleDayStartMs() {
    return addLocalDays(
      startOfLocalDay(Date.now()),
      -(RECENT_WORK_LOG_DAY_COUNT - 1),
    );
  }

  function startOfLocalDay(timestampMs: number) {
    const date = new Date(timestampMs);

    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    ).getTime();
  }

  function addLocalDays(timestampMs: number, dayOffset: number) {
    const date = new Date(timestampMs);

    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate() + dayOffset,
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds(),
    ).getTime();
  }

  function localDateKey(date: Date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${date.getFullYear()}-${month}-${day}`;
  }

  function formatLogDateLabel(date: Date, todayStartMs: number) {
    const dateStartMs = startOfLocalDay(date.getTime());

    if (dateStartMs === todayStartMs) {
      return "Today";
    }

    if (dateStartMs === addLocalDays(todayStartMs, -1)) {
      return "Yesterday";
    }

    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() === new Date(todayStartMs).getFullYear()
          ? undefined
          : "numeric",
    }).format(date);
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

  function isTauriRuntime() {
    return "__TAURI_INTERNALS__" in window;
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
    <div class="hint-row" aria-label="Log status and shortcuts">
      <div
        class="reminder-status"
        aria-label={`Rhythm reminder ${reminderEnabled ? "on" : "off"}, next check-in ${reminderRemainingLabel}`}
        style={`--reminder-progress: ${reminderProgress}`}
      >
        <span class="reminder-fill" aria-hidden="true"></span>
        <span class="reminder-label">Next check-in</span>
        <span class="reminder-time">{reminderRemainingLabel}</span>
        <button
          class="reminder-switch"
          type="button"
          role="switch"
          aria-checked={reminderEnabled}
          aria-label="Toggle rhythm reminder"
          onclick={onToggleReminder}
        >
          <span aria-hidden="true"></span>
        </button>
      </div>
    </div>
  </header>

  <h2 id="log-title" class="sr-only">Work Log</h2>

  <div class="log-list-shell">
    <ol
      class="log-list"
      aria-label="Work log"
      tabindex="-1"
      bind:this={workLogListElement}
    >
      {#if isLoadingWorkLogs}
        <li class="log-empty">Loading logs...</li>
      {:else if workLogs.length === 0 || visibleWorkLogGroups.length === 0}
        <li class="log-empty">No recent logs.</li>
      {:else}
        {#each visibleWorkLogGroups as group (group.dateKey)}
          <li class="log-date-group">
            <h3>{group.label}</h3>
            <ol class="log-day-list" aria-label={`${group.label} logs`}>
              {#each group.logs as log (log.id)}
                <li class="log-item">
                  <time>{formatLogTime(log.createdAtMs)}</time>
                  <span>{log.body}</span>
                </li>
              {/each}
            </ol>
          </li>
        {/each}
      {/if}
    </ol>

  </div>

  {#if workLogError}
    <p class="log-error" role="alert">{workLogError}</p>
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

  .reminder-status {
    --reminder-progress: 0;
    display: inline-flex;
    align-items: center;
    position: relative;
    overflow: hidden;
    gap: 0.45rem;
    min-height: 1.75rem;
    border: 1px solid rgba(91, 143, 249, 0.28);
    border-radius: 8px;
    padding: 0 0.25rem 0 0.65rem;
    color: #c9d4e8;
    background: rgba(91, 143, 249, 0.07);
  }

  .reminder-fill {
    position: absolute;
    inset: 0 auto 0 0;
    width: calc(var(--reminder-progress) * 100%);
    background: rgba(91, 143, 249, 0.16);
    pointer-events: none;
  }

  .reminder-label,
  .reminder-time,
  .reminder-switch {
    position: relative;
  }

  .reminder-label {
    color: #9ba3b0;
  }

  .reminder-time {
    min-width: 3rem;
    color: #e3e9f5;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .reminder-switch {
    display: inline-flex;
    align-items: center;
    width: 2rem;
    height: 1.15rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    padding: 0.12rem;
    background: rgba(255, 255, 255, 0.08);
    cursor: pointer;
    transition:
      border-color 120ms ease,
      background 120ms ease;
  }

  .reminder-switch span {
    width: 0.75rem;
    aspect-ratio: 1;
    border-radius: 999px;
    background: #aeb5c1;
    transition:
      background 120ms ease,
      transform 120ms ease;
  }

  .reminder-switch[aria-checked="true"] {
    border-color: rgba(91, 143, 249, 0.45);
    background: rgba(91, 143, 249, 0.28);
  }

  .reminder-switch[aria-checked="true"] span {
    background: #ffffff;
    transform: translateX(0.82rem);
  }

  .reminder-switch:focus-visible {
    outline: 1px solid rgba(91, 143, 249, 0.85);
    outline-offset: 2px;
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

  .log-list-shell {
    display: flex;
    flex-direction: column;
    flex: 0 1 auto;
    min-height: 0;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    background: rgba(9, 12, 16, 0.28);
  }

  .log-list {
    flex: 0 1 auto;
    overflow-x: hidden;
    overflow-y: auto;
    min-height: 0;
    margin: 0;
    padding: 0.75rem 0.9rem;
    list-style: none;
  }

  .log-list:focus {
    outline: none;
  }

  .log-date-group {
    display: block;
  }

  .log-date-group + .log-date-group {
    margin-top: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 0.7rem;
  }

  .log-date-group h3 {
    margin: 0 0 0.45rem;
    color: #8ea4c9;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0;
  }

  .log-day-list {
    display: grid;
    gap: 0.4rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .log-item {
    display: grid;
    grid-template-columns: 3rem minmax(0, 1fr);
    gap: 0.55rem;
    color: #d7dce4;
    font-size: 14px;
  }

  .log-item span {
    white-space: pre-wrap;
  }

  .log-list .log-empty {
    grid-template-columns: 1fr;
    color: #858d9a;
  }

  .log-item time {
    color: #a8b0be;
    font-variant-numeric: tabular-nums;
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
</style>
