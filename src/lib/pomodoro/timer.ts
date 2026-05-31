export const FOCUS_DURATION_SECONDS = 25 * 60;

export type PomodoroState = {
  remainingSeconds: number;
  durationSeconds: number;
  running: boolean;
};

export type PomodoroTickResult = {
  state: PomodoroState;
  completed: boolean;
};

export function initialPomodoroState(
  durationSeconds = FOCUS_DURATION_SECONDS,
): PomodoroState {
  return {
    remainingSeconds: durationSeconds,
    durationSeconds,
    running: false,
  };
}

export function togglePomodoro(state: PomodoroState): PomodoroState {
  if (state.running) {
    return {
      ...state,
      running: false,
    };
  }

  return startPomodoro(state);
}

export function startPomodoro(state: PomodoroState): PomodoroState {
  return {
    remainingSeconds:
      state.remainingSeconds <= 0
        ? state.durationSeconds
        : state.remainingSeconds,
    durationSeconds: state.durationSeconds,
    running: true,
  };
}

export function resetPomodoro(
  durationSeconds = FOCUS_DURATION_SECONDS,
): PomodoroState {
  return initialPomodoroState(durationSeconds);
}

export function startFocusPomodoro(
  durationSeconds = FOCUS_DURATION_SECONDS,
): PomodoroState {
  return {
    remainingSeconds: durationSeconds,
    durationSeconds,
    running: true,
  };
}

export function startFocusPomodoroUnlessRunning(
  state: PomodoroState,
  durationSeconds = FOCUS_DURATION_SECONDS,
): PomodoroState {
  if (state.running) {
    return state;
  }

  return startFocusPomodoro(durationSeconds);
}

export function setPomodoroDuration(
  state: PomodoroState,
  durationSeconds: number,
): PomodoroState {
  if (state.running) {
    return state;
  }

  return initialPomodoroState(durationSeconds);
}

export function tickPomodoro(state: PomodoroState): PomodoroTickResult {
  if (!state.running) {
    return { state, completed: false };
  }

  if (state.remainingSeconds <= 1) {
    return {
      state: initialPomodoroState(state.durationSeconds),
      completed: true,
    };
  }

  return {
    state: {
      ...state,
      remainingSeconds: state.remainingSeconds - 1,
    },
    completed: false,
  };
}

export function pomodoroStatus(state: PomodoroState) {
  if (state.running) {
    return "Focusing...";
  }

  return state.remainingSeconds < state.durationSeconds ? "Paused" : "";
}

export function pomodoroPrimaryActionLabel(state: PomodoroState) {
  if (state.running) {
    return "Pause";
  }

  return state.remainingSeconds < state.durationSeconds ? "Continue" : "Start";
}

export function pomodoroProgress(state: PomodoroState) {
  return state.remainingSeconds / state.durationSeconds;
}

export function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
