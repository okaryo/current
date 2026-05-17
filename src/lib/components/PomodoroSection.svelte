<script lang="ts">
  import { onDestroy } from "svelte";
  import KeyboardKey from "$lib/components/KeyboardKey.svelte";
  import { sendPomodoroCompleteNotification } from "$lib/notifications";

  type PomodoroCommand = "toggle" | "reset" | "startFocus";

  type PomodoroCommandRequest = {
    id: number;
    command: PomodoroCommand;
  } | null;

  type Props = {
    active: boolean;
    title: string;
    shortcut: string;
    commandRequest: PomodoroCommandRequest;
    onActivate: () => void;
  };

  const FOCUS_DURATION_SECONDS = 25 * 60;

  let {
    active,
    title,
    shortcut,
    commandRequest,
    onActivate,
  }: Props = $props();

  let remainingSeconds = $state(FOCUS_DURATION_SECONDS);
  let running = $state(false);
  let timerInterval: ReturnType<typeof setInterval> | undefined;
  let lastCommandRequestId = 0;

  const formattedRemainingTime = $derived(formatTime(remainingSeconds));
  const timerStatus = $derived(
    running
      ? "Focusing..."
      : remainingSeconds < FOCUS_DURATION_SECONDS
        ? "Paused"
        : "",
  );
  const primaryActionLabel = $derived(
    running
      ? "Pause"
      : remainingSeconds < FOCUS_DURATION_SECONDS
        ? "Continue"
        : "Start",
  );
  const timerProgress = $derived(remainingSeconds / FOCUS_DURATION_SECONDS);

  $effect(() => {
    if (!commandRequest || commandRequest.id === lastCommandRequestId) {
      return;
    }

    lastCommandRequestId = commandRequest.id;

    switch (commandRequest.command) {
      case "toggle":
        toggleTimer();
        break;
      case "reset":
        resetTimer();
        break;
      case "startFocus":
        startFocusTimer();
        break;
    }
  });

  onDestroy(() => {
    stopTimer();
  });

  function toggleTimer() {
    onActivate();

    if (running) {
      pauseTimer();
      return;
    }

    startTimer();
  }

  function startTimer() {
    if (remainingSeconds <= 0) {
      remainingSeconds = FOCUS_DURATION_SECONDS;
    }

    setRunning(true);
    restartInterval();
  }

  function pauseTimer() {
    setRunning(false);
    stopTimer();
  }

  function resetTimer() {
    onActivate();
    setRunning(false);
    stopTimer();
    remainingSeconds = FOCUS_DURATION_SECONDS;
  }

  function startFocusTimer() {
    remainingSeconds = FOCUS_DURATION_SECONDS;
    startTimer();
  }

  function restartInterval() {
    stopTimer();

    timerInterval = setInterval(() => {
      if (remainingSeconds <= 1) {
        setRunning(false);
        stopTimer();
        remainingSeconds = FOCUS_DURATION_SECONDS;
        void sendPomodoroCompleteNotification();
        return;
      }

      remainingSeconds -= 1;
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = undefined;
    }
  }

  function setRunning(nextRunning: boolean) {
    if (running === nextRunning) {
      return;
    }

    running = nextRunning;
  }

  function formatTime(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
</script>

<section
  class="panel pomodoro"
  class:panel-active={active}
  aria-label="Pomodoro"
>
  <header class="panel-header">
    <div class="title-row">
      <p class="section-label section-label-focus">{title}</p>
      <KeyboardKey value={shortcut} label="Command 1" />
    </div>
  </header>

  <div
    class="timer-layout"
    aria-label={`${formattedRemainingTime} remaining`}
    style={`--timer-progress: ${timerProgress}`}
  >
    <div class="timer-summary">
      <span class="time">{formattedRemainingTime}</span>
      <span class="timer-status">{timerStatus}</span>
    </div>

    <div class="timer-bar" aria-hidden="true">
      <span class="timer-bar-fill"></span>
    </div>

    <div class="timer-actions" aria-label="Pomodoro controls">
      <button
        class="primary-button"
        type="button"
        onfocus={onActivate}
        onclick={toggleTimer}
      >
        <span>{primaryActionLabel}</span>
        <KeyboardKey value="Space" />
      </button>
      <button type="button" onfocus={onActivate} onclick={resetTimer}>
        <span>Reset</span>
        <KeyboardKey value="r" />
      </button>
    </div>
  </div>

</section>

<style>
  .panel {
    position: relative;
    min-width: 0;
    container-type: inline-size;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 0.85rem;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.04),
      rgba(255, 255, 255, 0.02)
    );
    opacity: 0.7;
    filter: saturate(0.82);
    transition:
      border-color 120ms ease,
      filter 120ms ease,
      box-shadow 120ms ease,
      opacity 120ms ease;
  }

  .panel-active {
    border-color: rgba(255, 255, 255, 0.18);
    opacity: 1;
    filter: saturate(1);
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.055),
      rgba(255, 255, 255, 0.026)
    );
  }

  .pomodoro.panel-active {
    border-color: #ff5965;
    box-shadow:
      0 0 0 1px rgba(255, 89, 101, 0.34),
      0 0 0 4px rgba(255, 89, 101, 0.08),
      0 0.8rem 2rem rgba(255, 89, 101, 0.1);
  }

  button {
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #e8ecf2;
    background: rgba(255, 255, 255, 0.07);
    cursor: pointer;
    font: inherit;
  }

  button:focus-visible {
    outline: 1px solid rgba(68, 209, 107, 0.8);
    outline-offset: 2px;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.6rem;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    min-width: 0;
  }

  .section-label {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: 0;
  }

  .section-label-focus {
    color: #ff5965;
  }

  .timer-layout {
    --timer-progress: 1;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    padding: 0.7rem;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    background: rgba(9, 12, 16, 0.28);
  }

  .timer-summary {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.8rem;
    min-width: 0;
  }

  .time {
    font-size: 1.75rem;
    font-weight: 650;
    line-height: 1;
  }

  .timer-status {
    color: #c7cdd6;
    font-size: 0.92rem;
  }

  .timer-bar {
    overflow: hidden;
    height: 0.48rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
  }

  .timer-bar-fill {
    display: block;
    width: calc(var(--timer-progress) * 100%);
    height: 100%;
    border-radius: inherit;
    background: #f05260;
    transition: width 160ms linear;
  }

  .timer-actions {
    display: flex;
    flex-wrap: nowrap;
    gap: 0.55rem;
  }

  .timer-actions button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-width: 5.5rem;
    min-height: 2.45rem;
    padding: 0 0.85rem;
    font-weight: 650;
  }

  .timer-actions .primary-button {
    border-color: rgba(255, 89, 101, 0.45);
    color: #ffffff;
    background: #e94654;
  }

  .timer-actions :global(kbd) {
    min-width: 1.45rem;
    height: 1.15rem;
    border-color: currentColor;
    color: currentColor;
    background: transparent;
    box-shadow: none;
    font-size: 0.7rem;
    line-height: 1;
    opacity: 0.72;
  }

  .timer-actions :global(.keyboard-key-label) {
    transform: translateY(-0.08rem);
  }

  @media (max-width: 560px) {
    .panel {
      padding: 0.8rem;
    }

    .timer-actions {
      width: 100%;
    }

    .timer-actions button {
      flex: 1 1 8rem;
    }
  }
</style>
