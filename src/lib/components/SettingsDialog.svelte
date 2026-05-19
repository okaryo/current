<script lang="ts">
  import { X } from "@lucide/svelte";
  import { tick } from "svelte";
  import KeyboardKey from "$lib/components/KeyboardKey.svelte";
  import {
    shortcutFromKeydown,
    shortcutToKeyboardKeys,
  } from "$lib/globalShortcut";

  type Props = {
    open: boolean;
    quickEntryShortcut: string;
    onClose: () => void;
    onStartQuickEntryShortcutRecording: () => Promise<void>;
    onCancelQuickEntryShortcutRecording: () => Promise<void>;
    onUpdateQuickEntryShortcut: (shortcut: string) => Promise<void>;
  };

  let {
    open,
    quickEntryShortcut,
    onClose,
    onStartQuickEntryShortcutRecording,
    onCancelQuickEntryShortcutRecording,
    onUpdateQuickEntryShortcut,
  }: Props = $props();

  let hotkeyButton = $state<HTMLButtonElement>();
  let closeButton = $state<HTMLButtonElement>();
  let previousFocusedElement: HTMLElement | null = null;
  let wasOpen = false;
  let isRecording = $state(false);
  let isSaving = $state(false);
  let activeSetting = $state<"quick-entry" | null>(null);
  let message = $state<string | null>(null);
  const quickEntryShortcutKeys = $derived(
    shortcutToKeyboardKeys(quickEntryShortcut),
  );

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
      void focusHotkeyButton();
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

  function trapFocus(event: KeyboardEvent) {
    const focusableElements = [hotkeyButton, closeButton].filter(
      (element): element is HTMLButtonElement => Boolean(element),
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
            aria-describedby={message
              ? "quick-entry-hotkey-message"
              : undefined}
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

        {#if message}
          <p id="quick-entry-hotkey-message" class="setting-message">
            {message}
          </p>
        {/if}
      </section>
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
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding: 1rem 1rem 0.92rem;
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
  .hotkey-button:focus-visible {
    box-shadow: 0 0 0 2px rgba(154, 185, 255, 0.22);
  }

  .settings-content {
    padding: 0.92rem 1rem 1rem;
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

  .setting-message {
    color: #aeb7c4;
    font-size: 0.76rem;
  }
</style>
