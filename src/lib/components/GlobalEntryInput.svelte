<script lang="ts">
  import { tick } from "svelte";
  import { fade } from "svelte/transition";
  import { createTodo } from "$lib/api/todos";
  import { createWorkLog } from "$lib/api/workLogs";
  import KeyboardKey from "$lib/components/KeyboardKey.svelte";
  import { insertMarkdownNewLine } from "$lib/work-log/markdown";

  type SectionId = "pomodoro" | "todo" | "log";
  type EntryMode = "todo" | "log";

  type Props = {
    activeSection: SectionId;
    focusRequest: number;
    onCancel: (section: SectionId) => void;
  };

  const MAX_TEXTAREA_ROWS = 5;

  let { activeSection, focusRequest, onCancel }: Props = $props();

  let mode = $state<EntryMode>("log");
  let value = $state("");
  let isFocused = $state(false);
  let isSubmitting = $state(false);
  let error = $state<string | null>(null);
  let restoreSection = $state<SectionId>("log");
  let textareaElement = $state<HTMLTextAreaElement>();
  let panelElement = $state<HTMLElement>();
  let lastFocusRequest = 0;
  let isComposingInput = false;
  let shouldIgnoreNextEnterAfterComposition = false;

  const placeholder = $derived(
    mode === "log" ? "Write a log... (Enter for newline)" : "Add a todo...",
  );
  const hasValue = $derived(value.trim().length > 0);

  $effect(() => {
    if (focusRequest === 0 || focusRequest === lastFocusRequest) {
      return;
    }

    lastFocusRequest = focusRequest;
    restoreSection = activeSection;
    void focusInput();
  });

  $effect(() => {
    value;
    isFocused;
    void tick().then(adjustTextareaHeight);
  });

  async function focusInput() {
    isFocused = true;
    await tick();
    textareaElement?.focus();
  }

  function toggleMode() {
    switchMode(mode === "log" ? "todo" : "log");
  }

  function setMode(nextMode: EntryMode) {
    switchMode(nextMode);
  }

  function switchMode(nextMode: EntryMode) {
    if (nextMode === "todo") {
      value = normalizeTodoTitle(value);
    }

    mode = nextMode;
    void tick().then(() => {
      textareaElement?.focus();
      textareaElement?.setSelectionRange(
        textareaElement.value.length,
        textareaElement.value.length,
      );
    });
  }

  function handleCompactClick() {
    restoreSection = activeSection;
    void focusInput();
  }

  function handleFocusOut() {
    window.setTimeout(() => {
      if (!isFocused) {
        return;
      }

      if (panelElement?.contains(document.activeElement)) {
        return;
      }

      isFocused = false;
      isComposingInput = false;
      shouldIgnoreNextEnterAfterComposition = false;
    });
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Tab") {
      event.preventDefault();
      toggleMode();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      textareaElement?.blur();
      isFocused = false;
      onCancel(restoreSection);
      return;
    }

    if (event.key !== "Enter") {
      return;
    }

    if (isComposingEnter(event)) {
      return;
    }

    if (event.metaKey) {
      event.preventDefault();
      void submit();
      return;
    }

    if (mode === "todo") {
      event.preventDefault();
      return;
    }

    if (event.shiftKey || event.ctrlKey || event.altKey) {
      return;
    }

    event.preventDefault();
    insertMarkdownNewLineInTextarea(event.currentTarget);
  }

  function handleCompositionStart() {
    isComposingInput = true;
    shouldIgnoreNextEnterAfterComposition = false;
  }

  function handleCompositionEnd() {
    isComposingInput = false;
    shouldIgnoreNextEnterAfterComposition = true;

    window.setTimeout(() => {
      shouldIgnoreNextEnterAfterComposition = false;
    });
  }

  function isComposingEnter(event: KeyboardEvent) {
    return (
      event.isComposing ||
      event.keyCode === 229 ||
      isComposingInput ||
      shouldIgnoreNextEnterAfterComposition
    );
  }

  async function submit() {
    if (isSubmitting) {
      return;
    }

    const body = value.trim();

    if (!body) {
      return;
    }

    isSubmitting = true;
    error = null;

    try {
      if (mode === "todo") {
        await createTodo(normalizeTodoTitle(body));
      } else {
        await createWorkLog(body);
      }

      value = "";
      await tick();
      adjustTextareaHeight();
      textareaElement?.focus();
    } catch (submitError) {
      error = errorMessage(submitError);
    } finally {
      isSubmitting = false;
    }
  }

  function normalizeTodoTitle(title: string) {
    return title.replace(/\s+/g, " ").trim();
  }

  function insertMarkdownNewLineInTextarea(target: EventTarget | null) {
    if (!(target instanceof HTMLTextAreaElement)) {
      return;
    }

    const insertion = insertMarkdownNewLine(
      target.value,
      target.selectionStart,
      target.selectionEnd,
    );

    value = insertion.value;

    tick().then(() => {
      target.selectionStart = insertion.cursorPosition;
      target.selectionEnd = insertion.cursorPosition;
      scrollTextareaToCaret(target);
    });
  }

  function adjustTextareaHeight() {
    if (!textareaElement) {
      return;
    }

    const style = window.getComputedStyle(textareaElement);
    const lineHeight = Number.parseFloat(style.lineHeight) || 21;
    const paddingTop = Number.parseFloat(style.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(style.paddingBottom) || 0;
    const maxHeight =
      lineHeight * MAX_TEXTAREA_ROWS + paddingTop + paddingBottom;
    const minHeight = lineHeight + paddingTop + paddingBottom;

    if (value.length === 0) {
      textareaElement.style.height = `${minHeight}px`;
      textareaElement.style.overflowY = "hidden";
      return;
    }

    textareaElement.style.height = "auto";
    textareaElement.style.height = `${Math.max(
      Math.min(textareaElement.scrollHeight, maxHeight),
      minHeight,
    )}px`;
    const shouldScroll = textareaElement.scrollHeight > maxHeight;

    textareaElement.style.overflowY = shouldScroll ? "auto" : "hidden";

    if (shouldScroll) {
      scrollTextareaToCaret(textareaElement);
    }
  }

  function scrollTextareaToCaret(textarea: HTMLTextAreaElement) {
    const isCaretAtEnd = textarea.selectionStart >= textarea.value.length;

    if (!isCaretAtEnd) {
      return;
    }

    textarea.scrollTop = textarea.scrollHeight;
  }

  function errorMessage(submitError: unknown) {
    return submitError instanceof Error
      ? submitError.message
      : String(submitError);
  }
</script>

<div class="global-entry-shell">
  <div
    class="global-entry-frame"
    class:global-entry-frame-focused={isFocused}
    bind:this={panelElement}
    onfocusout={handleFocusOut}
  >
    {#if isFocused}
      <section
        class="global-entry-panel"
        aria-label="Quick Todo and Log input"
        transition:fade={{ duration: 90 }}
      >
        <div class="entry-toolbar">
          <div class="mode-tabs" aria-label="Input type">
            <button
              class:mode-active={mode === "todo"}
              class="mode-button mode-button-todo"
              type="button"
              aria-pressed={mode === "todo"}
              onmousedown={(event) => event.preventDefault()}
              onclick={() => setMode("todo")}
            >
              Todo
            </button>
            <button
              class:mode-active={mode === "log"}
              class="mode-button mode-button-log"
              type="button"
              aria-pressed={mode === "log"}
              onmousedown={(event) => event.preventDefault()}
              onclick={() => setMode("log")}
            >
              Log
            </button>
          </div>

          <div class="entry-shortcuts" aria-label="Quick input shortcuts">
            <span><KeyboardKey value="Tab" />Switch</span>
            {#if hasValue}
              <span
                ><KeyboardKey
                  value="⌘Enter"
                  label="Command Enter"
                />Submit</span
              >
            {/if}
            <span><KeyboardKey value="Esc" label="Escape" />Close</span>
          </div>
        </div>

        <div class="entry-input" class:entry-input-todo={mode === "todo"}>
          <span class="entry-prompt" aria-hidden="true">&gt;</span>
          <textarea
            rows="1"
            {placeholder}
            bind:value
            bind:this={textareaElement}
            disabled={isSubmitting}
            onkeydown={handleKeydown}
            oncompositionstart={handleCompositionStart}
            oncompositionend={handleCompositionEnd}
          ></textarea>
        </div>

        {#if error}
          <p class="entry-error" role="alert">{error}</p>
        {/if}
      </section>
    {:else}
      <button
        class="global-entry-compact"
        type="button"
        aria-label="Focus input to add Todo or Log"
        onclick={handleCompactClick}
        transition:fade={{ duration: 90 }}
      >
        <span class="compact-prompt" aria-hidden="true">&gt;</span>
        <strong>Press<KeyboardKey value="i" />to focus</strong>
        <span class="compact-placeholder">
          <span class="compact-todo">Todo</span> /
          <span class="compact-log">Log</span>
        </span>
      </button>
    {/if}
  </div>
</div>

<style>
  .global-entry-shell {
    position: fixed;
    right: 0.8rem;
    bottom: 0.8rem;
    left: 0.8rem;
    z-index: 20;
    display: flex;
    justify-content: center;
    pointer-events: none;
  }

  .global-entry-frame {
    overflow: hidden;
    flex: 0 1 auto;
    display: flex;
    align-items: center;
    width: auto;
    min-width: 0;
    max-width: min(100%, 16rem);
    max-height: 2.5rem;
    border: 1px solid rgba(91, 143, 249, 0.34);
    border-radius: 8px;
    padding: 0.5rem 0.72rem;
    color: rgba(232, 236, 242, 0.84);
    background: rgba(7, 11, 15, 0.78);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.035),
      0 0.7rem 2rem rgba(0, 0, 0, 0.22);
    opacity: 0.72;
    backdrop-filter: blur(14px);
    pointer-events: auto;
    transition:
      max-width 180ms ease,
      max-height 180ms ease,
      border-color 180ms ease,
      background 180ms ease,
      box-shadow 180ms ease,
      opacity 180ms ease,
      padding 180ms ease,
      transform 180ms ease;
  }

  .global-entry-frame-focused {
    display: block;
    width: calc(100vw - 2.4rem);
    max-width: 44rem;
    max-height: 15rem;
    border-color: rgba(255, 255, 255, 0.18);
    padding: 0.75rem 0.8rem;
    color: #e8ecf2;
    background: rgba(16, 20, 25, 0.9);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.05),
      0 1.2rem 3rem rgba(0, 0, 0, 0.38);
    opacity: 1;
    backdrop-filter: blur(18px);
  }

  .global-entry-frame:not(.global-entry-frame-focused):hover,
  .global-entry-frame:not(.global-entry-frame-focused):focus-within {
    border-color: rgba(91, 143, 249, 0.68);
    opacity: 0.96;
    transform: translateY(-1px);
  }

  .global-entry-panel,
  .global-entry-compact {
    pointer-events: auto;
  }

  .global-entry-compact {
    display: inline-flex;
    align-items: center;
    gap: 1rem;
    width: max-content;
    max-width: 100%;
    min-height: 1.5rem;
    border: 0;
    padding: 0;
    color: inherit;
    line-height: 1;
    background: transparent;
    cursor: pointer;
  }

  .global-entry-compact:focus-visible {
    outline: none;
  }

  .compact-prompt {
    display: none;
    color: #5b8ff9;
    font-weight: 800;
  }

  .compact-placeholder {
    overflow: hidden;
    min-width: 0;
    color: #9ba3b0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .compact-todo {
    color: #72df90;
    font-weight: 700;
  }

  .compact-log {
    color: #86a9ff;
    font-weight: 700;
  }

  .global-entry-compact strong {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: #aecaef;
    font-size: 0.82rem;
    font-weight: 700;
  }

  .global-entry-panel {
    display: grid;
    gap: 0.6rem;
    width: 100%;
    min-width: 0;
  }

  .entry-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.65rem;
    min-width: 0;
  }

  .mode-tabs {
    display: inline-flex;
    gap: 0.15rem;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 7px;
    padding: 0.14rem;
    background: rgba(255, 255, 255, 0.04);
  }

  button {
    font: inherit;
  }

  .mode-button {
    border: 1px solid transparent;
    border-radius: 7px;
    color: #9ba3b0;
    background: transparent;
    cursor: pointer;
  }

  .mode-button {
    min-width: 3.85rem;
    padding: 0.22rem 0.5rem;
    font-size: 0.88rem;
    font-weight: 700;
  }

  .mode-button-todo {
    color: rgba(114, 223, 144, 0.72);
  }

  .mode-button-log {
    color: rgba(134, 169, 255, 0.72);
  }

  .mode-button-todo.mode-active {
    border-color: rgba(68, 209, 107, 0.48);
    color: #72df90;
    background: rgba(68, 209, 107, 0.12);
  }

  .mode-button-log.mode-active {
    border-color: rgba(91, 143, 249, 0.5);
    color: #86a9ff;
    background: rgba(91, 143, 249, 0.13);
  }

  .entry-shortcuts {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.8rem;
    color: #858d9a;
    font-size: 0.78rem;
    white-space: nowrap;
  }

  .entry-shortcuts span {
    display: inline-flex;
    align-items: center;
    gap: 0.32rem;
  }

  .entry-input {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;
    gap: 0.62rem;
    border: 1px solid rgba(91, 143, 249, 0.72);
    border-radius: 8px;
    padding: 0.6rem 0.7rem;
    background: rgba(4, 8, 12, 0.38);
    box-shadow:
      0 0 0 1px rgba(91, 143, 249, 0.28),
      0 0 0 4px rgba(91, 143, 249, 0.07);
  }

  .entry-input-todo {
    border-color: rgba(68, 209, 107, 0.74);
    box-shadow:
      0 0 0 1px rgba(68, 209, 107, 0.28),
      0 0 0 4px rgba(68, 209, 107, 0.07);
  }

  .entry-prompt {
    color: #5b8ff9;
    font-weight: 800;
    line-height: 1.45;
  }

  .entry-input-todo .entry-prompt {
    color: #44d16b;
  }

  textarea {
    display: block;
    width: 100%;
    min-width: 0;
    height: 1.45em;
    max-height: 8rem;
    border: 0;
    padding: 0;
    color: #e8ecf2;
    font: inherit;
    line-height: 1.45;
    caret-color: #5b8ff9;
    background: transparent;
    resize: none;
  }

  .entry-input-todo textarea {
    caret-color: #44d16b;
  }

  textarea:focus-visible {
    outline: none;
  }

  textarea:disabled {
    opacity: 0.65;
  }

  textarea::placeholder {
    color: #858d9a;
  }

  .entry-error {
    margin: 0;
    color: #ff8a93;
    font-size: 0.86rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .global-entry-frame {
      transition: none;
    }
  }
</style>
