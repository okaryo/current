<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import { listen, type UnlistenFn } from "@tauri-apps/api/event";
  import { openUrl } from "@tauri-apps/plugin-opener";
  import { listWorkLogs, type WorkLog } from "$lib/api/workLogs";
  import KeyboardKey from "$lib/components/KeyboardKey.svelte";
  import {
    addLocalDays,
    formatWorkLogDateLabel,
    formatWorkLogTime,
    startOfLocalDay,
  } from "$lib/dateFormat";
  import { linkifyWorkLogBody } from "$lib/work-log/linkify";

  type WorkLogCommand = "focusPreferred" | "editLatest";

  type WorkLogCommandRequest = {
    id: number;
    command: WorkLogCommand;
  } | null;

  type Props = {
    active: boolean;
    title: string;
    shortcut: string;
    commandRequest: WorkLogCommandRequest;
    onActivate: () => void;
    onEditLatest: (workLog: WorkLog) => void;
  };

  type WorkLogGroup = {
    dateKey: string;
    label: string;
    logs: WorkLog[];
  };

  type LastLogTone = "neutral" | "soon" | "late" | "stale";

  const RECENT_WORK_LOG_DAY_COUNT = 7;
  const LOG_TONE_SOON_THRESHOLD_MS = 15 * 60 * 1000;
  const LOG_TONE_LATE_THRESHOLD_MS = 30 * 60 * 1000;
  const LOG_TONE_STALE_THRESHOLD_MS = 60 * 60 * 1000;

  let {
    active,
    title,
    shortcut,
    commandRequest,
    onActivate,
    onEditLatest,
  }: Props = $props();

  let workLogs = $state<WorkLog[]>([]);
  let workLogError = $state<string | null>(null);
  let isLoadingWorkLogs = $state(true);
  let workLogListElement = $state<HTMLOListElement>();
  let relativeTimeNowMs = $state(Date.now());
  let lastCommandRequestId = 0;
  let unlistenWorkLogCreated: UnlistenFn | undefined;
  let unlistenWorkLogUpdated: UnlistenFn | undefined;
  let relativeTimeInterval: ReturnType<typeof setInterval> | undefined;
  const visibleWorkLogGroups = $derived(groupVisibleWorkLogs(workLogs));
  const lastWorkLog = $derived(workLogs[0] ?? null);
  const lastLogLabel = $derived(
    formatLastLogLabel(lastWorkLog, relativeTimeNowMs),
  );
  const lastLogTone = $derived(
    formatLastLogTone(lastWorkLog, relativeTimeNowMs),
  );

  onMount(() => {
    void loadWorkLogs();
    relativeTimeInterval = setInterval(() => {
      relativeTimeNowMs = Date.now();
    }, 60 * 1000);

    if (!isTauriRuntime()) {
      return;
    }

    void listen<WorkLog>("work-log:created", (event) => {
      addWorkLog(event.payload);
    }).then((unlisten) => {
      unlistenWorkLogCreated = unlisten;
    });

    void listen<WorkLog>("work-log:updated", (event) => {
      replaceWorkLog(event.payload);
    }).then((unlisten) => {
      unlistenWorkLogUpdated = unlisten;
    });
  });

  onDestroy(() => {
    unlistenWorkLogCreated?.();
    unlistenWorkLogUpdated?.();

    if (relativeTimeInterval) {
      clearInterval(relativeTimeInterval);
    }
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
      case "editLatest":
        editLatestWorkLog();
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
    relativeTimeNowMs = Date.now();
    void scrollLogListToTop();
  }

  function replaceWorkLog(workLog: WorkLog) {
    workLogs = workLogs
      .map((existingWorkLog) =>
        existingWorkLog.id === workLog.id ? workLog : existingWorkLog,
      )
      .sort(compareWorkLogs);
    relativeTimeNowMs = Date.now();
  }

  function editLatestWorkLog() {
    if (!lastWorkLog) {
      return;
    }

    onActivate();
    onEditLatest(lastWorkLog);
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
        label: formatWorkLogDateLabel(date, todayStartMs),
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

  function localDateKey(date: Date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${date.getFullYear()}-${month}-${day}`;
  }

  function formatLastLogLabel(workLog: WorkLog | null, nowMs: number) {
    if (!workLog) {
      return "Last log: none";
    }

    return `Last log: ${formatRelativeTime(nowMs - workLog.createdAtMs)}`;
  }

  function formatLastLogTone(
    workLog: WorkLog | null,
    nowMs: number,
  ): LastLogTone {
    if (!workLog) {
      return "neutral";
    }

    const elapsedMs = Math.max(nowMs - workLog.createdAtMs, 0);

    if (elapsedMs >= LOG_TONE_STALE_THRESHOLD_MS) {
      return "stale";
    }

    if (elapsedMs >= LOG_TONE_LATE_THRESHOLD_MS) {
      return "late";
    }

    if (elapsedMs >= LOG_TONE_SOON_THRESHOLD_MS) {
      return "soon";
    }

    return "neutral";
  }

  function formatRelativeTime(elapsedMs: number) {
    const totalSeconds = Math.max(Math.floor(elapsedMs / 1000), 0);

    if (totalSeconds < 60) {
      return "just now";
    }

    const totalMinutes = Math.floor(totalSeconds / 60);

    if (totalMinutes < 60) {
      return `${totalMinutes}m ago`;
    }

    const totalHours = Math.floor(totalMinutes / 60);

    if (totalHours < 24) {
      return `${totalHours}h ago`;
    }

    return `${Math.floor(totalHours / 24)}d ago`;
  }

  function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  function openExternalUrl(event: MouseEvent, url: string) {
    if (!isTauriRuntime()) {
      return;
    }

    event.preventDefault();
    void openUrl(url).catch((error) => {
      workLogError = errorMessage(error);
    });
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
    <div class="hint-row" aria-label="Log recency">
      <span
        class="last-log-status"
        class:last-log-status-soon={lastLogTone === "soon"}
        class:last-log-status-late={lastLogTone === "late"}
        class:last-log-status-stale={lastLogTone === "stale"}
      >
        {lastLogLabel}
      </span>
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
                  <time>{formatWorkLogTime(log.createdAtMs)}</time>
                  <span>
                    {#each linkifyWorkLogBody(log.body) as part, partIndex (`${part.kind}-${partIndex}`)}
                      {#if part.kind === "url"}
                        <!-- External log URLs are opened through Tauri opener, not SvelteKit navigation. -->
                        <!-- eslint-disable svelte/no-navigation-without-resolve -->
                        <a
                          href={part.value}
                          target="_blank"
                          rel="noreferrer"
                          onclick={(event) =>
                            openExternalUrl(event, part.value)}
                        >
                          {part.value}
                        </a>
                        <!-- eslint-enable svelte/no-navigation-without-resolve -->
                      {:else}
                        {part.value}
                      {/if}
                    {/each}
                  </span>
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

  .last-log-status {
    display: inline-flex;
    align-items: center;
    min-height: 1.75rem;
    border: 1px solid rgba(91, 143, 249, 0.18);
    border-radius: 8px;
    padding: 0 0.65rem;
    color: #c9d4e8;
    font-variant-numeric: tabular-nums;
    background: rgba(91, 143, 249, 0.06);
    transition:
      border-color 120ms ease,
      background-color 120ms ease,
      color 120ms ease;
  }

  .last-log-status-soon {
    border-color: rgba(217, 171, 75, 0.28);
    color: #ead4a6;
    background: rgba(217, 171, 75, 0.1);
  }

  .last-log-status-late {
    border-color: rgba(231, 160, 64, 0.36);
    color: #f0c98d;
    background: rgba(231, 160, 64, 0.16);
  }

  .last-log-status-stale {
    border-color: rgba(232, 106, 96, 0.4);
    color: #f0b0aa;
    background: rgba(232, 106, 96, 0.17);
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
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    background: rgba(9, 12, 16, 0.28);
  }

  .log-list {
    flex: 1 1 auto;
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

  .log-item a {
    color: #8fb5ff;
    text-decoration: underline;
    text-decoration-color: rgba(143, 181, 255, 0.5);
    text-underline-offset: 0.16em;
  }

  .log-item a:hover,
  .log-item a:focus-visible {
    color: #b7ccff;
    text-decoration-color: rgba(183, 204, 255, 0.8);
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
