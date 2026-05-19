import { invoke } from "@tauri-apps/api/core";

export type AppSettings = {
  globalShortcut: {
    quickEntry: string;
  };
  pomodoroSound: PomodoroSoundSettings;
};

export const DEFAULT_QUICK_ENTRY_GLOBAL_SHORTCUT = "CommandOrControl+Shift+L";
export const DEFAULT_POMODORO_SOUND_VOLUME = 100;

export type PomodoroSoundSettings = {
  focusVolume: number;
  completionVolume: number;
};

export function getSettings() {
  return invoke<AppSettings>("get_settings");
}

export function updateQuickEntryGlobalShortcut(shortcut: string) {
  return invoke<AppSettings>("update_quick_entry_global_shortcut", {
    shortcut,
  });
}

export function updatePomodoroSoundSettings({
  focusVolume,
  completionVolume,
}: PomodoroSoundSettings) {
  return invoke<AppSettings>("update_pomodoro_sound_settings", {
    focusVolume,
    completionVolume,
  });
}

export function pauseQuickEntryGlobalShortcut() {
  return invoke<void>("pause_quick_entry_global_shortcut");
}

export function resumeQuickEntryGlobalShortcut() {
  return invoke<void>("resume_quick_entry_global_shortcut");
}
