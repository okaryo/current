use serde::{Deserialize, Serialize};

pub const DEFAULT_QUICK_ENTRY_GLOBAL_SHORTCUT: &str = "CommandOrControl+Shift+L";

#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default)]
    pub global_shortcut: GlobalShortcutSettings,
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
