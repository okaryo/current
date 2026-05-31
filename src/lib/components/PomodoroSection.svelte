<script lang="ts">
  import { onDestroy } from "svelte";
  import { Bell } from "@lucide/svelte";
  import {
    createCurrentAudio,
    createCurrentAudioSequence,
  } from "$lib/audio/player";
  import {
    pomodoroCompletionSounds,
    pomodoroFocusLoopSounds,
  } from "$lib/audio/sounds";
  import KeyboardKey from "$lib/components/KeyboardKey.svelte";
  import { sendPomodoroCompleteNotification } from "$lib/notifications";
  import {
    formatTime,
    pomodoroPrimaryActionLabel,
    pomodoroProgress,
    pomodoroStatus,
    resetPomodoro,
    setPomodoroDuration,
    startFocusPomodoroUnlessRunning,
    tickPomodoro,
    togglePomodoro,
    type PomodoroState,
  } from "$lib/pomodoro/timer";

  type PomodoroCommand = "toggle" | "reset" | "startFocus";
  const MIN_FOCUS_DURATION_MINUTES = 1;
  const MAX_FOCUS_DURATION_MINUTES = 60;

  type PomodoroCommandRequest = {
    id: number;
    command: PomodoroCommand;
    preserveFocus?: boolean;
  } | null;

  type Props = {
    active: boolean;
    title: string;
    shortcut: string;
    focusDurationMinutes: number;
    focusVolume: number;
    completionVolume: number;
    showNotificationPermissionPrompt: boolean;
    commandRequest: PomodoroCommandRequest;
    onActivate: () => void;
    onRequestNotificationPermission: () => void | Promise<void>;
  };

  let {
    active,
    title,
    shortcut,
    focusDurationMinutes,
    focusVolume,
    completionVolume,
    showNotificationPermissionPrompt,
    commandRequest,
    onActivate,
    onRequestNotificationPermission,
  }: Props = $props();

  let pomodoroState = $state<PomodoroState>(resetPomodoro());
  let timerInterval: ReturnType<typeof setInterval> | undefined;
  let lastCommandRequestId = 0;
  const focusLoopAudio = createCurrentAudioSequence({
    sources: pomodoroFocusLoopSounds.map((sound) => sound.src),
    failureMessage: "Failed to play Pomodoro focus sound.",
  });
  const completionAudio = createCurrentAudio({
    src: pomodoroCompletionSounds[0].src,
    failureMessage: "Failed to play Pomodoro completion sound.",
  });

  const remainingSeconds = $derived(pomodoroState.remainingSeconds);
  const focusDurationSeconds = $derived(
    durationMinutesToSeconds(focusDurationMinutes),
  );
  const formattedRemainingTime = $derived(formatTime(remainingSeconds));
  const timerStatus = $derived(pomodoroStatus(pomodoroState));
  const primaryActionLabel = $derived(
    pomodoroPrimaryActionLabel(pomodoroState),
  );
  const timerProgress = $derived(pomodoroProgress(pomodoroState));

  $effect(() => {
    focusLoopAudio.setVolume(volumePercentToAudioVolume(focusVolume));
  });

  $effect(() => {
    completionAudio.setVolume(volumePercentToAudioVolume(completionVolume));
  });

  $effect(() => {
    if (
      pomodoroState.running ||
      pomodoroState.durationSeconds === focusDurationSeconds
    ) {
      return;
    }

    pomodoroState = setPomodoroDuration(pomodoroState, focusDurationSeconds);
  });

  $effect(() => {
    if (!commandRequest || commandRequest.id === lastCommandRequestId) {
      return;
    }

    lastCommandRequestId = commandRequest.id;

    switch (commandRequest.command) {
      case "toggle":
        toggleTimer({ preserveFocus: commandRequest.preserveFocus });
        break;
      case "reset":
        resetTimer({ preserveFocus: commandRequest.preserveFocus });
        break;
      case "startFocus":
        startFocusTimer();
        break;
    }
  });

  onDestroy(() => {
    stopTimer();
    focusLoopAudio.dispose();
    completionAudio.dispose();
  });

  function toggleTimer(options: { preserveFocus?: boolean } = {}) {
    if (!options.preserveFocus) {
      onActivate();
    }

    pomodoroState = togglePomodoro(pomodoroState);
    syncInterval();
  }

  function resetTimer(options: { preserveFocus?: boolean } = {}) {
    if (!options.preserveFocus) {
      onActivate();
    }

    pomodoroState = resetPomodoro(focusDurationSeconds);
    syncInterval();
  }

  function startFocusTimer() {
    const nextState = startFocusPomodoroUnlessRunning(
      pomodoroState,
      focusDurationSeconds,
    );

    if (nextState === pomodoroState) {
      return;
    }

    pomodoroState = nextState;
    syncInterval();
  }

  function syncInterval() {
    if (pomodoroState.running) {
      focusLoopAudio.play();
      restartInterval();
      return;
    }

    focusLoopAudio.stop();
    stopTimer();
  }

  function restartInterval() {
    stopTimer();
    timerInterval = setInterval(() => {
      const result = tickPomodoro(pomodoroState);

      pomodoroState = result.state;

      if (result.completed) {
        syncInterval();
        completionAudio.play();
        void sendPomodoroCompleteNotification();
        return;
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = undefined;
    }
  }

  function volumePercentToAudioVolume(volume: number) {
    return Math.min(100, Math.max(0, volume)) / 100;
  }

  function durationMinutesToSeconds(minutes: number) {
    if (!Number.isFinite(minutes)) {
      return MIN_FOCUS_DURATION_MINUTES * 60;
    }

    return (
      Math.min(
        MAX_FOCUS_DURATION_MINUTES,
        Math.max(MIN_FOCUS_DURATION_MINUTES, Math.round(minutes)),
      ) * 60
    );
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

  {#if showNotificationPermissionPrompt}
    <div class="notification-prompt">
      <button
        type="button"
        class="notification-button"
        onfocus={onActivate}
        onclick={() => void onRequestNotificationPermission()}
      >
        <Bell size={14} strokeWidth={2} aria-hidden="true" />
        <span>Enable timer notifications</span>
      </button>
    </div>
  {/if}

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
        onclick={() => toggleTimer()}
      >
        <span>{primaryActionLabel}</span>
      </button>
      <button type="button" onfocus={onActivate} onclick={() => resetTimer()}>
        <span>Reset</span>
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

  .notification-prompt {
    display: flex;
    margin: -0.15rem 0 0.65rem;
  }

  .notification-button {
    display: inline-flex;
    align-items: center;
    gap: 0.42rem;
    min-height: 1.9rem;
    padding: 0 0.62rem;
    border-color: rgba(255, 255, 255, 0.12);
    color: #d7dde6;
    background: rgba(255, 255, 255, 0.055);
    font-size: 0.78rem;
    font-weight: 650;
  }

  .notification-button:hover,
  .notification-button:focus-visible {
    border-color: rgba(255, 89, 101, 0.36);
    color: #ffffff;
    background: rgba(255, 89, 101, 0.12);
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
