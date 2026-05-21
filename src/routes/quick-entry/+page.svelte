<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import { listen, type UnlistenFn } from "@tauri-apps/api/event";
  import { createTodo } from "$lib/api/todos";
  import { createWorkLog } from "$lib/api/workLogs";
  import { hideQuickEntryWindow } from "$lib/api/quickEntryWindow";
  import KeyboardKey from "$lib/components/KeyboardKey.svelte";
  import { effectWithDeps } from "$lib/effectWithDeps.svelte";
  import { normalizeTodoTitle } from "$lib/entry/todo";
  import { insertMarkdownNewLine } from "$lib/work-log/markdown";

  type EntryMode = "todo" | "log";

  const MAX_TEXTAREA_ROWS = 5;

  let mode = $state<EntryMode>("log");
  let value = $state("");
  let error = $state<string | null>(null);
  let isSubmitting = $state(false);
  let textarea = $state<HTMLTextAreaElement>();
  let isComposing = false;
  let shouldIgnoreNextEnterAfterComposition = false;
  let unlistenFocus: UnlistenFn | undefined;

  const placeholder = $derived(
    mode === "log" ? "Write a log... (Enter for newline)" : "Add a todo...",
  );
  const hasValue = $derived(value.trim().length > 0);

  onMount(() => {
    void focusInput();

    if (!isTauriRuntime()) {
      return;
    }

    void listen("quick-entry:focus", () => {
      resetMode();
      void focusInput();
    }).then((unlisten) => {
      unlistenFocus = unlisten;
    });
  });

  onDestroy(() => {
    unlistenFocus?.();
  });

  effectWithDeps(
    () => {
      void tick().then(adjustTextareaHeight);
    },
    () => [value, mode],
  );

  async function submit() {
    if (isSubmitting) {
      return;
    }

    const body = value.trim();

    if (!body) {
      await hideWindow();
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
      await hideWindow();
    } catch (submitError) {
      error = errorMessage(submitError);
      await focusInput();
    } finally {
      isSubmitting = false;
    }
  }

  async function hideWindow() {
    error = null;
    resetMode();

    if (isTauriRuntime()) {
      await hideQuickEntryWindow();
    }
  }

  function resetMode() {
    mode = "log";
    isComposing = false;
    shouldIgnoreNextEnterAfterComposition = false;
  }

  async function focusInput() {
    await tick();
    textarea?.focus();
    textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
    adjustTextareaHeight();
  }

  function handleWindowFocus() {
    void focusInput();
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (event.key === "Tab") {
      event.preventDefault();
      toggleMode();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      void hideWindow();
    }
  }

  function setMode(nextMode: EntryMode) {
    switchMode(nextMode);
  }

  function toggleMode() {
    switchMode(mode === "log" ? "todo" : "log");
  }

  function switchMode(nextMode: EntryMode) {
    if (nextMode === "todo") {
      value = normalizeTodoTitle(value);
    }

    mode = nextMode;
    void tick().then(() => {
      textarea?.focus();
      textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
    });
  }

  function handleKeydown(event: KeyboardEvent) {
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
    isComposing = true;
    shouldIgnoreNextEnterAfterComposition = false;
  }

  function handleCompositionEnd() {
    isComposing = false;
    shouldIgnoreNextEnterAfterComposition = true;

    window.setTimeout(() => {
      shouldIgnoreNextEnterAfterComposition = false;
    });
  }

  function isComposingEnter(event: KeyboardEvent) {
    return (
      event.isComposing ||
      event.keyCode === 229 ||
      isComposing ||
      shouldIgnoreNextEnterAfterComposition
    );
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
    if (!textarea) {
      return;
    }

    const style = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(style.lineHeight) || 21;
    const paddingTop = Number.parseFloat(style.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(style.paddingBottom) || 0;
    const maxHeight =
      lineHeight * MAX_TEXTAREA_ROWS + paddingTop + paddingBottom;
    const minHeight = lineHeight + paddingTop + paddingBottom;

    if (value.length === 0) {
      textarea.style.height = `${minHeight}px`;
      textarea.style.overflowY = "hidden";
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(
      Math.min(textarea.scrollHeight, maxHeight),
      minHeight,
    )}px`;

    const shouldScroll = textarea.scrollHeight > maxHeight;

    textarea.style.overflowY = shouldScroll ? "auto" : "hidden";

    if (shouldScroll) {
      scrollTextareaToCaret(textarea);
    }
  }

  function scrollTextareaToCaret(target: HTMLTextAreaElement) {
    const isCaretAtEnd = target.selectionStart >= target.value.length;

    if (!isCaretAtEnd) {
      return;
    }

    target.scrollTop = target.scrollHeight;
  }

  function errorMessage(value: unknown) {
    return value instanceof Error ? value.message : String(value);
  }

  function isTauriRuntime() {
    return "__TAURI_INTERNALS__" in window;
  }
</script>

<svelte:head>
  <title>Quick Entry</title>
</svelte:head>

<svelte:window onfocus={handleWindowFocus} onkeydown={handleWindowKeydown} />

<main class="quick-entry-shell" aria-label="Quick Entry">
  <form
    class="quick-entry"
    onsubmit={(event) => {
      event.preventDefault();
      void submit();
    }}
  >
    <header>
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

      <div class="entry-shortcuts" aria-label="Quick Entry shortcuts">
        <span><KeyboardKey value="Tab" size="compact" />Switch</span>
        {#if hasValue}
          <span
            ><KeyboardKey
              value="⌘Enter"
              label="Command Enter"
              size="compact"
            />Submit</span
          >
        {/if}
        <span
          ><KeyboardKey value="Esc" label="Escape" size="compact" />Close</span
        >
      </div>
    </header>

    <label class="input-shell" class:input-shell-todo={mode === "todo"}>
      <span class="entry-prompt" aria-hidden="true">&gt;</span>
      <textarea
        rows="1"
        {placeholder}
        bind:value
        bind:this={textarea}
        disabled={isSubmitting}
        oncompositionstart={handleCompositionStart}
        oncompositionend={handleCompositionEnd}
        onkeydown={handleKeydown}
      ></textarea>
    </label>

    {#if error}
      <p class="error" role="alert">{error}</p>
    {/if}
  </form>
</main>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(html) {
    color: #e8ecf2;
    background: transparent;
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
    min-width: 0;
    width: 100vw;
    height: 100vh;
    margin: 0;
    overflow: hidden;
    background: transparent;
  }

  .quick-entry-shell {
    display: grid;
    width: 100vw;
    height: 100vh;
    padding: 0;
    background: transparent;
  }

  .quick-entry {
    display: grid;
    grid-template-rows: auto auto auto;
    align-content: start;
    gap: 0.6rem;
    min-width: 0;
    min-height: 0;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 14px;
    padding: 1rem 1.05rem;
    overflow: hidden;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent), #171c22;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.05),
      inset 0 -2rem 4rem rgba(0, 0, 0, 0.18);
  }

  header {
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
    min-width: 3.85rem;
    border: 1px solid transparent;
    border-radius: 7px;
    padding: 0.22rem 0.5rem;
    font-size: 0.88rem;
    font-weight: 700;
    background: transparent;
    cursor: pointer;
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

  .input-shell {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;
    gap: 0.62rem;
    min-width: 0;
    align-self: start;
    border: 1px solid rgba(91, 143, 249, 0.72);
    border-radius: 8px;
    padding: 0.6rem 0.7rem;
    background: rgba(4, 8, 12, 0.38);
    box-shadow:
      0 0 0 1px rgba(91, 143, 249, 0.28),
      0 0 0 4px rgba(91, 143, 249, 0.07);
  }

  .input-shell-todo {
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

  .input-shell-todo .entry-prompt {
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
    caret-color: #5b8ff9;
    background: transparent;
    font: inherit;
    line-height: 1.45;
    resize: none;
  }

  .input-shell-todo textarea {
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

  .error {
    margin: 0;
    color: #ff8a93;
    font-size: 0.82rem;
  }
</style>
