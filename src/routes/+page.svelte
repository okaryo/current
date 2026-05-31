<script lang="ts">
  import { onMount } from "svelte";
  import { check, type Update } from "@tauri-apps/plugin-updater";
  import { relaunch } from "@tauri-apps/plugin-process";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import {
    DEFAULT_POMODORO_FOCUS_DURATION_MINUTES,
    DEFAULT_POMODORO_SOUND_VOLUME,
    DEFAULT_QUICK_ENTRY_GLOBAL_SHORTCUT,
    DEFAULT_TODO_SOUND_VOLUME,
    getSettings,
    pauseQuickEntryGlobalShortcut,
    resumeQuickEntryGlobalShortcut,
    updateNotificationPermissionPromptSeen,
    updatePomodoroSoundSettings,
    updatePomodoroTimerSettings,
    updateQuickEntryGlobalShortcut,
    updateTodoSoundSettings,
    type PomodoroSoundSettings,
    type PomodoroTimerSettings,
    type TodoSoundSettings,
  } from "$lib/api/settings";
  import type { WorkLog } from "$lib/api/workLogs";
  import AppFooter from "$lib/components/AppFooter.svelte";
  import KeyboardShortcutsDialog from "$lib/components/KeyboardShortcutsDialog.svelte";
  import PomodoroSection from "$lib/components/PomodoroSection.svelte";
  import SettingsDialog from "$lib/components/SettingsDialog.svelte";
  import TodoSection from "$lib/components/TodoSection.svelte";
  import WorkLogSection from "$lib/components/WorkLogSection.svelte";
  import { formatFooterDateLabel } from "$lib/dateFormat";
  import {
    globalEntryShortcutRequested,
    keyboardShortcutsRequested,
    pomodoroGlobalCommandFromKeydown,
    sectionFromShortcut,
    settingsShortcutRequested,
    todoCommandFromKeydown,
    updateShortcutRequested,
    workLogCommandFromKeydown,
    type PomodoroCommand,
    type SectionId,
    type TodoCommand,
    type WorkLogCommand,
  } from "$lib/keyboard";
  import {
    isCurrentNotificationPermissionGranted,
    requestCurrentNotificationPermission,
  } from "$lib/notifications";

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
  const UPDATE_CHECK_COOLDOWN_MS = 24 * 60 * 60 * 1000;
  let activeSection = $state<SectionId>("log");
  let pomodoroCommandRequest = $state<{
    id: number;
    command: PomodoroCommand;
    preserveFocus?: boolean;
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
  let workLogEditRequest = $state<{ id: number; workLog: WorkLog } | null>(
    null,
  );
  let workLogEditRequestId = 0;
  let globalEntryFocusRequest = $state(0);
  let dateLabel = $state(formatFooterDateLabel());
  let updateState = $state<UpdateState>("unavailable");
  let availableUpdate = $state<Update | null>(null);
  let updateCheckInFlight = false;
  let lastUpdateCheckAttemptAt = 0;
  let settingsDialogOpen = $state(false);
  let keyboardShortcutsDialogOpen = $state(false);
  let quickEntryGlobalShortcut = $state(DEFAULT_QUICK_ENTRY_GLOBAL_SHORTCUT);
  let pomodoroFocusDurationMinutes = $state(
    DEFAULT_POMODORO_FOCUS_DURATION_MINUTES,
  );
  let pomodoroFocusVolume = $state(DEFAULT_POMODORO_SOUND_VOLUME);
  let pomodoroCompletionVolume = $state(DEFAULT_POMODORO_SOUND_VOLUME);
  let todoCompletionVolume = $state(DEFAULT_TODO_SOUND_VOLUME);
  let pomodoroTimerSaveRequestId = 0;
  let pomodoroSoundSaveRequestId = 0;
  let todoSoundSaveRequestId = 0;
  let settingsLoaded = $state(false);
  let notificationPermissionLoaded = $state(false);
  let notificationPermissionGranted = $state(false);
  let notificationPermissionPromptSeen = $state(false);
  const showNotificationPermissionPrompt = $derived(
    settingsLoaded &&
      notificationPermissionLoaded &&
      !notificationPermissionGranted &&
      !notificationPermissionPromptSeen,
  );

  onMount(() => {
    const dateInterval = window.setInterval(() => {
      dateLabel = formatFooterDateLabel();
    }, 60_000);
    const updateInterval = window.setInterval(() => {
      void checkForUpdates();
    }, UPDATE_CHECK_COOLDOWN_MS);
    let disposed = false;
    let unlistenFocusChange: (() => void) | null = null;

    void checkForUpdates({ force: true });
    void loadSettings();
    void loadNotificationPermission();

    if (isTauriRuntime()) {
      void getCurrentWindow()
        .onFocusChanged(({ payload: focused }) => {
          if (focused) {
            void checkForUpdates();
          }
        })
        .then((unlisten) => {
          if (disposed) {
            unlisten();
            return;
          }

          unlistenFocusChange = unlisten;
        })
        .catch((error) => {
          console.warn("Update focus listener setup failed", error);
        });
    }

    return () => {
      disposed = true;
      window.clearInterval(dateInterval);
      window.clearInterval(updateInterval);
      unlistenFocusChange?.();
    };
  });

  function handleKeydown(event: KeyboardEvent) {
    if (
      keyboardShortcutsRequested(event) &&
      !settingsDialogOpen &&
      !isTextInputTarget(event.target)
    ) {
      event.preventDefault();
      toggleKeyboardShortcutsDialog();
      return;
    }

    if (keyboardShortcutsDialogOpen) {
      return;
    }

    if (settingsShortcutRequested(event)) {
      event.preventDefault();
      openSettingsDialog();
      return;
    }

    if (settingsDialogOpen) {
      return;
    }

    const globalPomodoroCommand = pomodoroGlobalCommandFromKeydown(event);

    if (globalPomodoroCommand) {
      event.preventDefault();
      requestPomodoroCommand(globalPomodoroCommand, { preserveFocus: true });
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
        break;
      case "todo":
        handleTodoSectionKeydown(event);
        break;
      case "log":
        handleWorkLogSectionKeydown(event);
        break;
    }
  }

  function handleTodoSectionKeydown(event: KeyboardEvent) {
    const command = todoCommandFromKeydown(event);

    if (command) {
      event.preventDefault();
      requestTodoCommand(command);
    }
  }

  function handleWorkLogSectionKeydown(event: KeyboardEvent) {
    const command = workLogCommandFromKeydown(event);

    if (command) {
      event.preventDefault();
      requestWorkLogCommand(command);
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

  function openKeyboardShortcutsDialog() {
    keyboardShortcutsDialogOpen = true;
  }

  function closeKeyboardShortcutsDialog() {
    keyboardShortcutsDialogOpen = false;
  }

  function toggleKeyboardShortcutsDialog() {
    keyboardShortcutsDialogOpen = !keyboardShortcutsDialogOpen;
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

  function requestPomodoroCommand(
    command: PomodoroCommand,
    options: { preserveFocus?: boolean } = {},
  ) {
    pomodoroCommandRequest = {
      id: ++pomodoroCommandRequestId,
      command,
      preserveFocus: options.preserveFocus,
    };
  }

  function requestWorkLogCommand(command: WorkLogCommand) {
    workLogCommandRequest = {
      id: ++workLogCommandRequestId,
      command,
    };
  }

  function requestWorkLogEdit(workLog: WorkLog) {
    workLogEditRequest = {
      id: ++workLogEditRequestId,
      workLog,
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

  async function checkForUpdates(options: { force?: boolean } = {}) {
    if (!isTauriRuntime()) {
      updateState = "unavailable";
      return;
    }

    if (shouldSkipUpdateCheck(options.force ?? false)) {
      return;
    }

    updateCheckInFlight = true;
    lastUpdateCheckAttemptAt = Date.now();
    updateState = "checking";

    try {
      const update = await check();

      availableUpdate = update;
      updateState = update ? "available" : "idle";
    } catch (error) {
      console.warn("Update check failed", error);
      updateState = "error";
    } finally {
      updateCheckInFlight = false;
    }
  }

  function shouldSkipUpdateCheck(force: boolean) {
    if (
      updateCheckInFlight ||
      updateState === "available" ||
      updateState === "installing"
    ) {
      return true;
    }

    return (
      !force && Date.now() - lastUpdateCheckAttemptAt < UPDATE_CHECK_COOLDOWN_MS
    );
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
      settingsLoaded = true;
      return;
    }

    try {
      const settings = await getSettings();
      quickEntryGlobalShortcut = settings.globalShortcut.quickEntry;
      pomodoroFocusDurationMinutes =
        settings.pomodoroTimer.focusDurationMinutes;
      pomodoroFocusVolume = settings.pomodoroSound.focusVolume;
      pomodoroCompletionVolume = settings.pomodoroSound.completionVolume;
      todoCompletionVolume = settings.todoSound.completionVolume;
      notificationPermissionPromptSeen =
        settings.notification.permissionPromptSeen;
    } catch (error) {
      console.warn("Settings load failed", error);
    } finally {
      settingsLoaded = true;
    }
  }

  async function loadNotificationPermission() {
    notificationPermissionGranted =
      await isCurrentNotificationPermissionGranted();
    notificationPermissionLoaded = true;
  }

  async function saveQuickEntryGlobalShortcut(shortcut: string) {
    if (!isTauriRuntime()) {
      quickEntryGlobalShortcut = shortcut;
      return;
    }

    const settings = await updateQuickEntryGlobalShortcut(shortcut);
    quickEntryGlobalShortcut = settings.globalShortcut.quickEntry;
  }

  async function savePomodoroTimerSettings(settings: PomodoroTimerSettings) {
    const requestId = ++pomodoroTimerSaveRequestId;

    pomodoroFocusDurationMinutes = settings.focusDurationMinutes;

    if (!isTauriRuntime()) {
      return;
    }

    const savedSettings = await updatePomodoroTimerSettings(settings);

    if (requestId !== pomodoroTimerSaveRequestId) {
      return;
    }

    pomodoroFocusDurationMinutes =
      savedSettings.pomodoroTimer.focusDurationMinutes;
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

  async function saveTodoSoundSettings(settings: TodoSoundSettings) {
    const requestId = ++todoSoundSaveRequestId;

    todoCompletionVolume = settings.completionVolume;

    if (!isTauriRuntime()) {
      return;
    }

    const savedSettings = await updateTodoSoundSettings(settings);

    if (requestId !== todoSoundSaveRequestId) {
      return;
    }

    todoCompletionVolume = savedSettings.todoSound.completionVolume;
  }

  async function requestNotificationPermission() {
    notificationPermissionPromptSeen = true;
    notificationPermissionGranted =
      await requestCurrentNotificationPermission();

    if (isTauriRuntime()) {
      try {
        const settings = await updateNotificationPermissionPromptSeen(true);
        notificationPermissionPromptSeen =
          settings.notification.permissionPromptSeen;
      } catch (error) {
        console.warn("Notification prompt state save failed", error);
      }
    }
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
        focusDurationMinutes={pomodoroFocusDurationMinutes}
        focusVolume={pomodoroFocusVolume}
        completionVolume={pomodoroCompletionVolume}
        {showNotificationPermissionPrompt}
        commandRequest={pomodoroCommandRequest}
        onActivate={() => setActiveSection("pomodoro", { preserveFocus: true })}
        onRequestNotificationPermission={requestNotificationPermission}
      />
    </div>

    <div class="section-slot todo-slot">
      <TodoSection
        active={activeSection === "todo"}
        title={sections[1].title}
        shortcut={sections[1].shortcut}
        completionVolume={todoCompletionVolume}
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
        onEditWorkLog={requestWorkLogEdit}
      />
    </div>
  </div>

  <AppFooter
    {activeSection}
    {dateLabel}
    focusRequest={globalEntryFocusRequest}
    {workLogEditRequest}
    {updateState}
    onCancelEntry={restoreSectionFromGlobalEntry}
    onInstallUpdate={installUpdate}
    onOpenKeyboardShortcuts={openKeyboardShortcutsDialog}
    onOpenSettings={openSettingsDialog}
  />

  <KeyboardShortcutsDialog
    open={keyboardShortcutsDialogOpen}
    onClose={closeKeyboardShortcutsDialog}
  />

  <SettingsDialog
    open={settingsDialogOpen}
    quickEntryShortcut={quickEntryGlobalShortcut}
    {pomodoroFocusDurationMinutes}
    {pomodoroFocusVolume}
    {pomodoroCompletionVolume}
    {todoCompletionVolume}
    onClose={closeSettingsDialog}
    onStartQuickEntryShortcutRecording={pauseQuickEntryShortcutRecording}
    onCancelQuickEntryShortcutRecording={resumeQuickEntryShortcutRecording}
    onUpdateQuickEntryShortcut={saveQuickEntryGlobalShortcut}
    onUpdatePomodoroTimerSettings={savePomodoroTimerSettings}
    onUpdatePomodoroSoundSettings={savePomodoroSoundSettings}
    onUpdateTodoSoundSettings={saveTodoSoundSettings}
  />
</main>

<style>
  :global(*) {
    box-sizing: border-box;
    scrollbar-color: rgba(132, 151, 179, 0.44) transparent;
    scrollbar-width: thin;
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
    position: relative;
    min-width: 0;
    min-height: 0;
  }

  .section-slot :global(.panel) {
    flex: 1 1 auto;
    min-width: 0;
  }

  .pomodoro-slot {
    grid-area: pomodoro;
    z-index: 1;
  }

  .todo-slot {
    grid-area: todo;
    z-index: 2;
  }

  .log-slot {
    grid-area: log;
    z-index: 1;
  }
</style>
