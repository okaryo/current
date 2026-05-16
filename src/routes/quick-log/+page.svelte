<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import { listen, type UnlistenFn } from "@tauri-apps/api/event";
  import { createWorkLog } from "$lib/api/workLogs";
  import { hideQuickLogWindow } from "$lib/api/quickLogWindow";
  import { insertMarkdownNewLine } from "$lib/work-log/markdown";

  let body = $state("");
  let error = $state<string | null>(null);
  let isSubmitting = $state(false);
  let textarea = $state<HTMLTextAreaElement>();
  let isComposing = false;
  let shouldIgnoreNextEnterAfterComposition = false;
  let unlistenFocus: UnlistenFn | undefined;

  onMount(() => {
    void focusInput();

    if (!isTauriRuntime()) {
      return;
    }

    void listen("quick-log:focus", () => {
      void focusInput();
    }).then((unlisten) => {
      unlistenFocus = unlisten;
    });
  });

  onDestroy(() => {
    unlistenFocus?.();
  });

  async function submit() {
    if (isSubmitting) {
      return;
    }

    const trimmedBody = body.trim();

    if (!trimmedBody) {
      await hideWindow();
      return;
    }

    isSubmitting = true;
    error = null;

    try {
      await createWorkLog(trimmedBody);
      body = "";
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

    if (isTauriRuntime()) {
      await hideQuickLogWindow();
    }
  }

  async function focusInput() {
    await tick();
    textarea?.focus();
    textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      void hideWindow();
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

    body = insertion.value;

    tick().then(() => {
      target.selectionStart = insertion.cursorPosition;
      target.selectionEnd = insertion.cursorPosition;
    });
  }

  function errorMessage(value: unknown) {
    return value instanceof Error ? value.message : String(value);
  }

  function isTauriRuntime() {
    return "__TAURI_INTERNALS__" in window;
  }
</script>

<svelte:head>
  <title>Quick Log</title>
</svelte:head>

<main class="quick-log-shell" aria-label="Quick Log">
  <form
    class="quick-log"
    onsubmit={(event) => {
      event.preventDefault();
      void submit();
    }}
  >
    <header>
      <p>Quick Log</p>
      <div aria-label="Quick Log shortcuts">
        <span>Enter newline</span>
        <span>Cmd+Enter save</span>
        <span>Esc close</span>
      </div>
    </header>

    <label class="input-shell">
      <span aria-hidden="true">&gt;</span>
      <textarea
        rows="4"
        placeholder="Write a work log..."
        bind:value={body}
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
    min-width: 0;
    width: 100vw;
    height: 100vh;
    margin: 0;
    overflow: hidden;
    background: #0b0d10;
  }

  .quick-log-shell {
    display: grid;
    width: 100vw;
    height: 100vh;
    padding: 0.7rem;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent), #0b0d10;
  }

  .quick-log {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 0.65rem;
    min-width: 0;
    min-height: 0;
    border: 1px solid rgba(91, 143, 249, 0.35);
    border-radius: 8px;
    padding: 0.75rem;
    background: rgba(9, 12, 16, 0.92);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.06),
      0 1rem 3rem rgba(0, 0, 0, 0.42);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    min-width: 0;
  }

  header p {
    margin: 0;
    color: #5b8ff9;
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: 0;
  }

  header div {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 0.45rem 0.65rem;
    min-width: 0;
    color: #858d9a;
    font-size: 0.72rem;
  }

  .input-shell {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;
    gap: 0.65rem;
    min-width: 0;
    min-height: 0;
    border: 1px solid rgba(91, 143, 249, 0.72);
    border-radius: 8px;
    padding: 0.7rem 0.8rem;
    background: rgba(4, 8, 12, 0.4);
  }

  .input-shell:focus-within {
    border-color: #5b8ff9;
    box-shadow:
      0 0 0 1px rgba(91, 143, 249, 0.35),
      0 0 0 4px rgba(91, 143, 249, 0.08);
  }

  .input-shell span {
    color: #5b8ff9;
    font-weight: 700;
  }

  textarea {
    display: block;
    width: 100%;
    min-width: 0;
    height: 100%;
    min-height: 5.4rem;
    border: 0;
    padding: 0;
    color: #e8ecf2;
    caret-color: #5b8ff9;
    background: transparent;
    font: inherit;
    resize: none;
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
