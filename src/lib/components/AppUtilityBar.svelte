<script lang="ts">
  type UpdateState =
    | "unavailable"
    | "checking"
    | "idle"
    | "available"
    | "installing"
    | "error";

  type Props = {
    dateLabel: string;
    updateState: UpdateState;
    onInstallUpdate: () => void;
  };

  let { dateLabel, updateState, onInstallUpdate }: Props = $props();

  const hasUpdate = $derived(updateState === "available");
  const isInstalling = $derived(updateState === "installing");
  const showUpdateButton = $derived(hasUpdate || isInstalling);
  const actionLabel = $derived(isInstalling ? "Installing" : "Update");
  const ariaLabel = $derived(
    isInstalling ? "Installing update" : "Install available update",
  );
</script>

<div class="utility-bar" aria-label="Application controls">
  <time class="date-label">{dateLabel}</time>

  <div class="utility-actions">
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
</div>

<style>
  .utility-bar {
    display: flex;
    min-height: 1.5rem;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    width: min(100%, 104rem);
    margin: 0 auto 0.55rem;
    padding: 0 0.15rem;
    color: #aeb7c4;
  }

  .date-label {
    color: #9da7b6;
    font-size: 0.78rem;
    font-weight: 560;
    letter-spacing: 0;
  }

  .utility-actions {
    display: flex;
    min-width: 6rem;
    justify-content: flex-end;
  }

  .update-button {
    display: inline-flex;
    min-width: 0;
    height: 1.65rem;
    align-items: center;
    justify-content: center;
    gap: 0.42rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    padding: 0 0.48rem;
    color: #d7dde6;
    background: rgba(255, 255, 255, 0.045);
    font: inherit;
    font-size: 0.76rem;
    font-weight: 620;
    letter-spacing: 0;
    line-height: 1;
    cursor: default;
  }

  .update-button:hover:not(:disabled),
  .update-button:focus-visible {
    border-color: rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.08);
    outline: none;
  }

  .update-button:focus-visible {
    box-shadow: 0 0 0 2px rgba(154, 185, 255, 0.22);
  }

  .status-dot {
    width: 0.42rem;
    height: 0.42rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.18);
  }

  .update-button {
    border-color: rgba(119, 196, 255, 0.34);
    color: #eaf6ff;
    background: rgba(79, 156, 216, 0.15);
  }

  .update-button .status-dot {
    background: #77c4ff;
    box-shadow: 0 0 0.8rem rgba(119, 196, 255, 0.36);
  }

  .is-installing {
    opacity: 0.72;
  }
</style>
