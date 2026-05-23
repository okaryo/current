import { describe, expect, it } from "vitest";
import {
  FOCUS_DURATION_SECONDS,
  formatTime,
  initialPomodoroState,
  pomodoroPrimaryActionLabel,
  pomodoroProgress,
  pomodoroStatus,
  resetPomodoro,
  setPomodoroDuration,
  startFocusPomodoro,
  tickPomodoro,
  togglePomodoro,
} from "$lib/pomodoro/timer";

describe("pomodoro timer state", () => {
  it("starts, pauses, and resets focus", () => {
    const started = togglePomodoro(initialPomodoroState());

    expect(started).toEqual({
      remainingSeconds: FOCUS_DURATION_SECONDS,
      durationSeconds: FOCUS_DURATION_SECONDS,
      running: true,
    });
    expect(togglePomodoro(started)).toEqual({
      remainingSeconds: FOCUS_DURATION_SECONDS,
      durationSeconds: FOCUS_DURATION_SECONDS,
      running: false,
    });
    expect(resetPomodoro()).toEqual(initialPomodoroState());
  });

  it("starts focus from the full duration", () => {
    expect(startFocusPomodoro()).toEqual({
      remainingSeconds: FOCUS_DURATION_SECONDS,
      durationSeconds: FOCUS_DURATION_SECONDS,
      running: true,
    });
  });

  it("uses custom focus durations", () => {
    const durationSeconds = 10 * 60;

    expect(initialPomodoroState(durationSeconds)).toEqual({
      remainingSeconds: durationSeconds,
      durationSeconds,
      running: false,
    });
    expect(startFocusPomodoro(durationSeconds)).toEqual({
      remainingSeconds: durationSeconds,
      durationSeconds,
      running: true,
    });
    expect(resetPomodoro(durationSeconds)).toEqual(
      initialPomodoroState(durationSeconds),
    );
  });

  it("updates idle timers to a new duration", () => {
    const state = initialPomodoroState(25 * 60);

    expect(setPomodoroDuration(state, 30 * 60)).toEqual(
      initialPomodoroState(30 * 60),
    );
  });

  it("keeps running timers on their current duration", () => {
    const state = startFocusPomodoro(25 * 60);

    expect(setPomodoroDuration(state, 30 * 60)).toBe(state);
  });

  it("ticks running timers and reports completion", () => {
    expect(
      tickPomodoro({
        remainingSeconds: 10,
        durationSeconds: FOCUS_DURATION_SECONDS,
        running: true,
      }),
    ).toEqual({
      state: {
        remainingSeconds: 9,
        durationSeconds: FOCUS_DURATION_SECONDS,
        running: true,
      },
      completed: false,
    });

    expect(
      tickPomodoro({
        remainingSeconds: 1,
        durationSeconds: 10 * 60,
        running: true,
      }),
    ).toEqual({
      state: initialPomodoroState(10 * 60),
      completed: true,
    });
  });

  it("does not tick paused timers", () => {
    const state = {
      remainingSeconds: 10,
      durationSeconds: FOCUS_DURATION_SECONDS,
      running: false,
    };

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
    expect(
      pomodoroStatus({
        remainingSeconds: 10,
        durationSeconds: FOCUS_DURATION_SECONDS,
        running: true,
      }),
    ).toBe("Focusing...");
    expect(
      pomodoroStatus({
        remainingSeconds: 10,
        durationSeconds: FOCUS_DURATION_SECONDS,
        running: false,
      }),
    ).toBe("Paused");

    expect(pomodoroPrimaryActionLabel(initialPomodoroState())).toBe("Start");
    expect(
      pomodoroPrimaryActionLabel({
        remainingSeconds: 10,
        durationSeconds: FOCUS_DURATION_SECONDS,
        running: false,
      }),
    ).toBe("Continue");
    expect(
      pomodoroPrimaryActionLabel({
        remainingSeconds: 10,
        durationSeconds: FOCUS_DURATION_SECONDS,
        running: true,
      }),
    ).toBe("Pause");

    expect(
      pomodoroProgress({
        remainingSeconds: FOCUS_DURATION_SECONDS / 2,
        durationSeconds: FOCUS_DURATION_SECONDS,
        running: false,
      }),
    ).toBe(0.5);
  });
});
