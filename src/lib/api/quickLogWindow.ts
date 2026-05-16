import { invoke } from "@tauri-apps/api/core";

export function showQuickLogWindow() {
  return invoke<void>("show_quick_log_window");
}

export function hideQuickLogWindow() {
  return invoke<void>("hide_quick_log_window");
}
