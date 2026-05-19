import { invoke } from "@tauri-apps/api/core";

export type AppSettings = {
  globalShortcut: {
    quickEntry: string;
  };
};

export const DEFAULT_QUICK_ENTRY_GLOBAL_SHORTCUT = "CommandOrControl+Shift+L";

export function getSettings() {
  return invoke<AppSettings>("get_settings");
}

export function updateQuickEntryGlobalShortcut(shortcut: string) {
  return invoke<AppSettings>("update_quick_entry_global_shortcut", {
    shortcut,
  });
}

export function pauseQuickEntryGlobalShortcut() {
  return invoke<void>("pause_quick_entry_global_shortcut");
}

export function resumeQuickEntryGlobalShortcut() {
  return invoke<void>("resume_quick_entry_global_shortcut");
}
