use std::sync::Mutex;
use tauri::{AppHandle, Emitter, LogicalPosition, Manager, WindowEvent};

#[cfg(target_os = "macos")]
use objc2_app_kit::{NSApplicationActivationOptions, NSRunningApplication, NSWorkspace};

const QUICK_ENTRY_WINDOW_LABEL: &str = "quick-entry";
const QUICK_ENTRY_WINDOW_WIDTH: f64 = 560.0;
const QUICK_ENTRY_WINDOW_HEIGHT: f64 = 230.0;
static PREVIOUS_FRONTMOST_APP_PID: Mutex<Option<i32>> = Mutex::new(None);

pub fn toggle_quick_entry_window(app: AppHandle) -> Result<(), String> {
    let window = quick_entry_window(&app)?;

    if window.is_visible().map_err(|error| error.to_string())? {
        return hide_quick_entry_window(app);
    }

    show_quick_entry_window(app)
}

#[tauri::command]
pub fn show_quick_entry_window(app: AppHandle) -> Result<(), String> {
    let window = quick_entry_window(&app)?;

    remember_frontmost_app();
    position_window_on_cursor_monitor(&app, &window)?;
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())?;
    app.emit_to(QUICK_ENTRY_WINDOW_LABEL, "quick-entry:focus", ())
        .map_err(|error| error.to_string())?;

    Ok(())
}

pub fn setup_quick_entry_window(app: &AppHandle) -> Result<(), String> {
    let window = quick_entry_window(app)?;
    let app_handle = window.app_handle().clone();

    window.on_window_event(move |event| {
        if matches!(event, WindowEvent::Focused(false)) {
            let _ = hide_quick_entry_window_without_restoring(app_handle.clone());
        }
    });

    Ok(())
}

#[tauri::command]
pub fn hide_quick_entry_window(app: AppHandle) -> Result<(), String> {
    let window = quick_entry_window(&app)?;

    window.hide().map_err(|error| error.to_string())?;
    restore_previous_frontmost_app();

    Ok(())
}

fn hide_quick_entry_window_without_restoring(app: AppHandle) -> Result<(), String> {
    let window = quick_entry_window(&app)?;

    window.hide().map_err(|error| error.to_string())
}

fn quick_entry_window(app: &AppHandle) -> Result<tauri::WebviewWindow, String> {
    app.get_webview_window(QUICK_ENTRY_WINDOW_LABEL)
        .ok_or_else(|| "Quick Entry window was not found".to_string())
}

fn position_window_on_cursor_monitor(
    app: &AppHandle,
    window: &tauri::WebviewWindow,
) -> Result<(), String> {
    let cursor_position = app.cursor_position().map_err(|error| error.to_string())?;
    let primary_monitor = app.primary_monitor().map_err(|error| error.to_string())?;
    let primary_scale_factor = primary_monitor
        .as_ref()
        .map(|monitor| monitor.scale_factor())
        .unwrap_or(1.0);
    let cursor_x = cursor_position.x / primary_scale_factor;
    let cursor_y = cursor_position.y / primary_scale_factor;
    let monitors = app
        .available_monitors()
        .map_err(|error| error.to_string())?;
    let monitor = monitors
        .iter()
        .find(|monitor| {
            let scale_factor = monitor.scale_factor();
            let position = monitor.position().to_logical::<f64>(scale_factor);
            let size = monitor.size().to_logical::<f64>(scale_factor);

            cursor_x >= position.x
                && cursor_x < position.x + size.width
                && cursor_y >= position.y
                && cursor_y < position.y + size.height
        })
        .or(primary_monitor.as_ref())
        .or_else(|| monitors.first())
        .ok_or_else(|| "No monitor was found".to_string())?;
    let work_area = monitor.work_area();
    let scale_factor = monitor.scale_factor();
    let work_area_position = work_area.position.to_logical::<f64>(scale_factor);
    let work_area_size = work_area.size.to_logical::<f64>(scale_factor);
    let x =
        work_area_position.x + ((work_area_size.width - QUICK_ENTRY_WINDOW_WIDTH) / 2.0).max(0.0);
    let y =
        work_area_position.y + ((work_area_size.height - QUICK_ENTRY_WINDOW_HEIGHT) / 3.0).max(0.0);

    window
        .set_position(LogicalPosition::new(x, y))
        .map_err(|error| error.to_string())
}

#[cfg(target_os = "macos")]
fn remember_frontmost_app() {
    let previous_pid = NSWorkspace::sharedWorkspace()
        .frontmostApplication()
        .map(|application| application.processIdentifier());

    if let Ok(mut pid) = PREVIOUS_FRONTMOST_APP_PID.lock() {
        *pid = previous_pid;
    }
}

#[cfg(not(target_os = "macos"))]
fn remember_frontmost_app() {}

#[cfg(target_os = "macos")]
fn restore_previous_frontmost_app() {
    let previous_pid = PREVIOUS_FRONTMOST_APP_PID
        .lock()
        .ok()
        .and_then(|mut pid| pid.take());
    let Some(previous_pid) = previous_pid else {
        return;
    };

    if previous_pid < 0 {
        return;
    }

    if let Some(application) =
        NSRunningApplication::runningApplicationWithProcessIdentifier(previous_pid)
    {
        if !application.isTerminated() {
            let _ = application.activateWithOptions(NSApplicationActivationOptions::empty());
        }
    }
}

#[cfg(not(target_os = "macos"))]
fn restore_previous_frontmost_app() {
    if let Ok(mut pid) = PREVIOUS_FRONTMOST_APP_PID.lock() {
        *pid = None;
    }
}
