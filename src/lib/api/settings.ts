import { invoke } from "@tauri-apps/api/core";

export type AppSettings = {
  globalShortcut: {
    quickEntry: string;
  };
  pomodoroTimer: PomodoroTimerSettings;
  pomodoroSound: PomodoroSoundSettings;
  notification: NotificationSettings;
};

export const DEFAULT_QUICK_ENTRY_GLOBAL_SHORTCUT = "CommandOrControl+Shift+L";
export const DEFAULT_POMODORO_FOCUS_DURATION_MINUTES = 25;
export const MIN_POMODORO_FOCUS_DURATION_MINUTES = 1;
export const MAX_POMODORO_FOCUS_DURATION_MINUTES = 60;
export const DEFAULT_POMODORO_SOUND_VOLUME = 100;

export type PomodoroTimerSettings = {
  focusDurationMinutes: number;
};

export type PomodoroSoundSettings = {
  focusVolume: number;
  completionVolume: number;
};

export type NotificationSettings = {
  permissionPromptSeen: boolean;
};

export function getSettings() {
  return invoke<AppSettings>("get_settings");
}

export function updateQuickEntryGlobalShortcut(shortcut: string) {
  return invoke<AppSettings>("update_quick_entry_global_shortcut", {
    shortcut,
  });
}

export function updatePomodoroTimerSettings({
  focusDurationMinutes,
}: PomodoroTimerSettings) {
  return invoke<AppSettings>("update_pomodoro_timer_settings", {
    focusDurationMinutes,
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

export function updateNotificationPermissionPromptSeen(seen: boolean) {
  return invoke<AppSettings>("update_notification_permission_prompt_seen", {
    seen,
  });
}

export function pauseQuickEntryGlobalShortcut() {
  return invoke<void>("pause_quick_entry_global_shortcut");
}

export function resumeQuickEntryGlobalShortcut() {
  return invoke<void>("resume_quick_entry_global_shortcut");
}
