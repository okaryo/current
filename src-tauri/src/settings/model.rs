use serde::{Deserialize, Serialize};

pub const DEFAULT_QUICK_ENTRY_GLOBAL_SHORTCUT: &str = "CommandOrControl+Shift+L";
pub const DEFAULT_POMODORO_FOCUS_DURATION_MINUTES: u8 = 25;
pub const MIN_POMODORO_FOCUS_DURATION_MINUTES: u8 = 1;
pub const MAX_POMODORO_FOCUS_DURATION_MINUTES: u8 = 60;
pub const DEFAULT_POMODORO_SOUND_VOLUME: u8 = 100;
pub const DEFAULT_TODO_SOUND_VOLUME: u8 = 100;

#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default)]
    pub global_shortcut: GlobalShortcutSettings,
    #[serde(default)]
    pub pomodoro_timer: PomodoroTimerSettings,
    #[serde(default)]
    pub pomodoro_sound: PomodoroSoundSettings,
    #[serde(default)]
    pub todo_sound: TodoSoundSettings,
    #[serde(default)]
    pub notification: NotificationSettings,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GlobalShortcutSettings {
    #[serde(default = "default_quick_entry_global_shortcut")]
    pub quick_entry: String,
}

impl Default for GlobalShortcutSettings {
    fn default() -> Self {
        Self {
            quick_entry: default_quick_entry_global_shortcut(),
        }
    }
}

fn default_quick_entry_global_shortcut() -> String {
    DEFAULT_QUICK_ENTRY_GLOBAL_SHORTCUT.to_string()
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PomodoroTimerSettings {
    #[serde(default = "default_pomodoro_focus_duration_minutes")]
    pub focus_duration_minutes: u8,
}

impl Default for PomodoroTimerSettings {
    fn default() -> Self {
        Self {
            focus_duration_minutes: DEFAULT_POMODORO_FOCUS_DURATION_MINUTES,
        }
    }
}

fn default_pomodoro_focus_duration_minutes() -> u8 {
    DEFAULT_POMODORO_FOCUS_DURATION_MINUTES
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PomodoroSoundSettings {
    #[serde(default = "default_pomodoro_sound_volume")]
    pub focus_volume: u8,
    #[serde(default = "default_pomodoro_sound_volume")]
    pub completion_volume: u8,
}

impl Default for PomodoroSoundSettings {
    fn default() -> Self {
        Self {
            focus_volume: DEFAULT_POMODORO_SOUND_VOLUME,
            completion_volume: DEFAULT_POMODORO_SOUND_VOLUME,
        }
    }
}

fn default_pomodoro_sound_volume() -> u8 {
    DEFAULT_POMODORO_SOUND_VOLUME
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TodoSoundSettings {
    #[serde(default = "default_todo_sound_volume")]
    pub completion_volume: u8,
}

impl Default for TodoSoundSettings {
    fn default() -> Self {
        Self {
            completion_volume: DEFAULT_TODO_SOUND_VOLUME,
        }
    }
}

fn default_todo_sound_volume() -> u8 {
    DEFAULT_TODO_SOUND_VOLUME
}

#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationSettings {
    #[serde(default)]
    pub permission_prompt_seen: bool,
}
