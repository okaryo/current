<script lang="ts">
  import GlobalEntryInput from "$lib/components/GlobalEntryInput.svelte";
  import PomodoroSection from "$lib/components/PomodoroSection.svelte";
  import TodoSection from "$lib/components/TodoSection.svelte";
  import WorkLogSection from "$lib/components/WorkLogSection.svelte";

  type SectionId = "pomodoro" | "todo" | "log";

  type Section = {
    id: SectionId;
    title: string;
    shortcut: string;
  };

  type TodoCommand =
    | "focusPreferred"
    | "moveDown"
    | "moveUp"
    | "toggleComplete"
    | "edit"
    | "toggleNow"
    | "addSubtask"
    | "indent"
    | "outdent"
    | "delete"
    | "clearSelection";

  type PomodoroCommand = "toggle" | "reset" | "startFocus";
  type WorkLogCommand = "focusPreferred";

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

    if (
      event.key === "i" &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey
    ) {
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
      case "e":
        event.preventDefault();
        requestTodoCommand("edit");
        break;
      case "t":
        if (
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey &&
          !event.shiftKey
        ) {
          event.preventDefault();
          requestTodoCommand("addSubtask");
        }
        break;
      case "Enter":
        if (
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey &&
          !event.shiftKey
        ) {
          event.preventDefault();
          requestTodoCommand("toggleNow");
        }
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

  function sectionFromShortcut(event: KeyboardEvent): SectionId | null {
    if (!event.metaKey || event.ctrlKey || event.altKey) {
      return null;
    }

    if (event.shiftKey) {
      return adjacentSectionFromShortcut(event);
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

  function adjacentSectionFromShortcut(event: KeyboardEvent): SectionId | null {
    switch (event.code) {
      case "BracketLeft":
        return adjacentSection(-1);
      case "BracketRight":
        return adjacentSection(1);
      default:
        return null;
    }
  }

  function adjacentSection(offset: number): SectionId {
    const activeIndex = sections.findIndex(
      (section) => section.id === activeSection,
    );
    const nextIndex =
      (activeIndex + offset + sections.length) % sections.length;

    return sections[nextIndex].id;
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
