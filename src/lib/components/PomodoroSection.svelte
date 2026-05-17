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
  const timerStatus = $derived(running ? "Focusing..." : "Paused");
  const primaryActionLabel = $derived(running ? "Pause" : "Start");

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

  <div class="timer-layout">
    <div class="timer-ring" aria-label={`${formattedRemainingTime} remaining`}>
      <span class="time">{formattedRemainingTime}</span>
    </div>

    <div class="timer-details">
      <p class="timer-status">{timerStatus}</p>
      <div class="timer-actions" aria-label="Pomodoro controls">
        <button
          class="primary-button"
          type="button"
          onfocus={onActivate}
          onclick={toggleTimer}
        >
          {primaryActionLabel}
        </button>
        <button type="button" onfocus={onActivate} onclick={resetTimer}>
          Reset
        </button>
      </div>
    </div>

    <dl class="shortcut-list" aria-label="Pomodoro shortcuts">
      <div>
        <dt><KeyboardKey value="Space" /></dt>
        <dd>Start / Pause</dd>
      </div>
      <div>
        <dt><KeyboardKey value="r" /></dt>
        <dd>Reset</dd>
      </div>
    </dl>
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
    align-items: start;
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
    display: grid;
    grid-template-columns: auto minmax(14rem, 1fr) minmax(13rem, auto);
    grid-template-areas: "ring details shortcuts";
    align-items: center;
    gap: 1.4rem;
    min-height: 7.4rem;
    padding: 0.65rem;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    background: rgba(9, 12, 16, 0.28);
  }

  .timer-ring {
    grid-area: ring;
    display: grid;
    place-items: center;
    align-content: center;
    width: clamp(6.4rem, 12vw, 7.6rem);
    aspect-ratio: 1;
    border: 0.3rem solid #f05260;
    border-radius: 999px;
    box-shadow:
      0 0 0 0.35rem rgba(240, 82, 96, 0.08),
      inset 0 0 2rem rgba(0, 0, 0, 0.22);
  }

  .time {
    font-size: clamp(1.55rem, 3vw, 1.95rem);
    font-weight: 650;
    line-height: 1;
  }

  .timer-status {
    margin: 0 0 0.75rem;
    color: #c7cdd6;
    font-size: 1rem;
  }

  .timer-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
  }

  .timer-actions button {
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

  .shortcut-list {
    grid-area: shortcuts;
    display: grid;
    gap: 0.4rem;
    margin: 0;
    color: #aeb5c1;
  }

  .shortcut-list div {
    display: grid;
    grid-template-columns: 3rem 1fr;
    align-items: center;
    gap: 0.65rem;
  }

  .timer-details {
    grid-area: details;
    min-width: 0;
  }

  @container (max-width: 36rem) {
    .timer-layout {
      grid-template-areas:
        "ring details"
        "shortcuts shortcuts";
      grid-template-columns: auto minmax(0, 1fr);
      gap: 0.8rem;
      min-height: 0;
      padding: 0.6rem;
    }

    .timer-ring {
      width: 5.7rem;
      border-width: 0.25rem;
      box-shadow:
        0 0 0 0.25rem rgba(240, 82, 96, 0.08),
        inset 0 0 1.5rem rgba(0, 0, 0, 0.22);
    }

    .time {
      font-size: 1.45rem;
    }

    .timer-status {
      margin-bottom: 0.5rem;
      font-size: 0.92rem;
    }

    .timer-actions button {
      min-width: 4.8rem;
      min-height: 2.15rem;
      padding: 0 0.7rem;
    }

    .shortcut-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.4rem;
      font-size: 0.86rem;
    }

    .shortcut-list div {
      grid-template-columns: auto minmax(0, 1fr);
      gap: 0.45rem;
    }
  }

  .shortcut-list dt,
  .shortcut-list dd {
    margin: 0;
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
