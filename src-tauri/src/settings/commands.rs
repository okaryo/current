use super::model::{AppSettings, DEFAULT_QUICK_ENTRY_GLOBAL_SHORTCUT};
use super::service;
use crate::quick_entry;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

pub struct GlobalShortcutState {
    quick_entry: Mutex<String>,
}

impl GlobalShortcutState {
    fn new(quick_entry: String) -> Self {
        Self {
            quick_entry: Mutex::new(quick_entry),
        }
    }

    fn quick_entry(&self) -> Result<String, String> {
        self.quick_entry
            .lock()
            .map(|shortcut| shortcut.clone())
            .map_err(|_| "Failed to lock global shortcut state.".to_string())
    }

    fn set_quick_entry(&self, shortcut: String) -> Result<(), String> {
        self.quick_entry
            .lock()
            .map(|mut current| {
                *current = shortcut;
            })
            .map_err(|_| "Failed to lock global shortcut state.".to_string())
    }
}

pub fn setup_global_shortcuts(app: &AppHandle) -> Result<(), String> {
    let settings = service::load(app)?;
    let shortcut = settings.global_shortcut.quick_entry.clone();

    register_quick_entry_shortcut(app, &shortcut)?;
    app.manage(GlobalShortcutState::new(shortcut));

    Ok(())
}

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<AppSettings, String> {
    service::load(&app)
}

#[tauri::command]
pub fn update_quick_entry_global_shortcut(
    shortcut: String,
    app: AppHandle,
    state: State<GlobalShortcutState>,
) -> Result<AppSettings, String> {
    let current_shortcut = state.quick_entry()?;
    let mut settings = service::load(&app)?;

    if shortcut == current_shortcut {
        settings.global_shortcut.quick_entry = shortcut;
        service::save(&app, &settings)?;
        return Ok(settings);
    }

    register_quick_entry_shortcut(&app, &shortcut)?;

    if app
        .global_shortcut()
        .is_registered(current_shortcut.as_str())
    {
        if let Err(error) = app.global_shortcut().unregister(current_shortcut.as_str()) {
            let _ = app.global_shortcut().unregister(shortcut.as_str());
            return Err(format!(
                "Failed to unregister previous global shortcut: {error}"
            ));
        }
    }

    settings.global_shortcut.quick_entry = shortcut.clone();

    if let Err(error) = service::save(&app, &settings) {
        let _ = app.global_shortcut().unregister(shortcut.as_str());
        if current_shortcut != DEFAULT_QUICK_ENTRY_GLOBAL_SHORTCUT
            || !app
                .global_shortcut()
                .is_registered(DEFAULT_QUICK_ENTRY_GLOBAL_SHORTCUT)
        {
            let _ = register_quick_entry_shortcut(&app, &current_shortcut);
        }

        return Err(error);
    }

    state.set_quick_entry(shortcut)?;

    Ok(settings)
}

fn register_quick_entry_shortcut(app: &AppHandle, shortcut: &str) -> Result<(), String> {
    app.global_shortcut()
        .on_shortcut(shortcut, |app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                let _ = quick_entry::commands::toggle_quick_entry_window(app.clone());
            }
        })
        .map_err(|error| format!("Failed to register global shortcut: {error}"))
}
