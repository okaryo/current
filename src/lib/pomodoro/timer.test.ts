import { describe, expect, it } from "vitest";
import {
  FOCUS_DURATION_SECONDS,
  formatTime,
  initialPomodoroState,
  pomodoroPrimaryActionLabel,
  pomodoroProgress,
  pomodoroStatus,
  resetPomodoro,
  startFocusPomodoro,
  tickPomodoro,
  togglePomodoro,
} from "$lib/pomodoro/timer";

describe("pomodoro timer state", () => {
  it("starts, pauses, and resets focus", () => {
    const started = togglePomodoro(initialPomodoroState());

    expect(started).toEqual({
      remainingSeconds: FOCUS_DURATION_SECONDS,
      running: true,
    });
    expect(togglePomodoro(started)).toEqual({
      remainingSeconds: FOCUS_DURATION_SECONDS,
      running: false,
    });
    expect(resetPomodoro()).toEqual(initialPomodoroState());
  });

  it("starts focus from the full duration", () => {
    expect(startFocusPomodoro()).toEqual({
      remainingSeconds: FOCUS_DURATION_SECONDS,
      running: true,
    });
  });

  it("ticks running timers and reports completion", () => {
    expect(tickPomodoro({ remainingSeconds: 10, running: true })).toEqual({
      state: { remainingSeconds: 9, running: true },
      completed: false,
    });

    expect(tickPomodoro({ remainingSeconds: 1, running: true })).toEqual({
      state: initialPomodoroState(),
      completed: true,
    });
  });

  it("does not tick paused timers", () => {
    const state = { remainingSeconds: 10, running: false };

    expect(tickPomodoro(state)).toEqual({ state, completed: false });
  });
});

describe("pomodoro display helpers", () => {
  it.each([
    [1500, "25:00"],
    [65, "1:05"],
    [5, "0:05"],
  ])("formats %d seconds as %s", (seconds, expected) => {
    expect(formatTime(seconds)).toBe(expected);
  });

  it("derives status, action label, and progress", () => {
    expect(pomodoroStatus(initialPomodoroState())).toBe("");
    expect(pomodoroStatus({ remainingSeconds: 10, running: true })).toBe(
      "Focusing...",
    );
    expect(pomodoroStatus({ remainingSeconds: 10, running: false })).toBe(
      "Paused",
    );

    expect(pomodoroPrimaryActionLabel(initialPomodoroState())).toBe("Start");
    expect(
      pomodoroPrimaryActionLabel({ remainingSeconds: 10, running: false }),
    ).toBe("Continue");
    expect(
      pomodoroPrimaryActionLabel({ remainingSeconds: 10, running: true }),
    ).toBe("Pause");

    expect(
      pomodoroProgress({
        remainingSeconds: FOCUS_DURATION_SECONDS / 2,
        running: false,
      }),
    ).toBe(0.5);
  });
});
