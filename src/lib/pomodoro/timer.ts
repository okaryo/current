export const FOCUS_DURATION_SECONDS = 25 * 60;

export type PomodoroState = {
  remainingSeconds: number;
  running: boolean;
};

export type PomodoroTickResult = {
  state: PomodoroState;
  completed: boolean;
};

export function initialPomodoroState(): PomodoroState {
  return {
    remainingSeconds: FOCUS_DURATION_SECONDS,
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
        ? FOCUS_DURATION_SECONDS
        : state.remainingSeconds,
    running: true,
  };
}

export function resetPomodoro(): PomodoroState {
  return initialPomodoroState();
}

export function startFocusPomodoro(): PomodoroState {
  return {
    remainingSeconds: FOCUS_DURATION_SECONDS,
    running: true,
  };
}

export function tickPomodoro(state: PomodoroState): PomodoroTickResult {
  if (!state.running) {
    return { state, completed: false };
  }

  if (state.remainingSeconds <= 1) {
    return {
      state: initialPomodoroState(),
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

  return state.remainingSeconds < FOCUS_DURATION_SECONDS ? "Paused" : "";
}

export function pomodoroPrimaryActionLabel(state: PomodoroState) {
  if (state.running) {
    return "Pause";
  }

  return state.remainingSeconds < FOCUS_DURATION_SECONDS ? "Continue" : "Start";
}

export function pomodoroProgress(state: PomodoroState) {
  return state.remainingSeconds / FOCUS_DURATION_SECONDS;
}

export function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
