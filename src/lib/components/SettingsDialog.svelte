<script lang="ts">
  import { X } from "@lucide/svelte";
  import { tick } from "svelte";
  import KeyboardKey from "$lib/components/KeyboardKey.svelte";
  import {
    shortcutFromKeydown,
    shortcutToKeyboardKeys,
  } from "$lib/globalShortcut";
  import type { PomodoroSoundSettings } from "$lib/api/settings";

  type SettingId = "quick-entry" | "focus-volume" | "completion-volume";

  type Props = {
    open: boolean;
    quickEntryShortcut: string;
    pomodoroFocusVolume: number;
    pomodoroCompletionVolume: number;
    onClose: () => void;
    onStartQuickEntryShortcutRecording: () => Promise<void>;
    onCancelQuickEntryShortcutRecording: () => Promise<void>;
    onUpdateQuickEntryShortcut: (shortcut: string) => Promise<void>;
    onUpdatePomodoroSoundSettings: (
      settings: PomodoroSoundSettings,
    ) => Promise<void>;
  };

  let {
    open,
    quickEntryShortcut,
    pomodoroFocusVolume,
    pomodoroCompletionVolume,
    onClose,
    onStartQuickEntryShortcutRecording,
    onCancelQuickEntryShortcutRecording,
    onUpdateQuickEntryShortcut,
    onUpdatePomodoroSoundSettings,
  }: Props = $props();

  let hotkeyButton = $state<HTMLButtonElement>();
  let focusVolumeInput = $state<HTMLInputElement>();
  let completionVolumeInput = $state<HTMLInputElement>();
  let closeButton = $state<HTMLButtonElement>();
  let previousFocusedElement: HTMLElement | null = null;
  let wasOpen = false;
  let isRecording = $state(false);
  let isSaving = $state(false);
  let activeSetting = $state<SettingId | null>(null);
  let message = $state<string | null>(null);
  const quickEntryShortcutKeys = $derived(
    shortcutToKeyboardKeys(quickEntryShortcut),
  );
  const settingIds: SettingId[] = [
    "quick-entry",
    "focus-volume",
    "completion-volume",
  ];

  $effect(() => {
    if (open && !wasOpen) {
      wasOpen = true;
      previousFocusedElement = document.activeElement as HTMLElement | null;
      void focusHotkeyButton();
      return;
    }

    if (!open && wasOpen) {
      wasOpen = false;
      isRecording = false;
      isSaving = false;
      activeSetting = null;
      message = null;
      void tick().then(() => previousFocusedElement?.focus());
    }
  });

  function handleKeydown(event: KeyboardEvent) {
    if (!open) {
      return;
    }

    if (isRecording) {
      handleRecordingKeydown(event);
      return;
    }

    if (event.key === "Escape") {
      void closeDialog(event);
      return;
    }

    if (event.key === "j" || event.key === "k") {
      event.preventDefault();
      event.stopPropagation();
      void focusAdjacentSetting(event.key === "j" ? 1 : -1);
      return;
    }

    if (event.key === "Tab") {
      trapFocus(event);
    }
  }

  function handleRecordingKeydown(event: KeyboardEvent) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (event.key === "Escape") {
      void cancelRecording();
      return;
    }

    if (event.repeat || isSaving) {
      return;
    }

    const result = shortcutFromKeydown(event);

    if (result.status === "pending") {
      return;
    }

    if (result.status === "invalid") {
      message = result.message;
      return;
    }

    void updateShortcut(result.shortcut);
  }

  async function closeDialog(event: KeyboardEvent) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    await cancelRecording();
    onClose();
  }

  async function startRecording() {
    if (isSaving) {
      return;
    }

    isSaving = true;
    message = null;

    try {
      await onStartQuickEntryShortcutRecording();
      isRecording = true;
      message = "Press a global shortcut.";
    } catch (error) {
      message = errorMessage(error);
    } finally {
      isSaving = false;
      void focusHotkeyButton();
    }
  }

  async function cancelRecording() {
    if (!isRecording) {
      return;
    }

    isRecording = false;
    message = null;

    try {
      await onCancelQuickEntryShortcutRecording();
    } catch (error) {
      message = errorMessage(error);
    } finally {
      void focusHotkeyButton();
    }
  }

  async function updateShortcut(shortcut: string) {
    isSaving = true;
    message = null;

    try {
      await onUpdateQuickEntryShortcut(shortcut);
      isRecording = false;
      message = null;
    } catch (error) {
      const updateMessage = errorMessage(error);

      try {
        await onCancelQuickEntryShortcutRecording();
        message = updateMessage;
      } catch (resumeError) {
        message = `${updateMessage} ${errorMessage(resumeError)}`;
      }
    } finally {
      isSaving = false;
      void focusHotkeyButton();
    }
  }

  async function focusHotkeyButton() {
    await tick();
    hotkeyButton?.focus();
  }

  async function focusAdjacentSetting(offset: number) {
    const currentSetting =
      activeSetting ?? settingIdFromElement(document.activeElement);
    const currentIndex = currentSetting
      ? settingIds.indexOf(currentSetting)
      : -1;
    const nextIndex =
      currentIndex === -1
        ? 0
        : (currentIndex + offset + settingIds.length) % settingIds.length;

    await focusSetting(settingIds[nextIndex]);
  }

  async function focusSetting(settingId: SettingId) {
    await tick();

    switch (settingId) {
      case "quick-entry":
        hotkeyButton?.focus();
        break;
      case "focus-volume":
        focusVolumeInput?.focus();
        break;
      case "completion-volume":
        completionVolumeInput?.focus();
        break;
    }
  }

  function settingIdFromElement(element: Element | null): SettingId | null {
    if (element === hotkeyButton) {
      return "quick-entry";
    }

    if (element === focusVolumeInput) {
      return "focus-volume";
    }

    if (element === completionVolumeInput) {
      return "completion-volume";
    }

    return null;
  }

  function trapFocus(event: KeyboardEvent) {
    const focusableElements = [
      hotkeyButton,
      focusVolumeInput,
      completionVolumeInput,
      closeButton,
    ].filter((element): element is HTMLButtonElement | HTMLInputElement =>
      Boolean(element),
    );

    if (focusableElements.length === 0) {
      return;
    }

    const activeIndex = focusableElements.findIndex(
      (element) => element === document.activeElement,
    );

    if (activeIndex === -1) {
      event.preventDefault();
      focusableElements[0]?.focus();
      return;
    }

    const nextIndex = event.shiftKey
      ? (activeIndex - 1 + focusableElements.length) % focusableElements.length
      : (activeIndex + 1) % focusableElements.length;

    event.preventDefault();
    focusableElements[nextIndex]?.focus();
  }

  function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  function handleFocusVolumeInput(event: Event) {
    void updatePomodoroVolume(volumeFromEvent(event), pomodoroCompletionVolume);
  }

  function handleCompletionVolumeInput(event: Event) {
    void updatePomodoroVolume(pomodoroFocusVolume, volumeFromEvent(event));
  }

  async function updatePomodoroVolume(
    focusVolume: number,
    completionVolume: number,
  ) {
    message = null;

    try {
      await onUpdatePomodoroSoundSettings({
        focusVolume,
        completionVolume,
      });
    } catch (error) {
      message = errorMessage(error);
    }
  }

  function volumeFromEvent(event: Event) {
    const input = event.currentTarget as HTMLInputElement;

    return clampVolume(Number(input.value));
  }

  function clampVolume(volume: number) {
    if (!Number.isFinite(volume)) {
      return 0;
    }

    return Math.min(100, Math.max(0, Math.round(volume)));
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div
    class="dialog-backdrop"
    aria-hidden="true"
    onclick={() => {
      void cancelRecording().then(onClose);
    }}
  ></div>
  <div
    class="settings-dialog"
    role="dialog"
    aria-modal="true"
    aria-labelledby="settings-title"
    tabindex="-1"
  >
    <header class="settings-header">
      <h2 id="settings-title">Settings</h2>
      <button
        bind:this={closeButton}
        type="button"
        class="icon-button"
        aria-label="Close settings with Escape"
        title="Close (Esc)"
        onclick={() => {
          void cancelRecording().then(onClose);
        }}
      >
        <X size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </header>

    <div class="settings-content">
      <section class="settings-section" aria-labelledby="global-shortcut-title">
        <h3 id="global-shortcut-title">Global shortcut</h3>

        <div
          class="setting-row"
          class:is-active={activeSetting === "quick-entry" || isRecording}
          aria-labelledby="quick-entry-hotkey-title"
        >
          <div class="setting-copy">
            <h4 id="quick-entry-hotkey-title">Quick Entry</h4>
          </div>
          <button
            bind:this={hotkeyButton}
            type="button"
            class="hotkey-button"
            class:is-recording={isRecording}
            aria-label="Quick Entry hotkey"
            aria-describedby={message ? "settings-message" : undefined}
            disabled={isSaving}
            onfocus={() => {
              activeSetting = "quick-entry";
            }}
            onclick={() => {
              void startRecording();
            }}
          >
            {#if isRecording}
              <span class="recording-label">Press shortcut</span>
            {:else}
              {#each quickEntryShortcutKeys as key, index (`${key}-${index}`)}
                <KeyboardKey value={key} />
              {/each}
            {/if}
          </button>
        </div>
      </section>

      <section class="settings-section" aria-labelledby="pomodoro-sound-title">
        <h3 id="pomodoro-sound-title">Pomodoro sound</h3>

        <div
          class="setting-row"
          class:is-active={activeSetting === "focus-volume"}
          aria-labelledby="pomodoro-focus-volume-title"
        >
          <div class="setting-copy">
            <h4 id="pomodoro-focus-volume-title">Focus sound</h4>
          </div>
          <div class="volume-control">
            <input
              bind:this={focusVolumeInput}
              type="range"
              min="0"
              max="100"
              step="5"
              value={pomodoroFocusVolume}
              aria-label="Focus sound volume"
              aria-valuetext={`${pomodoroFocusVolume}%`}
              onfocus={() => {
                activeSetting = "focus-volume";
              }}
              oninput={handleFocusVolumeInput}
            />
            <span class="volume-value">{pomodoroFocusVolume}%</span>
          </div>
        </div>

        <div
          class="setting-row"
          class:is-active={activeSetting === "completion-volume"}
          aria-labelledby="pomodoro-completion-volume-title"
        >
          <div class="setting-copy">
            <h4 id="pomodoro-completion-volume-title">Completion sound</h4>
          </div>
          <div class="volume-control">
            <input
              bind:this={completionVolumeInput}
              type="range"
              min="0"
              max="100"
              step="5"
              value={pomodoroCompletionVolume}
              aria-label="Completion sound volume"
              aria-valuetext={`${pomodoroCompletionVolume}%`}
              onfocus={() => {
                activeSetting = "completion-volume";
              }}
              oninput={handleCompletionVolumeInput}
            />
            <span class="volume-value">{pomodoroCompletionVolume}%</span>
          </div>
        </div>
      </section>

      {#if message}
        <p id="settings-message" class="setting-message">
          {message}
        </p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 20;
    background: rgba(3, 5, 8, 0.54);
  }

  .settings-dialog {
    position: fixed;
    top: 50%;
    left: 50%;
    z-index: 21;
    width: min(32rem, calc(100vw - 3rem));
    max-height: calc(100vh - 3rem);
    transform: translate(-50%, -50%);
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    color: #e8ecf2;
    background: #11151b;
    box-shadow: 0 1.5rem 5rem rgba(0, 0, 0, 0.44);
  }

  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.78rem 0.9rem 0.42rem;
  }

  h2,
  h3,
  h4,
  p {
    margin: 0;
  }

  h2 {
    font-size: 1.08rem;
    font-weight: 700;
    letter-spacing: 0;
    line-height: 1.2;
  }

  h3 {
    color: #f0f3f7;
    font-size: 0.82rem;
    font-weight: 650;
    letter-spacing: 0;
    line-height: 1.25;
  }

  h4 {
    color: #f0f3f7;
    font-size: 0.88rem;
    font-weight: 600;
    letter-spacing: 0;
    line-height: 1.25;
  }

  p {
    color: #9da7b6;
    font-size: 0.78rem;
    line-height: 1.4;
  }

  .icon-button {
    display: inline-flex;
    width: 1.8rem;
    height: 1.8rem;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 6px;
    color: #c7ced9;
    background: transparent;
    font: inherit;
    line-height: 1;
    cursor: default;
  }

  .icon-button:hover,
  .icon-button:focus-visible {
    background: rgba(255, 255, 255, 0.08);
    outline: none;
  }

  .icon-button:focus-visible,
  .hotkey-button:focus-visible,
  input[type="range"]:focus-visible {
    box-shadow: 0 0 0 2px rgba(154, 185, 255, 0.22);
  }

  .settings-content {
    display: grid;
    gap: 0.8rem;
    padding: 0.42rem 0.9rem 0.9rem;
  }

  .settings-section {
    display: grid;
    gap: 0.5rem;
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-height: 3.25rem;
    border-radius: 7px;
    padding: 0.42rem 0.52rem;
  }

  .setting-row.is-active {
    background: rgba(119, 196, 255, 0.09);
    box-shadow: inset 0 0 0 1px rgba(119, 196, 255, 0.16);
  }

  .setting-copy {
    min-width: 0;
  }

  .hotkey-button {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    min-height: 2rem;
    border: 1px solid rgba(255, 255, 255, 0.11);
    border-radius: 6px;
    padding: 0 0.45rem;
    background: rgba(255, 255, 255, 0.05);
    font: inherit;
    cursor: default;
  }

  .hotkey-button:hover,
  .hotkey-button:focus-visible {
    border-color: rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.07);
    outline: none;
  }

  .hotkey-button:disabled {
    opacity: 0.68;
  }

  .is-recording {
    border-color: rgba(119, 196, 255, 0.5);
    background: rgba(79, 156, 216, 0.14);
  }

  .recording-label {
    color: #dbeafe;
    font-size: 0.78rem;
    font-weight: 620;
    letter-spacing: 0;
    line-height: 1;
  }

  .volume-control {
    display: grid;
    grid-template-columns: minmax(8.5rem, 1fr) 3rem;
    flex: 0 1 12.6rem;
    align-items: center;
    gap: 0.55rem;
  }

  input[type="range"] {
    width: 100%;
    min-width: 0;
    accent-color: #77c4ff;
    cursor: default;
  }

  input[type="range"]:focus-visible {
    border-radius: 999px;
    outline: none;
  }

  .volume-value {
    color: #c9d0da;
    font-size: 0.78rem;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    text-align: right;
  }

  .setting-message {
    color: #aeb7c4;
    font-size: 0.76rem;
  }
</style>
