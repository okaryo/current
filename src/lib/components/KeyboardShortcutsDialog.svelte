<script lang="ts">
  import { X as CloseIcon } from "@lucide/svelte";
  import KeyboardKey from "$lib/components/KeyboardKey.svelte";

  type ShortcutItem = {
    action: string;
    keys: {
      value: string;
      label?: string;
    }[];
    separator?: string;
    appWide?: boolean;
  };

  type ShortcutGroup = {
    id: string;
    title: string;
    shortcuts: ShortcutItem[];
  };

  type Props = {
    open: boolean;
    onClose: () => void;
  };

  let { open, onClose }: Props = $props();
  let dialog = $state<HTMLDialogElement>();

  const shortcutGroups: ShortcutGroup[] = [
    {
      id: "navigation",
      title: "Navigation",
      shortcuts: [
        {
          action: "Focus Section",
          keys: [
            { value: "⌘1", label: "Command 1" },
            { value: "⌘2", label: "Command 2" },
            { value: "⌘3", label: "Command 3" },
          ],
          appWide: true,
        },
        {
          action: "Previous or Next Section",
          keys: [
            { value: "⌘⇧[", label: "Command Shift Left Bracket" },
            { value: "⌘⇧]", label: "Command Shift Right Bracket" },
          ],
          appWide: true,
        },
        {
          action: "Show Keyboard Shortcuts",
          keys: [{ value: "⇧/", label: "Shift Slash" }],
          appWide: true,
        },
      ],
    },
    {
      id: "pomodoro",
      title: "Pomodoro",
      shortcuts: [
        {
          action: "Start or Pause",
          keys: [{ value: "⌘⇧P", label: "Command Shift P" }],
          appWide: true,
        },
        {
          action: "Reset",
          keys: [{ value: "⌘⇧R", label: "Command Shift R" }],
          appWide: true,
        },
      ],
    },
    {
      id: "todo",
      title: "Todo",
      shortcuts: [
        { action: "Add Todo", keys: [{ value: "a" }] },
        { action: "Add Subtask", keys: [{ value: "t" }] },
        { action: "Edit Todo", keys: [{ value: "e" }] },
        { action: "Complete or Reopen Todo", keys: [{ value: "Space" }] },
        { action: "Set or Unset Now", keys: [{ value: "Enter" }] },
        {
          action: "Move Selection",
          keys: [
            { value: "↑", label: "Arrow Up" },
            { value: "↓", label: "Arrow Down" },
            { value: "j" },
            { value: "k" },
          ],
          separator: "or",
        },
        {
          action: "Expand or Collapse Subtasks",
          keys: [
            { value: "→", label: "Arrow Right" },
            { value: "←", label: "Arrow Left" },
          ],
        },
        { action: "Delete Todo", keys: [{ value: "D" }] },
        { action: "Clear Selection", keys: [{ value: "Esc" }] },
      ],
    },
    {
      id: "log",
      title: "Log",
      shortcuts: [{ action: "Edit Latest Log", keys: [{ value: "e" }] }],
    },
  ];

  $effect(() => {
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
      dialog.focus({ preventScroll: true });
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  });

  function handleDialogClick(event: MouseEvent) {
    if (event.target === dialog) {
      onClose();
    }
  }
</script>

<dialog
  class="shortcut-dialog"
  aria-label="Keyboard shortcuts"
  tabindex="-1"
  bind:this={dialog}
  onclick={handleDialogClick}
  oncancel={onClose}
  onclose={onClose}
>
  <div class="shortcut-dialog-content">
    <div class="shortcut-dialog-header">
      <h2>Keyboard shortcuts</h2>
      <button
        class="shortcut-dialog-close"
        type="button"
        aria-label="Close keyboard shortcuts"
        title="Close"
        onclick={onClose}
      >
        <CloseIcon aria-hidden="true" size={14} />
      </button>
    </div>

    <div class="shortcut-groups">
      {#each shortcutGroups as group (group.id)}
        <section
          class="shortcut-group"
          aria-labelledby={`shortcut-${group.id}`}
        >
          <h3 id={`shortcut-${group.id}`}>{group.title}</h3>
          <div class="shortcut-dialog-list" role="list">
            {#each group.shortcuts as shortcut (shortcut.action)}
              <div class="shortcut-row" role="listitem">
                <span class="shortcut-action">
                  <span>{shortcut.action}</span>
                  {#if shortcut.appWide}
                    <span
                      class="shortcut-scope"
                      title="Works without focusing a section"
                    >
                      App-wide
                    </span>
                  {/if}
                </span>
                <span class="shortcut-keys">
                  {#if shortcut.separator}
                    {#each shortcut.keys.slice(0, 2) as key (key.value)}
                      <KeyboardKey
                        value={key.value}
                        label={key.label}
                        size="compact"
                      />
                    {/each}
                    <span class="shortcut-separator">{shortcut.separator}</span>
                    {#each shortcut.keys.slice(2) as key (key.value)}
                      <KeyboardKey
                        value={key.value}
                        label={key.label}
                        size="compact"
                      />
                    {/each}
                  {:else}
                    {#each shortcut.keys as key (key.value)}
                      <KeyboardKey
                        value={key.value}
                        label={key.label}
                        size="compact"
                      />
                    {/each}
                  {/if}
                </span>
              </div>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  </div>
</dialog>

<style>
  .shortcut-dialog {
    width: min(35rem, calc(100vw - 2rem));
    height: auto;
    max-height: calc(100vh - 2rem);
    border: 1px solid rgba(154, 185, 255, 0.24);
    border-radius: 8px;
    padding: 0;
    color: #d8dee8;
    background: #080c10;
    overflow: hidden;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.04),
      0 1rem 2.5rem rgba(0, 0, 0, 0.38);
  }

  .shortcut-dialog:focus {
    outline: none;
  }

  .shortcut-dialog::backdrop {
    background: rgba(3, 6, 10, 0.58);
  }

  .shortcut-dialog-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: inherit;
    padding: 0.85rem;
    overflow: hidden;
  }

  .shortcut-dialog-header {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    color: #eef3fa;
  }

  .shortcut-dialog-header h2 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: 0;
  }

  .shortcut-dialog-close {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    width: 1.72rem;
    height: 1.72rem;
    border: 0;
    border-radius: 6px;
    padding: 0;
    color: #d7dde6;
    background: transparent;
    cursor: pointer;
  }

  .shortcut-dialog-close:hover,
  .shortcut-dialog-close:focus-visible {
    color: #f1f5f9;
    background: rgba(255, 255, 255, 0.075);
    outline: none;
  }

  .shortcut-dialog-close:focus-visible {
    box-shadow: 0 0 0 2px rgba(154, 185, 255, 0.22);
  }

  .shortcut-groups {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.7rem;
    min-height: 0;
    overflow-y: auto;
    padding-right: 0.1rem;
  }

  .shortcut-group h3 {
    margin: 0 0 0.38rem;
    color: #eef3fa;
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0;
  }

  .shortcut-dialog-list {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 8px;
  }

  .shortcut-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) max-content;
    align-items: center;
    gap: 0.85rem;
    min-width: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
    padding: 0.55rem 0.65rem;
  }

  .shortcut-row:first-child {
    border-top: 0;
  }

  .shortcut-action {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.36rem;
    min-width: 0;
    color: #aab2bf;
    font-size: 0.78rem;
    overflow-wrap: anywhere;
  }

  .shortcut-scope {
    display: inline-flex;
    align-items: center;
    min-height: 1rem;
    border: 1px solid rgba(154, 185, 255, 0.18);
    border-radius: 999px;
    padding: 0 0.35rem;
    color: #c4d2f0;
    background: rgba(154, 185, 255, 0.08);
    font-size: 0.62rem;
    font-weight: 650;
    line-height: 1;
    white-space: nowrap;
  }

  .shortcut-keys {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.34rem;
    min-width: 0;
    white-space: nowrap;
  }

  .shortcut-separator {
    color: #737d8b;
    font-size: 0.74rem;
  }
</style>
