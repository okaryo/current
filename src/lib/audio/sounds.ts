export type SoundAsset = {
  id: string;
  label: string;
  src: string;
};

export const pomodoroSounds = {
  focusTick: {
    id: "tick",
    label: "Tick",
    src: "/sounds/pomodoro/6103cd58.mp3",
  },
  focusTock: {
    id: "tock",
    label: "Tock",
    src: "/sounds/pomodoro/cad167ea.mp3",
  },
  completion: {
    id: "complete",
    label: "Complete",
    src: "/sounds/pomodoro/be75f155.mp3",
  },
} as const satisfies Record<string, SoundAsset>;

export const pomodoroFocusLoopSounds = [
  pomodoroSounds.focusTick,
  pomodoroSounds.focusTock,
] as const;
export const pomodoroCompletionSounds = [pomodoroSounds.completion] as const;
