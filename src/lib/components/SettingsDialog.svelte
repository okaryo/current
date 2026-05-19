<script lang="ts">
  import { X } from "@lucide/svelte";
  import KeyboardKey from "$lib/components/KeyboardKey.svelte";

  type Props = {
    open: boolean;
    onClose: () => void;
  };

  let { open, onClose }: Props = $props();

  function handleKeydown(event: KeyboardEvent) {
    if (!open || event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    onClose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="dialog-backdrop" aria-hidden="true" onclick={onClose}></div>
  <div
    class="settings-dialog"
    role="dialog"
    aria-modal="true"
    aria-labelledby="settings-title"
    tabindex="-1"
  >
    <header class="settings-header">
      <div>
        <p class="settings-kicker">Current</p>
        <h2 id="settings-title">Settings</h2>
      </div>
      <button
        type="button"
        class="icon-button"
        aria-label="Close settings with Escape"
        title="Close (Esc)"
        onclick={onClose}
      >
        <X size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </header>

    <div class="settings-content">
      <section class="settings-section" aria-labelledby="global-shortcut-title">
        <h3 id="global-shortcut-title">Global shortcut</h3>

        <div class="setting-row" aria-labelledby="quick-entry-hotkey-title">
          <div class="setting-copy">
            <h4 id="quick-entry-hotkey-title">Quick Entry</h4>
          </div>
          <button
            type="button"
            class="hotkey-button"
            aria-label="Quick Entry hotkey"
          >
            <KeyboardKey value="⌘" label="Command" />
            <KeyboardKey value="⇧" label="Shift" />
            <KeyboardKey value="L" label="L" />
          </button>
        </div>
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
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding: 1rem 1rem 0.92rem;
  }

  .settings-kicker {
    margin: 0 0 0.12rem;
    color: #95a0af;
    font-size: 0.72rem;
    font-weight: 650;
    letter-spacing: 0;
    text-transform: uppercase;
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
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 6px;
    color: #c7ced9;
    background: rgba(255, 255, 255, 0.05);
    font: inherit;
    font-size: 1.1rem;
    line-height: 1;
    cursor: default;
  }

  .icon-button:hover,
  .icon-button:focus-visible {
    border-color: rgba(255, 255, 255, 0.17);
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
    padding: 0.15rem 0;
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
</style>
