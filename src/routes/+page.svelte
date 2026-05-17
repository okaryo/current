<script lang="ts">
  import GlobalEntryInput from "$lib/components/GlobalEntryInput.svelte";
  import PomodoroSection from "$lib/components/PomodoroSection.svelte";
  import TodoSection from "$lib/components/TodoSection.svelte";
  import WorkLogSection from "$lib/components/WorkLogSection.svelte";
  import {
    globalEntryShortcutRequested,
    pomodoroCommandFromKeydown,
    sectionFromShortcut,
    todoCommandFromKeydown,
    type PomodoroCommand,
    type SectionId,
    type TodoCommand,
    type WorkLogCommand,
  } from "$lib/keyboard";

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
  let workLogCommandRequest = $state<{
    id: number;
    command: WorkLogCommand;
  } | null>(null);
  let workLogCommandRequestId = 0;
  let globalEntryFocusRequest = $state(0);

  function handleKeydown(event: KeyboardEvent) {
    const sectionShortcut = sectionFromShortcut(event, activeSection);

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

    if (globalEntryShortcutRequested(event)) {
      event.preventDefault();
      requestGlobalEntryFocus();
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
        break;
    }
  }

  function handlePomodoroSectionKeydown(event: KeyboardEvent) {
    const command = pomodoroCommandFromKeydown(event);

    if (command) {
      event.preventDefault();
      requestPomodoroCommand(command);
    }
  }

  function handleTodoSectionKeydown(event: KeyboardEvent) {
    const command = todoCommandFromKeydown(event);

    if (command) {
      event.preventDefault();
      requestTodoCommand(command);
    }
  }

  function requestGlobalEntryFocus() {
    globalEntryFocusRequest += 1;
  }

  function activateSectionFromShortcut(section: SectionId) {
    if (section === "todo") {
      setActiveSection("todo");
      requestTodoCommand("focusPreferred");
      return;
    }

    if (section === "log") {
      setActiveSection("log");
      requestWorkLogCommand("focusPreferred");
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

  function requestWorkLogCommand(command: WorkLogCommand) {
    workLogCommandRequest = {
      id: ++workLogCommandRequestId,
      command,
    };
  }

  function startPomodoroFocus() {
    requestPomodoroCommand("startFocus");
  }

  function restoreSectionFromGlobalEntry(section: SectionId) {
    setActiveSection(section);

    if (section === "todo") {
      requestTodoCommand("focusPreferred");
    }

    if (section === "log") {
      requestWorkLogCommand("focusPreferred");
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
        commandRequest={workLogCommandRequest}
        onActivate={() => setActiveSection("log", { preserveFocus: true })}
      />
    </div>
  </div>

  <GlobalEntryInput
    {activeSection}
    focusRequest={globalEntryFocusRequest}
    onCancel={restoreSectionFromGlobalEntry}
  />
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
      "pomodoro log"
      "todo log";
    grid-template-columns: minmax(18rem, 0.6fr) minmax(0, 1fr);
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
