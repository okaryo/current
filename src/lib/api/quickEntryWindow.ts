import { invoke } from "@tauri-apps/api/core";

export function showQuickEntryWindow() {
  return invoke<void>("show_quick_entry_window");
}

export function hideQuickEntryWindow() {
  return invoke<void>("hide_quick_entry_window");
}
