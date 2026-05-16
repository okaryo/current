use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, WindowEvent};

const QUICK_LOG_WINDOW_LABEL: &str = "quick-log";

#[tauri::command]
pub fn show_quick_log_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window(QUICK_LOG_WINDOW_LABEL)
        .ok_or_else(|| "Quick Log window was not found".to_string())?;

    center_window_on_cursor_monitor(&app, &window)?;
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())?;
    app.emit_to(QUICK_LOG_WINDOW_LABEL, "quick-log:focus", ())
        .map_err(|error| error.to_string())?;

    Ok(())
}

pub fn setup_quick_log_window(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window(QUICK_LOG_WINDOW_LABEL)
        .ok_or_else(|| "Quick Log window was not found".to_string())?;
    let app_handle = window.app_handle().clone();

    window.on_window_event(move |event| {
        if matches!(event, WindowEvent::Focused(false)) {
            let _ = hide_quick_log_window(app_handle.clone());
        }
    });

    Ok(())
}

#[tauri::command]
pub fn hide_quick_log_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window(QUICK_LOG_WINDOW_LABEL)
        .ok_or_else(|| "Quick Log window was not found".to_string())?;

    window.hide().map_err(|error| error.to_string())
}

fn center_window_on_cursor_monitor(
    app: &AppHandle,
    window: &tauri::WebviewWindow,
) -> Result<(), String> {
    let cursor_position = app.cursor_position().map_err(|error| error.to_string())?;
    let monitors = app
        .available_monitors()
        .map_err(|error| error.to_string())?;
    let monitor = monitors
        .iter()
        .find(|monitor| {
            let position = monitor.position();
            let size = monitor.size();
            cursor_position.x >= f64::from(position.x)
                && cursor_position.x < f64::from(position.x) + f64::from(size.width)
                && cursor_position.y >= f64::from(position.y)
                && cursor_position.y < f64::from(position.y) + f64::from(size.height)
        })
        .or_else(|| monitors.first())
        .ok_or_else(|| "No monitor was found".to_string())?;
    let work_area = monitor.work_area();
    let window_size = window.outer_size().map_err(|error| error.to_string())?;
    let x = work_area.position.x
        + ((work_area.size.width as i32 - window_size.width as i32) / 2).max(0);
    let y = work_area.position.y
        + ((work_area.size.height as i32 - window_size.height as i32) / 3).max(0);

    window
        .set_position(PhysicalPosition::new(x, y))
        .map_err(|error| error.to_string())
}
