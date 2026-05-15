<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import PomodoroSection from "$lib/components/PomodoroSection.svelte";
  import TodoSection from "$lib/components/TodoSection.svelte";
  import WorkLogSection from "$lib/components/WorkLogSection.svelte";
  import { sendWorkLogReminderNotification } from "$lib/notifications";

  type SectionId = "pomodoro" | "todo" | "log";

  type Section = {
    id: SectionId;
    title: string;
    shortcut: string;
  };

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

  type PomodoroCommand = "toggle" | "reset" | "startFocus";

  const sections: Section[] = [
    { id: "pomodoro", title: "Pomodoro", shortcut: "⌘1" },
    { id: "todo", title: "Todo", shortcut: "⌘2" },
    { id: "log", title: "Log", shortcut: "⌘3" },
  ];
  const RHYTHM_REMINDER_INTERVAL_MS = 15 * 60 * 1000;

  let activeSection = $state<SectionId>("log");
  let pomodoroCommandRequest = $state<{
    id: number;
    command: PomodoroCommand;
  } | null>(null);
  let pomodoroCommandRequestId = 0;
  let todoCommandRequest = $state<{ id: number; command: TodoCommand } | null>(
    null,
  );
  let todoCommandRequestId = 0;
  let workLogFocusRequest = $state(0);
  let pomodoroRunning = $state(false);
  let reminderEnabled = $state(true);
  let reminderStartedAtMs = $state<number | null>(null);
  let reminderNextAtMs = $state<number | null>(null);
  let reminderNowMs = $state(Date.now());
  let reminderTimeout: ReturnType<typeof setTimeout> | undefined;
  let reminderTickInterval: ReturnType<typeof setInterval> | undefined;

  const reminderRemainingLabel = $derived(
    reminderStatusLabel(
      reminderEnabled,
      pomodoroRunning,
      reminderNextAtMs,
      reminderNowMs,
    ),
  );
  const reminderProgress = $derived(
    reminderProgressValue(reminderStartedAtMs, reminderNextAtMs, reminderNowMs),
  );

  onDestroy(() => {
    stopRhythmReminder();
  });

  onMount(() => {
    focusWorkLogInput();
  });

  function handleKeydown(event: KeyboardEvent) {
    const sectionShortcut = sectionFromShortcut(event);

    if (sectionShortcut) {
      event.preventDefault();
      activateSectionFromShortcut(sectionShortcut);
      return;
    }

    if (isTextInputTarget(event.target)) {
      if (event.key === "Escape") {
        (event.target as HTMLElement).blur();
      }

      return;
    }

    switch (activeSection) {
      case "pomodoro":
        handlePomodoroSectionKeydown(event);
        break;
      case "todo":
        handleTodoSectionKeydown(event);
        break;
      case "log":
        handleLogSectionKeydown(event);
        break;
    }
  }

  function handlePomodoroSectionKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case " ":
        event.preventDefault();
        requestPomodoroCommand("toggle");
        break;
      case "r":
        event.preventDefault();
        requestPomodoroCommand("reset");
        break;
    }
  }

  function handleTodoSectionKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case "D":
        if (event.shiftKey) {
          event.preventDefault();
          requestTodoCommand("delete");
        }
        break;
      case "j":
      case "ArrowDown":
        event.preventDefault();
        requestTodoCommand("moveDown");
        break;
      case "k":
      case "ArrowUp":
        event.preventDefault();
        requestTodoCommand("moveUp");
        break;
      case " ":
        event.preventDefault();
        requestTodoCommand("toggleComplete");
        break;
      case "i":
        event.preventDefault();
        requestTodoCommand("focusAdd");
        break;
      case "e":
        event.preventDefault();
        requestTodoCommand("edit");
        break;
      case "Enter":
        event.preventDefault();
        requestTodoCommand("toggleNow");
        break;
      case "Tab":
        event.preventDefault();
        requestTodoCommand(event.shiftKey ? "outdent" : "indent");
        break;
      case "Escape":
        event.preventDefault();
        requestTodoCommand("clearSelection");
        break;
    }
  }

  function handleLogSectionKeydown(event: KeyboardEvent) {
    if (event.key === "i") {
      event.preventDefault();
      focusWorkLogInput();
    }
  }

  function focusWorkLogInput() {
    setActiveSection("log", { preserveFocus: true });
    workLogFocusRequest += 1;
  }

  function activateSectionFromShortcut(section: SectionId) {
    if (section === "todo") {
      setActiveSection("todo");
      requestTodoCommand("focusPreferred");
      return;
    }

    if (section === "log") {
      focusWorkLogInput();
      return;
    }

    setActiveSection(section);
  }

  function setActiveSection(
    section: SectionId,
    options: { preserveFocus?: boolean } = {},
  ) {
    activeSection = section;

    if (!options.preserveFocus && isTextInputTarget(document.activeElement)) {
      (document.activeElement as HTMLElement).blur();
    }
  }

  function requestTodoCommand(command: TodoCommand) {
    todoCommandRequest = {
      id: ++todoCommandRequestId,
      command,
    };
  }

  function requestPomodoroCommand(command: PomodoroCommand) {
    pomodoroCommandRequest = {
      id: ++pomodoroCommandRequestId,
      command,
    };
  }

  function startPomodoroFocus() {
    requestPomodoroCommand("startFocus");
  }

  function handlePomodoroRunningChange(nextRunning: boolean) {
    pomodoroRunning = nextRunning;

    if (nextRunning) {
      startRhythmReminder();
      return;
    }

    stopRhythmReminder();
  }

  function toggleRhythmReminder() {
    reminderEnabled = !reminderEnabled;

    if (reminderEnabled && pomodoroRunning) {
      startRhythmReminder();
      return;
    }

    stopRhythmReminder();
  }

  function startRhythmReminder() {
    stopRhythmReminder();

    if (!reminderEnabled || !pomodoroRunning) {
      return;
    }

    const now = Date.now();

    reminderStartedAtMs = now;
    reminderNextAtMs = now + RHYTHM_REMINDER_INTERVAL_MS;
    reminderNowMs = now;
    reminderTimeout = setTimeout(() => {
      void handleRhythmReminderElapsed();
    }, RHYTHM_REMINDER_INTERVAL_MS);
    reminderTickInterval = setInterval(() => {
      reminderNowMs = Date.now();
    }, 1000);
  }

  function stopRhythmReminder() {
    if (reminderTimeout) {
      clearTimeout(reminderTimeout);
      reminderTimeout = undefined;
    }

    if (reminderTickInterval) {
      clearInterval(reminderTickInterval);
      reminderTickInterval = undefined;
    }

    reminderStartedAtMs = null;
    reminderNextAtMs = null;
    reminderNowMs = Date.now();
  }

  async function handleRhythmReminderElapsed() {
    if (!reminderEnabled || !pomodoroRunning) {
      stopRhythmReminder();
      return;
    }

    await sendWorkLogReminderNotification();
    startRhythmReminder();
  }

  function reminderStatusLabel(
    enabled: boolean,
    running: boolean,
    nextAtMs: number | null,
    nowMs: number,
  ) {
    if (!enabled) {
      return "Off";
    }

    if (!running || nextAtMs === null) {
      return "Paused";
    }

    return formatDuration(Math.max(nextAtMs - nowMs, 0));
  }

  function reminderProgressValue(
    startedAtMs: number | null,
    nextAtMs: number | null,
    nowMs: number,
  ) {
    if (startedAtMs === null || nextAtMs === null || nextAtMs <= startedAtMs) {
      return 0;
    }

    return Math.min(
      Math.max((nowMs - startedAtMs) / (nextAtMs - startedAtMs), 0),
      1,
    );
  }

  function formatDuration(durationMs: number) {
    const totalSeconds = Math.ceil(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
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

  function isTextInputTarget(target: EventTarget | null) {
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    );
  }
</script>

<svelte:head>
  <title>Current</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<main class="app-shell" aria-label="Current">
  <div class="workspace">
    <div class="section-slot pomodoro-slot">
      <PomodoroSection
        active={activeSection === "pomodoro"}
        title={sections[0].title}
        shortcut={sections[0].shortcut}
        commandRequest={pomodoroCommandRequest}
        onRunningChange={handlePomodoroRunningChange}
        onActivate={() => setActiveSection("pomodoro", { preserveFocus: true })}
      />
    </div>

    <div class="section-slot todo-slot">
      <TodoSection
        active={activeSection === "todo"}
        title={sections[1].title}
        shortcut={sections[1].shortcut}
        commandRequest={todoCommandRequest}
        onSetNow={startPomodoroFocus}
        onActivate={() => setActiveSection("todo", { preserveFocus: true })}
      />
    </div>

    <div class="section-slot log-slot">
      <WorkLogSection
        active={activeSection === "log"}
        title={sections[2].title}
        shortcut={sections[2].shortcut}
        focusRequest={workLogFocusRequest}
        {reminderEnabled}
        {reminderProgress}
        {reminderRemainingLabel}
        onToggleReminder={toggleRhythmReminder}
        onActivate={() => setActiveSection("log", { preserveFocus: true })}
      />
    </div>
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
    min-width: 860px;
    height: 100vh;
    margin: 0;
    overflow: hidden;
  }

  .app-shell {
    height: 100vh;
    overflow: hidden;
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
    grid-template-areas:
      "pomodoro pomodoro"
      "todo log";
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    gap: 0.75rem;
    width: min(100%, 104rem);
    height: calc(100vh - 1.6rem);
    min-height: 0;
    margin: 0 auto;
  }

  .section-slot {
    display: flex;
    min-width: 0;
    min-height: 0;
  }

  .section-slot :global(.panel) {
    flex: 1 1 auto;
    min-width: 0;
  }

  .pomodoro-slot {
    grid-area: pomodoro;
  }

  .todo-slot {
    grid-area: todo;
  }

  .log-slot {
    grid-area: log;
  }
</style>
