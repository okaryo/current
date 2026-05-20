<script lang="ts">
  import { Settings } from "@lucide/svelte";
  import GlobalEntryInput from "$lib/components/GlobalEntryInput.svelte";
  import type { SectionId } from "$lib/keyboard";

  type UpdateState =
    | "unavailable"
    | "checking"
    | "idle"
    | "available"
    | "installing"
    | "error";

  type Props = {
    activeSection: SectionId;
    dateLabel: string;
    focusRequest: number;
    updateState: UpdateState;
    onCancelEntry: (section: SectionId) => void;
    onInstallUpdate: () => void;
    onOpenSettings: () => void;
  };

  let {
    activeSection,
    dateLabel,
    focusRequest,
    updateState,
    onCancelEntry,
    onInstallUpdate,
    onOpenSettings,
  }: Props = $props();

  const hasUpdate = $derived(updateState === "available");
  const isInstalling = $derived(updateState === "installing");
  const showUpdateButton = $derived(hasUpdate || isInstalling);
  const actionLabel = $derived(isInstalling ? "Installing" : "Update");
  const ariaLabel = $derived(
    isInstalling ? "Installing update" : "Install available update",
  );
</script>

<footer class="app-footer" aria-label="Application controls">
  <time class="footer-date">{dateLabel}</time>

  <div class="footer-entry">
    <GlobalEntryInput {activeSection} {focusRequest} onCancel={onCancelEntry} />
  </div>

  <div class="footer-actions">
    <button
      type="button"
      class="icon-button"
      aria-label="Open settings with Command Comma"
      title="Settings (Cmd+,)"
      onclick={onOpenSettings}
    >
      <Settings size={15} strokeWidth={2} aria-hidden="true" />
    </button>

    {#if showUpdateButton}
      <button
        type="button"
        class="update-button"
        class:is-installing={isInstalling}
        aria-label={ariaLabel}
        disabled={isInstalling}
        onclick={onInstallUpdate}
      >
        <span class="status-dot" aria-hidden="true"></span>
        <span>{actionLabel}</span>
      </button>
    {/if}
  </div>
</footer>

<style>
  .app-footer {
    display: grid;
    grid-template-columns: minmax(7rem, 1fr) minmax(13rem, auto) minmax(
        7rem,
        1fr
      );
    align-items: center;
    gap: 0.75rem;
    width: min(100%, 104rem);
    min-height: 2.45rem;
    margin: 0 auto;
    padding: 0.48rem 0.15rem;
    color: #aeb7c4;
  }

  .footer-date {
    justify-self: start;
    color: #9da7b6;
    font-size: 0.76rem;
    font-weight: 560;
    letter-spacing: 0;
  }

  .footer-entry {
    display: flex;
    align-items: center;
    justify-content: center;
    justify-self: center;
    min-width: 0;
  }

  .footer-actions {
    display: flex;
    justify-self: end;
    justify-content: flex-end;
    align-items: center;
    gap: 0.45rem;
    min-width: 0;
  }

  .update-button {
    display: inline-flex;
    min-width: 0;
    height: 1.55rem;
    align-items: center;
    justify-content: center;
    gap: 0.38rem;
    border: 1px solid rgba(119, 196, 255, 0.34);
    border-radius: 6px;
    padding: 0 0.46rem;
    color: #eaf6ff;
    background: rgba(79, 156, 216, 0.15);
    font: inherit;
    font-size: 0.74rem;
    font-weight: 620;
    letter-spacing: 0;
    line-height: 1;
    cursor: default;
  }

  .icon-button {
    display: inline-flex;
    width: 1.72rem;
    height: 1.72rem;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 6px;
    padding: 0;
    color: #d7dde6;
    background: transparent;
    cursor: default;
  }

  .icon-button:hover,
  .icon-button:focus-visible {
    color: #f1f5f9;
    background: rgba(255, 255, 255, 0.075);
    outline: none;
  }

  .update-button:hover:not(:disabled),
  .update-button:focus-visible {
    border-color: rgba(119, 196, 255, 0.52);
    background: rgba(79, 156, 216, 0.22);
    outline: none;
  }

  .icon-button:focus-visible,
  .update-button:focus-visible {
    box-shadow: 0 0 0 2px rgba(154, 185, 255, 0.22);
  }

  .status-dot {
    width: 0.38rem;
    height: 0.38rem;
    border-radius: 999px;
    background: #77c4ff;
    box-shadow: 0 0 0.8rem rgba(119, 196, 255, 0.36);
  }

  .is-installing {
    opacity: 0.72;
  }
</style>
