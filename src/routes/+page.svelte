<script lang="ts">
  import { onMount } from "svelte";
  import { check, type Update } from "@tauri-apps/plugin-updater";
  import { relaunch } from "@tauri-apps/plugin-process";
  import {
    DEFAULT_POMODORO_SOUND_VOLUME,
    DEFAULT_QUICK_ENTRY_GLOBAL_SHORTCUT,
    getSettings,
    pauseQuickEntryGlobalShortcut,
    resumeQuickEntryGlobalShortcut,
    updatePomodoroSoundSettings,
    updateQuickEntryGlobalShortcut,
    type PomodoroSoundSettings,
  } from "$lib/api/settings";
  import AppFooter from "$lib/components/AppFooter.svelte";
  import PomodoroSection from "$lib/components/PomodoroSection.svelte";
  import SettingsDialog from "$lib/components/SettingsDialog.svelte";
  import TodoSection from "$lib/components/TodoSection.svelte";
  import WorkLogSection from "$lib/components/WorkLogSection.svelte";
  import {
    globalEntryShortcutRequested,
    pomodoroCommandFromKeydown,
    sectionFromShortcut,
    settingsShortcutRequested,
    todoCommandFromKeydown,
    updateShortcutRequested,
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
  type UpdateState =
    | "unavailable"
    | "checking"
    | "idle"
    | "available"
    | "installing"
    | "error";

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
  let dateLabel = $state(formatDateLabel());
  let updateState = $state<UpdateState>("unavailable");
  let availableUpdate = $state<Update | null>(null);
  let settingsDialogOpen = $state(false);
  let quickEntryGlobalShortcut = $state(DEFAULT_QUICK_ENTRY_GLOBAL_SHORTCUT);
  let pomodoroFocusVolume = $state(DEFAULT_POMODORO_SOUND_VOLUME);
  let pomodoroCompletionVolume = $state(DEFAULT_POMODORO_SOUND_VOLUME);
  let pomodoroSoundSaveRequestId = 0;

  onMount(() => {
    const dateInterval = window.setInterval(() => {
      dateLabel = formatDateLabel();
    }, 60_000);

    void checkForUpdates();
    void loadSettings();

    return () => {
      window.clearInterval(dateInterval);
    };
  });

  function handleKeydown(event: KeyboardEvent) {
    if (settingsShortcutRequested(event)) {
      event.preventDefault();
      openSettingsDialog();
      return;
    }

    if (settingsDialogOpen) {
      return;
    }

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

    if (updateShortcutRequested(event) && updateState === "available") {
      event.preventDefault();
      void installUpdate();
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

  function openSettingsDialog() {
    settingsDialogOpen = true;
  }

  function closeSettingsDialog() {
    settingsDialogOpen = false;
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

  async function checkForUpdates() {
    if (!isTauriRuntime()) {
      updateState = "unavailable";
      return;
    }

    updateState = "checking";

    try {
      const update = await check();

      availableUpdate = update;
      updateState = update ? "available" : "idle";
    } catch (error) {
      console.warn("Update check failed", error);
      updateState = "error";
    }
  }

  async function installUpdate() {
    if (!availableUpdate) {
      return;
    }

    updateState = "installing";

    try {
      await availableUpdate.downloadAndInstall();
      await relaunch();
    } catch (error) {
      console.warn("Update installation failed", error);
      updateState = "error";
    }
  }

  async function loadSettings() {
    if (!isTauriRuntime()) {
      return;
    }

    try {
      const settings = await getSettings();
      quickEntryGlobalShortcut = settings.globalShortcut.quickEntry;
      pomodoroFocusVolume = settings.pomodoroSound.focusVolume;
      pomodoroCompletionVolume = settings.pomodoroSound.completionVolume;
    } catch (error) {
      console.warn("Settings load failed", error);
    }
  }

  async function saveQuickEntryGlobalShortcut(shortcut: string) {
    if (!isTauriRuntime()) {
      quickEntryGlobalShortcut = shortcut;
      return;
    }

    const settings = await updateQuickEntryGlobalShortcut(shortcut);
    quickEntryGlobalShortcut = settings.globalShortcut.quickEntry;
  }

  async function savePomodoroSoundSettings(settings: PomodoroSoundSettings) {
    const requestId = ++pomodoroSoundSaveRequestId;

    pomodoroFocusVolume = settings.focusVolume;
    pomodoroCompletionVolume = settings.completionVolume;

    if (!isTauriRuntime()) {
      return;
    }

    const savedSettings = await updatePomodoroSoundSettings(settings);

    if (requestId !== pomodoroSoundSaveRequestId) {
      return;
    }

    pomodoroFocusVolume = savedSettings.pomodoroSound.focusVolume;
    pomodoroCompletionVolume = savedSettings.pomodoroSound.completionVolume;
  }

  async function pauseQuickEntryShortcutRecording() {
    if (!isTauriRuntime()) {
      return;
    }

    await pauseQuickEntryGlobalShortcut();
  }

  async function resumeQuickEntryShortcutRecording() {
    if (!isTauriRuntime()) {
      return;
    }

    await resumeQuickEntryGlobalShortcut();
  }

  function formatDateLabel(date = new Date()) {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(date);
  }

  function isTauriRuntime() {
    return "__TAURI_INTERNALS__" in window;
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
        focusVolume={pomodoroFocusVolume}
        completionVolume={pomodoroCompletionVolume}
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

  <AppFooter
    {activeSection}
    {dateLabel}
    focusRequest={globalEntryFocusRequest}
    {updateState}
    onCancelEntry={restoreSectionFromGlobalEntry}
    onInstallUpdate={installUpdate}
    onOpenSettings={openSettingsDialog}
  />

  <SettingsDialog
    open={settingsDialogOpen}
    quickEntryShortcut={quickEntryGlobalShortcut}
    {pomodoroFocusVolume}
    {pomodoroCompletionVolume}
    onClose={closeSettingsDialog}
    onStartQuickEntryShortcutRecording={pauseQuickEntryShortcutRecording}
    onCancelQuickEntryShortcutRecording={resumeQuickEntryShortcutRecording}
    onUpdateQuickEntryShortcut={saveQuickEntryGlobalShortcut}
    onUpdatePomodoroSoundSettings={savePomodoroSoundSettings}
  />
</main>

<style>
  :global(*) {
    box-sizing: border-box;
    scrollbar-color: var(--scrollbar-thumb) transparent;
    scrollbar-width: thin;
  }

  :global(html) {
    --scrollbar-thumb: rgba(132, 151, 179, 0.44);
    --scrollbar-thumb-hover: rgba(158, 177, 204, 0.56);
    --scrollbar-thumb-border: rgba(9, 12, 16, 0.78);

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

  :global(*::-webkit-scrollbar) {
    width: 0.48rem;
    height: 0.48rem;
  }

  :global(*::-webkit-scrollbar-track) {
    border-radius: 999px;
    background: transparent;
  }

  :global(*::-webkit-scrollbar-thumb) {
    border: 1px solid var(--scrollbar-thumb-border);
    border-radius: 999px;
    background: var(--scrollbar-thumb);
    background-clip: padding-box;
  }

  :global(*::-webkit-scrollbar-thumb:hover) {
    background: var(--scrollbar-thumb-hover);
    background-clip: padding-box;
  }

  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    min-height: 0;
    overflow: hidden;
    padding: 0.8rem 0.8rem 0rem;
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
    flex: 1 1 auto;
    width: min(100%, 104rem);
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
